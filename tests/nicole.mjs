import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const lib={inpile:['sha','shan','wuzhong','lebu'],skill:{}};
const voiceCalls=[];const game={trySkillAudio(id){voiceCalls.push(id)},roundNumber:1,hasPlayer(fn){assert.equal(typeof fn,'function');return actors.some(fn)},filterPlayer(fn){return actors.filter(fn||(()=>true))},checkMod(){return 'unchanged'}};
const get={type:n=>n==='lebu'?'delay':n==='wuzhong'?'trick':'basic',position:c=>c.pos,is:{convertedCard:c=>!c.isCard&&c.cards?.length>0},translation:x=>x};
const ui={selected:{cards:[]}},status={};let actors=[];
const source=readFileSync(new URL('../character/skills/nicole.js',import.meta.url),'utf8');
const skills=new Function('lib','game','get','ui','_status','startNicoleStory','finishNicoleStory',source.replace(/^import .*;\r?\n/gm,'').replace('export default','return'))(lib,game,get,ui,status,()=>{},()=>{});lib.skill=skills;
function actor(id){return {playerid:id,storage:{},draws:0,exp:[],getStorage(k){return this.storage[k]||[]},getExpansions(){return this.exp},hasSkill(){return true},isIn(){return true},async draw(n=1){this.draws+=n},awakenSkill(){},addSkill(k){this.gained=k},markSkill(){},addToExpansion(cards){const p=this;return {set(){p.exp.push(...cards);cards.forEach(c=>c.pos='x');return Promise.resolve()}}}}}
const n=actor('n');actors=[n];n.storage.fan_tianlin_names=['sha'];n.storage.fan_duanyu_failed=true;
const c={pos:'o'},use={name:'useCard',card:{name:'sha',isCard:true},cards:[c]};const otherUser=actor("other-user");otherUser.getHistory=()=>[{hs:[c]}];const targetEvent={player:otherUser,cards:[c],card:use.card,getParent:()=>use};n.getHistory=()=>[{hs:[c]}];
assert(skills.fan_tianlin.group.includes('fan_tianlin_record'));
assert(!skills.fan_tianlin_record.filter({...targetEvent,player:n},n),'Nicole own hand use cannot collect or draw');
for(let i=0;i<3;i++){assert(skills.fan_tianlin_record.filter(targetEvent,n));await skills.fan_tianlin_record.content({},targetEvent,n)}
assert.deepEqual(use.fan_tianlin_collectors,['n']);
assert(skills.fan_tianlin_collect.filter(use,n));await skills.fan_tianlin_collect.content({},use,n);assert.equal(n.draws,0);assert.equal(n.exp.length,0);
c.pos='d';const ordering={name:'orderingDiscard',relatedEvent:use};const discard={name:'cardsDiscard',cards:[c],getParent:()=>ordering};
assert(skills.fan_tianlin_collect.filter(discard,n));await skills.fan_tianlin_collect.content({},discard,n);assert.equal(n.draws,1);assert.deepEqual(n.exp,[c]);assert(!skills.fan_tianlin_collect.filter(discard,n));
assert(!skills.fan_tianlin_record.filter({card:{name:'sha',cards:[{}],isCard:false}},n));
assert(!skills.fan_tianlin_collect.filter({getParent:()=>({name:'discard'})},n));
const d=actor('d');d.storage.fan_tianlin_names=['sha'];d.storage.fan_tianlin_current='sha';let cancelled=0;
await skills.fan_duanyu.content({}, {card:{name:'sha'},cancel(){cancelled++}},d);assert.equal(d.draws,0);assert(!d.storage.fan_duanyu_done);
await skills.fan_duanyu.content({}, {card:{name:'juedou'},cancel(){cancelled++}},d);assert.equal(d.draws,2);assert.equal(d.gained,'fan_xuanji');assert(d.storage.fan_duanyu_failed);
assert(!skills.fan_duanyu.filter({card:{name:'sha'}},d));assert(!skills.fan_duanyu.filter({card:{name:'juedou'}},d));assert.equal(cancelled,2);
assert.throws(()=>game.hasPlayer());
console.log('Nicole: attached recorders, multiple targets deduplicated, real ordering discard timing, converted/unrelated cards excluded, mission failure and retained prevention passed.');
const a=actor('a'),b=actor('b');let order=[],used=[];actors=[n,a,b];
a.isIn=()=>true;b.isIn=()=>true;
a.chooseControl=()=>({set(){return this},async forResult(){return {control:'cancel2'}}});
b.chooseControl=()=>({set(){return this},async forResult(){return {control:'令其摸牌'}}});
a.addTempSkill=()=>{throw Error('cancel must not grant protection')};b.addTempSkill=k=>order.push(k);b.markAuto=(k,ps)=>b.storage[k]=ps;
const rawFilter=game.filterPlayer;game.filterPlayer=fn=>{const list=rawFilter(fn);list.sortBySeat=()=>list.reverse();return list};
status.currentPhase=n;n.storage.fan_tianlin_order=[c];n.hasUseTarget=()=>true;n.chooseToUse=async spec=>{used.push(spec.fan_xuanji_card);assert.equal(spec.position,'x');n.exp=[]};
await skills.fan_xuanji.content({}, {}, n);
assert.equal(n.draws,3);assert.equal(order.length,1);assert.deepEqual(used,[c]);assert(skills.fan_xuanji_protect.filter({source:n},b));assert(!skills.fan_xuanji_protect.filter({source:a},b));
status.event={fan_xuanji_card:c};assert.equal(skills.fan_xuanji.mod.targetInRange(c,n),true);status.event={};assert.equal(skills.fan_xuanji.mod.targetInRange(c,n),undefined);
console.log('Nicole Xuanji: seat sorting, declining grants no protection, draw branch, bound expansion card, source-specific prevention and scoped distance passed.');
// Conversion UI: direct entry, explicit color confirmation, and only fixed-target cards auto-submit.
get.color=card=>card.color;get.info=card=>({sha:{selectTarget:1},wuzhong:{selectTarget:-1},tao:{selectTarget:-1},wuxie:{notarget:true}}[card.name]);get.select=n=>typeof n==='number'?[n,n]:n||[1,1];
const red={color:'red'},black={color:'black'};n.hand=[red,black];n.getCards=(position,filter)=>{assert.equal(position,"h");return filter?n.hand.filter(filter):n.hand.slice()};n.storage.fan_duanyu_failed=false;n.storage.fan_tianlin_current='sha';
assert.equal(skills.fan_tianlin_convert.direct,true);assert.deepEqual(skills.fan_tianlin_convert.chooseButton.select,[0,1]);
let backup=skills.fan_tianlin_convert.chooseButton.backup(['n|red'],n);
assert.equal(backup.manualConfirm,true);assert.equal(backup.direct,false);assert(backup.filterCard(red));assert(!backup.filterCard(black));
ui.selected.cards=[red];status.event={player:n};assert(backup.filterOk());
n.hand=[{color:'red'},black];assert(!backup.filterOk(),'must not replace invalid bound materials');n.hand=[red,black];
for(const name of ['wuzhong','tao','wuxie']){n.storage.fan_tianlin_current=name;backup=skills.fan_tianlin_convert.chooseButton.backup(['n|red'],n);assert.equal(backup.manualConfirm,false);assert.equal(backup.direct,false)}
console.log('Nicole conversion UI: direct entry, explicit color selection, fixed-target submission, Sha target confirmation and bound materials passed.');


