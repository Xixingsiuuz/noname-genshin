import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const voices=[];
const game={trySkillAudio:(id,p,direct)=>{assert.equal(direct,true);voices.push(id);},countPlayer:fn=>[enemy,friend].filter(fn).length};
const enemy={side:-1},friend={side:1};
const get={number:(card)=>card.number??(card.cards?.length===1?card.cards[0].number:null),
  tag:card=>card.damage?1:0,nature:()=>undefined,damageEffect:target=>target.side===-1?3:-3};
const source=readFileSync(new URL('../character/skills/eula.js',import.meta.url),'utf8');
const skills=new Function('game','get',source.replace(/^import .*;\r?\n/gm,'').replace('export default','return'))(game,get);
const main=skills.fan_langhua, after=main.subSkill.after;
assert.equal(main.locked,false);assert.equal(after.locked,false);
assert(main.group.includes('fan_langhua_after'));
assert(main.group.includes('fan_langhua_damage_voice'));
const p={history:[],turn:[],hujia:0,hp:4,drawn:0,armorCalls:0,alive:true,
 getAllHistory(key){assert.equal(key,'useCard');return this.history;},
 getHistory(key,fn){assert.equal(key,'useCard');return this.turn.filter(fn);},
 async draw(){this.drawn++;if(this.onDraw){const fn=this.onDraw;this.onDraw=null;await fn();}},
 async changeHujia(n,type,cap){assert.equal(type,'gain');assert.equal(cap,5);this.armorCalls++;this.hujia=Math.min(cap,this.hujia+n);},
 isIn(){return this.alive;},logSkill(id){assert.equal(id,'fan_langhua');},
 canUse:()=>true,getUseValue:card=>card.bad?-1:2};
