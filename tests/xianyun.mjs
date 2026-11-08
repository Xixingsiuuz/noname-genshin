import assert from 'node:assert/strict';
import {readFileSync, existsSync} from 'node:fs';
const read = path => readFileSync(new URL(path, import.meta.url), 'utf8');
const strip = source => source.replace(/^import .*;\r?\n/gm, '').replace(/export (const|function)/g, '$1');
const players = [], calls = [], choices = [];
const ui = {selected:{cards:[],targets:[],buttons:[]}};
const status = {};
const lib = {nature:new Map([['fire',1],['thunder',2],['ice',3]]),skill:{}, card:{}, filter:{cardDiscardable:card=>!card.protected,cardEnabled:card=>!card.disabled}};
const get = {
  mode:()=> 'identity',
  nature:card=>card.nature,
  subtype:name=>lib.card[typeof name==='string'?name:name.name].subtype,
  suit:card=>card.effectiveSuit || card.suit,
  color:card=>card.color || (['club','spade'].includes(card.effectiveSuit || card.suit)?'black':'red'),
  value:card=>card.value??2, translation:value=>typeof value==='string'?value:value.map(c=>c.name).join(','),
  attitude:(a,b)=>a===b||a.team===b.team?5:-5,
  effect:(target,card,source,viewer)=>target.immuneNature===card.nature && card.nature ? 0 : (card.name==='sha'?-1:1)*get.attitude(viewer,target),
  recoverEffect:(target,source,viewer)=>target.isDamaged()?get.attitude(viewer,target)*2:0,
  damageEffect:(target,source,viewer)=>-get.attitude(viewer,target), cnNumber:String,
};
const game = {players,dead:[],filterPlayer:fn=>players.filter(fn||(()=>true)),
  checkMod:card=>card.disabled?false:'unchanged',
  countGroup:()=>3,broadcastAll:(fn,...args)=>fn(...args),createCard2:(name,suit,number)=>({name,suit,number})};
// Preserve the native required callback contract, including the missing-argument failure.
const gameSource = read('../../../noname/game/index.js');
const nativeHasPlayer = gameSource.match(/  hasPlayer\(func, includeOut\) \{([\s\S]*?)\n  \}/)[1];
game.hasPlayer = new Function('game','return function(func,includeOut){'+nativeHasPlayer+'}')(game);
const guozhanSource = strip(read('../../../card/guozhan.js')).replace(/export\s*\{[\s\S]*?\};?\s*$/, '');
const guozhan = new Function('game','get','lib','ui','_status',guozhanSource+';return guozhan;')(game,get,lib,ui,status);
const snapshot = new Function('game','get',strip(read('../card/native-taiping.js')).replace('export default','return'))(game,get);
assert.equal(snapshot.translate.taipingyaoshu_info, guozhan.translate.taipingyaoshu_info);
assert.equal(snapshot.skill.taipingyaoshu.filter.toString().replace(/\r/g, ""), guozhan.skill.taipingyaoshu.filter.toString().replace(/\r/g, ""));
const cards = new Function('guozhan',strip(read('../card/xianyun.js'))+';return {mechanisms,xianyunCards,nativeTaipingSkill,xianyunCardTranslate};')(snapshot);
Object.assign(lib.card,cards.xianyunCards);
const {skills,mechanismPresent,canPlaceMechanism,luanyinValue} = new Function('game','get','lib','ui','_status','mechanisms',
  strip(read('../character/skills/xianyun.js')).replace('export default','const skills =')+';return {skills,mechanismPresent,canPlaceMechanism,luanyinValue};')
  (game,get,lib,ui,status,cards.mechanisms);
const equipment = new Function('game','get','lib','ui','nativeTaipingSkill',
  strip(read('../card/mechanism-skills.js')).replace('export default','return'))(game,get,lib,ui,cards.nativeTaipingSkill);