get.tag=(card,tag)=>tag==='damage'&&['sha','juedou','huogong'].includes(card.name);
const attacker=actor('attacker'),defender=actor('defender');const effect=skills.fan_duanyu.ai.effect.target;
assert.equal(effect({name:'sha'},attacker,defender),undefined);
defender.storage.fan_tianlin_names=['sha','juedou'];defender.storage.fan_tianlin_current='juedou';
assert.equal(effect({name:'juedou'},attacker,defender),'zerotarget');assert.equal(effect({name:'sha'},attacker,defender),undefined);
defender.storage.fan_duanyu_done=true;assert.equal(effect({name:'juedou'},attacker,defender),undefined);
const ended=actor('ended');ended.storage.fan_duanyu_done=true;ended.storage.fan_tianlin_current='sha';let prevented=false;await skills.fan_duanyu.content({}, {card:{name:'sha'},cancel(){prevented=true}},ended);assert(!prevented);
console.log('Nicole AI: normal native damage evaluation, only current-round immunity before mission completion, completed mission entry guard passed.');
// Fixed-target conversion must submit a use result without opening another target chooser.
const oldInfo=get.info;get.info=card=>card.name==='nanman'?{selectTarget:-1}:oldInfo(card);
get.autoViewAs=(card,cards)=>({...card,cards});lib.filter={filterTarget:(card,player,target)=>target!==player};
n.storage.fan_tianlin_current='nanman';actors=[n,attacker];n.hand=[red,black];status.event={player:n};ui.selected.cards=[red];
const fixed=skills.fan_tianlin_convert.chooseButton.backup(['n|red'],n);assert.equal(fixed.viewAs,undefined);assert.equal(fixed.selectTarget,0);assert.equal(fixed.filterTarget(),false);
const submission={result:{bool:true,skill:'fan_tianlin_convert_backup'},getParent:()=>({_backup:{filterCard:()=>true}})};
await fixed.precontent(submission,{},n);assert.equal(submission.result.card.name,'nanman');assert.deepEqual(submission.result.cards,[red]);assert.deepEqual(Array.from(submission.result.targets),[attacker]);assert.equal(submission.result.skill,undefined);
console.log('Nanman: no target-selection viewAs, bound materials, native target list and direct use result passed.');

