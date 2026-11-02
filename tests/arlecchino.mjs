import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

const source = readFileSync(new URL("../character/skills/arlecchino.js", import.meta.url), "utf8")
  .replace(/^import .*;\r?\n/, "").replace("export default", "globalThis.skills =");
const context = { _status: {}, game: { trySkillAudio() {}, setNature: (event, nature) => { event.nature = nature; } }, get: {} };
vm.runInNewContext(source, context);
const { fan_chiyi: red, fan_luhuo: hearth, fan_ruyue: rise } = context.skills;
for (const nature of [undefined, "thunder", "fire"]) {
  const damage = { num: 2, nature, hasNature(value) { return value ? this.nature === value : !!this.nature; } };
  assert.equal(red.subSkill.damage.filter(damage, {hp: 3}), true); assert.equal(red.subSkill.damage.filter(damage, {hp: 4}), false); await red.subSkill.damage.content({}, damage, {hp: 3});
  assert.equal(damage.nature, "fire");
  assert.equal(damage.num, nature === "fire" ? 3 : 2);
}
let armor = 4;
const incoming = { num: 3, cancel() { this.cancelled = true; } };
await red.content({}, incoming, { hujia: 4, changeHujia: async (num, type, limit) => { assert.equal(type, "gain"); assert.equal(limit, 5); armor = Math.min(limit, armor + num); } });
assert.equal(incoming.cancelled, true);
assert.equal(armor, 5, "护甲上限为五点");

const choice = control => ({ set() { return this; }, async forResult() { return { control }; } });
const makeTarget = control => ({
  linked: false, links: 0, isIn: () => true,
  chooseControl: () => choice(control),
  isLinked() { return this.linked; },
  async link(value) { this.linked = value; this.links++; },
});
const first = makeTarget("不限距离次数"), second = makeTarget("摸牌并连环");
const targets = [first, second];
// 引擎提供的按座次排序辅助方法。
vm.runInNewContext("Array.prototype.sortBySeat = function () { return this; };", context);
const event = vm.runInNewContext("({targets: []})", context);
event.targets.push(...targets);
const player = {
  storage: {}, drawn: 0, marked: [], isIn: () => true,
  async draw(num) { this.drawn += num; },
  addTempSkill() {}, markAuto(skill, values) { this.marked.push(...values); },
};
await hearth.content(event, {}, player);
assert.equal(player.drawn, 2);
assert.equal(first.linked, true, "选第一项的人也须连环");
assert.equal(second.linked, true);
assert.deepEqual(player.marked, [first]);
player.drawn = 0;
first.chooseControl = second.chooseControl = () => choice("摸牌并连环");
await hearth.content(event, {}, player);
assert.equal(player.drawn, 4, "两人选第二项分别摸两张");
assert.equal(first.links, 1, "已连环者不解除连环");
player.storage.fan_ruyue = "recover";
first.chooseControl = second.chooseControl = () => { throw Error("唯一选项不应弹确认"); };
await hearth.content(event, {}, player);
assert.equal(player.drawn, 8);
player.storage.fan_ruyue = "convert";
await hearth.content(event, {}, player);
assert.equal(player.drawn, 8, "删除第二项后不再摸牌");

