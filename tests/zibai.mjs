import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

// Exercise real skill content with the same history/source separation used by 1.11.6.
const source = readFileSync(new URL("../character/skills/zibai.js", import.meta.url), "utf8");
const ui = { cardPile: { childNodes: [] }, click: { auto() { status.auto = !status.auto; } } };
const status = { auto: false };
let people = [], swaps = [], eyeCalls = [], voiceCalls = [];
const lib = { skill: {}, filter: { cardDiscardable: card => !card.protected } };
const game = {
  phaseNumber: 0, log() {}, me: null,
  trySkillAudio(id, player, direct) { voiceCalls.push({ id, player, direct }); },
  broadcastAll(fn, ...args) { fn(...args); },
  addGlobalSkill() {}, expandSkills(skills) {
    for (const skill of [...skills]) {
      const group = lib.skill[skill]?.group;
      for (const child of typeof group === "string" ? [group] : group || []) if (!skills.includes(child)) skills.push(child);
    }
    return skills;
  },
  hasPlayer: fn => people.some(fn), swapPlayerAuto: p => swaps.push(p),
  createEvent(name) { return { name, setContent(content) { this.content = content; return this; } }; },
};
const get = {
  number: card => card.number, position: card => card.zone,
  translation: value => Array.isArray(value) ? value.map(c => c.id || c.name).join("、") : value.name || value,
  value: () => 3, attitude: () => 5, is: { shownCard: card => !!card.shown },
};
const { skills, changeForm, advance, level, primeNumbers, useCount } = new Function("lib", "game", "get", "ui", "_status", "setZibaiEyes",
  source.replace(/^import .*;\r?\n/gm, "").replace("export default", "const skills =")
    + "\nreturn { skills, changeForm, advance, level, primeNumbers, useCount };")
  (lib, game, get, ui, status, (...args) => eyeCalls.push(args));
Object.assign(lib.skill, skills);
for (const [key, info] of Object.entries(skills)) for (const [sub, value] of Object.entries(info.subSkill || {})) lib.skill[`${key}_${sub}`] = value;
Object.defineProperty(Array.prototype, "randomGet", { configurable: true, value() { return this[0]; } });
Object.defineProperty(Array.prototype, "randomGets", { configurable: true, value(count) { return this.slice(0, count); } });