Object.assign(lib.skill,skills,equipment);
get.autoViewAs = (card,materials)=>({...card,cards:materials});
const conversions = new Function('game','get','ui','_status','mechanismSkills',strip(read('../card/skill.js')).replace('export default','return'))(game,get,ui,status,equipment);
Object.assign(lib.skill,conversions);
Array.prototype.sortBySeat = function(){return this.sort((a,b)=>a.seat-b.seat)};
Array.prototype.addArray = function(items){for(const item of items)if(!this.includes(item))this.push(item);return this};
function select(result){return {set(key,value){this[key]=value;return this},forResult:async()=>typeof result==='function'?result():result}}
function nextChoice(){const result=choices.shift();return typeof result==='function'?result():result}
function actor(seat,team){return {seat,team,h:[],e:[],j:[],s:[],hp:2,maxHp:3,alive:true,disabled:new Set(),owned:[],
  isIn(){return this.alive},isOut(){return !this.alive},isMin:()=>false,isDamaged(){return this.hp<this.maxHp},
  getCards(zone,filter){return [...zone].flatMap(z=>this[z]||[]).filter(filter||(()=>true))},
  countCards(zone,filter){return this.getCards(zone,filter).length},getVCards(zone,filter){return this.getCards(zone,filter)},
  hasEmptySlot(type){return !this.disabled.has(type)&&!this.e.some(c=>get.subtype(c)===type)},
  canEquip(name,replace){return replace||this.hasEmptySlot(get.subtype(name))},canUse(card,target){return target!==this&&target.isIn()},
  hasUseTarget:()=>true,
  updateMarks(){},
  logSkill(id,target){calls.push(['voice',id,target?.seat])},
  chooseTarget(...args){const next=select(nextChoice);next.args=args;calls.push(['target',next]);return next},
  chooseButton(dialog){const next=select(nextChoice);next.dialog=dialog;calls.push(['button',next]);return next},
  chooseCardTarget(params){calls.push(['cardTarget',params]);return select(nextChoice)},
  chooseCard(...args){const next=select(nextChoice);next.args=args;calls.push(['card',next]);return next},
  chooseToDiscard(zone,number){calls.push(['forcedDiscard',this.seat,number]);this.h.splice(0,number);return Promise.resolve()},
  chooseToUse(params){calls.push(['use',params]);return {backup(id){calls.push(['backup',id])}}},
  draw(n=1){calls.push(['draw',this.seat,n]);const result={cards:this.noDraw?[]:Array.from({length:n},()=>({name:'sha'}))};this.h.push(...result.cards);return Object.assign(Promise.resolve(),{result})},
  async recover(){calls.push(['recover',this.seat]);this.hp=Math.min(this.maxHp,this.hp+1)},
  discard(card){const list=Array.isArray(card)?card:[card];const actual=list.filter(c=>this.getCards('he').includes(c)&&!c.protected);
    this.h=this.h.filter(c=>!actual.includes(c));this.e=this.e.filter(c=>!actual.includes(c));calls.push(['discard',actual]);
    return Object.assign(Promise.resolve().then(()=>this.afterDiscard?.()),{cards:actual})},
  async equip(card){this.e.push(card);calls.push(['equip',this.seat,card])},
  async loseToSpecial(list){this.h=this.h.filter(c=>!list.includes(c));this.s.push(...list);await this.afterStore?.()},
  async gain(cards){const list=Array.isArray(cards)?cards:[cards];this.s=this.s.filter(c=>!list.includes(c));this.h.push(...list);calls.push(['gain',list])},
  async loseHp(){this.hp--;calls.push(['loseHp'])},
}}
const owner=actor(2,'a'), ally=actor(1,'a'),enemy=actor(3,'b');players.push(owner,ally,enemy);
assert.throws(()=>game.hasPlayer(),TypeError);
assert.equal(game.hasPlayer(p=>p===owner),true);
const hand = n => Array.from({length:n},()=>({name:'sha',suit:'heart'}));
function reset(){calls.length=choices.length=0;ui.selected.cards=[];ui.selected.targets=[];ui.selected.buttons=[];
  for(const p of players){p.h=[];p.e=[];p.j=[];p.s=[];p.hp=2;p.alive=true;p.disabled.clear();delete p.noDraw;delete p.afterDiscard;delete p.afterStore}}
