import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("../character/skills/kokomi.js", import.meta.url), "utf8");
const reward = { name: "wuzhong" };
const cards = [{ name: "nanman" }, reward];
cards.__proto__.randomGet = function () { return this[0]; };
const played = [];
const game = { trySkillAudio: id => played.push(id) };
const get = { zhinangs: () => ["wuzhong"] };
const ui = { cardPile: { childNodes: cards } };
const skills = new Function("game", "get", "ui",
  source.replace(/^import .*;\r?\n/gm, "").replace("export default", "return"))(game, get, ui);
const target = { hp: 2, maxHp: 3, isIn: () => true };
const traces = [];
const player = {
  storage: { fan_miaosuan: { target } },
  isIn: () => true,
  getCards: () => [reward],
  draw: async () => traces.push("draw"),
  gain: async card => traces.push(card),
  give: async (card, recipient) => traces.push([card, recipient]),
  chooseTarget: () => ({ set() { return this; }, forResult: async () => ({ bool: true, targets: [target] }) }),
};
const { record, end, cleanup } = skills.fan_miaosuan.subSkill;
const turn = { name: "phase" };
const recover = { num: 1, player: target, getParent: () => turn };
assert.ok(!end.filter(turn, player));
assert.ok(record.filter(recover, player));
await record.content({}, recover, player);
assert.ok(end.filter(turn, player));
await end.content({}, turn, player);
assert.deepEqual(traces, ["draw"]);
assert.ok(!end.filter({ name: "phase" }, player));
target.hp = 3;
await end.content({}, { name: "phase" }, player);
assert.deepEqual(traces, ["draw", "draw"]);
await end.content({}, turn, player);
assert.deepEqual(traces, ["draw", "draw", "draw", reward, [reward, target]]);
assert.equal(played.filter(id => id === "fan_miaosuan_gain_voice").length, 1);
assert.equal(played.filter(id => id === "fan_miaosuan_draw_voice").length, 3);
await cleanup.content({}, {}, player);
assert.ok(!end.filter(turn, player));
let cancelled = false;
target.recover = async n => traces.push(n);
await skills.fan_haiji.content({}, { num: 4, cancel() { cancelled = true; } }, player);
assert.ok(cancelled);
assert.equal(traces.at(-1), 1);
console.log("PASS Kokomi skill simulation");