const selection = result => ({ set() { return this; }, forResult: async () => result });
let serial = 0;
const card = (number = 4, shown = false, zone = "h") => ({
  id: `c${++serial}`, cardid: `c${serial}`, number, shown, zone,
  hasGaintag: tag => tag === "faceup_tag" && !!shown,
});
function holder(initial = []) {
  return {
    name: "test", storage: {}, cards: initial, history: [], losses: [], base: new Set(["fan_nichi", "fan_sanxiang"]),
    additionalSkills: {}, awakenedSkills: [], marks: new Set(), blocks: new Set(),
    hp: 4, alive: true, draws: 0, gained: [], choices: [], discarded: [], stat: { triggerSkill: { fan_nichi: 1 } },
    allSkills() { return [...new Set([...this.base, ...Object.values(this.additionalSkills).flat()])]; },
    hasSkill(skill) { return this.allSkills().includes(skill) && !this.awakenedSkills.includes(skill); },
    getSkills() { return this.allSkills(); }, isIn() { return this.alive; },
    getAllHistory(key) { return key === "useCard" ? this.history : []; },
    getHistory(key, fn = () => true) { return (key === "lose" ? this.losses : this.history).filter(fn); },
    getCards(zones, fn = () => true) { return this.cards.filter(c => zones.includes(c.zone) && fn(c)); },
    hasCard(fn, zones) { return this.getCards(zones, fn).length > 0; },
    getStat(key) { return this.stat[key] ||= {}; },
    markSkill(skill) { this.marks.add(skill); }, unmarkSkill(skill) { this.marks.delete(skill); }, logSkill() {},
    addAdditionalSkill(key, value, keep = false) {
      const incoming = typeof value === "string" ? [value] : value;
      if (!keep) this.removeAdditionalSkill(key);
      const before = this.allSkills();
      this.additionalSkills[key] = [...new Set([...(this.additionalSkills[key] || []), ...incoming])];
      for (const skill of incoming) if (!before.includes(skill)) lib.skill[skill]?.init?.(this, skill);
    },
    removeAdditionalSkill(key) {
      const old = this.additionalSkills[key] || [];
      delete this.additionalSkills[key];
      for (const skill of old) if (!this.allSkills().includes(skill)) lib.skill[skill]?.onremove?.(this, skill);
    },
    addSkill(skill) { if (!this.hasSkill(skill)) { this.base.add(skill); lib.skill[skill]?.init?.(this, skill); } },
    removeSkill(skill) { this.base.delete(skill); lib.skill[skill]?.onremove?.(this, skill); },
    addSkillBlocker(skill) { this.blocks.add(skill); }, removeSkillBlocker(skill) { this.blocks.delete(skill); },
    awakenSkill(skill) { this.awakenedSkills.push(skill); },
    restoreSkill(skill) { this.awakenedSkills = this.awakenedSkills.filter(s => s !== skill); },
    chooseControl(...options) {
      this.lastControls = options;
      const index = this.choices.shift(), settings = {};
      return { set(key, value) { settings[key] = value; return this; },
        forResult: async () => ({ index: index ?? (this.aiControls ? settings.ai() : 0) }) };
    },
    chooseBool() { return selection({ bool: this.choices.shift() ?? true }); },
    chooseCard() { return selection({ bool: true, cards: this.getCards("h", c => !c.shown).slice(0, 1) }); },
    chooseToDiscard() {
      const chosen = this.getCards("he", c => !c.protected)[0];
      if (chosen && this.choices.shift() !== false) { chosen.zone = "d"; this.discarded.push(chosen); return selection({ bool: true, cards: [chosen] }); }
      return selection({ bool: false });
    },
    chooseTarget() { return selection({ bool: true, targets: [this.giftTarget] }); },
    async addShownCards(cards) { cards.forEach(c => c.shown = true); },
    async loseHp() { this.hp--; if (this.onLoseHp) await this.onLoseHp(); },
    async draw() { this.draws++; this.cards.push(card()); },
    async gain(cards) { cards = Array.isArray(cards) ? cards : [cards]; this.gained.push(...cards); cards.forEach(c => c.zone = "h"); },
    async damage(...args) { this.damageArgs = args; },
  };
}
const record = skills.fan_zibai_record;
async function dispatchUseCard1(p, event) {
  // 从实际持有技能展开触发器，不能无条件手动执行一个未注册的记录器。
  const attached = game.expandSkills(p.getSkills());
  for (const key of ["fan_zibai_record", "fan_yunjian_record"]) {
    const info = lib.skill[key];
    if (attached.includes(key) && info.trigger.player === "useCard1" && (!info.filter || info.filter(event, p))) {
      await info.content({}, event, p);
    }
  }
}
async function use(p, number) {
  const event = { card: card(number), cards: [], player: p };
  p.history.push(event);
  await dispatchUseCard1(p, event);
  return event;
}
async function startControl(player, target) {
  const turn = { player: target, after: [] };
  const detached = [];
  assert(skills.fan_yanjian.subSkill.control.filter(turn, player));
  await skills.fan_yanjian.subSkill.control.content({ next: { remove(event) { detached.push(event); } } }, turn, player);
  assert.equal(detached[0], turn.after[0]);
  return turn;
}
async function finishControl(turn) {
  await skills.fan_zibai_controlled.content({}, {}, turn.player);
  for (const event of turn.after) await event.content(event);
}

// Only the current acquisition counts uses/points; inactive forms and respond do not.
const p = holder(); people = [p];
changeForm(p, "ren");
for (const n of [2, 3, 5, 7, 11, 13]) await use(p, n);
assert.equal(p.history.length, 6);
assert.deepEqual(primeNumbers(p), []);
assert.equal(useCount(p), 0);
assert(!p.marks.has("fan_yunjian_count"));
changeForm(p, "yun");
assert.deepEqual(p.storage.fan_zibai_lost_forms, ["ren"]);
assert(p.marks.has("fan_yunjian_count"));
assert.match(skills.fan_yunjian_count.intro.content(null, p), /已使用牌数：0；<br>下一个质数：2/);
assert.match(skills.fan_yunjian_count.intro.content(null, p), /未使用的质数点数：2、3、5、7、J、K/);
assert(!skills.fan_yunjian_count.intro.content(null, p).includes("已使用的质数点数"));
const other = holder(); people.push(other); await use(other, 2);
assert.equal(p.history.length, 6); // another player's card is not counted
assert.equal(useCount(p), 0);
assert.deepEqual(skills.fan_yunjian.subSkill.record.trigger, { player: "useCard1" }); // no respond trigger
const first = await use(p, 2);
assert.equal(first.fan_yunjian_index, 1);
assert(!skills.fan_yunjian.subSkill.record.filter(first, p)); // no double recording
assert.deepEqual(primeNumbers(p), [2]);
assert.match(skills.fan_yunjian_count.intro.content(null, p), /未使用的质数点数：3、5、7、J、K/);

