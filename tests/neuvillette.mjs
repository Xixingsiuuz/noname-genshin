import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const source = readFileSync(new URL("../character/skills/neuvillette.js", import.meta.url), "utf8");
const others = [{ id: 1 }, { id: 2 }];
const played = [];
const game = { trySkillAudio: (...args) => played.push(args), hasPlayer: f => others.some(f), filterPlayer: f => others.filter(f) };
const get = { attitude: () => 1, value: () => 3 };
const ui = { selected: { buttons: [], targets: [] } };
const skills = new Function("game", "get", "ui", source.replace(/^import .*;\r?\n/, "").replace("export default", "return"))(game, get, ui);
const state = { marks: 0, history: [], stat: { fan_shenpan: 1 } };
const player = {
  countMark: () => state.marks,
  addMark: (_, n) => state.marks += n,
  removeMark: (_, n) => state.marks -= n,
  getHistory: () => state.history,
  getStat: () => state.stat,
  isIn: () => true,
  line() {}, logSkill() {},
};
const choice = result => ({ set() { return this; }, forResult: async () => result });
const gain = skills.fan_yilong.subSkill.gain;
const damage = skills.fan_yilong.subSkill.damage;
const evt = { getg: p => p === others[0] ? [{}, {}, {}] : [{}], getParent: () => undefined, num: 3, source: others[0] };
assert.ok(gain.filter(evt, player));
await gain.content({}, evt, player);
assert.equal(state.marks, 4);
await damage.content({}, evt, player);
assert.equal(state.marks, 7);
await gain.content({}, evt, player);
assert.equal(state.marks, 9);
assert.equal(damage.filter(evt, player), false);
state.marks = 0;
const ownDraw = { ...evt, getParent: () => ({ player: others[0] }), getg: p => p === others[0] ? [{}] : [] };
assert.equal(gain.filter(ownDraw, player), false);
assert.equal(damage.filter(ownDraw, player), false);
assert.equal(damage.filter({ ...evt, source: player }, player), false);
assert.equal(damage.filter({ ...evt, source: undefined }, player), false);
assert.equal(damage.filter({ ...evt, num: 0 }, player), false);
for (const discarded of [true, false]) {
  for (const num of [1, 2, 3]) {
    state.marks = 9;
    const calls = [];
    const target = {
      isIn: () => true,
      chooseToDiscard(prompt, n, zone) {
        assert.equal(n, num); assert.equal(zone, "he");
        calls.push("choice"); return choice({ bool: discarded });
      },
      async damage(n, source) { assert.equal(n, 1); assert.equal(source, "nosource"); calls.push("damage"); },
    };
    player.chooseButtonTarget = opts => {
      assert.deepEqual(opts.selectButton, [0, 1]); assert.equal(opts.selectTarget, 1);
      // 两种顺序都允许进行，只有两项齐全才可以确认。
      for (const sequence of [["targets", "buttons"], ["buttons", "targets"]]) {
        ui.selected.buttons = []; ui.selected.targets = [];
        assert.equal(opts.filterOk(), false);
        assert.equal(opts.filterTarget(null, player, target), true);
        ui.selected[sequence[0]] = [{}];
        assert.equal(opts.filterOk(), false);
        ui.selected[sequence[1]] = [{}];
        assert.equal(opts.filterOk(), true);
      }
      assert.equal(opts.filterTarget(null, player, player), false);
      return choice({ bool: true, links: [num], targets: [target] });
    };
    await skills.fan_shenpan.content({}, null, player);
    assert.equal(state.marks, 9 - num);
    assert.deepEqual(calls, discarded ? ["choice"] : ["choice", "damage"]);
  }
}
state.history = [{ skill: "fan_shenpan", removed: 3 }, { skill: "fan_shenpan", removed: 2 }];
assert.equal(skills.fan_leiyu.filter({}, player), false);
state.history.push({ skill: "fan_shenpan", removed: 1 });
assert.equal(skills.fan_leiyu.filter({}, player), true);
const rewards = [];
const recipient = { async gainMaxHp(n) { rewards.push(["max", n]); }, async recover(n) { rewards.push(["recover", n]); }, isIn: () => true };
player.chooseTarget = () => choice({ bool: true, targets: [recipient] });
await skills.fan_leiyu.content({}, null, player);
assert.deepEqual(rewards, [["max", 1], ["recover", 1]]);
player.chooseTarget = () => choice({ bool: false });
await skills.fan_leiyu.content({}, null, player);
assert.equal(rewards.length, 2);
state.history = [];
assert.equal(skills.fan_leiyu.filter({}, player), false);
state.marks = 3;
player.chooseButtonTarget = () => choice({ bool: false });
await skills.fan_shenpan.content({}, null, player);
assert.equal(state.stat.fan_shenpan, 0);
assert.equal(state.marks, 3);
assert.equal(state.history.length, 0);
console.log("PASS: 遗龙按牌数/伤害计数与上限、阶段判断、审判弃牌/无来源伤害、取消退次、泪雨门槛与奖励");