async function luanyin(target){choices.push({bool:true,targets:[target]});await skills.fan_luanyin.content({}, {},owner)}
reset();owner.h=hand(8);ally.h=hand(1);await luanyin(ally);
assert.deepEqual(calls.filter(c=>c[0]==='draw'),[['draw',1,4]],'cap five, no old extra draws');
assert.deepEqual(calls.filter(c=>c[0]==='recover').map(c=>c[1]),[1,2],'seat order');
reset();owner.h=hand(8);ally.h=hand(6);await luanyin(ally);assert(!calls.some(c=>c[0]==='draw'||c[0]==='forcedDiscard'));
reset();owner.h=hand(2);enemy.h=hand(7);await luanyin(enemy);assert.equal(enemy.h.length,2);assert(!calls.some(c=>c[0]==='recover'));
reset();owner.h=hand(4);ally.h=hand(1);ally.noDraw=true;await luanyin(ally);assert(!calls.some(c=>c[0]==='recover'));
reset();owner.h=hand(4);await luanyin(owner);assert(!calls.some(c=>c[0]==='draw'));
assert.equal(calls.find(c=>c[0]==='target')[1].args[1](null,owner,owner),false);
reset();owner.h=hand(4);ally.h=hand(1);enemy.h=hand(1);
assert(luanyinValue(owner,ally)>0);assert(luanyinValue(owner,enemy)<0);
enemy.h=hand(8);assert(luanyinValue(owner,enemy)>0);
owner.h=hand(1);assert(luanyinValue(owner,ally)===0);

reset();owner.h=hand(1);assert(skills.fan_xianzhu.filter({},owner));
for(const [, , name] of cards.mechanisms){assert.equal(lib.card[name].derivation,'fan_xianyun');assert.equal(lib.card[name].fullskin,true);assert(!lib.card[name].fullimage)}
assert.equal(lib.card.fan_zhuxing.subtype,'equip5');assert(!lib.card.fan_zhuxing.distance);
assert.equal(lib.card.fan_taipingyaoshu.subtype,'equip2');
ally.e=[{name:'fan_chengehu'}];assert(!canPlaceMechanism(ally,'fan_zhuxing'));
ally.e=[];ally.disabled.add('equip5');assert(!canPlaceMechanism(ally,'fan_zhuxing'));
ally.disabled.clear();ally.j=[{name:'fan_zhuxing'}];assert(mechanismPresent('fan_zhuxing'));
ally.j=[{name:'taipingyaoshu'}];assert(mechanismPresent('fan_taipingyaoshu'));
ally.j=[];ally.h=[{name:'fan_zhuxing'}];assert(!mechanismPresent('fan_zhuxing'),'hidden hand is not field');
const mechanism=cards.mechanisms[0];
reset();const cost={name:'sha',suit:'heart'};owner.h=[cost];
choices.push({bool:true,links:[mechanism],cards:[cost]},{bool:true,targets:[ally]});
await skills.fan_xianzhu.content({}, {},owner);
assert.equal(ally.e[0].name,mechanism[2]);assert.deepEqual(calls.filter(c=>['discard','voice','equip'].includes(c[0])).map(c=>c[0]),['discard','voice','equip']);
const first=calls.find(c=>c[0]==='button')[1];
const params=calls.find(c=>c[0]==='target')[1];
assert.deepEqual(first.selectButton,[0,1]);assert.equal(first.fanPairedConfirm,true);
assert.deepEqual(first.selectCard,[0,1]);assert.equal(first.position,'he');
assert.equal(first.dialog.length,2,'dialog only contains the mechanism row');
assert.deepEqual(params.selectTarget,[0,1]);assert.equal(params.fanPairedConfirm,true);
reset();owner.h=[cost];
assert.equal(first.filterOk(),false);ui.selected.cards=[cost];assert(!first.filterOk());
assert(first.filterButton({link:mechanism}));assert(!first.filterButton({link:{name:'sha'}}));
ui.selected.buttons=[{link:mechanism}];assert(first.filterOk(),'native material then mechanism');
ui.selected.cards=[];assert(!first.filterOk(),'deselect disables confirmation');
ui.selected.cards=[cost];assert(first.filterOk(),'mechanism then native material');
assert(first.filterCard(cost));assert(first.processAI().bool,'AI evaluates cost and mechanism together');
assert.equal(params.filterOk(),false);ui.selected.targets=[enemy];assert(params.args[1](null,owner,enemy));
assert(params.filterOk(),'only target remains to choose');
owner.h=[];assert(!params.filterOk(),'material no longer held');
reset();owner.h=[cost];choices.push({bool:true,links:[mechanism],cards:[cost]},{bool:false});await skills.fan_xianzhu.content({}, {},owner);
assert.deepEqual(owner.h,[cost]);assert(!calls.some(c=>c[0]==='voice'));
reset();owner.h=[cost];choices.push({bool:true,links:[mechanism],cards:[cost]},()=>{cost.protected=true;return {bool:true,targets:[ally]}});
await skills.fan_xianzhu.content({}, {},owner);assert(!calls.some(c=>c[0]==='discard'));delete cost.protected;
reset();owner.h=[cost];choices.push({bool:true,links:[mechanism],cards:[cost]},{bool:true,targets:[ally]});
owner.afterDiscard=()=>ally.disabled.add('equip5');await skills.fan_xianzhu.content({}, {},owner);
assert(!calls.some(c=>c[0]==='equip'||c[0]==='voice'),'recheck after paid cost and loss triggers');
reset();owner.h=[cost];const alternate={name:'shan'};
choices.push({bool:true,links:[mechanism],cards:[cost]},()=>{owner.h=[alternate];return {bool:true,targets:[ally]}});
await skills.fan_xianzhu.content({}, {},owner);assert.deepEqual(owner.h,[alternate]);
assert(!calls.some(c=>c[0]==='discard'||c[0]==='voice'),'missing bound cost cannot be substituted');

