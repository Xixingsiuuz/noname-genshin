import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL(p,import.meta.url),'utf8');
const trace=[];let control='观看牌堆顶',arrange=cs=>cs.slice().reverse(),throwMove=false;
let pile=[],ordering=[];
const ui={cardPile:{get firstChild(){return pile[0]||null;},insertBefore(card,before){pile=pile.filter(c=>c!==card);const i=pile.indexOf(before);pile.splice(i<0?pile.length:i,0,card);card.pos='c';},appendChild(card){pile=pile.filter(c=>c!==card);pile.push(card);card.pos='c';}}};
const get={position:c=>c.pos,cards(n){return pile.splice(0,n);},attitude:(a,b)=>b.friend??1,value:c=>c.value??0,judge:c=>c.judge,name:c=>c.name};
const game={async cardsGotoOrdering(cs){ordering=cs;cs.forEach(c=>c.pos='o');},trySkillAudio(id){trace.push(id);},updateRoundNumber(){},addCardKnower(cs,p){trace.push('private');}};
// Exercise the actual local pile API and insertion implementation, including reversal.
const engine=read('../../../noname/game/index.js');
for(const [name,signature] of [['cardsGotoPile','...args'],['$cardsGotoPile','event2']]){
 const match=engine.match(new RegExp('  '+name.replace('$','\\$')+'\\('+signature.replace(/[.*]/g,'\\$&')+'\\) \\{([\\s\\S]*?)\\n  \\}'));
 assert(match,name);game[name]=new Function('game','get','ui','_status','return function('+signature+'){'+match[1]+'}')(game,get,ui,{});
}
get.itemtype=x=>Array.isArray(x)&&x.every(c=>c?.card)?'cards':x?.card?'card':typeof x;
Array.prototype.addArray=function(xs){for(const x of xs)if(!this.includes(x))this.push(x);};Array.prototype.add=function(x){if(!this.includes(x))this.push(x);};
game.createEvent=()=>({cards:[],set(k,v){this[k]=v;},setContent(){},then(resolve){game.$cardsGotoPile(this);resolve();}});
const skills=new Function('game','get','_status',read('../character/skills/mona.js').replace(/^import .*;\r?\n/gm,'').replace(/export function/g,'function').replace('export default','return'))(game,get,{});
const choice=result=>({set(k,v){this[k]=v;return this;},async forResult(){return result(this);}});
const player={storage:{},marks:{},active:new Set(['fan_jiliu','fan_shuijing']),temp:{},hp:3,
 isIn(){return !this.out;},countCards(){return 2;},getCards(){return this.judges||[];},
 addTempSkill(id,expiry){this.active.add(id);this.temp[id]=expiry;},addMark(id,n){this.marks[id]=(this.marks[id]||0)+n;},countMark(id){return this.marks[id]||0;},
 logSkill(...args){assert.deepEqual(args[4],[]);trace.push('log');},
 chooseControl(){return choice(()=>({control}));},
 chooseToMove(forced){assert.equal(forced,true);return choice(event=>{if(throwMove)throw Error('exit');const moved=[arrange(event.list[0][1])];assert(event.filterOk(moved));assert(!event.filterOk([event.list[0][1].slice(1)]));assert(!event.filterOk([[...event.list[0][1].slice(1),event.list[0][1][1]]]));assert.equal(event.processAI(event.list)[0].length,event.list[0][1].length);return {bool:true,moved};});},
 async draw(){trace.push('draw');const card=pile.shift();if(card)card.pos='h';},
};player.next={friend:-1,getCards:()=>[]};
function reset(){trace.length=0;player.out=false;pile=Array.from({length:8},(_,i)=>({card:true,id:i,pos:'c',value:i,fix(){},willBeDestroyed(){return false;}}));}
async function dispatch(name,source,owner=player){for(const id of [...player.active]){const s=skills[id];if(owner===player&&s?.trigger?.target===name&&s.filter(source,player))await s.content({},source,player);if(owner===player&&s?.trigger?.player===name&&(!s.filter||s.filter(source,player)))await s.content({},source,player);}for(const id of [...player.active])if(owner===player&&player.temp[id]?.player===name){player.active.delete(id);delete player.storage[id];delete player.marks[id];}}
reset();const other={};await dispatch('useCardToTargeted',{player:other});await dispatch('useCardToTargeted',{player:other});assert.equal(player.countMark('fan_jiliu_distance'),2);assert.equal(skills.fan_jiliu_distance.mod.globalTo(other,player,1),3);assert.equal(skills.fan_jiliu_distance.mod.globalTo(player,player,0),undefined);assert(!skills.fan_jiliu.filter({player},player));
// Current card retains its existing targets; later cards use the larger distance.
const originalTargets=[player];await dispatch('useCardToTargeted',{player:other,targets:originalTargets});assert.deepEqual(originalTargets,[player]);assert.equal(player.countMark('fan_jiliu_distance'),3);
// A different player's turn end does not expire the player-scoped duration.
assert.deepEqual(player.temp.fan_jiliu_distance,{player:'phaseAfter'});await dispatch('phaseAfter',{},other);assert.equal(player.countMark('fan_jiliu_distance'),3);await dispatch('phaseAfter',{});assert.equal(player.countMark('fan_jiliu_distance'),0);
reset();control='取消';await dispatch('phaseZhunbeiBegin',{});assert.deepEqual(trace,[]);assert(!player.storage.fan_shuijing_end);
control='观看牌堆顶';await dispatch('phaseZhunbeiBegin',{});assert.deepEqual(pile.map(c=>c.id),[4,3,2,1,0,5,6,7]);assert.deepEqual(player.storage.fan_shuijing_end,['摸牌']);assert.equal(trace.filter(x=>x==='fan_shuijing').length,1);
await dispatch('phaseJieshuBegin',{});assert.equal(trace.at(-1),'draw');assert(!skills.fan_shuijing_end.filter({},player));await dispatch('phaseJieshuBegin',{});assert.equal(trace.filter(x=>x==='draw').length,1);
reset();control='摸牌';await dispatch('phaseZhunbeiBegin',{});assert.deepEqual(pile.map(c=>c.id),[1,2,3,4,5,6,7]);await dispatch('phaseJieshuBegin',{});assert.deepEqual(pile.map(c=>c.id),[5,4,3,2,1,6,7]);
// Losing/suppressing the source doesn't undo an already scheduled consequence.
reset();await dispatch('phaseZhunbeiBegin',{});player.active.delete('fan_shuijing');await dispatch('phaseJieshuBegin',{});assert.deepEqual(pile.map(c=>c.id),[5,4,3,2,1,6,7]);player.active.add('fan_shuijing');
// Skipped ending phase: remove pending work at own turn end, no carry to next turn.
reset();await dispatch('phaseZhunbeiBegin',{});await dispatch('phaseAfter',{});assert(!player.storage.fan_shuijing_end);assert(!player.active.has('fan_shuijing_end'));
reset();control='观看牌堆顶';throwMove=true;await assert.rejects(dispatch('phaseZhunbeiBegin',{}),/exit/);assert(ordering.every(c=>c.pos==='c'));assert.deepEqual(pile.map(c=>c.id),[0,1,2,3,4,5,6,7]);throwMove=false;
reset();pile=pile.slice(0,2);await skills.fan_shuijing.content({}, {},player);assert.deepEqual(pile.map(c=>c.id),[1,0]);
assert.equal(skills.fan_jiliu.locked,false);assert.equal(skills.fan_shuijing.locked,false);
assert.deepEqual(skills.fan_jiliu.ai.effect.target({},other,{friend:-1}),[1,.15]);assert.equal(skills.fan_jiliu.ai.effect.target({},other,{friend:1}),undefined);
console.log('PASS Mona: mounted triggers, cumulative directional distance, expiry, optional start/mandatory complement, cancellation, private single-row permutation, exact native pile insertion, skipped phase, source loss, short deck, exception cleanup and AI. Simulation with native pile methods; no live game.');

