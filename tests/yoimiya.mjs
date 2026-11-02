import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const source = readFileSync(new URL('../character/skills/yoimiya.js', import.meta.url),'utf8');
const actors = [], log = [];
let moveResult, chargeChoice='1';
const choice = result => ({set(){return this},forResult:async()=>typeof result==='function'?result():result});
const get={info:id=>lib.skill?.[id],number:c=>c.number,suit:c=>c.suit,type2:c=>c._fanType||c.type||(c.name==='sha'?'basic':undefined),name:c=>c.name,
 buttonValue:b=>b.link.value??5,damageEffect:()=>1,nature:()=>undefined,effect:()=>1,value:c=>c.value??5,attitude:(a,b)=>a===b?5:-5};
const game={filterPlayer:()=>actors,cardsGotoOrdering:async c=>log.push(['ordering',c]),cardsGotoPile:async(c)=>log.push(['pile',c]),updateRoundNumber(){}};
const lib={filter:{canBeDiscarded:c=>!c.protected}};
const ui={ordering:{},selected:{buttons:[]},create:{dialog:(...args)=>({args})}};
const {skills,maximalGroups,validXiajiExchange,canMoveXiaji}=new Function('game','get','ui','lib','_status',source.replace(/^import .*;\r?\n/gm,'').replace(/export function/g,'function').replace('export default','const skills =')+'\nreturn {skills,maximalGroups,validXiajiExchange,canMoveXiaji};')(game,get,ui,lib,{});
Array.prototype.randomGet=function(){return this[0]};
Array.prototype.sortBySeat=function(){return this.sort((a,b)=>a.seat-b.seat)};
function card(number,suit,type){return {number,suit,type,name:type==='basic'?'sha':'x'}}
function actor(seat){return {seat,storage:{},hand:[],area:[],history:[],charge:0,alive:true,stat:{skill:{},allSkills:0},getStat(type){return type==='skill'?this.stat.skill:this.stat},
 isIn(){return this.alive},getCards(zone,fn){const c=zone==='h'?this.hand:this.area;return c.filter(fn||(()=>true))},
 countCards(){return this.hand.length},countCharge(max){return max?3-this.charge:this.charge},addCharge(n){this.charge=Math.min(3,this.charge+n)},removeCharge(n){this.charge-=n},
 getHistory(t,fn){return this.history.filter(fn)},chooseControl(){return choice({control:chargeChoice})},chooseToMove(){return choice(()=>moveResult)},
 chooseBool(){return choice({bool:true})},logSkill(id){log.push(['audio',id])},
 async discard(cards){log.push(['discard',cards]);this.area=this.area.filter(c=>!cards.includes(c));this.hand=this.hand.filter(c=>!cards.includes(c));await this.onDiscard?.(cards)},
 async damage(n,nature,source){log.push(['damage',this.seat,n,nature,source])},async lose(c){this.hand=this.hand.filter(x=>!c.includes(x))},async gain(c){this.hand.push(...c)}}}
const owner=actor(0),target=actor(1);actors.push(owner,target);
owner.skills=['fan_xiaji','fan_huahuo'];
async function dispatch(name,trigger){
 const expanded=new Set();
 function expand(id){if(expanded.has(id))return;expanded.add(id);const group=skills[id]?.group;if(group)for(const child of Array.isArray(group)?group:[group])expand(child)}
 owner.skills.forEach(expand);
 for(const id of expanded){const skill=skills[id];const events=skill?.trigger?.global||skill?.trigger?.source;
 if((Array.isArray(events)?events:[events]).includes(name)&&skill.filter(trigger,owner))await skill.content({},trigger,owner)}
}

