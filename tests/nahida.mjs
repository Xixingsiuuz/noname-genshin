import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("../character/skills/nahida.js", import.meta.url), "utf8");
const get = {
  name: card => card.name,
  suit: card => card.suit,
  info: card => ({ selectTarget: ["nanman", "wuzhong"].includes(card.name) ? -1 : 1 }),
  type: name => name === "lebu" ? "delay" : name === "sha" ? "basic" : "trick",
  translation: item => String(item.name || item),
};
const lib = { filter: {
  selectTarget: card => ["nanman", "wuzhong"].includes(card.name) ? [-1, -1] : [1, 1],
  targetEnabled2: (card, source, target) => !target.illegal,
  targetInRange: (card, source, target) => !target.far,
} };
const spoken = [];
const game = { trySkillAudio(id) { spoken.push(id); }, roundNumber: 1, hasPlayer: fn => candidates.some(fn),
  filterPlayer: fn => { const list = candidates.filter(fn); list.sortBySeat = () => list; return list; } };
const selectionStatus = {};
let automaticUses = 0;
const skills = new Function("lib", "game", "get", "ui", "_status", source.replace(/^import .*;\r?\n/, "").replace("export default", "return"))(lib, game, get, { click: { ok() { automaticUses++; } } }, selectionStatus);
const choice = result => ({ set() { return this; }, async forResult() { return result; } });
const card = { name: "juedou", cardid: "n1", suit: "heart" }, otherCard = { name: "juedou", cardid: "n2" };
const target = { name: "target", cards: [card], isIn: () => true,
  losses: [], getAllHistory() { return this.losses; },
  effects: [], async recover() { this.effects.push("recover"); },
  async draw(n) { this.effects.push(`draw${n}`); },
  async chooseToDiscard() { this.effects.push("discard"); },
  async loseHp() { this.effects.push("loseHp"); },
  async turnOver() { this.effects.push("turnOver"); },
  countCards() { return this.cards.length; }, getCards: () => target.cards };
const player = { storage: {}, turned: false, isIn: () => true,
  isTurnedOver() { return this.turned; }, async turnOver(value) { this.turned = value; },
  removeSkill(name) { this.removed = name; },
  choosePlayerCard: () => choice({ bool: true, cards: [card] }),
  hasUseTarget: card => card.name !== "wuxie",
  async gain(card) { (this.gained ||= []).push(card); },
  hasZhuSkill: () => true, logSkill() {},
};
const flower = skills.fan_huaqiu;
await flower.content({}, {}, player);
assert.equal(player.turned, true);
assert.equal(flower.subSkill.hold.filter({}, player), true);
let cancelled = 0;
await flower.subSkill.hold.content({}, { cancel() { cancelled++; } });
await flower.subSkill.damage.content({}, { cancel() { cancelled++; } });
assert.equal(cancelled, 2);
assert.equal(flower.subSkill.end.filter(), false);
game.roundNumber = 2;
assert.equal(flower.subSkill.end.filter(), true);
await flower.subSkill.end.content({}, {}, player);
assert.equal(player.removed, "fan_huaqiu");
assert.equal(player.turned, false);

await skills.fan_wenshou.content({}, { player: target }, player);
assert.deepEqual(player.storage.fan_wenshou_names, ["juedou"]);
const useSkill = skills.fan_wenshou.subSkill.use;
const originalUse = () => ({ name: "useCard", player: target, cards: [card],
  card: { name: card.name, cardid: card.cardid, isCard: true } });
