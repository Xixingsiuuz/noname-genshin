import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const read = path => readFileSync(new URL(path, import.meta.url), "utf8");
const status = {}, timeline = [];
const selected = () => Object.assign([], {
  add(value) { if (!this.includes(value)) this.push(value); },
  remove(value) { const at = this.indexOf(value); if (at >= 0) this.splice(at, 1); },
});
const ui = { selected: { cards: selected(), targets: selected(), buttons: selected() }, click: {} };
const player = {
  storage: {}, marks: 3, present: true, hp: 3,
  isIn() { return this.present; }, isOut() { return !this.present; },
  countMark: () => player.marks, getCards: () => [],
  removeMark(id, count) { assert.equal(count, 1); player.marks -= count; timeline.push("pay"); },
  addTempSkill(id, expire) { assert.equal(id, "fan_chihun_used"); assert.deepEqual(expire, { global: "roundStart" }); },
  logSkill() {}, getUseValue: card => card.name === "tao" ? 8 : 4,
};
const enemy = { isOut: () => false }, ally = { isOut: () => false };
const classes = () => {
  const data = new Set();
  return { add: name => data.add(name), remove: name => data.delete(name), contains: name => data.has(name) };
};
for (const target of [player, enemy, ally]) target.classList = classes();
const cards = {
  sha: { type: "basic", selectTarget: 1 },
  shan: { type: "basic", notarget: true },
  tao: { type: "basic", selectTarget: -1 },
  jiu: { type: "basic", selectTarget: -1 },
};
const lib = { skill: {}, filter: {
  selectTarget: card => cards[card.name].notarget ? [0, 0] : [cards[card.name].selectTarget, cards[card.name].selectTarget],
  cardAiIncluded: () => true, cardRespondable: () => true, buttonIncluded: () => true,
} };
const get = {
  type: name => cards[name]?.type,
  info: value => typeof value === "string" ? lib.skill[value] : cards[value?.name] || {},
  inpileVCardList(predicate) {
    return [["basic", "", "sha"], ...["fire", "thunder", "ice", "kami", "stab", "poison"].map(nature => ["basic", "", "sha", nature]),
      ...["shan", "tao", "jiu"].map(name => ["basic", "", name])].filter(predicate);
  },
  player: () => status.event.player,
  card: () => lib.skill[status.event?.skill]?.viewAs,
  select: value => typeof value === "function" ? value() : Array.isArray(value) ? value : [value, value],
  filter: value => typeof value === "function" ? value : () => !!value,
};
const game = { roundNumber: 5, players: [player, enemy, ally],
  trySkillAudio: id => timeline.push(id),
  checkMod: () => "unchanged", callHook() {},
};
const source = read("../character/skills/mavuika.js");
const skills = new Function("lib", "game", "get", "ui", "_status", source
  .replace(/^import .*;\r?\n/gm, "").replace("export default", "return"))(lib, game, get, ui, status);
const use = skills.fan_chihun.subSkill.use;
lib.skill.fan_chihun_use = use;
// Exercise real native backup/restore, selection checks and auto-confirm hook.
const eventSource = read("../../../noname/library/element/gameEvent.js");
const methods = {};
for (const [name, args] of [["backup", "skill"], ["restore", ""]]) {
  const match = eventSource.match(new RegExp("  " + name + "\\(" + args + "\\) \\{([\\s\\S]*?)\\n  \\}"));
  assert(match);
  methods[name] = new Function("lib", "get", "game", "_status", "return function(" + args + "){" + match[1] + "}")(lib, get, game, status);
}
const Check = new Function("lib", "get", "ui", "game", "_status", read("../../../noname/game/check.js")
  .replace(/^import .*;\r?\n/gm, "").replace(/export\s*\{[\s\S]*?\};?\s*$/, "") + "\nreturn Check;")(lib, get, ui, game, status);
game.Check = new Check();
const hookSource = read("../../../noname/library/hooks/index.js");
const hookText = hookSource.slice(hookSource.indexOf("function autoConfirm(event,"), hookSource.indexOf("function createChooseAll"))
  .trim().replace(/,$/, "");
const autoConfirm = new Function("get", "ui", "_status", "return (" + hookText + ");")(get, ui, status);
let submits = 0, paused = false, expectedPause = false;
ui.click.ok = () => {
  if (expectedPause) assert(paused, "automatic completion waits for native pause");
  submits++;
  const event = status.event;
  event.result = { bool: true, card: get.card(), targets: [...ui.selected.targets], cards: [] };
};
game.check = () => {
  const event = status.event;
  // 原生 check 每次会创建/刷新确认控件；无参数 click.ok 本身不会关闭它。
  ui.confirm = { closed: false, close() { this.closed = true; } };
  let ok = true, auto = true;
  for (const type of ["button", "card", "target"]) {
    if (!event["filter" + type[0].toUpperCase() + type.slice(1)]) continue;
    const result = game.Check[type](event, false);
    ok &&= result.ok;
    if (result.auto !== undefined) auto = result.auto;
  }
  if (ok && event.filterOk) ok = event.filterOk();
  const manual = event.name === "chooseToUse" && lib.skill[event.skill]?.manualConfirm;
  autoConfirm(event, { ok, auto, autoConfirm: event.configAuto && !manual });
  return ok;
};
const resetSelected = () => { for (const list of Object.values(ui.selected)) list.length = 0; };
function origin(name = "chooseToUse", required, fixedTarget) {
  resetSelected();
  return { ...methods, name, type: name === "chooseToUse" ? "phase" : undefined,
    player, isMine: () => true, configAuto: false,
    filterCard: card => !required || card.name === required,
    filterTarget: name === "chooseToUse" ? (card, source, target) => card.name === "sha" ? target !== source : target === (fixedTarget || source) : undefined,
    selectCard: [1, 1], position: "h",
    selectTarget: () => lib.filter.selectTarget(get.card()),
  };
}
// Clicking the skill can immediately enter its native name chooser with auto-confirm OFF.
status.event = origin();
status.event.backup("fan_chihun_use");
assert(game.check()); assert.equal(submits, 1, "no initial activation confirmation");
status.event.restore();
const parent = status.event;
let shown;
ui.create = { dialog(title, content) { shown = content[0]; return {}; } };
use.chooseButton.dialog(parent, player);
assert.deepEqual(shown.filter(link => link[2] === "sha").map(link => link[3]), [undefined, "fire", "thunder"]);
const buttons = shown.map(link => ({ link, classList: classes() }));
const picker = { name: "chooseButton", player, isMine: () => true, getParent: () => parent,
  selectButton: use.chooseButton.select, filterButton: use.chooseButton.filter, filterOk: use.chooseButton.filterOk,
  dialog: { buttons }, configAuto: true };
