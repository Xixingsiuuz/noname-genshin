import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("../character/skills/mizuki.js", import.meta.url), "utf8");
const ui = { selected: { cards: [], targets: [] } };
const lib = { skill: {} };
const game = {
  phaseNumber: 0,
  trySkillAudio() {},
  hasPlayer: filter => [target].some(filter),
  checkMod: card => card.disabled ? false : "unchanged",
  broadcastAll: (fn, card) => fn(card),
};
const get = { type2: card => card.type === "delay" ? "trick" : card.type, translation: card => card.name };
const skills = new Function("lib", "game", "get", "ui", source.replace(/^import .*;\r?\n/, "").replace("export default", "return"))(lib, game, get, ui);
lib.skill.fan_chanyi_backup = skills.fan_chanyi.subSkill.backup;
function holder() {
  return {
    storage: {}, marks: 0, damaged: true, alive: true,
    hasMark() { return this.marks > 0; },
    addMark(_, n) { this.marks += n; },
    addSkill() {},
    removeSkill() { this.marks = 0; },
    isIn() { return this.alive; },
    isDamaged() { return this.damaged; },
    async recover() { this.healed = (this.healed || 0) + 1; },
    async loseHp() { this.paid = (this.paid || 0) + 1; },
    countCards: () => 1,
    getHistory(_, filter) { return this.history.filter(filter); },
  };
}
const player = holder(), target = holder();
await skills.fan_anshen.subSkill.start.content({}, {}, player);
await skills.fan_anshen.subSkill.start.content({}, {}, player);
assert.equal(player.marks, 1);
target.damaged = false;
assert.equal(skills.fan_anshen.filter({}, player), true);
assert.equal(skills.fan_anshen.filterTarget({}, player, target), true);
assert.equal(skills.fan_anshen.filterTarget({}, player, player), false);
assert.equal(skills.fan_anshen.ai.result.target(player, target), 1.5);
assert.ok(skills.fan_anshen.ai.result.player({hp:1}) < -5);
assert.ok(skills.fan_anshen.ai.result.player({hp:3}) > skills.fan_anshen.ai.result.player({hp:2}));
await skills.fan_anshen.content({ target }, {}, player);
assert.equal(player.paid, 1);
assert.equal(target.marks, 1);
assert.equal(skills.fan_anshen.filterTarget({}, player, target), false);
target.damaged = true;
const buff = skills.fan_anshen_tang;
assert.equal(buff.mod.maxHandcard(target, 4), 5);
const draw = { name: "phaseDraw", num: 2 };
await buff.content({}, draw, target);
assert.equal(draw.num, 3);
assert.equal(buff.filter({ ...draw, numFixed: true }, target), false);
assert.equal(buff.filter({ name: "damage", num: 1 }, player), false);
assert.equal(buff.filter({ name: "damage", num: 1 }, target), true);
await buff.content({}, { name: "phaseJieshu" }, target);
assert.equal(target.healed, 1);
await buff.content({}, { name: "damage" }, target);
assert.equal(target.marks, 0);
assert.equal(buff.mod.maxHandcard(target, 4), undefined);
target.marks = 1;
target.history = [
  { card: { name: "sha", nature: "fire", type: "basic" } },
  { card: { name: "bagua", type: "equip" } },
];
let next;
player.chooseToUse = () => next = {
  set(key, value) { this[key] = value; return this; },
  backup(key) { assert.equal(key, "fan_chanyi_backup"); return this; },
};
assert.equal(skills.fan_chanyi.filter({ player: target }, player), true);
await skills.fan_chanyi.content({}, { player: target }, player);
assert.equal(lib.skill.fan_chanyi_backup.viewAs.name, "sha");
assert.equal(lib.skill.fan_chanyi_backup.viewAs.nature, "fire");
assert.equal(skills.fan_chanyi.mod.targetInRange(lib.skill.fan_chanyi_backup.viewAs), true);
assert.equal(skills.fan_chanyi.mod.targetInRange({ name: "sha" }), undefined);
const backup = lib.skill.fan_chanyi_backup;
assert.equal(backup.filterCard({ disabled: true }, player), false);
for (const order of [["cards", "targets"], ["targets", "cards"]]) {
  ui.selected.cards = []; ui.selected.targets = [];
  assert.equal(backup.filterOk(), false);
  for (const key of order) ui.selected[key] = [{}];
  assert.equal(backup.filterOk(), true);
  ui.selected.cards = [];
  assert.equal(backup.filterOk(), false);
}
target.history = [{ card: { name: "bagua", type: "equip" } }];
assert.equal(skills.fan_chanyi.filter({ player: target }, player), false);
assert.equal(skills.fan_chanyi.filter({ player }, player), false);
console.log("mizuki: passed");