const ref=card(7,'heart','basic'),both=card(7,'heart','trick'),onlyNumber=card(7,'club','equip'),onlyType=card(1,'spade','basic');
assert.deepEqual(maximalGroups([both,onlyNumber,onlyType],ref),[[both,onlyNumber,onlyType]],'must reassign overlap to reach three');
assert.deepEqual(maximalGroups([both],ref),[[both]],'cannot discard one card twice');
assert.equal(maximalGroups([],ref)[0].length,0);
assert.equal(maximalGroups([card(0,'none','equip')],card(0,'none','basic'))[0].length,0,'invalid suit/number never match');
const four=[ref,card(7,'heart','basic'),card(7,'heart','basic'),card(7,'heart','basic')];
assert.equal(maximalGroups(four,ref).length,4,'deduplicate multiple condition assignments to same physical set');
// Compare exhaustive subsets and permutations for every possible nonempty match mask.
for(let mask=0;mask<512;mask++){
 const cards=Array.from({length:3},(_,i)=>card(mask&(1<<(i*3))?7:2,mask&(1<<(i*3+1))?'heart':'club',mask&(1<<(i*3+2))?'basic':'equip'));
 let best=0;
 for(let a=-1;a<3;a++)for(let b=-1;b<3;b++)for(let c=-1;c<3;c++){
  const ids=[a,b,c].filter(i=>i>=0);if(new Set(ids).size!==ids.length)continue;
  if(a>=0&&cards[a].number!==7||b>=0&&cards[b].suit!=='heart'||c>=0&&cards[c].type!=='basic')continue;
  best=Math.max(best,ids.length);
 }
 assert.ok(maximalGroups(cards,ref).every(g=>g.length===best));
}
skills.fan_xiaji.init(owner);skills.fan_xiaji.init(owner);assert.equal(owner.charge,1);
const planted=card(7,'heart','basic');owner.hand=[planted];const top=Array.from({length:5},(_,i)=>card(i+1,'club','equip'));get.cards=()=>top;
moveResult={bool:true,moved:[[planted,...top.slice(1)],[top[0]]]};
lib.skill=skills;
async function activateXiaji(){
 owner.stat.skill.fan_xiaji=(owner.stat.skill.fan_xiaji||0)+1;owner.stat.allSkills++;
 await skills.fan_xiaji.content({name:'fan_xiaji',getParent:()=>({addCount:true})},{},owner);
}
await activateXiaji();
assert.equal(owner.charge,0);assert.equal(owner.storage.fan_xiaji_cards[0].card,planted);assert.ok(owner.hand.includes(top[0]));
assert.deepEqual(log.find(l=>l[0]==='pile')[1],[...moveResult.moved[0]].reverse(),'preserve top order via native insert');
assert.ok(skills.fan_xiaji.group.includes('fan_xiaji_burst'),'recorder attached via owned skill');
const burst=skills.fan_xiaji_burst;
const use={name:'useCard',player:target,cards:[planted]};target.history=[{hs:[planted],getParent:()=>use}];target.area=[both,onlyNumber,onlyType];
assert.equal(burst.filter(use,owner),true);log.length=0;await dispatch("useCard",use);
assert.deepEqual(log.filter(l=>l[0]==='discard').map(l=>l[1]),[[both],[onlyNumber],[onlyType]],'discard maximal combination through separate one-card events');assert.equal(log.filter(l=>l[0]==='damage').length,1);
assert.equal(burst.filter(use,owner),false,'first burst consumes physical mark');
owner.storage.fan_xiaji_cards=[{card:planted,ref}];
assert.equal(burst.filter({name:'lose',player:target,type:'discard',hs:[],es:[planted]},owner),false,'equipment loss never triggers hand trap');
assert.equal(burst.filter({name:'lose',player:target,type:'discard',getlx:false,hs:[planted]},owner),false,'batched losses handled only at aggregate event');
assert.equal(burst.filter({name:'lose',player:target,type:'gain',hs:[planted]},owner),false,'giving away does not burst');
assert.equal(burst.filter({name:'lose',player:owner,type:'discard',hs:[planted]},owner),false,'owner does not burst own trap');
const loss={hs:[planted]};const batch={name:'loseAsync',type:'discard',getl:a=>a===target?loss:null};
assert.equal(burst.filter(batch,owner),true);
await dispatch("loseAsyncAfter",batch);assert.equal(burst.filter(batch,owner),false);
const charge=skills.fan_huahuo_charge;owner.charge=0;
const sha={name:'sha'},useSha={name:'useCard',player:owner,card:sha};const damage={num:2,card:sha,getParent:()=>useSha};
assert.equal(charge.filter(damage,owner),true,'all Sha charge without discard activation');
await dispatch("damageSource",damage);assert.equal(owner.charge,1,'one per damage event, not per damage point');
await dispatch("damageSource",damage);assert.equal(owner.charge,2,'multiple targets can each charge');
assert.equal(charge.filter({...damage,card:{name:'sha'}},owner),false,'nested use must match its own card');
assert.equal(charge.filter({...damage,num:0},owner),false);
owner.charge=3;assert.equal(charge.filter(damage,owner),false);
assert.equal(skills.fan_huahuo.locked,false);assert.equal(burst.locked,false);assert.equal(charge.locked,false);
assert.equal(skills.fan_huahuo.mod.targetInRange(sha),true);
console.log('Yoimiya: 512 overlap cases, physical traps, hand-only use/discard, batches, first-burst consumption, pile exchange and independent Sha charge passed (simulation).');