// Independent conditions stack, using distinct random physical cards from the draw pile.
// Equipment has no exclusion: a rank-2 Tengjia must award rank-3 cards, even at ordinal 1.
for (const [name, type, before, expected] of [["tengjia", "equip", 0, 1], ["shan", "basic", 29, 1], ["shan", "basic", 30, 2]]) {
  const actor = holder(); changeForm(actor, "yun");
  for (let i = 0; i < before; i++) await use(actor, 4);
  const candidates = [card(3, false, "c"), card(3, false, "c"), card(8, false, "c")];
  ui.cardPile.childNodes = candidates;
  const used = { name: "useCard", player: actor, card: { name, type, number: 2 }, cards: [] };
  actor.history.push(used);
  await dispatchUseCard1(actor, used);
  assert.equal(used.fan_yunjian_index, before + 1);
  assert(skills.fan_yunjian.filter(used, actor));
  await skills.fan_yunjian.content({}, used, actor);
  assert.deepEqual(actor.gained, candidates.slice(0, expected));
}
ui.cardPile.childNodes = [];
const q = holder(); changeForm(q, "yun"); await use(q, 4);
const candidates = [card(4, false, "c"), card(4, false, "c"), card(9, false, "c")];
ui.cardPile.childNodes = candidates;
const both = await use(q, 3);
await skills.fan_yunjian.content({}, both, q);
assert.deepEqual(q.gained, [candidates[0], candidates[1]]);
assert.match(skills.fan_yunjian_count.intro.content(null, q), /未使用的质数点数：2、5、7、J、K/);
const king = await use(q, 13); await skills.fan_yunjian.content({}, king, q);
assert.equal(q.gained.length, 2);
assert.match(skills.fan_yunjian_count.intro.content(null, q), /未使用的质数点数：2、5、7、J/);
const single = holder();
single.addSkill("fan_yunjian");
await use(single, 4); await use(single, 4); await use(single, 4);
const lone = card(6, false, "c"); ui.cardPile.childNodes = [lone];
await skills.fan_yunjian.content({}, await use(single, 5), single); // only the point is prime
assert.deepEqual(single.gained, [lone]);
const short = holder(); short.addSkill("fan_yunjian"); await use(short, 4);
ui.cardPile.childNodes = [card(4, false, "c")];
await skills.fan_yunjian.content({}, await use(short, 3), short);
assert.equal(short.gained.length, 1); // two conditions, one matching card left
const ordinalOnly = holder(); ordinalOnly.addSkill("fan_yunjian"); await use(ordinalOnly, 4);
ui.cardPile.childNodes = [card(5, false, "c"), card(5, false, "c")];
await skills.fan_yunjian.content({}, await use(ordinalOnly, 4), ordinalOnly);
assert.equal(ordinalOnly.gained.length, 1);
ui.cardPile.childNodes = [];
await skills.fan_yunjian.content({}, await use(ordinalOnly, 5), ordinalOnly);
assert.equal(ordinalOnly.gained.length, 1); // empty pile: no invented cards

// Completed collection upgrades/transitions; every departed form is permanently unavailable.
for (const n of [3, 5, 7, 11, 13]) await use(p, n);
assert.match(skills.fan_yunjian_count.intro.content(null, p), /未使用的质数点数：无/);
await skills.fan_yunjian.content({}, p.history.at(-1), p);
assert.equal(level(p), 2); assert.equal(p.storage.fan_zibai_form, "yan");
assert(!p.hasSkill("fan_yunjian")); assert(!p.marks.has("fan_yunjian_count"));
assert(!changeForm(p, "ren"));
assert(!skills.fan_yanjian.subSkill.dying); // entering dying no longer transitions
const rockTarget = holder();
const rockTurn = await startControl(p, rockTarget);
assert.equal(level(p), 2); assert.equal(p.storage.fan_zibai_form, "yan");
await finishControl(rockTurn);
assert.equal(level(p), 3); assert.equal(p.storage.fan_zibai_form, "yan");
assert(p.hasSkill("fan_yanjian"));
assert.deepEqual(p.storage.fan_zibai_lost_forms, ["ren", "yun"]);
assert(!changeForm(p, "yun")); assert(!changeForm(p, "ren")); assert(!advance(p, "yan"));
assert.equal(useCount(p), 0); assert.deepEqual(primeNumbers(p), []);
assert.equal((await use(p, 4)).fan_yunjian_index, undefined);

