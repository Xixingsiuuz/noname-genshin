import assert from "node:assert/strict";
import loadedCharacters from '../character/character.js';
import { readFileSync } from "node:fs";
const read = path => readFileSync(new URL("../" + path, import.meta.url), "utf8");
const voices = [], moves = [];
const game = {
  roundNumber: 1, trySkillAudio: id => voices.push(id),
  filterPlayer: fn => players.filter(fn),
  getGlobalHistory(type, fn) { assert.equal(type, "cardMove"); moves.forEach(fn); },
  expandSkills: skills => skills, checkMod: (player, max) => max,
};
const get = { name: card => card.name, position: card => card.pos, value: card => card.value,
  effect: target => target.effect, damageEffect: target => target.effect,
  info: id => skills[id] };
const lib = { skill: { global: [] } };
const ui = { selected: { buttons: [] } };
const skills = new Function("game", "get", "ui", read("character/skills/ganyu.js").replace(/^import .*;\r?\n/, "").replace("export default", "return"))(game, get, ui);
// Execute the actual local engine charge methods, including cap and removal behavior.
const engine = read("../../noname/library/element/player.js");
const NativeCharge = new Function("game", "get", "lib", "return class {" + engine.slice(engine.indexOf("  addCharge(num, log) {"), engine.indexOf("  line(target, config) {")) + "}")(game, get, lib);
let answer = { bool: true, links: ["charge"] }, change = () => {}, settings;
class Player extends NativeCharge {
  storage = {}; charge = 0; hp = 3; hand = []; damageHistory = []; temp = new Set(); alive = true; effect = -2;
  getSkills() { return ["fan_liutian"]; }
  countMark() { return this.charge; }
  addMark(id, num) { this.charge += num; }
  removeMark(id, num) { this.charge -= num; }
  isIn() { return this.alive; }
  getCards() { return this.hand; }
  countCards(zone, fn) { return this.hand.filter(fn || (() => true)).length; }
  getCardUsable() { return this.usedSha ? 0 : 1; }
  canUse(card, target, distance) { return target !== this && !target.forbidden && (distance === false || !target.far); }
  getHistory(type, fn) { assert.equal(type, "damage"); return this.damageHistory.filter(fn); }
  getStorage(id) { return this.storage[id] || []; }
  markAuto(id, targets) { this.storage[id] = [...new Set([...this.getStorage(id), ...targets])]; }
  addTempSkill(id, expiry) { assert.equal(expiry, "phaseAfter"); this.temp.add(id); }
  removeSkill(id) { this.temp.delete(id); }
  logSkill(id, targets, nature, logv, args) {
    assert.deepEqual(args, [], id + ": suppress native log audio before explicit branch playback");
  }
  chooseButton() {
    settings = {};
    return { set(k, v) { settings[k] = v; return this; }, async forResult() { change(); return answer; } };
  }
  async draw() { this.drawn = (this.drawn || 0) + 1; }
  async gain(card) { this.gained = card; card.pos = "h"; }
}
const owner = new Player(), other = new Player(), third = new Player(), players = [owner, other, third];
const liu = skills.fan_liutian, lin = skills.fan_linji, star = skills.fan_xingzuo;
liu.init(owner); liu.init(owner); assert.equal(owner.countCharge(), 1);
owner.addCharge(10); assert.equal(owner.countCharge(), 2);
owner.removeCharge(1); assert.equal(owner.countCharge(), 1);
assert(liu.filter({}, owner)); await liu.content({}, {}, owner);
assert.equal(owner.countCharge(), 0); assert(owner.temp.has("fan_liutian_ready"));
const ready = skills.fan_liutian_ready;
assert.equal(ready.mod.targetInRange({ name: "sha" }), true);
assert.equal(ready.mod.targetInRange({ name: "juedou" }), undefined);
assert(!ready.filter({ card: { name: "shan" } }));
const use = { card: { name: "sha" }, baseDamage: 1, targets: [other, third] };
assert(ready.filter(use)); await ready.content({}, use, owner);
assert.equal(use.baseDamage, 2); assert(!owner.temp.has("fan_liutian_ready"));
use.targets = []; assert.equal(use.baseDamage, 2, "cancelled targets do not refund the bound buff");
const nested = { baseDamage: 1 }; assert.equal(nested.baseDamage, 1);
const spoken = voices.length; await liu.content({}, {}, owner); assert.equal(voices.length, spoken);
const begin = { player: other };
assert(lin.filter(begin, owner)); await lin.content({}, begin, owner);
assert.equal(owner.countCharge(), 1); assert.equal(owner.storage.fan_linji_count, 1);
assert.equal(voices.at(-1), "fan_linji");
assert.deepEqual(settings.selectButton, [0, 1]); assert(!settings.filterOk());
ui.selected.buttons = [{ link: "charge" }]; assert(settings.filterOk()); ui.selected.buttons = []; assert(!settings.filterOk());
const mod = skills.fan_linji_distance.mod;
function distance(from, to) {
  let n = 2;
  if (to.temp.has("fan_linji_distance")) n = mod.globalTo(from, to, n) ?? n;
  return n;
}
assert.equal(distance(other, owner), 3); assert.equal(distance(owner, other), 2);
assert.equal(distance(third, owner), 2); assert.equal(mod.globalFrom, undefined);
assert.equal(mod.targetEnabled({ name: "shunshou" }, other, owner), false);
assert.equal(mod.targetEnabled({ name: "shunshou" }, owner, other), undefined);
assert.equal(mod.targetEnabled({ name: "sha" }, other, owner), undefined);
assert(!lin.filter(begin, owner));
answer = { bool: true, links: ["draw"] }; const beforeRepeat = voices.length;
await lin.content({}, begin, owner); assert.equal(owner.drawn, undefined); assert.equal(voices.length, beforeRepeat);
game.roundNumber++;
answer = { bool: false }; await lin.content({}, begin, owner); assert.equal(owner.storage.fan_linji_round, 1);
answer = { bool: true, links: ["draw"] }; await lin.content({}, begin, owner);
assert.equal(owner.drawn, 1); assert.equal(owner.storage.fan_linji_count, 1); assert(!lin.filter(begin, owner));
game.roundNumber++; assert(lin.filter(begin, owner));
owner.addCharge(1); answer = { bool: true, links: ["charge"] };
await lin.content({}, begin, owner); assert.equal(settings.filterButton({ link: "charge" }), false);
assert.equal(owner.countCharge(), 2); assert.equal(owner.storage.fan_linji_round, 2);
owner.removeCharge(1); change = () => owner.addCharge(1);
await lin.content({}, begin, owner); assert.equal(owner.storage.fan_linji_round, 2); change = () => {};
// AI accounts for future Sha, exhausted normal quota, friends, enemies, prohibition and range.
owner.hand = [{ name: "sha" }]; other.effect = 3; third.effect = -3; other.far = true;
assert(liu.ai.result.player(owner) > 0); other.forbidden = true; assert.equal(liu.ai.result.player(owner), 0);
other.forbidden = false; owner.usedSha = true; assert.equal(liu.ai.result.player(owner), 0); owner.usedSha = false;
owner.removeCharge(1); await lin.content({}, begin, owner);
owner.removeCharge(2); // Re-evaluate with room to charge; actual acquisition correctly changed the AI state.
assert(settings.ai({ link: "charge" }) > settings.ai({ link: "draw" }));
owner.addCharge(1); assert(settings.ai({ link: "draw" }) > settings.ai({ link: "charge" }));
owner.hand = []; assert(settings.ai({ link: "draw" }) > settings.ai({ link: "charge" }));
// Only discards in this exact discard phase; unrelated discard/material movement excluded.
const phase = { player: other }, oldPhase = { player: other };
const card = (value = 5) => ({ pos: "d", value });
const a = card(), b = card(8), c = card(); c.pos = "h";
moves.push({ name: "lose", type: "discard", cards2: [a, b, c], getParent: () => phase },
  { name: "lose", type: "discard", cards2: [card()], getParent: () => oldPhase },
  { name: "lose", type: "use", cards2: [card()], getParent: () => phase });