owner.charge=0;owner.skills=[];await dispatch('damageSource',damage);assert.equal(owner.charge,0,'unowned recorders cannot execute');
owner.skills=['fan_huahuo'];target.area=[{...onlyType,protected:true}];
assert.equal(skills.fan_huahuo.filter({card:sha,target},owner),false,'protected cards are excluded');
assert.ok(skills.fan_huahuo.ai.effect.player(sha,owner,target)[1]>0,'hostile Sha counts recharge benefit');
assert.equal(skills.fan_huahuo.ai.effect.player(sha,owner,owner),undefined,'do not reward attacking allies');

// Exercise actual chooseToMove button-to-button semantics and final result validation.
const slots=[card(1,'heart','basic'),card(2,'club','basic'),card(3,'spade','basic')];
const originals=[card(4,'diamond','equip'),card(5,'heart','equip')];
const initial=[slots.slice(),originals.slice()];
const can=(a,b,state=initial,limit=2)=>canMoveXiaji({link:a},typeof b==='number'?b:{link:b},state,slots,originals,limit);
assert.equal(can(slots[0],slots[1]),false,'cannot swap two top cards');
assert.equal(can(originals[0],originals[1]),false,'no unnecessary same-row rearrangement');
assert.equal(can(slots[0],1),false,'cannot insert into row to shift fixed positions');
assert.equal(can(slots[0],originals[0]),true,'top first supported');
assert.equal(can(originals[0],slots[0]),true,'hand first supported');
const exchanged=[[originals[0],slots[1],slots[2]],[slots[0],originals[1]]];
assert.equal(can(slots[0],slots[1],exchanged),false,'acquired top card cannot replace another top card');
assert.equal(can(slots[0],originals[0],exchanged),true,'undo original exchange supported');
assert.equal(can(originals[1],slots[1],exchanged),true,'second original hand card may replace second slot');
assert.equal(can(originals[1],slots[1],exchanged,1),false,'over-limit intermediate swap rejected');
assert.equal(can(originals[1],originals[0],exchanged),true,'can change the original hand card used for same slot');
assert.equal(validXiajiExchange([[slots[1],slots[0],slots[2]],originals],slots,originals,2),false,'final guard rejects shuffled top cards');
assert.equal(validXiajiExchange([[originals[0],slots[0],slots[2]],[slots[1],originals[1]]],slots,originals,2),false,'final guard rejects chained reuse');
assert.equal(validXiajiExchange(exchanged,slots,originals,2),true);
assert.equal(validXiajiExchange(initial,slots,originals,2),true,'zero exchanges remain legal');
assert.equal(validXiajiExchange([[originals[0],slots[1],slots[2]],[originals[0],originals[1]]],slots,originals,2),false,'duplicate or missing cards rejected');
console.log('Xiaji: fixed top slots, original-hand-only swaps, no chained reuse, undo, selection order and final guard passed (simulation).');

// Dispatch through the attached Xiaji trigger, allowing each discard to change the next card's state.
owner.skills=['fan_xiaji','fan_huahuo'];
async function sequentialScenario(hook){
 log.length=0;target.alive=true;target.area=[both,onlyNumber,onlyType];
 owner.storage.fan_xiaji_cards=[{card:planted,ref}];
 target.onDiscard=hook;target.history=[{hs:[planted],getParent:()=>use}];
 await dispatch('useCard',use);delete target.onDiscard;
 return log.filter(l=>l[0]==='discard').flatMap(l=>l[1]);
}
assert.deepEqual(await sequentialScenario(async()=>{
 if(log.filter(l=>l[0]==='discard').length===1){await Promise.resolve();target.area=target.area.filter(c=>c!==onlyNumber)}
}),[both,onlyType],'await first discard effects; skip later card moved away without replacement');
assert.deepEqual(await sequentialScenario(async()=>{onlyNumber.protected=true}),[both,onlyType],'recheck discard protection before every card');
delete onlyNumber.protected;
assert.deepEqual(await sequentialScenario(async()=>{target.alive=false}),[both],'stop when target leaves during first discard');
assert.equal(log.some(l=>l[0]==='damage'),false,'do not damage target that left during discards');
target.alive=true;
assert.deepEqual(await sequentialScenario(async()=>{log.push(['nested-effect'])}),[both,onlyNumber,onlyType]);
assert.deepEqual(log.filter(l=>['discard','nested-effect','damage'].includes(l[0])).map(l=>l[0]),
 ['discard','nested-effect','discard','nested-effect','discard','nested-effect','damage'],'each discard fully settles before next, damage only after all');
console.log('Yoimiya sequential discard: separate events, awaited nested effects, moved/protected cards, no refill and target departure passed (simulation).');