// Copied form skills stay usable without a form: no upgrade, removal or forced switch.
const copy = holder(); copy.base = new Set(); copy.addSkill("fan_yunjian");
for (const n of [2, 3, 5, 7, 11, 13]) await use(copy, n);
await skills.fan_yunjian.content({}, copy.history.at(-1), copy);
assert.equal(level(copy), 1); assert(copy.hasSkill("fan_yunjian"));
assert(!skills.fan_renjian.subSkill.prepare.filter({}, copy));
assert.equal(useCount(copy), 6);
copy.removeSkill("fan_yunjian"); await use(copy, 2); copy.addSkill("fan_yunjian");
assert.equal(useCount(copy), 0); assert.deepEqual(primeNumbers(copy), []);
const copiedRock = holder(); copiedRock.base = new Set();
copiedRock.addSkill("fan_yanjian");
copiedRock.awakenSkill("fan_yanjian_control");
copiedRock.removeSkill("fan_yanjian");
copiedRock.addSkill("fan_yanjian");
assert(!copiedRock.awakenedSkills.includes("fan_yanjian_control"));
const copyTurn = await startControl(copiedRock, holder());
await finishControl(copyTurn);
assert.equal(level(copiedRock), 1); assert(copiedRock.hasSkill("fan_yanjian"));
assert(!skills.fan_yanjian.subSkill.control.filter({ player: holder() }, copiedRock));
copiedRock.removeSkill("fan_yanjian");
assert.equal(copiedRock.storage.fan_yanjian_control_used, undefined);
copiedRock.addSkill("fan_yanjian");
assert.equal(copiedRock.storage.fan_yanjian_control_used, false);
assert(skills.fan_yanjian.subSkill.control.filter({ player: holder() }, copiedRock));
// Leaving a form removes only the form's additional source, not a separate copy.
const shared = holder(); shared.addSkill("fan_yunjian");
await use(shared, 2);
changeForm(shared, "yun"); changeForm(shared, "yan");
assert(shared.hasSkill("fan_yunjian"));
assert.equal(useCount(shared), 1); // a still-held independent source is not reacquisition

// Normal yun -> yan -> ren -> full: three skills persist; no remaining form.
const full = holder(); changeForm(full, "yun");
await use(full, 2); await use(full, 3);
assert(advance(full, "yun")); assert(advance(full, "yan"));
assert.equal(full.storage.fan_zibai_form, "ren");
await use(full, 5);
assert(skills.fan_renjian.subSkill.prepare.filter({}, full)); // completion does not require a further available form
await skills.fan_renjian.subSkill.prepare.content({}, {}, full);
assert.equal(full.storage.fan_zibai_form, undefined);
assert.equal(full.storage.fan_zibai_lost_forms, undefined);
assert.equal(full.storage.fan_zibai_upgraded_forms, undefined);
assert(full.storage.fan_zibai_complete);
assert(!full.additionalSkills.fan_sanxiang_form);
for (const s of ["fan_yunjian", "fan_yanjian", "fan_renjian"]) assert(full.hasSkill(s));
assert(!advance(full, "yun"));
assert(!skills.fan_renjian.subSkill.prepare.filter({}, full));
assert.equal(eyeCalls.at(-1)[1], "full");
assert.equal(useCount(full), 0);
assert.equal(skills.fan_yunjian_count.intro.content(null, full), "已使用牌数：0；<br>下一个质数：2");
await use(full, 4);
ui.cardPile.childNodes = [card(4, false, "c"), card(4, false, "c")];
await skills.fan_yunjian.content({}, await use(full, 3), full);
assert.equal(full.gained.length, 2); // burst restarts at ordinal 2 in the complete form
assert(!skills.fan_yunjian_count.intro.content(null, full).includes("未使用"));
for (const n of [2, 5, 7, 11, 13]) await use(full, n);
await skills.fan_yunjian.content({}, full.history.at(-1), full);
assert(full.hasSkill("fan_yunjian")); assert.equal(full.storage.fan_zibai_form, undefined);
const fullTurn = await startControl(full, holder()); await finishControl(fullTurn);
assert.equal(full.storage.fan_zibai_form, undefined); assert.equal(level(full), 3);
assert(full.hasSkill("fan_yanjian"));

