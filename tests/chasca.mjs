import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const get = {
  prompt: () => "发动？", tag: () => 1, value: card => card.value,
  effect: (target, card) => card.name === "draw" ? target.drawValue : target.cardValue,
  damageEffect: target => target.damageValue,
};
const source = readFileSync(new URL("../character/skills/chasca.js", import.meta.url), "utf8");
const skills = new Function("get", source.replace(/^import .*;\r?\n/gm, "").replace("export default", "return"))(get);
for (const [id, skill] of Object.entries({ ...skills })) {
  for (const [suffix, sub] of Object.entries(skill.subSkill || {})) skills[`${id}_${suffix}`] = sub;
}
const log = [];
function actor(damageValue = -8, drawValue = 3) {
  return { hp: 4, hujia: 0, damageValue, drawValue, cardValue: -8, isIn: () => true,
    async draw(n) { log.push(["draw", this, n]); },
    async damage(n, owner) { log.push(["damage", this, n, owner]); },
  };
}
const player = Object.assign(actor(), {
  owned: new Set(["fan_tiaoting", "fan_xixin"]), disabled: new Set(),
  hasSkill(id) { return this.owned.has(id) && !this.disabled.has(id); },
  countDiscardableCards() { return 2; },
  addSkill(id) { if (!this.owned.has(id)) { this.owned.add(id); skills[id]?.init?.(this); } },
  removeSkill(id) { if (this.owned.delete(id)) skills[id]?.onremove?.(this); },
  addTempSkill(id, expiry) { assert.deepEqual(expiry, { global: "phaseAfter" }); this.addSkill(id); },
  disableSkill(reason, id) { assert.equal(reason, "fan_tiaoting_blocked"); assert.equal(id, "fan_tiaoting"); this.disabled.add(id); },
  enableSkill(reason) { assert.equal(reason, "fan_tiaoting_blocked"); this.disabled.delete("fan_tiaoting"); },
  logSkill() {},
});
let confirm = true, ai;
function choice() {
  return { set(key, value) { if (key === "ai") ai = value; return this; },
    async forResult() { return { bool: confirm }; } };
}
player.chooseBool = choice;
player.chooseToDiscard = choice;
const enemy = actor(8, -3), friend = actor();
function damage(target, num = 1) { return { player: target, num, cancel() { this.cancelled = true; } }; }
async function dispatchDamageEnd(num) {
  // Only dispatch to currently held skills, including the independently installed recovery marker.
  for (const id of [...player.owned]) {
    const skill = skills[id];
    if (skill?.trigger?.player === "damageEnd" && skill.filter({ num }, player)) {
      await skill.content({}, { num }, player);
    }
  }
}
assert.equal(skills.fan_xixin.filter(damage(player), player), false);
assert.equal(skills.fan_xixin.filter(damage(friend, 0), player), false);
confirm = false;
await skills.fan_xixin.content({}, damage(friend), player);
assert(!player.owned.has("fan_tiaoting_blocked"));
assert(ai() > 0, "protecting and drawing for a friend has positive value");
await skills.fan_xixin.content({}, damage(enemy), player);
assert(ai() < 1, "do not save an enemy and give them cards");
confirm = true;
const hit = damage(friend, 3);
await skills.fan_xixin.content({}, hit, player);
assert(hit.cancelled);
assert.equal(log.at(-1)[2], 2);
assert(!player.hasSkill("fan_tiaoting"));
assert(player.hasSkill("fan_xixin"));
assert(skills.fan_xixin.filter(damage(friend), player), "Xixin remains repeatable");
await dispatchDamageEnd(0);
assert(player.owned.has("fan_tiaoting_blocked"));
await dispatchDamageEnd(1);
assert(player.hasSkill("fan_tiaoting"));
const use = { targets: [friend] };
const trigger = { player: enemy, target: friend, card: {}, getParent: () => use };
assert(skills.fan_tiaoting.filter(trigger, player));
player.addSkill("fan_tiaoting_blocked");
assert(!skills.fan_tiaoting.filter(trigger, player));
await dispatchDamageEnd(1);
// First damage starts Xixin; disabling Tiaoting must not abort its second damage.
enemy.damage = async () => { log.push(["first"]); await skills.fan_xixin.content({}, damage(friend), player); };
log.length = 0;
await skills.fan_tiaoting.content({}, trigger, player);
assert(use.all_excluded);
assert.equal(log[0][0], "first");
assert.equal(log.at(-1)[1], friend);
assert(player.owned.has("fan_tiaoting_blocked"));
await dispatchDamageEnd(1);
assert(!skills.fan_tiaoting.filter(trigger, player));
use.all_excluded = false;
confirm = false;
await skills.fan_tiaoting.content({}, trigger, player);
assert(ai({ value: 100 }) < 0, "expensive discards are rejected");
player.hp = 1;
trigger.player = player;
await skills.fan_tiaoting.content({}, trigger, player);
assert.equal(ai({ value: 0 }), -Infinity, "avoid lethal self damage");
assert(!source.includes("fan_xixin_blocked"));

player.addSkill("fan_tiaoting_blocked");
assert(skills.fan_tiaoting_blocked.filter({name:"phase"}, player, "roundEnd"));
await skills.fan_tiaoting_blocked.content({}, {name:"round"}, player);
assert(player.hasSkill("fan_tiaoting"));
console.log("Chasca revised rules simulation passed");