assert.equal(useSkill.filter({ ...originalUse(), card: otherCard, cards: [otherCard] }, player), false);
assert.equal(useSkill.filter({ ...originalUse(), card: { name: "sha" } }, player), false);
assert.equal(useSkill.filter({ ...originalUse(), skill: "conversion" }, player), false);
assert.equal(useSkill.filter({ ...originalUse(), player }, player), false);
for (const [suit, expected] of [["heart", ["recover"]], ["diamond", ["draw3"]],
  ["club", ["discard", "loseHp"]], ["spade", ["turnOver"]], ["none", []]]) {
  card.suit = suit;
  target.losses = [];
  target.effects = [];
  player.storage.fan_wenshou_cards = [];
  await skills.fan_wenshou.content({}, { player: target }, player);
  card.suit = "changed"; // 选中后花色改变，仍按选中时花色。
  const use = originalUse();
  target.losses.push({ cards: [card], getParent: () => use });
  assert.equal(useSkill.filter(use, player), true);
  await useSkill.content({}, use, player);
  assert.deepEqual(target.effects, expected);
  assert.equal(useSkill.filter(use, player), false);
}
await skills.fan_wenshou.subSkill.gain.content({}, { player: target }, player);
assert.deepEqual(player.gained, [card]);
await skills.fan_wenshou.subSkill.clear.content({}, { player: target }, player);
assert.equal(useSkill.filter(originalUse(), player), false);
assert.deepEqual(player.storage.fan_wenshou_names, ["juedou"]);
assert.equal(skills.fan_huanjing.filter({}, player), true);
assert.equal(skills.fan_huanjing.chooseButton.backup([["锦囊", "", "juedou"]]).viewAs.name, "juedou");
assert.equal(skills.fan_huanjing.direct, true);
const aoe = skills.fan_huanjing.chooseButton.backup([["锦囊", "", "nanman"]], player);
assert.equal(aoe.direct, false);
assert.equal(aoe.manualConfirm, true);
const targeted = skills.fan_huanjing.chooseButton.backup([["锦囊", "", "shunshou"]], player);
assert.equal(targeted.direct, false);
assert.equal(targeted.manualConfirm, true);
// 使用本地引擎实际的 checkEnd 钩子：仅发动入口直接提交，转化后保留确认。
const hooks = readFileSync(new URL("../../../noname/library/hooks/index.js", import.meta.url), "utf8");
const hookStart = hooks.indexOf("function autoConfirm(event,");
const hookEnd = hooks.indexOf("function createChooseAll", hookStart);
const hookText = hooks.slice(hookStart, hookEnd).trim().replace(/,$/, "");
let confirms = 0;
const status = {};
const engineConfirm = new Function("get", "ui", "_status", `return (${hookText});`)(
  { info: skill => skill }, { click: { ok() { confirms++; } } }, status);
const eventFor = skill => ({ skill, isMine: () => true });
engineConfirm(eventFor(skills.fan_huanjing), { ok: true, auto: true, autoConfirm: false });
engineConfirm(eventFor(aoe), { ok: true, auto: true, autoConfirm: false });
assert.equal(confirms, 1);
engineConfirm(eventFor(targeted), { ok: true, auto: true, autoConfirm: false });
engineConfirm(eventFor(targeted), { ok: false, auto: true, autoConfirm: false });
engineConfirm(eventFor(aoe), { ok: false, auto: true, autoConfirm: false });
assert.equal(confirms, 1); // 转化流程不自动提交，非法牌不提交。
// 自动提交必须发生在原生外层完成暂停之后，且再次检查合法性。
for (const name of ["nanman", "wuzhong"]) {
  const backup = skills.fan_huanjing.chooseButton.backup([["锦囊", "", name]], player);
  selectionStatus.event = { name: "chooseToUse", skill: "fan_huanjing_backup", isMine: () => true };
  let paused = false;
  const before = automaticUses;
  game.check = () => { assert.equal(paused, true); return backup.filterOk(); };
  backup.filterOk();
  backup.filterOk(); // 重复检查不重复提交。
  assert.equal(automaticUses, before);
  paused = true;
  await Promise.resolve();
  assert.equal(automaticUses, before + 1);
}
assert.equal(targeted.filterOk, undefined);
const beforeInvalid = automaticUses;
game.check = () => false;
aoe.filterOk();
await Promise.resolve();
assert.equal(automaticUses, beforeInvalid);
aoe.filterOk();
selectionStatus.event = {}; // 等待期间取消或切换事件，不提交。
await Promise.resolve();
assert.equal(automaticUses, beforeInvalid);
target.cards = [otherCard];
player.storage.fan_wenshou_cards = [{ card, target, lossIndex: target.losses.length }];
await skills.fan_wenshou.subSkill.gain.content({}, { player: target }, player);
assert.equal(player.gained.length, 1); // 离开原角色区域后不追讨。
// 转交后拿回、移到武将牌上再拿回：实体相同仍不恢复效果或收牌。
for (const reason of ["gain", "addToExpansion"]) {
  target.cards = [card];
  target.losses = [];
  player.storage.fan_wenshou_cards = [];
  await skills.fan_wenshou.content({}, { player: target }, player);
  target.losses.push({ cards: [card], getParent: () => ({ name: reason }) });
  const use = originalUse();
  target.losses.push({ cards: [card], getParent: () => use });
  assert.equal(useSkill.filter(use, player), false);
  await skills.fan_wenshou.subSkill.gain.content({}, { player: target }, player);
  assert.equal(player.gained.length, 1);
}
await skills.fan_wenshou.subSkill.clear.content({}, { player: target }, player);
player.choosePlayerCard = () => choice({ bool: false });
await skills.fan_wenshou.content({}, { player: target }, player);
assert.equal(player.storage.fan_wenshou_cards, undefined);