// Yan opener: human can only enter the never-lost cloud form; final cloud stays put.
const rockOpener = holder(); changeForm(rockOpener, "yan"); advance(rockOpener, "yan");
assert.equal(level(rockOpener), 2); assert.equal(rockOpener.storage.fan_zibai_form, "ren");
await skills.fan_renjian.subSkill.prepare.content({}, {}, rockOpener);
assert.deepEqual(rockOpener.lastControls, ["兹踞", "取消"]);
assert.equal(rockOpener.storage.fan_zibai_form, "yun");
for (const n of [2, 3, 5, 7, 11, 13]) await use(rockOpener, n);
await skills.fan_yunjian.content({}, rockOpener.history.at(-1), rockOpener);
assert.equal(level(rockOpener), 3); assert(rockOpener.hasSkill("fan_yunjian"));
assert.equal(rockOpener.storage.fan_zibai_form, "yun");
assert.deepEqual(rockOpener.storage.fan_zibai_upgraded_forms, ["yan", "yun"]);
assert(!advance(rockOpener, "yun")); // completed task must not award again
for (const route of [["ren", "yun", "yan"], ["ren", "yan", "yun"], ["yun", "yan", "ren"], ["yun", "ren", "yan"], ["yan", "yun", "ren"], ["yan", "ren", "yun"]]) {
  const state = holder();
  for (const form of route) assert(changeForm(state, form));
  for (const lost of route.slice(0, 2)) assert(!changeForm(state, lost));
  const upgrade = route[2] !== "ren";
  assert.equal(advance(state, route[2]), upgrade);
  assert(!advance(state, route[2]));
  assert.equal(state.storage.fan_zibai_form, route[2]);
  assert.equal(level(state), upgrade ? 2 : 1);
}

// Requested route: human -> rock -> cloud; cloud's final task still upgrades to 3.
const humanOpener = holder(); changeForm(humanOpener, "ren"); changeForm(humanOpener, "yan");
const lastRockTurn = await startControl(humanOpener, holder()); await finishControl(lastRockTurn);
assert.equal(level(humanOpener), 2); assert.equal(humanOpener.storage.fan_zibai_form, "yun");
for (const number of [2, 3, 5, 7, 11, 13]) await use(humanOpener, number);
await skills.fan_yunjian.content({}, humanOpener.history.at(-1), humanOpener);
assert.equal(level(humanOpener), 3); assert.equal(humanOpener.storage.fan_zibai_form, "yun");
assert(humanOpener.hasSkill("fan_yunjian"));
assert.deepEqual(humanOpener.storage.fan_zibai_lost_forms, ["ren", "yan"]);
assert(!advance(humanOpener, "yun"));
assert(full.storage.fan_yanjian_control_used);
assert(!skills.fan_yanjian.subSkill.control.filter({ player: holder() }, full));
skills.fan_yanjian.init(full); // 再次初始化、切换显示不会刷新次数
assert(full.storage.fan_yanjian_control_used);
assert(!skills.fan_yanjian.subSkill.control.filter({ player: holder() }, full));
// 即使原生限定技显示被重置，独立的持有期标记仍阻止重复操控。
full.restoreSkill("fan_yanjian_control");
assert(!skills.fan_yanjian.subSkill.control.filter({ player: holder() }, full));
const duplicateTarget = holder(), duplicateTurn = { player: duplicateTarget, after: [] };
await skills.fan_yanjian.subSkill.control.content({}, duplicateTurn, full);
assert.equal(duplicateTarget._trueMe, undefined); assert.equal(duplicateTurn.after.length, 0);
assert.equal(skills.fan_yanjian.usable, 1); // 主动火焰伤害仍为每出牌阶段一次
const burned = holder(); await skills.fan_yanjian.content({ target: burned }, {}, full);
assert.deepEqual(burned.damageArgs, [1, "fire", full]); // 耗尽操控次数不影响火伤

// Limited control is spent on acquisition, survives loss of source/death, resets on reacquisition.
const controller = holder(), target = holder();
changeForm(controller, "yan");
const independentTurn = await startControl(controller, target);
assert(controller.awakenedSkills.includes("fan_yanjian_control"));
assert.equal(target._trueMe, controller);
assert(target.hasSkill("fan_zibai_controlled"));
changeForm(controller, "ren"); controller.alive = false;
assert.equal(target._trueMe, controller);
assert.equal(skills.fan_zibai_controlled.mod.cardUsable(), Infinity);
assert(skills.fan_zibai_controlled.skillBlocker("fan_nichi", target));
lib.skill.equipment_test = {}; lib.skill.internal_test = { charlotte: true }; target.base.add("internal_test");
assert(!skills.fan_zibai_controlled.skillBlocker("equipment_test", target));
assert(!skills.fan_zibai_controlled.skillBlocker("internal_test", target));
await skills.fan_zibai_controlled.content({}, {}, target);
assert.equal(target._trueMe, undefined); assert.equal(target.blocks.size, 0);
for (const event of independentTurn.after) await event.content(event);
assert.equal(controller.storage.fan_zibai_form, "ren"); // stale callback cannot switch a different form
controller.alive = true; controller.storage.fan_nichi_level = 3;
await skills.fan_renjian.subSkill.prepare.content({}, {}, controller);
assert(!controller.awakenedSkills.includes("fan_yanjian_control"));
assert.equal(controller.storage.fan_yanjian_control_used, false);
assert(skills.fan_yanjian.subSkill.control.filter({ player: holder() }, controller));