// Dispatch only skills actually granted by equipment, expanding their real groups.
async function dispatch(player,name,trigger){
 const ids=new Set();const expand=id=>{if(ids.has(id))return;ids.add(id);const group=lib.skill[id]?.group;if(group)(Array.isArray(group)?group:[group]).forEach(expand)};
 player.e.flatMap(c=>lib.card[c.name]?.skills||[]).forEach(expand);
 for(const id of ids){const info=lib.skill[id];const events=info?.trigger?.player;
  if((Array.isArray(events)?events:[events]).includes(name)&&(!info.filter||info.filter(trigger,player)))await info.content({},trigger,player)}
}
reset();owner.e=[{name:'fan_pengrenshenji'}];await dispatch(owner,'phaseJieshuBegin',{name:'phaseJieshu'});
assert.equal(owner.h.length,2);assert.equal(owner.hp,3);
await dispatch(owner,'damageEnd',{name:'damage'});assert.equal(owner.e.length,0);
const physical={};await lib.card.fan_pengrenshenji.onEquip({card:{cards:[physical]}});assert.equal(physical._destroy,true);
assert(!lib.card.fan_pengrenshenji.destroy,'do not use unsupported destroy callback');
reset();owner.e=[{name:'fan_guizhongji'}];choices.push({bool:true,links:[['','','sha','thunder']]});await dispatch(owner,'phaseJieshuBegin',{name:'phaseJieshu'});
assert.equal(calls.find(c=>c[0]==='backup')[1],'fan_guizhongji_backup');
assert.equal(calls.find(c=>c[0]==='use')[1].fan_guizhongji_card.nature,'thunder');
const chooseUse=calls.find(c=>c[0]==='use')[1];
assert(chooseUse.filterCard(chooseUse.fan_guizhongji_card,owner));
assert(!chooseUse.filterCard({name:'sha',nature:'thunder'},owner),'cannot substitute a hand sha');
assert(!chooseUse.filterCard({...chooseUse.fan_guizhongji_card,nature:'fire'},owner),'nature remains bound');
assert.deepEqual(calls.find(c=>c[0]==='button')[1].dialog[1][0].map(link=>link[3]),[undefined,'fire','thunder']);
const natureChoice=calls.find(c=>c[0]==='button')[1];
for(const nature of ['ice','kami','stab','poison'])assert(!natureChoice.filterButton({link:['','','sha',nature]}));
for(const nature of [undefined,'fire','thunder','ice','kami','stab','poison']){
 reset();owner.e=[{name:'fan_guizhongji'}];choices.push({bool:true,links:[['','','sha',nature]]});
 await dispatch(owner,'phaseJieshuBegin',{name:'phaseJieshu'});
 assert.equal(calls.some(c=>c[0]==='use'),[undefined,'fire','thunder'].includes(nature),'final nature validation');
}
assert.equal(equipment.fan_guizhongji_skill.mod.targetInRange({storage:{fan_guizhongji:true}}),true);
assert.equal(equipment.fan_guizhongji_skill.mod.targetInRange({name:'sha'}),undefined);
async function boost(suit){reset();owner.e=[{name:'fan_guizhongji'}];const card={name:'sha',suit};owner.h=[card];
 const use={card:{name:'sha',storage:{fan_guizhongji:true}},targets:[enemy],directHit:[],baseDamage:1};
 const targetEvent={...use,isFirstTarget:true,getParent:()=>use};
 choices.push({bool:true,cards:[card]});await dispatch(owner,'useCard1',targetEvent);assert(!calls.some(c=>c[0]==='card'),'not at useCard1');
 await dispatch(owner,'useCardToPlayered',targetEvent);
 const count=calls.filter(c=>c[0]==='card').length;
 await dispatch(owner,'useCardToPlayered',{...targetEvent,isFirstTarget:false});assert.equal(calls.filter(c=>c[0]==='card').length,count,'one opportunity across multiple targets');return use;}
