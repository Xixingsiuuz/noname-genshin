// 隔离测试技能结算分支；不替代实际游戏中的界面、AI及联机测试。
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("../character/skills/lyney.js", import.meta.url), "utf8");
const lib = { inpile: ["sha", "wuzhong", "lebu"], filter: {
  cardEnabled: () => true,
  selectTarget: card => card.name === "wuzhong" ? [-1, -1] : card.name === "wuxie" ? [0, 0] : [1, 1],
  filterTarget: (card, player, target) => card.name === "wuzhong" ? player === target : player !== target,
} };
const status = {};
const get = {
  type: name => name === "sha" ? "basic" : name === "lebu" ? "delay" : "trick",
  name: card => card.name,
  suit: card => card.suit,
  info: () => ({}),
  translation: item => typeof item === "object" ? item.name || "角色" : item,
  inpileVCardList: filter => [["basic", "", "sha"], ["basic", "", "sha", "fire"],
    ["trick", "", "wuzhong"], ["delay", "", "lebu"]].filter(filter),
};
const voiceCalls = [];
const game = { hasPlayer: () => true, log() {}, trySkillAudio: (...args) => voiceCalls.push(args) };
const skills = new Function("lib", "game", "get", "ui", "_status",
  source.replace(/^import .*;\r?\n/, "").replace("export default", "return"))(lib, game, get, {}, status);
lib.skill = skills;

