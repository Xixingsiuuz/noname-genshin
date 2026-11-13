import { selectConversionMaterial } from "../ui/conversion-material.js";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("../character/skills/ineffa.js", import.meta.url), "utf8");
const ui = { selected: { cards: [], buttons: [] }, discardPile: { childNodes: [] },
  create: { dialog: (title, list) => ({ names: list[0], add(cards) { this.materials = cards; } }) } };
const get = { type: card => card.type, subtypes: card => [card.subtype],
  zhinangs: () => ["wuzhong", "guohe", "wuxie"], info: () => ({}) };
const game = { trySkillAudio() {}, checkMod: () => "unchanged", check: () => true };
const lib = { filter: { selectTarget: card => card.name === "wuzhong" ? [-1, -1] : [1, 1] } };
const status = {};
const skills = new Function("lib", "game", "get", "ui", "_status", "selectConversionMaterial", source.replace(/^import .*;\r?\n/gm, "").replace("export default", "return"))(lib, game, get, ui, status, selectConversionMaterial);
const material = { name: "equipment" };
let equipCount = 0, charge = 0, used = false;
const player = { countCards: () => equipCount, getCards: () => [material], logSkill() {},
  countCharge: max => max ? 4 - charge : charge,
  addCharge(n) { charge = Math.min(4, charge + n); },
  removeCharge(n) { charge -= n; }, hasSkill: () => used,
  addTempSkill(skill, expiry) { assert.equal(skill, "fan_miyuan_used"); assert.deepEqual(expiry, { global: "phaseAfter" }); used = true; },
  chooseButtonTarget() { return { set() { return this; }, forResult: async () => ({ bool: true, targets: [target], links: ["equip"] }) }; } };
const miyuan = skills.fan_miyuan;
assert.equal(miyuan.chargeSkill, 4);
miyuan.init(player);
assert.equal(charge, 1);
assert.equal(miyuan.mod.maxHandcard(player, 4), 4);
equipCount = 3;
assert.equal(miyuan.mod.maxHandcard(player, 4), 7);
const context = { filterCard: card => card.name !== "wuxie" };
assert.equal(miyuan.filter(context, player), true);
assert.deepEqual(miyuan.chooseButton.dialog(context, player).names, ["wuzhong", "guohe"]);
const nameButton = { link: ["trick", "", "wuzhong"] };
status.event = { player, getParent: () => context };
assert.equal(miyuan.chooseButton.filter(nameButton, player), true);
assert.equal(status.event.position, "e");
ui.selected.buttons = [nameButton];
assert.equal(miyuan.chooseButton.filterOk(), false);
ui.selected.cards = [material];
assert.equal(miyuan.chooseButton.filterOk(), true);
ui.selected.buttons = [];
assert.equal(miyuan.chooseButton.filterOk(), false);
ui.selected.buttons = [nameButton];
assert.equal(miyuan.chooseButton.filterOk(), true);
status.event = context;
const backup = miyuan.chooseButton.backup([nameButton.link], player);
assert.equal(backup.fan_cyno_fixed_target, true);
assert.equal(backup.filterOk(), true);
ui.selected.cards = [];
assert.equal(backup.filterOk(), false);
ui.selected.cards = [material];
delete status.event;
assert.equal(charge, 1); // 所有选择均不扣蓄力，使用才消耗。
backup.onuse({ card: { name: "wuzhong" } }, player);
assert.equal(charge, 0);
assert.equal(miyuan.filter(context, player), false);
assert.equal(backup.filterOk(), false);
const recharge = miyuan.subSkill.charge;
assert.deepEqual(recharge.trigger, { player: "phaseZhunbeiBegin" });
await recharge.content({}, {}, player);
assert.equal(charge, 1);
charge = 4;
assert.equal(recharge.filter({}, player), false);
used = false; // 模拟回合结束移除临时技能。
assert.equal(miyuan.filter(context, player), true);
charge = 0;
assert.equal(miyuan.filter(context, player), false);

const effects = [], occupied = new Set();
const equipment = (name, slot) => ({ name, type: "equip", subtype: `equip${slot}` });
const weapon = equipment("weapon", 1), armor = equipment("armor", 2), blocked = equipment("blocked", 3), treasure = equipment("treasure", 5);
ui.discardPile.childNodes = [weapon, armor, blocked, treasure];
// 固定随机结果，验证直接使用弃牌堆装备，不经过获得手牌事件。
Array.prototype.randomGet = function () { return this[0]; };
const target = {
  isIn: () => true, hasEmptySlot: slot => !occupied.has(slot),
  canEquip: card => card !== blocked && !occupied.has(Number(card.subtype.slice(5))),
  canUse: () => true,
  async changeHujia(n, type, limit) {
    assert.equal(type, "gain");
    assert.equal(limit, 5);
    effects.push(`armor+${n}`);
  },
  async gain() { assert.fail("稳态应直接使用装备，不应触发获得手牌"); },
  async chooseUseTarget({ card, forced, nopopup }) {
    assert.equal(forced, true);
    assert.equal(nopopup, true);
    assert.ok(ui.discardPile.childNodes.includes(card));
    effects.push(`use:${card.name}`);
    ui.discardPile.childNodes = ui.discardPile.childNodes.filter(c => c !== card);
    occupied.add(Number(card.subtype.slice(5)));
  },
};
player.isIn = () => true;
player.changeHujia = async () => effects.push("selfArmor");
await skills.fan_wentai.content({}, {}, player);
assert.deepEqual(effects, ["use:weapon", "use:armor", "selfArmor"]);
assert.deepEqual(ui.discardPile.childNodes, [blocked, treasure]); // 即使有第三张可用装备，也只使用两张。
ui.discardPile.childNodes = [blocked];
effects.length = 0;
await skills.fan_wentai.content({}, {}, player);
assert.deepEqual(effects, ["selfArmor"]);
player.chooseButtonTarget = () => ({ set() { return this; }, forResult: async () => ({ bool: false }) });
effects.length = 0;
await skills.fan_wentai.content({}, {}, player);
assert.deepEqual(effects, []);
delete Array.prototype.randomGet;
console.log("伊涅芙：蓄力、回合次数、转化交互、装备手牌上限及稳态两张装备结算检查通过");