// Use the local lock classifier; explicit false overrides forced inference.
const lockedBody=read('../../../noname/get/is.js').match(/  locked\(skill, player\) \{([\s\S]*?)\n  \}/)[1];
const locked=new Function('lib','skill','player',lockedBody).bind(null,{skill:skills});
assert.equal(locked('fan_jiliu',player),false);assert.equal(locked('fan_shuijing',player),false);
const choiceAI=player.chooseControl;let picked;
player.chooseControl=()=>choice(event=>{picked=event.ai();return {control:'取消'};});
player.hp=1;player.countCards=()=>0;await skills.fan_shuijing.content({}, {},player);assert.equal(picked,1);
player.hp=3;await skills.fan_shuijing.content({}, {},player);assert.equal(picked,0);
player.chooseControl=choiceAI;
// Mirror AI handles actual judge order, own draws, and next player's alignment.
reset();let aiOrder;
const oldMove=player.chooseToMove;
player.chooseToMove=forced=>{const result=oldMove(forced);const original=result.set;result.set=function(k,v){if(k==='processAI')aiOrder=v;return original.call(this,k,v);};return result;};
player.judges=[{judge:c=>c.id===0?1:-1}];control='观看牌堆顶';await skills.fan_shuijing.content({}, {},player);
let aiCards=ordering.slice();assert.equal(aiOrder([[null,aiCards]])[0][0].id,0);
assert.deepEqual(aiOrder([[null,aiCards]])[0].slice(1).map(c=>c.id),[4,3,2,1]);
player.judges=[];player.next.friend=-1;control='摸牌';reset();delete player.storage.fan_shuijing_end;await skills.fan_shuijing.content({}, {},player);await skills.fan_shuijing_end.content({}, {},player);
assert.deepEqual(aiOrder([[null,ordering]])[0].map(c=>c.id),[1,2,3,4,5]);
player.next.friend=1;assert.deepEqual(aiOrder([[null,ordering]])[0].map(c=>c.id),[5,4,3,2,1]);
console.log('PASS native locked classification, foreign-turn expiry rejection, survival choice and friend/enemy/judgment/draw AI ordering.');