let use=await boost('club');assert(use.directHit.includes(enemy));assert.equal(use.baseDamage,1);
let boostAI=calls.find(c=>c[0]==='card')[1].ai;
enemy.h=hand(4);use.directHit=[];assert(boostAI({value:1})>0,'positive enemy hit benefit');
use.targets=[ally];assert(boostAI({value:1})<0,'do not spend to hurt teammate');
use.targets=[enemy];use.directHit=[enemy];assert(boostAI({value:1})<0,'no extra value when already direct hit');
use.directHit=[];use.card.nature='fire';enemy.immuneNature='fire';assert(boostAI({value:1})<0,'respect nature immunity');delete enemy.immuneNature;
use=await boost('spade');assert.equal(use.baseDamage,1);assert(use.directHit.includes(enemy));
use=await boost('heart');assert.equal(use.directHit.length,0);assert.equal(use.baseDamage,1);
reset();owner.e=[{name:'fan_guizhongji'}];owner.h=[cost];use={card:{name:'sha'},targets:[enemy],directHit:[]};
await dispatch(owner,'useCardToPlayered',{...use,isFirstTarget:true});assert(!calls.some(c=>c[0]==='card'),'ordinary sha not enhanced');
reset();owner.e=[{name:'fan_guizhongji'}];const black={name:'sha',suit:'club'};owner.h=[black];
const cancelledUse={card:{name:'sha',nature:'thunder',storage:{fan_guizhongji:true}},targets:[enemy],directHit:[]};
choices.push({bool:false});await dispatch(owner,'useCardToPlayered',{...cancelledUse,isFirstTarget:true,getParent:()=>cancelledUse});
assert(owner.h.includes(black));assert.equal(cancelledUse.directHit.length,0);
reset();owner.e=[{name:'fan_guizhongji'}];choices.push({bool:false});await dispatch(owner,'phaseJieshuBegin',{name:'phaseJieshu'});
assert(!calls.some(c=>c[0]==='use'),'cancel nature selection creates no use event');

reset();const stored={name:'shan',suit:'club'}, urn={name:'fan_chengehu',storages:[],cards:[]};
owner.e=[urn];owner.h=[stored];await equipment.fan_chengehu_skill.content({cards:[stored]}, {},owner);
assert.deepEqual(owner.s,[stored]);assert.deepEqual(urn.storages,[stored]);assert.equal(owner.h.length,1);
assert.equal(equipment.fan_chengehu_skill.usable,1);assert.equal(equipment.fan_chengehu_skill.position,'h');
owner.s=[];await dispatch(owner,'loseEnd',{ss:[stored]});assert.equal(urn.storages.length,0,'attached recorder prunes used material');
owner.s=[stored];urn.storages=[stored];
owner.e=[];await lib.card.fan_chengehu.onLose({card:urn}, {},owner);assert(owner.h.includes(stored));assert.equal(owner.s.length,0);
assert.equal(urn.storages.length,0);
reset();owner.e=[urn];owner.h=[stored];owner.afterStore=()=>owner.e=[];
await equipment.fan_chengehu_skill.content({cards:[stored]}, {},owner);assert(owner.h.includes(stored));assert(!owner.s.length);
assert(!calls.some(c=>c[0]==='draw'),'interrupted storage returns card');
assert.equal(equipment.fan_taipingyaoshu_skill.mod.maxHandcard(owner,3),5);
assert.equal(equipment.fan_taipingyaoshu_skill.filter,snapshot.skill.taipingyaoshu.filter);
assert.equal(equipment.fan_taipingyaoshu_skill.ai,snapshot.skill.taipingyaoshu.ai);
owner.hasSkillTag=()=>false;
assert.equal(equipment.fan_taipingyaoshu_skill.filter({nature:'fire'},owner),true);
assert.equal(equipment.fan_taipingyaoshu_skill.filter({},owner),undefined);
owner.hasSkillTag=()=>true;
assert.equal(equipment.fan_taipingyaoshu_skill.filter({nature:'fire'},owner),false);
owner.hasSkillTag=()=>false;
reset();owner.hp=1;await lib.card.fan_taipingyaoshu.onLose({}, {},owner);assert.equal(owner.hp,1);assert.equal(owner.h.length,2);
reset();await lib.card.fan_taipingyaoshu.onLose({}, {},owner);assert.equal(owner.hp,1);