// Unusable memories remain until the queue finishes, then all remaining memories are discarded.
const full=actor('full');const peach={name:'tao',pos:'x'};full.exp=[peach];full.storage.fan_tianlin_order=[peach];actors=[full];full.hasUseTarget=()=>false;
full.chooseToUse=()=>{throw Error('unusable peach must not open a chooser')};
let discarded=[];full.loseToDiscardpile=async cards=>{discarded.push(...cards);cards.forEach(card=>card.pos='d');full.exp=full.exp.filter(card=>!cards.includes(card))};
await skills.fan_xuanji.content({}, {}, full);assert.deepEqual(discarded,[peach]);assert.equal(peach.pos,'d');assert.deepEqual(full.storage.fan_tianlin_order,[]);
console.log('Xuanji: unusable memory skipped, discarded after queue, order storage cleared passed.');

assert.equal(voiceCalls.filter(id=>id==='fan_duanyu_guard').length,1);
assert.equal(voiceCalls.filter(id=>id==='fan_duanyu_failure').length,1);
assert.equal(voiceCalls.filter(id=>id==='fan_tianlin_draw_voice').length,1);
console.log('Nicole actual skill branches: one guard voice, one mission-failure voice, one memory draw voice, no per-target duplicates passed.');
// Fixed-target submission must not depend on cards being selected in the second UI.
n.storage.fan_tianlin_current='nanman';n.storage.fan_tianlin_round=undefined;n.storage.fan_tianlin_colors=[];n.hand=[red,black];actors=[n,attacker];status.event={player:n};ui.selected.cards=[];
const zeroSelection=skills.fan_tianlin_convert.chooseButton.backup(['n|red'],n);
assert.equal(zeroSelection.selectCard,0);assert.equal(zeroSelection.filterCard(red),false);assert(zeroSelection.filterOk(),'fixed-target cards must pass with no UI-selected materials');
n.hand=[black];assert(!zeroSelection.filterOk(),'invalid original materials still prevent use');n.hand=[red,black];
console.log('Nanman regression: zero-card/zero-target intermediate selection, empty UI passes, stale snapshot rejected.');
// Color confirmation previews all same-color materials, switching/clearing/cancel cleans up.
for(const card of [red,black]){card.preview=false;card.classList={toggle(name,value){card.preview=value},remove(){card.preview=false}};card.updateTransform=()=>{}}
const chooser={player:n,custom:{add:{}},getParent:()=>({filterCard:()=>true})};status.event=chooser;n.storage.fan_tianlin_round=undefined;ui.selected.buttons=[{link:'n|red'}];
assert(skills.fan_tianlin_convert.chooseButton.filterOk());assert(red.preview);assert(!black.preview);
ui.selected.buttons=[{link:'n|black'}];assert(skills.fan_tianlin_convert.chooseButton.filterOk());assert(!red.preview);assert(black.preview);
ui.selected.buttons=[];assert(!skills.fan_tianlin_convert.chooseButton.filterOk());assert(!red.preview);assert(!black.preview);
ui.selected.buttons=[{link:'n|red'}];skills.fan_tianlin_convert.chooseButton.filterOk();chooser.custom.add.confirm(false);assert(!red.preview);
console.log('Color preview: red/black all-material highlights, clearing and cancel cleanup passed.');