status.event = picker;
assert.equal(game.check(), false); assert.equal(picker.fanPairedConfirm, true);
ui.selected.buttons.push(buttons[0]);
assert(game.check()); assert.equal(submits, 1, "name selection needs manual confirmation even with auto-confirm ON");
ui.selected.buttons.length = 0; assert.equal(game.check(), false, "unselect disables confirmation again");
assert.deepEqual(timeline, [], "opening, selecting and cancelling never spend or speak");

async function backupFor(name, responding = false, fixedTarget) {
  const event = origin(responding ? "chooseToRespond" : "chooseToUse", responding ? name : undefined, fixedTarget);
  status.event = event;
  const backup = use.chooseButton.backup([["basic", "", name]], player);
  lib.skill.fan_chihun_use_backup = backup;
  event.backup("fan_chihun_use_backup");
  return { event, backup };
}
// Sha waits for target and manual confirmation, regardless of the global setting.
let { event, backup } = await backupFor("sha");
let before = submits;
event.configAuto = true;
assert.equal(game.check(), false); await Promise.resolve(); assert.equal(submits, before);
ui.selected.targets.push(enemy); assert(game.check()); await Promise.resolve(); assert.equal(submits, before);
ui.selected.targets.length = 0; assert.equal(game.check(), false);
status.event = {}; await Promise.resolve(); assert.deepEqual(timeline, []);

// Zero-material responses, own Peach/Wine and Peach saving a fixed ally finish once after pause.
for (const configAuto of [false, true]) for (const [name, responding, target] of [
  ["shan", true], ["sha", true], ["shan", false], ["tao", false], ["jiu", false], ["tao", false, ally],
]) {
  ({ event, backup } = await backupFor(name, responding, target));
  event.configAuto = configAuto; expectedPause = true; paused = false; before = submits;
  assert(game.check()); assert(game.check()); assert.equal(submits, before);
  paused = true; await Promise.resolve(); expectedPause = false;
  assert.equal(submits, before + 1, name + " no empty second confirmation");
  assert.equal(ui.confirm.closed, true, name + " leaves no empty confirmation control after native submission");
  if (name === "tao") assert.deepEqual(event.result.targets, [target || player]);
  assert.equal(event.result.card.name, name);
}

// State changes before scheduled completion prevent submission and do not consume anything.
for (const change of [() => player.marks = 0, () => player.storage.fan_chihun_round = game.roundNumber,
  () => player.present = false, () => status.event = {}]) {
  player.marks = 2; player.storage = {}; player.present = true;
  ({ event, backup } = await backupFor("tao")); before = submits;
  assert(game.check()); change(); await Promise.resolve(); assert.equal(submits, before);
}
player.marks = 2; player.storage = {}; player.present = true;
({ event, backup } = await backupFor("jiu"));
event._backup.filterCard = () => false;
before = submits; assert.equal(game.check(), false); await Promise.resolve(); assert.equal(submits, before);

// Commit only once per round, across turns and temporary skill disable/re-enable.
player.marks = 2; player.storage = {};
({ event, backup } = await backupFor("sha"));
await backup.precontent({ result: { bool: true } }, {}, player);
assert.equal(player.marks, 1); assert.deepEqual(timeline, ["pay", "fan_chihun_convert"]);
assert.equal(use.hiddenCard(player, "shan"), false);
const rejected = { result: { bool: true } };
await backup.precontent(rejected, {}, player); assert.equal(rejected.result.bool, false);
assert.equal(player.marks, 1); assert.equal(timeline.length, 2);
game.roundNumber++; assert.equal(use.hiddenCard(player, "shan"), true);
// Invalid special Sha cannot be injected through backup or at final payment.
status.event = origin();
const ice = use.chooseButton.backup([["basic", "", "sha", "ice"]], player);
const bad = { result: { bool: true } }; await ice.precontent(bad, {}, player);
assert.equal(bad.result.bool, false); assert.equal(player.marks, 1);
const translate = read("../character/translate.js");
assert(translate.includes('fan_chihun_info: "每当有【杀】进入弃牌堆，你获得1个“战意”标记（至多4个），若数量超过上限则改为摸1张牌。每轮限一次，你可以移除1个“战意”标记，视为使用一张基本牌。"'));
console.log("PASS: Mavuika native backup/restore, selection and confirm hook; direct name picker, cancel/manual confirmation, Sha target selection, automatic response/Peach/Wine with auto-confirm on/off, fixed rescue target, live validation, per-round usage and classic Sha natures (interaction simulation; no live UI test).");