const mod = rise.subSkill.convert.mod;
for (const name of ["shan", "tao", "jiu"]) {
  assert.equal(mod.cardname({ name }), "sha");
  assert.equal(mod.cardnature({ name }), "fire");
}
assert.equal(mod.cardname({ name: "sha" }), undefined);
context.ui = {
  updates: [],
  control: { children: [], getBoundingClientRect: () => ({top: 750}) },
  arena: {offsetHeight: 600, getBoundingClientRect: () => ({top: 30, height: 900})},
};
context.ResizeObserver = class { observe() {} disconnect() {} };
context.getComputedStyle = () => ({ bottom: "150px" });
for (const [control, state] of [["于此升起", "recover"], ["于此坠落", "convert"], ["cancel2", undefined]]) {
  const chooser = choice(control);
  let dialogConfig;
  chooser.set = function (key, value) {
    if (key === "dialog") dialogConfig = value;
    return this;
  };
  const subject = {
    storage: {}, maxHp: 4, hp: 1, chooseControl: () => chooser,
    logSkill() {}, awakenSkill() {}, syncStorage() {}, isDamaged: () => true,
    async recover(num) { this.hp += num; }, addSkill(skill) { this.added = skill; },
  };
  await rise.content({}, {}, subject);
  const styles = {};
  const classes = new Set();
  const dialog = {
    isConnected: true, content: {scrollHeight: 100, style: {setProperty() {}}},
    contentContainer: {style: {setProperty() {}}}, close() {}, open() {},
    style: { setProperty(key, value) { styles[key] = value; } },
    classList: { add: value => classes.add(value) }, addText() {},
  };
  dialog.content.querySelectorAll = () => [];
  dialog.content.getBoundingClientRect = () => ({
    top: 30 + (parseFloat(styles.top) || 0) * 1.5,
    bottom: 30 + ((parseFloat(styles.top) || 0) + dialog.content.scrollHeight) * 1.5,
  });
  dialogConfig[1][0](dialog);
  context.ui.updates.forEach(update => update());
  assert.equal(styles.bottom, "auto");
  assert.equal(styles.top, "202px", "150%缩放下提示以牌桌中央为锚点");
  dialog.content.scrollHeight = 150;
  context.ui.updates.forEach(update => update());
  assert.equal(styles.top, "177px", "换行增加高度时保持中央定位");
  dialog.close();
  assert.equal(context.ui.updates.length, 0, "关闭后清理布局回调");
  assert.equal(styles.left, "max(20px, calc(50% - 280px))");
  assert.equal(styles.transform, "none", "提示框不参与原生入场缩放");
  assert.equal(classes.has("fixed"), true, "不受原生记忆拖动位置影响");
  assert.equal(subject.storage.fan_ruyue, state);
  assert.equal(subject.hp, state === "recover" ? 4 : 1);
  assert.equal(subject.added, state === "convert" ? "fan_ruyue_convert" : undefined);
}
for (const hp of [1, 2, 3, 4]) {
  assert.equal(red.mod.maxHandcard({ hp }, hp), hp <= 2 ? hp + 4 : undefined);
  assert.equal(red.subSkill.link.filter({ target: first }, { hp }), false, "已连环目标不重复执行");
  assert.equal(red.subSkill.link.filter({ target: makeTarget("") }, { hp }), hp <= 1);
}
assert.equal(red.filter({ num: 2, hasNature: nature => nature === "fire" }), true);
assert.equal(red.filter({ num: 2, hasNature: nature => nature === "thunder" }), false);
const voices = [];
context.game.trySkillAudio = name => voices.push(name);
for (const hp of [1, 3, 4]) {
  const subject = {
    hp, maxHp: 4, storage: {}, hujia: 2,
    chooseControl: () => choice("于此坠落"), logSkill() {}, awakenSkill() {}, syncStorage() {},
    async loseHp(num) { this.hp -= num; }, addSkill(name) { this.added = name; },
  };
  await rise.content({}, {}, subject);
  assert.equal(subject.hp, 1);
  assert.equal(rise.filter({}, subject), false, "限定技发动后不能再次触发");
  assert.equal(voices.at(-1), "fan_ruyue_fall");
}
for (const [state, voice] of [[undefined, "fan_luhuo_start"], ["recover", "fan_luhuo_draw"], ["convert", "fan_luhuo_attack"]]) {
  player.storage.fan_ruyue = state;
  first.chooseControl = second.chooseControl = () => choice("摸牌并连环");
  await hearth.content(event, {}, player);
  assert.equal(voices.at(-1), voice);
}
context.get.nature = card => card.nature;
const convertVoice = context.skills.fan_ruyue_convert_voice;
assert.equal(convertVoice.filter({ card: { name: "sha", nature: "fire" }, cards: [{ name: "shan" }] }), true);
assert.equal(convertVoice.filter({ card: { name: "sha", nature: "fire" }, cards: [{ name: "sha" }] }), false);
assert.equal(convertVoice.filter({ card: { name: "sha", nature: "fire" }, cards: [{ name: "shan" }, { name: "tao" }] }), false);
// 从持有主技能展开分组，保证阈值效果与语音监听器确实挂载。
assert.equal(Array.from(red.group).includes("fan_chiyi_link"), true);
assert.equal(rise.subSkill.convert.group, "fan_ruyue_convert_voice");
context.get.attitude = () => -1;
context.get.tag = () => 1;
const evaluation = { storage: {fan_ruyue: "convert"}, countCards: () => 0, canUse: () => false };
assert.equal(hearth.ai.result.player(evaluation), 0);
assert.equal(hearth.ai.result.target(evaluation, first), 0);
evaluation.countCards = () => 3;
assert.equal(hearth.ai.result.target(evaluation, first), -2);
console.log("阿蕾奇诺：阈值、护甲、连环、如月、分支语音、转换牌识别、布局及AI模拟检查通过");