// One native skill event owns both quantity choice and the committed deck view.
assert.equal(skills.fan_xiaji.chooseButton,undefined,'no backup/re-entry boundary');
assert.equal(skills.fan_xiaji.direct,true);
let opened=0,forced=false;
const previousMove=owner.chooseToMove;
owner.chooseToMove=(prompt,mustFinish)=>{opened++;forced=mustFinish;return previousMove.call(owner)};
owner.hand=[planted];owner.charge=3;chargeChoice='2';log.length=0;owner.stat.skill.fan_xiaji=0;owner.stat.allSkills=0;
await activateXiaji();
assert.equal(forced,true);assert.equal(owner.charge,1);assert.equal(owner.stat.skill.fan_xiaji,1);
assert.equal(owner.stat.allSkills,1);assert.equal(log.filter(l=>l[0]==='audio'&&l[1]==='fan_xiaji').length,1);
owner.stat.skill.fan_xiaji=0;owner.stat.allSkills=0;owner.charge=1;opened=0;log.length=0;chargeChoice='cancel2';
await activateXiaji();assert.equal(owner.stat.skill.fan_xiaji,0);assert.equal(owner.stat.allSkills,0);
assert.equal(owner.charge,1);assert.equal(opened,0);assert.equal(log.length,0);
chargeChoice='3';await activateXiaji();assert.equal(owner.stat.skill.fan_xiaji,0);assert.equal(owner.charge,1);assert.equal(opened,0);
chargeChoice='1';owner.hand=[planted];await activateXiaji();assert.equal(opened,1,'can use again after return');
owner.chooseToMove=previousMove;
console.log('PASS: direct skill event quantity/view continuation, 2-point payment, cancel/retry, final resource check and once-only audio (simulation).');
// Dispatch the native skill event, then send actual native control click results into its awaiting choice.
const engineRoot=new URL('../../../',import.meta.url);
const nativeSource=readFileSync(new URL('noname/library/element/content.js',engineRoot),'utf8');
const nativeContent=new Function('game','get','ui','lib','_status','ai',nativeSource.replace(/^import .*;\r?\n/gm,'').replace(/export\s*\{[\s\S]*?\};?\s*$/,'')+'\nreturn Content;')(game,get,ui,lib,{},{});
const clickSource=readFileSync(new URL('noname/ui/click/index.js',engineRoot),'utf8');
const clickStart=clickSource.indexOf('  control() {'),clickEnd=clickSource.indexOf('  dialogcontrol()',clickStart);
const nativeStatus={};
const nativeControlClick=new Function('game','get','ui','_status','setTimeout','return {'+clickSource.slice(clickStart,clickEnd)+'}.control;')(game,get,ui,nativeStatus,()=>{});
game.uncheck=()=>{};game.resume=()=>{};game.delayx=async()=>{};get.links=buttons=>buttons.map(b=>b.link);
ui.control={classList:{contains:()=>false}};ui.selected.cards=[];ui.selected.targets=[];
const engineUse=nativeContent.useSkill.find(fn=>fn.toString().includes('next.setContent(info.content)'));
for(const amount of ['1','2','3','cancel2']){
 owner.charge=3;owner.hand=[planted];log.length=0;owner.stat.skill.fan_xiaji=1;owner.stat.allSkills=1;
 const pending=[];
 game.createEvent=name=>{const ev={name,getParent:()=>({addCount:true}),setContent(content){this.content=content}};pending.push(ev);return ev};
 await engineUse({skill:'fan_xiaji',num:0,cards:[],targets:[]},null,owner);
 assert.equal(pending.length,1);const actual=pending[0];
 const oldControl=owner.chooseControl;
 owner.chooseControl=(...controls)=>{
  assert.deepEqual(controls,['1','2','3','cancel2']);
  const ev={name:'chooseControl',set(key,value){this[key]=value;return this},forResult(){
   assert.equal(this.fan_xiaji_count_choice,true);nativeStatus.event=this;
   const parent={classList:{contains:()=>false},close(){}};
   nativeControlClick.call({link:amount,parentNode:parent});return Promise.resolve(this.result);
  }};return ev;
 };
 await actual.content(actual,null,actual.player);owner.chooseControl=oldControl;
 const cancelled=amount==='cancel2';
 assert.equal(owner.charge,cancelled?3:3-Number(amount));
 assert.equal(owner.stat.skill.fan_xiaji,cancelled?0:1);
 assert.equal(log.filter(l=>l[0]==='ordering').length,cancelled?0:1);
 assert.equal(log.filter(l=>l[0]==='audio'&&l[1]==='fan_xiaji').length,cancelled?0:1);
}
console.log('PASS: native useSkill dispatch -> awaiting quantity choice -> native control click -> five-card view; 1/2/3 and return (engine-source harness, not live game).');
