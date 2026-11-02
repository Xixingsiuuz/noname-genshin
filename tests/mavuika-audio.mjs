import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const read = path => readFileSync(new URL(path, import.meta.url), "utf8");
const source = read("../character/skills/mavuika.js");
const manifest = JSON.parse(read("../audio/mavuika/originals/mavuika-sources.json"));
assert.equal(Object.keys(manifest.clips).length, 14);
const poolLabels = prefix => Object.entries(manifest.clips).filter(([id]) => id.startsWith(prefix)).map(([, clip]) => clip.label);
assert.deepEqual(poolLabels('fan_chihun_gain'), ['元素战技·其一', '元素战技·其三', '元素战技·其二']);
assert.deepEqual(poolLabels('fan_chihun_overflow'), ['打开宝箱·其三', '元素战技·其四']);
assert.deepEqual(poolLabels('fan_fentian_charge'), ['元素战技·其五', '元素战技·其六']);
assert.equal(Object.values(manifest.clips).filter(clip => clip.label === '元素战技·其四').length, 1);
for (const clip of Object.values(manifest.clips)) {
  assert.equal(clip.trim_seconds, null);
  assert(clip.volume.after.true_peak_dbtp <= -1, clip.output);
  assert(clip.url.startsWith("https://patchwiki.biligame.com/"));
  assert(clip.text && clip.bytes > 1000 && clip.original_sha256);
}
const report = JSON.parse(read("../audio/mavuika/originals/mavuika-volume-report.json"));
assert.equal(report.target_lufs, -14.25);
assert.equal(report.clips.length, 14);
const nativeGame = read("../../../noname/game/index.js");
const timeline = [], status = {};
const game = { roundNumber: 1, players: [], trySkillAudio(id, player, direct) {
  assert.equal(direct, true); timeline.push(id);
} };
const lib = { filter: { all: () => true, selectTarget: () => [1, 1] } };
// Preserve the real local method signatures: hasPlayer without its callback must fail.
for (const name of ["hasPlayer", "countPlayer"]) {
  const match = nativeGame.match(new RegExp("  " + name + "\\(func, includeOut\\) \\{([\\s\\S]*?)\\n  \\}"));
  assert(match);
  game[name] = new Function("game", "lib", "return function(func,includeOut){" + match[1] + "}")(game, lib);
}
const get = {
  position: card => card.position,
  name: card => card.name,
  type: name => ["sha", "shan", "tao", "jiu"].includes(name) ? "basic" : "trick",
  prompt: id => id,
  order: () => 3,
  info: () => ({}),
  effect: target => target.friend ? -3 : 3,
  damageEffect: target => target.friend ? -2 : 2,
};
const skills = new Function("lib", "game", "get", "ui", "_status", source
  .replace(/^import .*;\r?\n/gm, "").replace("export default", "return"))(lib, game, get, {}, status);
function player() {
  return {
    marks: 0, used: false, hp: 4, hujia: 0, group: "shu", storage: {}, hand: [], present: true,
    isIn() { return this.present; }, isOut() { return !this.present; },
    countMark(id) { return id === "fan_chihun" ? this.marks : this.buff || 0; },
    addMark(id, n) { if (id === "fan_chihun") this.marks += n; else this.buff = (this.buff || 0) + n; timeline.push("mark:" + id); },
    removeMark(id, n) { assert(n <= this.marks); this.marks -= n; timeline.push("pay"); },
    hasSkill() { return this.used; },
    addTempSkill(id, expiry) { if (id === "fan_chihun_used") { assert.deepEqual(expiry, { global: "roundStart" }); this.used = true; } },
    draw: async () => timeline.push("draw"),
    logSkill() {}, hasZhuSkill: () => true,
    awakenSkill(id) { this.storage[id] = true; },
    recover: async n => timeline.push("recover:" + n),
    line() {},
    getCards(zone, predicate) { return this.hand.filter(predicate || (() => true)); },
    countCards(zone, predicate) { return this.hand.filter(card => card.name === predicate.name).length; },
    canUse(card, target, distance, includeCount) { assert.equal(distance, true); assert.equal(includeCount, false); return target.present; },
    getCardUsable: () => 1,
  };
}
const choice = (result, inspect) => ({ set(key, value) { if (key === "ai") inspect?.(value); return this; }, async forResult() { return result; } });
const p = player(), enemy = player(), ally = player(); ally.friend = true;
game.players = [p, enemy, ally];
assert.throws(() => game.hasPlayer(), TypeError);
assert.equal(game.hasPlayer(target => target === enemy), true);

// Dispatch only actual owned trigger definitions, including groups (no unconditional recorder calls).
const flat = {};
function collect(defs, prefix = "") {
  for (const [key, value] of Object.entries(defs)) {
    const id = prefix ? prefix + "_" + key : key; flat[id] = value;
    if (value.subSkill) collect(value.subSkill, id);
  }
}
collect(skills);
const owned = new Set(["fan_chihun", "fan_fentian", "fan_zailin"]);
for (const id of [...owned]) for (const group of [flat[id].group].flat().filter(Boolean)) owned.add(group);
async function dispatch(name, trigger) {
  for (const id of owned) {
    const skill = flat[id];
    if (![skill.trigger?.global, skill.trigger?.player].flat(2).includes(name)) continue;
    if (skill.filter && !skill.filter(trigger, p)) continue;
    await skill.content({ triggername: name }, trigger, p);
  }
}
const sha1 = { name: "sha", position: "o" }, sha2 = { name: "sha", position: "o" };
const move = { getd: () => [sha1, sha2] };
await dispatch("useCardAfter", move); assert.deepEqual(timeline, []);
sha1.position = sha2.position = "d";
await dispatch("cardsDiscardAfter", move);
assert.equal(p.marks, 1); assert.deepEqual(timeline, ["mark:fan_chihun", "fan_chihun_gain"]);
timeline.length = 0; p.marks = 4;
await dispatch("cardsDiscardAfter", move);
assert.deepEqual(timeline, ["fan_chihun_overflow", "draw"]); assert.equal(p.marks, 4);
timeline.length = 0;
sha1.position = sha2.position = "h"; await dispatch("cardsDiscardAfter", move); assert.deepEqual(timeline, []);

