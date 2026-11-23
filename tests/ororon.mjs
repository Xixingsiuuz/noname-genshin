import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const src=readFileSync(new URL('../character/skills/ororon.js',import.meta.url),'utf8').replace(/^import .*;\r?\n/gm,'').replace('export function','function').replace('export default','return').replace('installSelectionCount();','');
const skills=new Function('game','ui','get','_status','lib',src)({}, {}, {effect:(target,card)=>card.name==='draw'?2:-2}, {}, {filter:{cardDiscardable(card,player,event){assert.equal(event,'fan_tonggan');return !card.blocked;}}});
const filter=skills.fan_tonggan.filter, owner={};
assert(filter({getg:()=>[1,2]},owner));
assert(filter({getl:()=>({cards2:[1,2]})},owner));
assert(!filter({getg:()=>[1],getl:()=>({cards2:[2]})},owner));
assert(!filter({getlx:false,getg:()=>[1,2]},owner));
assert(!filter({getParent:()=>({name:'loseAsync'}),getg:()=>[1,2]},owner));
assert(skills.fan_cangmi.subSkill.distribute.filter({}, {hp:3,getExpansions:()=>[1,2,3,4]}));
assert(!skills.fan_cangmi.subSkill.distribute.filter({}, {hp:4,getExpansions:()=>[1,2,3,4]}));
console.log('PASS: 通感单次得失阈值、批量事件去重、藏蜜分配阈值');

let draws=0,discards=0,mode='draw',cancel=false,leave=false;
const card={};
const target={isIn:()=>!leave,countCards:(zone,filter)=>[card].filter(filter).length,async draw(){draws++;},async chooseToDiscard(...args){assert.equal(args[0],'he');assert.equal(args[1],true);assert(args[3](card));discards++;}};
const player={isIn:()=>true,logSkill(){},chooseTarget(prompt,filter){assert.equal(filter(null,player,target),mode==='draw'||!card.blocked);return {set(key,value){if(key==='ai')assert.equal(value(target),mode==='draw'?2:-2);return this;},async forResult(){return {bool:!cancel,targets:[target]};}};}};
await skills.fan_tonggan.content({}, {getg:()=>[1,2]},player);
assert.equal(draws,1);assert.equal(discards,0);
mode='discard';
await skills.fan_tonggan.content({}, {getl:()=>({cards2:[1,2]})},player);
assert.equal(draws,1);assert.equal(discards,1);
card.blocked=true;
await skills.fan_tonggan.content({}, {getl:()=>({cards2:[1,2]})},player);
assert.equal(discards,1);
card.blocked=false;cancel=true;
await skills.fan_tonggan.content({}, {getl:()=>({cards2:[1,2]})},player);
assert.equal(discards,1);
console.log('PASS: 实际发动流程、获得仅摸牌、失去仅弃牌、弃牌接口、禁弃及取消');

// Preparation: cancel never accesses the deck; confirmation accepts zero cards.
let deckReads=0,placed=[],logs=0;
const prepGet={cards(n){deckReads++;return Array.from({length:n},()=>({top:true}));},value:()=>2};
const prepSkills=new Function('game','ui','get','_status','lib',src)({}, {}, prepGet, {}, {});
async function preparation(bool,cards,count){
 const p={chooseCard(...args){assert.deepEqual(args.slice(0,2),['he',[0,2]]);assert.equal(args[2],'你可以发动【藏蜜】：将至多两张牌置于武将牌上。');assert.equal(args.length,3);return {set(key,value){if(['manualConfirm','fanPairedConfirm'].includes(key))assert.equal(value,true);return this;},async forResult(){return {bool,cards};}};},getCards:()=>cards,getExpansions:()=>Array(count).fill({}),logSkill(){logs++;},addToExpansion(cards){placed=cards;return {gaintag:{add(){}}};}};
 await prepSkills.fan_cangmi.content({}, {}, p);
}
await preparation(false,[],2);assert.equal(deckReads,0);
await preparation(true,[],2);assert.equal(deckReads,1);assert.equal(placed.length,2);
const material={};await preparation(true,[material],2);assert.equal(placed.length,3);assert(placed.includes(material));
await preparation(true,[],0);assert.equal(deckReads,3);
console.log('PASS: 藏蜜直接选牌、成对手动确认、取消不取牌、零张与选牌确认');

const aiUi={selected:{cards:[]}};
let enabled=true,benefit=1;
const aiGame={hasPlayer(fn){return fn({isIn:()=>true,countCards:()=>1});}};
const aiGet={value:c=>c.value,name:c=>c.name,effect:()=>benefit};
const score=new Function('game','ui','get','lib',src.slice(0,src.indexOf('return {'))+'return cangmiCardScore;')(aiGame,aiUi,aiGet,{filter:{cardDiscardable:()=>true}});
const medium={value:7,name:'shan'},second={value:7,name:'sha'},peach={value:9,name:'tao'};
const aiPlayer={hp:4,getExpansions:()=>[],hasSkill:()=>enabled,getCards:()=>[medium,second,peach],countCards:()=>1};
assert(score(medium,aiPlayer)>0);aiUi.selected.cards=[medium];assert(score(second,aiPlayer)>0);
enabled=false;assert(score(second,aiPlayer)<=0);enabled=true;benefit=-1;assert(score(second,aiPlayer)<=0);
benefit=1;aiPlayer.hp=1;assert(score(peach,aiPlayer)<0);
console.log('PASS: 两张联动前瞻、选第一张后重评、无通感或无有利目标不虚增收益、保留危急自救桃');