for (const name of ["chooseToUse", "chooseToRespond"]) {
  for (const hasCard of [false, true]) {
    for (const answer of ["有", "没有"]) {
      const added = [];
      const target = { chooseControl() {
        return { set() { return this; }, async forResult() { return { control: answer }; } };
      } };
      const player = {
        countCards: () => Number(hasCard),
        addTempSkill: (skill, expiry) => { assert.equal(expiry.global, "phaseAfter"); added.push(skill); },
        logSkill() {},
      };
      const parent = { name, filterCard: () => true,
        restore() { this.restored = true; }, backup(skill) { this.backed = skill; } };
      const result = { bool: true, targets: [target], skill: "fan_huanxi_backup" };
      await skills.fan_huanxi.chooseButton.backup([["basic", "", "sha", "fire"]])
        .precontent({ result, getParent: () => parent }, null, player);
      const correct = hasCard === (answer === "有");
      assert.equal(voiceCalls.at(-1)[0], correct ? "fan_huanxi_right" : "fan_huanxi_wrong");
      assert.equal(voiceCalls.at(-1)[1], player);
      assert.ok(parent.restored);
      assert.ok(added.includes("fan_huanxi_used"));
      assert.equal(added.includes("fan_huanxi_blocked"), correct);
      const auto = !correct && name === "chooseToRespond";
      assert.equal(parent.backed, correct || auto ? undefined : "fan_huanxi_use");
      assert.equal(result.cancel, !auto);
      assert.equal(result.skill, undefined);
      assert.deepEqual(result.targets, []);
      if (!correct && !auto) {
        assert.equal(skills.fan_huanxi_use.viewAs.name, "sha");
        assert.equal(skills.fan_huanxi_use.viewAs.nature, "fire");
      }
    }
  }
}
// 无中生有自动以自己为目标、无懈可击无目标；杀仍需进入选目标流程。
for (const cardName of ["wuzhong", "wuxie", "sha"]) {
  const player = { countCards: () => 0, addTempSkill() {}, logSkill() {} };
  const target = { chooseControl() {
    return { set() { return this; }, async forResult() { return { control: "有" }; } };
  } };
  game.filterPlayer = filter => [player, target].filter(filter);
  const parent = { name: "chooseToUse", filterCard: () => true,
    restore() {}, backup(skill) { this.backed = skill; } };
  const result = { bool: true, targets: [target], skill: "fan_huanxi_backup" };
  await skills.fan_huanxi.chooseButton.backup([["trick", "", cardName]])
    .precontent({ result, getParent: () => parent }, null, player);
  assert.equal(result.cancel, cardName === "sha");
  assert.equal(parent.backed, cardName === "sha" ? "fan_huanxi_use" : undefined);
  assert.deepEqual(result.targets, cardName === "wuzhong" ? [player] : []);
  assert.equal(result.card.storage.fan_huanxi, true);
}
// 从本地 v1.11.6 源码取出 _wuxie 最后两步，覆盖真实的延后 precontent 路径。
const standard = readFileSync(new URL('../../../card/standard.js', import.meta.url), 'utf8').replaceAll('\r\n', '\n');
const preIndex = standard.indexOf('if (event.wuxieresult && event.wuxieresult2 && event.wuxieresult2.skill)');
assert(preIndex > 0);
const stepStart = standard.lastIndexOf('async (event, trigger, player, result) => {', preIndex);
const stepEnd = standard.indexOf('\n      ]', preIndex);
const pending = [];
const nativeGame = { online: false, createEvent(name) {
  const next = { name, setContent(content) { this.content = content; return this; },
    set(k, v) { this[k] = v; return this; } };
  pending.push(next); return next;
} };
const nativeGet = { info: id => lib.skill[id] };
const wuxieSteps = new Function('game', 'get', `return [${standard.slice(stepStart, stepEnd)}];`)(nativeGame, nativeGet);
for (const hasCard of [false, true]) {
  for (const answer of ['有', '没有']) {
    for (const enabled of [false, true]) {
      const added = [], uses = [], originalUser = {}, originalCard = {name: 'wuxie'};
      const player = { countCards: () => Number(hasCard),
        addTempSkill: id => added.push(id), logSkill() {},
        useResult(result) { const use = {result}; uses.push(use); return use; } };
      const guesser = { chooseControl() {
        return { set() {return this;}, forResult: async () => ({control: answer}) };
      } };
      lib.filter.cardEnabled = (card, actor, mode) => {
        assert.equal(card.name, 'wuxie'); assert.equal(actor, player);
        assert.equal(mode, 'forceEnable'); return enabled;
      };
      lib.skill.fan_huanxi_backup = skills.fan_huanxi.chooseButton.backup([['trick', '', 'wuxie']]);
      const result = {bool: true, skill: 'fan_huanxi_backup', targets: [guesser]};
      // 故意不提供 restore/filterCard/backup，匹配截图中的 _wuxie 父事件。
      const parent = { name: '_wuxie', triggername: 'useCardToBegin', wuxieresult: player,
        wuxieresult2: result, goto(step) {this.retry = step;} };
      const trigger = {player: originalUser, card: originalCard};
      await wuxieSteps[0](parent, trigger);
      const pre = pending.pop();
      assert.equal(pre.name, 'pre_fan_huanxi_backup');
      pre.getParent = () => parent;
      await pre.content(pre, null, pre.player);
      await wuxieSteps[1](parent, trigger);
      const correct = hasCard === (answer === '有');
      const success = !correct && enabled;
      assert.equal(uses.length, Number(success));
      assert.equal(parent.retry, success ? undefined : 0);
      assert.equal(added.includes('fan_huanxi_blocked'), correct);
      assert(added.includes('fan_huanxi_used'));
      assert.equal(result.skill, undefined);
      assert.deepEqual(result.targets, []);
      if (success) {
        assert.equal(uses[0].result.card.storage.fan_huanxi, true);
        assert.deepEqual(uses[0].respondTo, [originalUser, originalCard]);
      }
    }
  }
}
lib.filter.cardEnabled = () => true;
const player = { hasSkill: () => false };
assert.equal(skills.fan_huanxi.filter({ filterCard: card => card.name === "wuzhong" }, player), true);
assert.equal(skills.fan_huanxi.filter({ filterCard: card => card.name === "lebu" }, player), false);
assert.equal(skills.fan_huanxi.hiddenCard({ hasSkill: () => true }, "sha"), false);
assert.equal(skills.fan_huanxi.hiddenCard(player, "lebu"), false);
const other = {};
for (const sourcePlayer of [player, other]) {
  status.event = { name: "chooseToUse", respondTo: [sourcePlayer], getParent: () => null };
  assert.equal(skills.fan_huanxi_blocked.mod.cardEnabled({}, player), sourcePlayer === player ? undefined : false);
  status.event.name = "chooseToRespond";
  assert.equal(skills.fan_huanxi_blocked.mod.cardRespondable({}, player), sourcePlayer === player ? undefined : false);
}
status.event = { name: "chooseToUse", type: "phase", getParent: () => ({ player: other }) };
assert.equal(skills.fan_huanxi_blocked.mod.cardEnabled({}, player), undefined);
assert.equal(skills.fan_moshu.filterCard({ suit: "heart" }, player), true);
assert.equal(skills.fan_moshu.filterCard({ suit: "diamond" }, player), false);
for (const count of [0, 1]) {
  let discarded = false;
  status.currentPhase = { isIn: () => true, countDiscardableCards: () => count };
  await skills.fan_huanxi_discard.content({}, {}, {
    isIn: () => true,
    async discardPlayerCard(target, zone, forced) {
      assert.equal(target, status.currentPhase);
      assert.equal(zone, "hej");
      assert.equal(forced, true);
      discarded = true;
    },
  });
  assert.equal(discarded, count > 0);
}
console.log("林尼：8个猜测分支、限次、牌类别、响应限制、红桃转化及弃牌边界检查通过。");