// 同名技能的独立来源仍在时并未真正失去，不得刷新操控次数。
const retained = holder(); retained.addSkill("fan_yanjian");
changeForm(retained, "yan");
const retainedTurn = await startControl(retained, holder());
await finishControl(retainedTurn);
assert(retained.hasSkill("fan_yanjian")); assert(retained.storage.fan_yanjian_control_used);
assert(!skills.fan_yanjian.subSkill.control.filter({ player: holder() }, retained));

// The controlled target's death restores control, but upgrades only at the turn's end.
const survivor = holder(), doomed = holder(); changeForm(survivor, "yan");
const deathTurn = await startControl(survivor, doomed);
doomed.alive = false;
await skills.fan_zibai_controlled.content({}, {}, doomed);
assert.equal(level(survivor), 1); assert.equal(survivor.storage.fan_zibai_form, "yan");
for (const event of deathTurn.after) await event.content(event);
assert.equal(level(survivor), 2); assert.equal(survivor.storage.fan_zibai_form, "ren");

// A use from an earlier acquisition cannot trigger a freshly acquired copy.
const renewed = holder(); renewed.addSkill("fan_yunjian");
const oldUse = await use(renewed, 3);
renewed.removeSkill("fan_yunjian"); renewed.addSkill("fan_yunjian");
assert.equal(useCount(renewed), 0);
assert(!skills.fan_yunjian.filter(oldUse, renewed));
assert.equal((await use(renewed, 4)).fan_yunjian_index, 1);

// Swapped local player is returned to the owner when control ends.
const controlled = holder(); controlled._trueMe = controller; game.me = controlled;
await skills.fan_zibai_controlled.content({}, {}, controlled);
assert.equal(swaps.at(-1), controller); game.me = null;

// Lost HP is paid before prevention and still prevents the damage after death.
const dying = holder(); dying.hp = 1;
let cancelled = false;
dying.onLoseHp = () => { assert(!cancelled); dying.alive = false; };
await skills.fan_nichi.content({}, { player: other, cancel() { cancelled = true; } }, dying);
assert(cancelled); assert.equal(dying.hp, 0);
const cancel = holder(); cancel.choices.push(false);
await skills.fan_nichi.content({}, { player: other, cancel() { assert.fail(); } }, cancel);
assert.equal(cancel.stat.triggerSkill.fan_nichi, 0);
const self = holder([card(4, false, "e")]); self.storage.fan_nichi_level = 3; self.choices.push(1);
await skills.fan_nichi.content({}, { player: self, cancel() {} }, self);
assert.equal(self.hp, 4); assert.equal(self.discarded.length, 1);
assert.equal(self.draws, 2); assert.equal(self.getCards("h", c => c.shown).length, 2);
const deadReward = holder(); deadReward.storage.fan_nichi_level = 2;
deadReward.onLoseHp = () => deadReward.alive = false;
await skills.fan_nichi.content({}, { player: other, cancel() {} }, deadReward);
assert.equal(deadReward.draws, 0);

// Mixed zhangba material: only the originally shown component can be donated.
const human = holder(), receiver = holder(); human.giftTarget = receiver; people = [human, receiver];
human.addSkill("fan_renjian");
const light = card(2, false, "d"), dark = card(3, false, "d"), equip = card(5, false, "d"), judge = card(7, false, "d");
const mixed = { name: "useCard", player: human, card: { name: "sha", number: 0 }, cards: [light, dark, equip, judge] };
human.history.push(mixed);
human.losses.push({ getParent: () => mixed, hs: [light, dark], es: [equip], js: [judge], gaintag_map: { [light.cardid]: ["visible_other"] } });
await dispatchUseCard1(human, mixed);
assert.deepEqual(mixed.fan_zibai_shown, [light, equip]);
const discardOf = (use, cards = use.cards) => ({ name: "cardsDiscard", cards, getParent: () => ({ name: "orderingDiscard", relatedEvent: use }) });
const mixedDiscard = discardOf(mixed);
assert(!skills.fan_renjian.subSkill.give.filter(mixed, human)); // useCardAfter is too early / not the discard event
assert(skills.fan_renjian.subSkill.give.filter(mixedDiscard, human));
equip.zone = "h"; // no longer in discard when the optional gift resolves
await skills.fan_renjian.subSkill.give.content({}, mixedDiscard, human);
assert.deepEqual(receiver.gained, [light]);
assert.equal(dark.zone, "d"); assert.equal(judge.zone, "d");