// Fire-sha material is confirmed once, auto-bound in the native target step, never substituted.
reset();const material={name:'sha',suit:'diamond'}, substitute={name:'sha',suit:'diamond'};owner.h=[material,substitute];
const demand={name:'chooseToUse',filterCard:card=>card.name==='sha'&&card.nature==='fire'};
status.event={name:'chooseButton',player:owner,getParent:()=>demand};
const fire=conversions.fan_zhuxing_diamond;
assert(fire.filter(demand,owner));
ui.selected.buttons=[{link:material}];assert(fire.chooseButton.filterOk());
const backup=fire.chooseButton.backup([material]);
assert.equal(backup.selectCard,-1);assert.equal(backup.manualConfirm,true);
assert(backup.filterCard(material,owner));assert(!backup.filterCard(substitute,owner));
ui.selected.cards=[material];assert(backup.filterOk());
owner.h=[substitute];assert(!backup.filterOk());assert(!backup.filterCard(substitute,owner));
owner.h=[material];material.disabled=true;assert(!backup.filterCard(material,owner));delete material.disabled;
// Reuse the real Fangtian target modifier; the auto-bound physical card remains selected.
const standardSource=read('../../../card/standard.js');
const fangtianSource=standardSource.slice(standardSource.indexOf('    fangtian_skill: {'),standardSource.indexOf('    fangtian_guozhan: {'));
const targetBody=fangtianSource.match(/selectTarget\(card, player, range\) \{([\s\S]*?)\n        \}/)[1];
const fangtianTarget=new Function('get','ui','return function(card,player,range){'+targetBody+'}')(get,ui);
ui.selected.cards=[material];owner.h=[material];let range=[1,1];fangtianTarget(backup.viewAs,owner,range);assert.deepEqual(range,[1,3]);
owner.h=[material,substitute];range=[1,1];fangtianTarget(backup.viewAs,owner,range);assert.deepEqual(range,[1,1]);
owner.h=[material];ui.selected.cards=[];range=[1,1];fangtianTarget(backup.viewAs,owner,range);assert.deepEqual(range,[1,1]);
function targetRangeWithEquipment(){
 const result=[1,1];
 for(const card of owner.e)if(card.name==='fangtian')fangtianTarget(backup.viewAs,owner,result);
 return result;
}
owner.e=[];owner.h=[material];ui.selected.cards=[material];assert.deepEqual(targetRangeWithEquipment(),[1,1],'no weapon grants no extra targets');
owner.e=[{name:'fangtian'}];assert.deepEqual(targetRangeWithEquipment(),[1,3],'equipped native modifier sees bound last hand card');
owner.e=[];
status.event.name='chooseToRespond';assert.equal(fire.chooseButton.backup([material]).manualConfirm,false);
for(const [id,suit,name] of [['heart','heart','tao'],['club','club','shan'],['spade','spade','wuxie']]){
 const skill=conversions['fan_zhuxing_'+id];const card={suit};owner.h=[card];
 assert.equal(skill.viewAs.name,name);assert(skill.viewAsFilter(owner));assert(skill.filterCard(card,owner));
 owner.h=[];assert(!skill.viewAsFilter(owner));
}

// Actual local vcard preset initializes native cards from the same tuples; "card" requires DOM cards.
const uiSource=read('../../../noname/ui/create/index.js');
const presetSource=uiSource.slice(uiSource.indexOf('    vcard: (item,'),uiSource.indexOf('    character: (item,'));
const nativeVcard=new Function('ui','get','return ({'+presetSource+'}).vcard;')({create:{card(){return {classList:{add(){}},init(tuple){this.tuple=tuple}}}}},{});
for(const tuple of cards.mechanisms){const node=nativeVcard(tuple,'vcard');assert.deepEqual(node.tuple,tuple);assert.equal(node.link,tuple)}
assert.equal(calls.filter(c=>c[0]==='voice').length,0);
const portrait=new URL('../image/character/portraits/xianyun-20261027.png',import.meta.url);assert(existsSync(portrait));
console.log('PASS: Xianyun redesign, AI ally/enemy/cap choices, joint selection, real hasPlayer contract, five native card faces, attached equipment triggers, costs, disposal, stored cards and Taiping rules (simulation; no live game).');