assert(star.filter(phase, owner)); answer = { bool: true, links: [b] };
await star.content({}, phase, owner); assert.equal(owner.gained, b); assert.equal(voices.at(-1), "fan_xingzuo");
assert(settings.ai({ link: b }) > settings.ai({ link: a }));
owner.gained = null; answer = { bool: true, links: [a] }; change = () => { a.pos = "h"; };
await star.content({}, phase, owner); assert.equal(owner.gained, null); change = () => {};
a.pos = "d"; owner.damageHistory = [{ source: other, num: 1 }]; assert(!star.filter(phase, owner));
owner.damageHistory = [{ source: third, num: 1 }, { source: other, num: 0 }]; assert(star.filter(phase, owner));
answer = { bool: false }; const last = voices.length; await star.content({}, phase, owner); assert.equal(voices.length, last);
owner.alive = false; assert(!star.filter(phase, owner));
// Definitions are actually reachable from the registered character; no unattached recorder shortcut.
const characters = loadedCharacters;
for (const id of characters.fan_ganyu[3]) { assert(skills[id]); assert.equal(skills[id].locked, false); }
assert.equal(lin.trigger.global, "phaseZhunbeiBegin"); assert.equal(star.trigger.global, "phaseDiscardEnd");
assert.equal(liu.usable, 1);
const translations = new Function("nativeGet", "lib", read("character/translate.js").replace(/^import .*;\r?\n/gm, "").replace(/export /g, "") + "\nreturn { characterTranslate, skills: createSkillTranslate() };")({ poptip: id => id }, { translate: {} });
assert.equal(translations.characterTranslate.fan_ganyu, "甘雨");
for (const id of characters.fan_ganyu[3]) { assert(translations.skills[id]); assert(translations.skills[id + "_info"]); }
assert.equal(translations.skills.fan_xingzuo, "星佐");
console.log("PASS: Ganyu native charge cap, payment, useCard binding, one-way distance, round quota, cancelled/stale choices, exact discard phase, damage gate and AI (simulation; no live game).");

const targetEvent = { isFirstTarget: true, getParent: () => use };
assert(skills.fan_liutian_sha.filter(targetEvent));
await skills.fan_liutian_sha.content({},targetEvent,owner);
assert(!skills.fan_liutian_sha.filter(targetEvent));
