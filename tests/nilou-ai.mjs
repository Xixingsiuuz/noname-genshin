import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const get = { name:card=>card.name, type:card=>card.type, tag:(card,tag)=>!!card[tag],
  value:card=>card.cost ?? 1, position:card=>card.position || "h",
  attitude:(_player,target)=>target.enemy ? -5 : 5, effect:(_target,card)=>card.blocked ? 0 : 5 };
const enemies=[{enemy:true,hp:1,hujia:0}];
const game={hasPlayer:filter=>enemies.some(filter)};
const skills = new Function("game", "get", readFileSync(new URL("../character/skills/nilou.js", import.meta.url),"utf8")
  .replace(/^import .*;\r?\n/gm, "").replace("export default", "return"))(game, get);
const yang=skills.fan_pianzhuan.subSkill.yang;
const p={storage:{fan_pianzhuan:true}, history:[], hand:[], phase:true, missing:0,
  isPhaseUsing(){return this.phase;}, getDamagedHp(){return this.missing;},
  getHistory(type,filter){return this.history.filter(filter);},
  hasCard(filter){return this.hand.some(filter);},
  // Simulate native legal-target/value evaluation, including distance and remaining uses.
  getUseValue(card,distance,include){assert.equal(distance,undefined);assert.equal(include,true);
    return card.legal===false ? 0 : (card.value||0);}};
const sha={name:"sha",type:"basic",value:6,order:3};
const trick={name:"guohe",type:"trick",value:8,order:6};
const draw={name:"wuzhong",type:"trick",value:7,order:7};
const tao={name:"tao",type:"basic",value:5,order:4};
const equip={name:"zhuge",type:"equip",value:9,order:9};
const order=card=>yang.mod.aiOrder(p,card,card.order) ?? card.order;
// The modifier is attached only to the currently granted Yang effect, not the next-branch flag.
assert(!skills.fan_pianzhuan.subSkill.yin.mod.aiOrder);
p.hand=[equip,sha,trick];assert(order(sha)>order(equip));assert(order(trick)>order(equip));
assert.equal(order(equip),0.5);
p.missing=2;p.hand.push(tao);assert(order(tao)>order(sha));assert(order(tao)>order(trick));
p.missing=1;assert.equal(order(tao),tao.order);
p.hand=[equip,draw];assert(order(draw)>order(equip));
p.hand=[equip,{...sha,legal:false}];assert.equal(order(equip),equip.order);
assert.equal(order(p.hand[1]),sha.order); // no range / usage limit: do not reserve the opener
p.hand=[equip,{...trick,value:-5}];assert.equal(order(equip),equip.order);
p.hand=[equip,{...trick,norepeat:true}];assert.equal(order(equip),equip.order);
p.hand=[equip,{name:"lebu",type:"delay",value:8}];assert.equal(order(equip),equip.order);
p.hand=[equip,sha];p.history=[{targets:[p]}];assert.equal(order(equip),equip.order);assert.equal(order(sha),sha.order);
// An extra phase or reacquiring Yang does not reset the first targeted use in this turn.
p.storage.fan_pianzhuan=false;assert.equal(order(sha),sha.order);
p.history=[{targets:[]}];assert(order(sha)>order(equip)); // targetless use does not consume the bonus
p.phase=false;assert.equal(order(sha),sha.order);assert.equal(order(equip),equip.order);
p.phase=true;assert.equal(order({...sha,order:0}),0); // preserve disabled / nonpositive AI orders
console.log("Nilou AI: attack/trick/self-draw before equipment, double Peach, legal targets, exhausted Slash, first-use history and phase guards passed (simulation).");

// Exercise the actual discard-choice callback and decline the skill to isolate its decision.
let discardAI;
p.countDiscardableCards=()=>1;
p.chooseToDiscard=()=>({set(key,value){if(key==="ai")discardAI=value;return this;},forResult:async()=>({bool:false})});
p.hasSkill=id=>p.held.includes(id);
p.canUse=card=>card.legal!==false;
const cheap={name:"shan",type:"basic",cost:1};
const attack={...sha,damage:true,cost:7};
p.held=["fan_pianzhuan","fan_pianzhuan_yin"];p.storage.fan_pianzhuan=false;
p.hand=[cheap];await skills.fan_chuchen.content({}, {}, p);
assert(discardAI(cheap)<=0,"normal Yin defense: decline despite cheap discard");
p.held=["fan_pianzhuan","fan_pianzhuan_yang"];p.storage.fan_pianzhuan=true;
assert(discardAI(cheap)>0,"off rhythm: spend a cheap card to return to Yin");
assert(discardAI({...cheap,cost:7})<=0,"do not sacrifice valuable cards just to repair rhythm");
p.held=["fan_pianzhuan","fan_pianzhuan_yin"];p.storage.fan_pianzhuan=false;
p.hand=[cheap,attack];assert(discardAI(cheap)>0,"retain an attack to finish a vulnerable enemy");
assert(discardAI(attack)<=0,"do not discard the only finishing attack");
enemies[0].hp=3;assert(discardAI(cheap)<=0,"ordinary damage does not justify losing the next turn");
enemies[0].hp=1;enemies[0].hujia=1;assert(discardAI(cheap)<=0);
enemies[0].hujia=0;p.hand=[cheap,{...attack,legal:false}];assert(discardAI(cheap)<=0);
p.hand=[cheap,{...attack,blocked:true}];assert(discardAI(cheap)<=0);
p.hand=[cheap,attack];assert(discardAI({...cheap,position:"e"})<=0,"do not assume range survives discarding equipment");
console.log("Nilou Chuchen AI: default decline, rhythm repair, cost limit, conservative finishing chance and retaining attack passed (simulation).");