const backup = skills.fan_chihun.subSkill.use.chooseButton.backup([["basic", "", "sha"]]);
assert.deepEqual(timeline, [], "opening conversion has no audio");
p.marks = 1;
await backup.precontent({ result: { bool: true } }, {}, p);
assert.deepEqual(timeline, ["pay", "fan_chihun_convert"]); assert.equal(p.marks, 0);
timeline.length = 0;
const invalid = { result: { bool: true } };
await backup.precontent(invalid, {}, p); assert.equal(invalid.result.bool, false); assert.deepEqual(timeline, []);
p.marks = 2; p.used = false;
await backup.precontent({ result: { bool: true } }, {}, p); assert.deepEqual(timeline, [], "same round stays used across turns");
game.roundNumber++;
await backup.precontent({ result: { bool: true } }, {}, p); assert.deepEqual(timeline, ["pay", "fan_chihun_convert"], "next round speaks");
timeline.length = 0;

p.chooseControl = () => choice({ control: "cancel2" });
await skills.fan_fentian.content({}, {}, p); assert.deepEqual(timeline, []);
p.marks = 1; p.chooseControl = () => choice({ control: "2" });
await skills.fan_fentian.content({}, {}, p); assert.equal(p.marks, 1); assert.deepEqual(timeline, [], "no partial payment or voice");
p.marks = 3; p.chooseControl = () => choice({ control: "2" });
await skills.fan_fentian.content({}, {}, p);
assert.deepEqual(timeline, ["pay", "mark:fan_fentian_buff", "fan_fentian_charge"]);
timeline.length = 0;
const phase = {}; p.getHistory = (_, predicate) => [1, 2, 3].map(() => ({ card: { name: "sha" }, getParent: () => phase })).filter(predicate);
p.chooseTarget = () => choice({ bool: false });
await skills.fan_fentian.subSkill.end.content({}, phase, p); assert.deepEqual(timeline, []);
p.chooseTarget = () => choice({ bool: true, targets: [enemy] }, ai => {
  assert(ai(enemy) > 0); assert(ai(ally) < 0);
});
enemy.damage = async n => timeline.push("damage:" + n);
await skills.fan_fentian.subSkill.end.content({}, phase, p); assert.deepEqual(timeline, ["fan_fentian_fire", "damage:3"]);
timeline.length = 0; enemy.present = false;
await skills.fan_fentian.subSkill.end.content({}, phase, p); assert.deepEqual(timeline, []); enemy.present = true;

// AI chooses an affordable useful increase, declines with no useful attacks, and re-evaluates current state.
let decision;
p.hand = [{ name: "sha" }, { name: "sha" }, { name: "sha" }]; p.marks = 3; p.storage.fan_chihun_round = game.roundNumber;
p.chooseControl = () => choice({ control: "cancel2" }, ai => { decision = ai(); });
await skills.fan_fentian.content({}, {}, p); assert.equal(decision, "2");
p.hand = []; await skills.fan_fentian.content({}, {}, p); assert.equal(decision, "cancel2");
p.hand = [{ name: "sha" }, { name: "sha" }]; enemy.friend = true;
await skills.fan_fentian.content({}, {}, p); assert.equal(decision, "cancel2"); enemy.friend = false;
p.getCardUsable = () => Infinity;
await skills.fan_fentian.content({}, {}, p); assert.equal(decision, "cancel2");
timeline.length = 0;

// One revival voice precedes recovery and selection; no repetitions for self or multiple targets.
let sortStart;
const chosen = [ally, p];
chosen.sortBySeat = start => { sortStart = start; return [p, ally]; };
status.currentPhase = enemy;
p.damage = async () => { timeline.push("selfDamage"); ally.present = false; };
ally.damage = async () => timeline.push("allyDamage");
p.chooseTarget = () => { assert.deepEqual(timeline, ["fan_zailin", "recover:3"]); return choice({ bool: true, targets: chosen }); };
await skills.fan_zailin.content({}, {}, p);
assert.equal(sortStart, enemy); assert.deepEqual(timeline, ["fan_zailin", "recover:3", "selfDamage"]);
assert.equal(skills.fan_zailin.filter({}, p), false);
timeline.length = 0; await skills.fan_zailin.content({}, {}, p); assert.deepEqual(timeline, []);
delete status.currentPhase; p.storage = {}; ally.present = true;
p.chooseTarget = () => choice({ bool: false });
await skills.fan_zailin.content({}, {}, p); assert.deepEqual(timeline, ["fan_zailin", "recover:3"], "declining damage does not undo actual revival or repeat audio");
timeline.length = 0; p.storage = {};
p.chooseTarget = () => choice({ bool: true, targets: chosen });
await skills.fan_zailin.content({}, {}, p); assert.equal(sortStart, p, "no current turn uses the owner as seat origin");
assert(source.includes("sortBySeat(_status.currentPhase || player)"));
console.log("PASS: Mavuika mounted triggers, real discard timing, gain/overflow, confirmed conversion/payment, cancellation/invalid target silence, per-node deduplication, revival seat order, limited reuse rejection, native hasPlayer signature and state-dependent AI (simulation, not live playback).");
