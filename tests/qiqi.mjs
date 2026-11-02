import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const read = p => readFileSync(new URL(p, import.meta.url), 'utf8');
Array.prototype.randomGet = function () { return this[0]; };
Array.prototype.sortBySeat = function (p) { return this.sort((a,b)=>(a.seat-p.seat+8)%8-(b.seat-p.seat+8)%8); };
let accept=true, selected=[], cards=[], duringGain;
const trace=[];
const game={players:[], hasPlayer(fn){assert.equal(typeof fn,'function');return this.players.some(fn);},
  async cardsGotoOrdering(cs){cs.forEach(c=>c.pos='o');},async cardsDiscard(cs){cs.forEach(c=>c.pos='d');},
  trySkillAudio(id){trace.push(id);}};
const get={cards:()=>cards,color:c=>c.color,position:c=>c.pos,attitude:(p,t)=>t.friend||0,tag:(c,t)=>!!c[t]};
const status={};
const skills=new Function('game','get','_status',read('../character/skills/qiqi.js').replace(/^import .*;\r?\n/gm,'').replace(/export function/g,'function').replace('export default','return'))(game,get,status);
const choice=result=>({set(){return this;},async forResult(){return result();}});
function actor(seat){return {seat,hp:2,maxHp:3,friend:2,storage:{},mounted:new Set(['fan_due']),
 isIn(){return !this.out;},hasSkill(s){return this.mounted.has(s);},addSkill(s){this.mounted.add(s);},removeSkill(s){this.mounted.delete(s);},
 countCards:()=>2,isDamaged(){return this.hp<this.maxHp;},chooseBool(){return choice(()=>({bool:accept}));},
 chooseTarget(){return choice(()=>({bool:!!selected.length,targets:selected}));},
 logSkill(id,t,a,b,args){assert.deepEqual(args,[]);assert.equal(skills[id].audio,false);trace.push('log');},
 async showCards(cs){trace.push('show');},line(ts){trace.push(ts.map(t=>t.seat));},
 async gain(cs){trace.push('gain');cs.forEach(c=>c.pos='h');duringGain?.();},async recover(){trace.push('heal');this.hp=Math.min(this.maxHp,this.hp+1);}};}
const q=actor(0),a=actor(1),b=actor(3);game.players=[q,a,b];status.currentPhase=b;
const draw=()=>({num:2,changeToZero(){this.num=0;this.numFixed=true;}});
cards=Array.from({length:5},(_,i)=>({color:i<2?'black':'red',pos:'c'}));selected=[a,b];
let event=draw();await skills.fan_due.content({},event,q);
assert.equal(event.num,0);assert.deepEqual(cards.map(c=>c.pos),['h','h','d','d','d']);
assert.deepEqual(trace,['log','show','fan_due_gain1','gain','fan_due_give1',[3,1]]);
assert(a.hasSkill('fan_due_zhenfu'));assert(b.hasSkill('fan_due_zhenfu'));
assert(!skills.fan_due_zhenfu.filter({num:0}));
// Independent marks survive the source losing skills. Remove before recovery to avoid reentry.
q.mounted.clear();trace.length=0;
await skills.fan_due_zhenfu.content({}, {num:3},a);assert.equal(a.hp,3);assert(!a.hasSkill('fan_due_zhenfu'));
await skills.fan_due_zhenfu.content({}, {num:1},a);assert.deepEqual(trace,['heal']);
// Full HP consumes the mark; later damage cannot recover again.
b.hp=3;await skills.fan_due_zhenfu.content({}, {num:1},b);assert(!b.hasSkill('fan_due_zhenfu'));assert.equal(b.hp,3);
trace.length=0;accept=false;event=draw();await skills.fan_due.content({},event,q);assert.equal(event.num,2);assert.deepEqual(trace,[]);
accept=true;cards=Array.from({length:5},()=>({color:'red',pos:'c'}));await skills.fan_due.content({},draw(),q);assert.deepEqual(trace,['log','show']);assert(cards.every(c=>c.pos==='d'));
trace.length=0;cards=Array.from({length:5},()=>({color:'black',pos:'c'}));selected=[];await skills.fan_due.content({},draw(),q);assert(!trace.includes('fan_due_give1'));
// Gain triggers may remove the owner. Remaining cards still leave ordering, no grants/audio.
trace.length=0;cards=[{color:'black'},{color:'red'}];duringGain=()=>q.out=true;selected=[a];await skills.fan_due.content({},draw(),q);assert.equal(cards[1].pos,'d');assert(!trace.includes('fan_due_give1'));q.out=false;duringGain=null;
assert.equal(skills.fan_due.locked,false);
console.log('PASS Qiqi Due: reveal/gain/discard, seat order, cancellation, zero black, owner departure, independent nonstacking marks, full HP and multihit. Simulation only.');