// Ordinary use: still in ordering during useCardAfter, eligible only after orderingDiscard.
const original = card(7, false, "o");
const firstSha = { name: "useCard", player: human, cards: [original], fan_zibai_shown: [original] };
const firstDiscard = discardOf(firstSha);
assert(!skills.fan_renjian.subSkill.give.filter(firstDiscard, human));
original.zone = "d";
assert(skills.fan_renjian.subSkill.give.filter(firstDiscard, human));
assert(!skills.fan_renjian.subSkill.give.filter(firstDiscard, receiver)); // another player's usage cannot be gifted
assert(!skills.fan_renjian.subSkill.give.filter({ cards: [original], getParent: () => ({ name: "discard" }) }, human));

// Qinglong resolves a nested Sha before the first Sha's cleanup; identify each by relatedEvent.
original.zone = "o";
const follow = card(9, false, "o");
const followSha = { name: "useCard", player: human, cards: [follow], fan_zibai_shown: [follow], getParent: () => firstSha };
const followDiscard = discardOf(followSha);
follow.zone = "d";
assert(skills.fan_renjian.subSkill.give.filter(followDiscard, human));
assert(!skills.fan_renjian.subSkill.give.filter(firstDiscard, human));
await skills.fan_renjian.subSkill.give.content({}, followDiscard, human);
assert.equal(receiver.gained.at(-1), follow); assert.equal(original.zone, "o");
original.zone = "d";
await skills.fan_renjian.subSkill.give.content({}, firstDiscard, human);
assert.equal(receiver.gained.at(-1), original);
const wrongBatch = discardOf(firstSha, [dark]);
assert(!skills.fan_renjian.subSkill.give.filter(wrongBatch, human));
assert.deepEqual(skills.fan_renjian.subSkill.give.trigger, { global: "cardsDiscardAfter" });

// Branch audio is explicit: silent bookkeeping/cancellation cannot play it.
voiceCalls = [];
const voiced = holder([card()]);
changeForm(voiced, "ren");
assert.equal(voiceCalls.length, 0, "initial form selection has no departure voice");
await skills.fan_renjian.content({ cards: voiced.cards }, {}, voiced);
assert.equal(voiceCalls.at(-1).id, "fan_renjian_reveal");
assert.equal(voiceCalls.length, 1);
await skills.fan_renjian.content({ cards: voiced.cards }, {}, voiced);
assert.equal(voiceCalls.length, 1, "already shown material cannot play another reveal");
voiced.storage.fan_nichi_level = 3;
await skills.fan_renjian.subSkill.prepare.content({}, {}, voiced);
assert.equal(voiceCalls.at(-1).id, "fan_sanxiang_leave_ren", "becoming complete also loses Ziqiao");
assert(voiced.storage.fan_zibai_complete);
const fresh = card(); voiced.cards.push(fresh);
await skills.fan_renjian.content({ cards: [fresh] }, {}, voiced);
assert.equal(voiceCalls.at(-1).id, "fan_renjian_full_reveal");
ui.cardPile.childNodes = [card(3, false, "c"), card(3, false, "c")];
await use(voiced, 4); // first use, no reward
const overlap = await use(voiced, 2);
const beforeReward = voiceCalls.length;
await skills.fan_yunjian.content({}, overlap, voiced);
assert.equal(voiceCalls.length, beforeReward + 1, "two reward conditions still play one line");
assert.equal(voiceCalls.at(-1).id, "fan_yunjian_full");
ui.cardPile.childNodes = [];
const beforeEmpty = voiceCalls.length;
await skills.fan_yunjian.content({}, await use(voiced, 5), voiced);
assert.equal(voiceCalls.length, beforeEmpty, "no obtainable card means no reward voice");
await skills.fan_yanjian.content({ target: holder() }, {}, voiced);
assert.equal(voiceCalls.at(-1).id, "fan_yanjian_full_damage");
const voicedTurn = await startControl(voiced, holder());
assert.equal(voiceCalls.at(-1).id, "fan_yanjian_full_control_voice");
const afterControl = voiceCalls.length;
await skills.fan_yanjian.subSkill.control.content({}, { player: holder() }, voiced);
assert.equal(voiceCalls.length, afterControl, "spent control cannot replay its voice");
await finishControl(voicedTurn);