let asked = [];
const makeCandidate = (name, accept, extra = {}) => ({ name, group: "wu", isIn: () => true,
  chooseBool() { asked.push(name); return choice({ bool: accept }); }, ...extra });
const candidates = [makeCandidate("illegal", true, { illegal: true }), makeCandidate("far", true, { far: true }),
  makeCandidate("first", false), makeCandidate("second", true), makeCandidate("third", true)];
const use = { targets: [player], triggeredTargets2: [player] };
for (const list of [use.targets, use.triggeredTargets2]) list.remove = function(item) { this.splice(this.indexOf(item), 1); };
const trigger = { player: target, card, targets: use.targets, getParent: () => use };
assert.equal(skills.fan_lanyin.filter(trigger, player), true);
await skills.fan_lanyin.content({}, trigger, player);
assert.deepEqual(asked, ["first", "second"]);
assert.equal(use.targets[0], candidates[3]);
assert.equal(use.triggeredTargets2.length, 0);
assert.equal(useSkill.trigger.global, "useCard1");
assert.equal(skills.fan_wenshou.subSkill.gain.trigger.global, "phaseJieshuBegin");
assert.equal(skills.fan_wenshou.subSkill.damage, undefined);
// 八个独立语音池各两条，原声与播放文件内容一致，阵亡三条。
const { createHash } = await import("node:crypto");
const audioSources = JSON.parse(readFileSync(new URL("../audio/nahida/originals/sources.json", import.meta.url), "utf8"));
assert.equal(audioSources.clips.length, 19);
for (const clip of audioSources.clips) {
  const bytes = readFileSync(new URL(`../${clip.output}`, import.meta.url));
  assert.equal(bytes.length, clip.output_bytes);
  assert.equal(createHash("sha256").update(bytes).digest("hex"), clip.output_sha256);
  const original = readFileSync(new URL(`../${clip.original}`, import.meta.url));
  assert.equal(original.length, clip.bytes);
  assert.equal(createHash("sha256").update(original).digest("hex"), clip.original_sha256);
  assert.ok(clip.volume.after.true_peak_dbtp <= -1);
}
for (const branch of ["start", "guard", "end"]) assert.ok(spoken.includes(`fan_huaqiu_${branch}_voice`));
for (const branch of ["select", "bless", "punish", "gain"]) assert.ok(spoken.includes(`fan_wenshou_${branch}_voice`));
const beforeVoice = spoken.length;
await skills.fan_huanjing.chooseButton.backup([["锦囊", "", "juedou"]], player).precontent({}, {}, player);
assert.equal(spoken.length, beforeVoice + 1);
assert.equal(spoken.at(-1), "fan_huanjing_voice");
console.log("纳西妲：四花色与顺序、直接使用与转化边界、转交/暂存失效、结束阶段收牌、永久记录、花囚及兰荫测试通过");
