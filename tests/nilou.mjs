import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const skills = new Function("game", "get", readFileSync(new URL("../character/skills/nilou.js", import.meta.url), "utf8")
  .replace(/^import .*;\r?\n/gm, "").replace("export default", "return"))({trySkillAudio(){}}, {value:()=>1,type:card=>card?.type});
const main = skills.fan_pianzhuan;
const yang = main.subSkill.yang, yin = main.subSkill.yin;
const p = {storage:{}, history:[], active:[], isIn:()=>true,
  async draw(){this.drawn=(this.drawn||0)+1;},
  addSkill(id){this.active.push(id);},
  removeSkill(id){this.active=this.active.filter(skill=>skill!==id);},
  changeZhuanhuanji(){this.storage.fan_pianzhuan=!this.storage.fan_pianzhuan;},
  getHistory(type, filter){return this.history.filter(filter);}};
const q = {history:[], getHistory: p.getHistory};
const other = {};
// Expand only actually held skills, as the engine does for subskills/temp skills.
let held = new Set(["fan_pianzhuan"]);
async function activate(){if(held.has("fan_pianzhuan")) await main.content({}, {}, p);
  held = new Set(["fan_pianzhuan", ...p.active]);}
await activate();
assert.equal(p.drawn,1); assert.equal(p.storage.fan_pianzhuan,true);
assert.deepEqual(p.active,["fan_pianzhuan_yang"]);
const use = {targets:[q,other],effectCount:1,excluded:[]};
use.excluded.add = function(x){if(!this.includes(x))this.push(x);};
p.history=[{targets:[]},use];
const ev = use;
assert(held.has("fan_pianzhuan_yang") && yang.filter(ev,p));
await yang.content({},ev,p);assert.equal(use.effectCount,2);
assert(!yang.filter(ev,p)); // multiple targets do not repeat the bonus
const nested = {targets:[q],effectCount:1};p.history.push(nested);
assert(!yang.filter(nested,p));
await activate(); assert.equal(p.drawn,2);assert.equal(p.storage.fan_pianzhuan,false);
assert.deepEqual(p.active,["fan_pianzhuan_yin"]);
assert(!held.has("fan_pianzhuan_yang"));
const attack = {targets:[p,other],excluded:[]};attack.excluded.add=use.excluded.add;
q.history=[attack]; const targetEvent={player:q,getParent:()=>attack};
assert(held.has("fan_pianzhuan_yin") && yin.filter(targetEvent,p));
await yin.content({},targetEvent,p);
assert(attack.excluded.includes(p));assert(!attack.excluded.includes(other));
const attack2={targets:[p]};q.history.push(attack2);
assert(!yin.filter({player:q,getParent:()=>attack2},p));
p.history=[{targets:[p]}];assert(!yin.filter({player:p,getParent:()=>p.history[0]},p));
q.history=[attack2];assert(yin.filter({player:q,getParent:()=>attack2},p)); // new turn
assert.equal(yang.mod.globalFrom(p,q,3),2);assert.equal(yin.mod.globalTo(q,p,3),4);
// Self-targeting cards now count; acquiring Yang never resets earlier uses.
const self = {targets:[p],effectCount:1};p.history=[self];
assert(yang.filter(self,p));
p.history=[self,use];assert(!yang.filter(ev,p));
let result={bool:true}, sequence=[];
p.countDiscardableCards=()=>1;p.logSkill=()=>sequence.push("log");
p.chooseToDiscard=()=>({set(key,value){if(key==="prompt2")assert.equal(value,false);return this;},forResult:async()=>result});
p.turnedOver=false;
p.phaseUse=async()=>{assert.equal(p.turnedOver,true,"extra phase begins after turning over");sequence.push("phaseUse");await activate();};
p.turnOver=async()=>{sequence.push("turnOver");p.turnedOver=!p.turnedOver;};
assert(skills.fan_chuchen.filter({},p));
await skills.fan_chuchen.content({}, {}, p);
assert.deepEqual(sequence,["log","turnOver","phaseUse"]);assert.equal(p.drawn,3);
result={bool:false};sequence=[];await skills.fan_chuchen.content({}, {}, p);assert.deepEqual(sequence,[]);
// Chuchen reversed the cycle: Yang persists outside the turn and across a skipped turn.
assert.deepEqual(p.active,["fan_pianzhuan_yang"]);
assert.equal(p.storage.fan_pianzhuan,true);
// No phaseUseBegin / phaseJieshuBegin is dispatched for a turned-over skipped turn.
assert.deepEqual(main.trigger.player,["phaseUseBegin","phaseJieshuBegin"]);
assert.deepEqual(p.active,["fan_pianzhuan_yang"]);
await activate(); // next playable turn's phaseUseBegin
assert.deepEqual(p.active,["fan_pianzhuan_yin"]);
await activate(); // phaseJieshuBegin
assert.deepEqual(p.active,["fan_pianzhuan_yang"]);
// Lebu consumes the regular phaseUse skip: only the end phase converts.
const before = p.drawn;
await activate();
assert.equal(p.drawn,before+1);
assert.deepEqual(p.active,["fan_pianzhuan_yin"]);
p.turnedOver=false;
result={bool:true}; await skills.fan_chuchen.content({}, {}, p);
assert.deepEqual(p.active,["fan_pianzhuan_yang"]); // extra phase still executes
console.log("Nilou: attached effects, conversion, first use per turn, multiple targets, nested uses, exclusions, distance, extra phase and cancellation passed (simulation).");

// If a turnOver-triggered effect removes the owner, do not enter the extra phase.
sequence=[];
p.turnOver=async()=>{sequence.push("turnOver");p.isIn=()=>false;};
await skills.fan_chuchen.content({}, {}, p);
assert.deepEqual(sequence,["log","turnOver"]);

assert.equal(main.group,"fan_pianzhuan_record");
assert.equal(yang.trigger.player,"useCard");
const cancelled={targets:[q],effectCount:1};p.history=[cancelled];
// Dispatch from the holder's real main group and currently acquired Yang effect.
assert(held.has("fan_pianzhuan"));
await main.subSkill.record.content({},cancelled,p);
assert(held.has("fan_pianzhuan_yang"));
assert(yang.filter(cancelled,p));await yang.content({},cancelled,p);
assert.equal(cancelled.effectCount,2);
cancelled.targets.length=0; // Tianhu useCardToTarget happens later
const next={targets:[q],effectCount:1};p.history.push(next);
await main.subSkill.record.content({},next,p);
assert(!yang.filter(next,p),"cancelled sole target must not refund the first card");
console.log("Nilou useCard timing: grouped snapshot, bonus before Tianhu and no first-use refund passed.");