const departed = holder(); changeForm(departed, "yun");
const beforeDeparture = voiceCalls.length;
changeForm(departed, "yan");
assert.equal(voiceCalls.at(-1).id, "fan_sanxiang_leave_yun");
assert.equal(voiceCalls.length, beforeDeparture + 1);
await skills.fan_yanjian.content({ target: holder() }, {}, departed);
assert.equal(voiceCalls.at(-1).id, "fan_yanjian_damage");
const normalTurn = await startControl(departed, holder());
assert.equal(voiceCalls.at(-1).id, "fan_yanjian_control_voice");
await finishControl(normalTurn);
assert.equal(voiceCalls.at(-1).id, "fan_sanxiang_leave_yan");
const afterDeparture = voiceCalls.length;
assert.equal(changeForm(departed, "yun"), false);
assert.equal(voiceCalls.length, afterDeparture, "failed form changes have no departure line");

for (const complete of [false, true]) {
  const giver = holder(), recipient = holder(), material = card(7, false, "d");
  giver.storage.fan_zibai_complete = complete; giver.giftTarget = recipient;
  const gift = discardOf({ name: "useCard", player: giver, cards: [material], fan_zibai_shown: [material] });
  await skills.fan_renjian.subSkill.give.content({}, gift, giver);
  assert.equal(voiceCalls.at(-1).id, complete ? "fan_renjian_full_gift" : "fan_renjian_gift");
  const beforeMoved = voiceCalls.length;
  await skills.fan_renjian.subSkill.give.content({}, gift, giver);
  assert.equal(voiceCalls.length, beforeMoved, "moved gift material cannot play audio");
  material.zone = "d";
  giver.chooseTarget = () => selection({ bool: false });
  await skills.fan_renjian.subSkill.give.content({}, gift, giver);
  assert.equal(voiceCalls.length, beforeMoved, "cancelled gift cannot play audio");
}
assert(voiceCalls.every(call => call.direct === true && lib.skill[call.id]?.audio), "all manual voices resolve native audio definitions");

// Drive the actual AI callbacks: all random opening outcomes are legal and reachable.
const randomGet = Array.prototype.randomGet;
for (let index = 0; index < 3; index++) {
  Object.defineProperty(Array.prototype, "randomGet", { configurable: true, value() { return this[index]; } });
  const opener = holder(); opener.aiControls = true;
  await skills.fan_sanxiang.content({}, {}, opener);
  assert.equal(opener.storage.fan_zibai_form, ["yun", "yan", "ren"][index]);
}
Object.defineProperty(Array.prototype, "randomGet", { configurable: true, value: randomGet });
for (const lost of [[], ["yun"], ["yan"]]) {
  const actor = holder(); actor.aiControls = true; changeForm(actor, "ren");
  actor.storage.fan_zibai_lost_forms = [...lost];
  await skills.fan_renjian.subSkill.prepare.content({}, {}, actor);
  assert.equal(actor.storage.fan_zibai_form, lost.includes("yun") ? "yan" : "yun");
  assert(actor.storage.fan_zibai_lost_forms.includes("ren"));
}
const aiComplete = holder(); aiComplete.aiControls = true; changeForm(aiComplete, "ren");
aiComplete.storage.fan_nichi_level = 3;
await skills.fan_renjian.subSkill.prepare.content({}, {}, aiComplete);
assert.equal(aiComplete.storage.fan_zibai_complete, true);
const stuck = holder(); stuck.aiControls = true; changeForm(stuck, "ren");
stuck.storage.fan_zibai_lost_forms = ["yun", "yan"];
assert.equal(skills.fan_renjian.subSkill.prepare.filter({}, stuck), false);

const optionalFull = holder(); changeForm(optionalFull, "ren"); optionalFull.storage.fan_nichi_level = 3;
optionalFull.choices.push(false);
const silentBefore = voiceCalls.length;
await skills.fan_renjian.subSkill.prepare.content({}, {}, optionalFull);
assert.equal(optionalFull.storage.fan_zibai_form, "ren");
assert(!optionalFull.storage.fan_zibai_complete); assert.equal(voiceCalls.length, silentBefore);
const hpCost = holder(); hpCost.storage.fan_nichi_level = 3;
assert(skills.fan_nichi.filter({num:1}, hpCost));
await skills.fan_nichi.content({}, {player:hpCost, cancel() {}}, hpCost);
assert.equal(hpCost.hp, 3);

delete Array.prototype.randomGet;
delete Array.prototype.randomGets;
console.log("zibai: histories, form ownership/cycle/completion, copied skills, control lifetime/reset, damage costs and shown-material gifts passed");
