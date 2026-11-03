import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const heard=[];
const skills=new Function('game','get',readFileSync(new URL('../character/skills/nilou.js',import.meta.url),'utf8').replace(/^import .*;\r?\n/gm,'').replace('export default','return'))({trySkillAudio:id=>heard.push(id)},{});
const main=skills.fan_pianzhuan,yin=main.subSkill.yin;
const p={},other={};
function actor(){return {history:[],getHistory(type,filter){return this.history.filter(filter);}};}
const a=actor(),b=actor();
const held=new Set(['fan_pianzhuan','fan_pianzhuan_yin']);
async function use(user,targets){const e={player:user,targets:[...targets],excluded:[]};e.excluded.add=function(x){if(!this.includes(x))this.push(x);};user.history.push(e);
 assert(held.has('fan_pianzhuan'));assert.equal(main.group,'fan_pianzhuan_record');assert.equal(main.subSkill.record.trigger.global,'useCard');
 await main.subSkill.record.content({},e,p);
 if(held.has('fan_pianzhuan_yin')&&e.targets.includes(p)&&yin.filter({player:user,getParent:()=>e},p))await yin.content({}, {player:user,getParent:()=>e},p);
 return e;}
// Equip targets its user: consumes first targeted use, without an exclusion or sound.
let e=await use(a,[a]);assert.equal(e.excluded.length,0);assert.equal(heard.length,0);
e=await use(a,[p]);assert.equal(e.excluded.length,0);assert.equal(heard.length,0);
// Each user separately gets a first targeted use; targetless cards do not consume it.
await use(b,[]);e=await use(b,[p,other]);assert(e.excluded.includes(p));assert(!e.excluded.includes(other));assert.equal(heard.length,1);
// Cancellation cannot retroactively refund a first targeted use.
a.history=[];e=await use(a,[other]);e.targets.length=0;
e=await use(a,[p]);assert(!e.excluded.includes(p));assert.equal(heard.length,1);
// New turn resets native history; same-turn regrant / extra phase does not.
a.history=[];e=await use(a,[p]);assert(e.excluded.includes(p));assert.equal(heard.length,2);
e=await use(a,[p]);assert(!e.excluded.includes(p));assert.equal(heard.length,2);
const evaluate=yin.ai.effect.target;
a.history=[];assert.equal(evaluate({},a,p),'zerotarget');assert.equal(evaluate({},p,p),undefined);
await use(a,[a]);assert.equal(evaluate({},a,p),undefined);
console.log('Nilou Yin: global mounted snapshot, equipment/other targets consume silently, targetless use, each user, cancellation, multiple targets, turn reset and AI passed (simulation).');