let held=new Set(['fan_langhua']);
// Dispatch from held skills and their actual group, not unconditional subskill calls.
async function use(number,card={number},finish=true){
 const event={player:p,card,baseDamage:1};p.history.push(event);p.turn.push(event);
 if(held.has('fan_langhua'))await main.content({},event,p);
 if(finish)await settle(event);
 return event;
}
async function settle(event){
 if(held.has('fan_langhua')&&main.group.includes('fan_langhua_after')&&after.filter(event,p))await after.content({},event,p);
}
let event=await use(1);assert.equal(event.fan_langhua.count,0);assert.equal(p.drawn,0);assert.equal(voices.length,0);
for(let i=1;i<=7;i++){
 event=await use(i+1);
 assert.equal(event.fan_langhua.count,i);
 assert.equal(voices.at(-1),'fan_langhua_'+(i>=4?'mid':i>=2?'low':'start'));
 assert.equal(event.baseDamage,i>=6?2:1);
}
assert.equal(p.drawn,11);assert.equal(p.hujia,1);assert.equal(p.armorCalls,1);
// Same number qualifies; turn reset refreshes armor only, not the sequence.
p.turn=[];event=await use(8);assert.equal(event.fan_langhua.count,8);assert.equal(p.hujia,2);
event=await use(13);assert.equal(event.baseDamage,4);
event=await use(2);assert.equal(event.fan_langhua.count,0);
event=await use(3);assert.equal(event.fan_langhua.count,1);
// No point is never coerced to zero. A point-less use breaks both comparisons.
await use(null,{name:'sha'});event=await use(4);assert.equal(event.fan_langhua.count,0);
event=await use(5,{cards:[{number:5}]});assert.equal(event.fan_langhua.count,1);
// Pure responses do not enter useCard history and cannot change count.
assert.equal(main.trigger.player,'useCard');assert.equal(event.fan_langhua.count,1);
// Reserve armor at use time: nested use does not take the same turn's quota.
p.turn=[];let nested;p.onDraw=async()=>{nested=await use(7);};
const outer=await use(6,undefined,false);
assert.equal(outer.fan_langhua.count,2);assert.equal(nested.fan_langhua.count,3);
assert.equal(outer.fan_langhua.armor,true);assert.equal(nested.fan_langhua.armor,false);
const armor=p.armorCalls;await settle(outer);await settle(outer);assert.equal(p.armorCalls,armor+1);
// Higher-tier outer use retains its draw after a nested low-point reset.
await use(8);await use(9);p.onDraw=async()=>{await use(1);};
const high=await use(10,undefined,false);assert.equal(high.fan_langhua.count,6);assert.equal(high.baseDamage,2);
const drawn=p.drawn;await settle(high);assert.equal(p.drawn,drawn+1);
// Armor never exceeds 5; quota remains spent even when already at cap.
p.hujia=5;p.turn=[];await use(2);const capped=await use(3);assert(capped.fan_langhua.armor);assert.equal(p.hujia,5);
assert.equal((await use(4)).fan_langhua.armor,false);
// Leaving play prevents post-resolution gains.
const pending=await use(5,undefined,false);p.alive=false;const before=p.drawn;await settle(pending);assert.equal(p.drawn,before);p.alive=true;
// Seal/skill loss stops dispatch, but actual card history still determines the next comparison.
held.clear();const disabled=await use(1);assert.equal(disabled.fan_langhua,undefined);
held.add('fan_langhua');assert.equal((await use(2)).fan_langhua.count,1);
// AI: low starts, nondecreasing continuation, caps, damage enemy/friend and no forced bad use.
assert(main.mod.aiOrder(p,{number:3},5)>main.mod.aiOrder(p,{number:13},5));
assert.equal(main.mod.aiOrder(p,{number:3,bad:true},5),undefined);
assert.equal(main.mod.aiOrder(p,{number:3},0),undefined);
for(let i=0;i<5;i++)await use(2);
const attack={number:13,damage:true};
assert(main.ai.effect.player(attack,p,enemy)[1]>main.ai.effect.player(attack,p,friend)[1]);
p.hujia=0;p.turn=[];const armorValue=main.ai.effect.player(attack,p,enemy)[1];
p.hujia=5;assert(main.ai.effect.player(attack,p,enemy)[1]<armorValue);
// Native engine establishes baseDamage before useCard and copies it into card effects.
const engine=readFileSync(new URL('../../../noname/library/element/content.js',import.meta.url),'utf8');
assert(engine.indexOf('event.baseDamage = get.info(event.card, false).baseDamage || 1')<engine.indexOf('await event.trigger("useCard")'));
assert(engine.includes('next.baseDamage = event.baseDamage'));
// Effect-specific timing: >=6 is silent on initial draw; real damage then final draw.
const damageVoice=main.subSkill.damage_voice;
assert.equal(damageVoice.trigger.source,'damage');
// Native damage fires on actual damage, before dying and the later damageSource.
const damageBody=engine.slice(engine.indexOf('  damage: ['));
assert(damageBody.indexOf('await event.trigger("damage")')<damageBody.indexOf('await event.trigger("damageSource")'));
assert.equal(damageVoice.locked,false);
async function damage(use, overrides={}) {
 const evt={num:1,source:p,card:use.card,getParent:name=>{assert.equal(name,'useCard');return use;},...overrides};
 if(held.has('fan_langhua')&&main.group.includes('fan_langhua_damage_voice')&&damageVoice.filter(evt,p))await damageVoice.content({},evt,p);
}
voices.length=0;
const damaging=await use(13,undefined,false);
assert(damaging.fan_langhua.count>=6);assert.deepEqual(voices,[]);
await damage(damaging,{num:0});await damage(damaging,{unreal:true});
await damage(damaging,{source:enemy});await damage(damaging,{card:{number:13}});
assert.deepEqual(voices,[]);
await damage(damaging);assert.deepEqual(voices,['fan_langhua_high']);
await damage(damaging);assert.deepEqual(voices,['fan_langhua_high']);
await settle(damaging);assert.deepEqual(voices,['fan_langhua_high','fan_langhua_mid']);
await settle(damaging);assert.equal(voices.length,2);
voices.length=0;
const harmless=await use(13,undefined,false);assert.deepEqual(voices,[]);
await settle(harmless);assert.deepEqual(voices,['fan_langhua_mid']);
// Nested low-tier damage cannot borrow the outer high-tier snapshot.
voices.length=0;
const outerHigh=await use(13,undefined,false);
const innerLow=await use(1,undefined,false);
await damage(innerLow);assert.deepEqual(voices,[]);
await damage(outerHigh);await settle(outerHigh);
assert.deepEqual(voices,['fan_langhua_high','fan_langhua_mid']);
console.log('PASS Eula: actual skill-group dispatch; count/reset/cross-turn, four voice routes, nested snapshots, armor quota/cap, post-resolution draw, virtual numbers, disabled dispatch and AI (simulation; no live game).');
