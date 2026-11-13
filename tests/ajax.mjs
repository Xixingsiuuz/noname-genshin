import { selectConversionMaterial } from "../ui/conversion-material.js";
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const read = path => readFileSync(new URL(path, import.meta.url), 'utf8');
const timeline = [], voices = [];
const ui = { selected: { cards: [], targets: [], buttons: [] }, cardPile: { childNodes: [] } };
const status = { event: {} };
const game = { hasNature: card => ['fire', 'thunder'].includes(card.nature), filterPlayer: fn => [].filter(fn), checkMod: card => card.disabled ? false : 'unchanged', trySkillAudio(id) { voices.push(id); timeline.push(id); } };
let combined = false;
const get = {
  inpileVCardList: filter => [undefined, 'fire', 'thunder', 'ice'].map(nature => ['basic', '', 'sha', nature]).filter(filter),
  type: card => typeof card === 'string' ? (card.startsWith('equip') ? 'equip' : 'basic') : card.type || 'basic',
  subtypes: card => card.subtypes || [typeof card === 'string' ? card : card.name],
  is: { mountCombined: () => combined },
  equipValue: c => c.value ?? 4, value: c => c.value ?? 4, attitude: (p, t) => t.attitude ?? -5,
  damageEffect: (t, p, viewer) => -(t.attitude ?? -5) * 2,
  effect: (t, card) => t.linkValue ?? 0, order: () => 5,
};
const lib = { inpile: ['equip1', 'equip2', 'equip3', 'equip4', 'equip5'] };
const skills = new Function('game', 'get', 'lib', 'ui', '_status', 'setTimeout', 'selectConversionMaterial', read('../character/skills/ajax.js')
  .replace(/^import .*;\r?\n/gm, '').replace('export default', 'return'))(game, get, lib, ui, status, callback => callback(), selectConversionMaterial);
for (const [id, info] of Object.entries({ ...skills })) {
  for (const [sub, definition] of Object.entries(info.subSkill || {})) skills[id + '_' + sub] = definition;
}
const equip = { name: 'equip1', type: 'equip', value: 4 };
status.event.fanConversionCard = equip;
const shaConvert = skills.fan_jingwu_sha.chooseButton.backup([['basic', '', 'sha', 'fire']]);
let dialogList;
ui.create = { dialog(title, [list, type]) { assert.equal(type, 'vcard'); dialogList = list; return { add(cards) { assert(cards.every(card => card.type === 'equip')); } }; } };
function actor() {
  const p = {
    hp: 4, storage: {}, held: new Set(['fan_jingwu', 'fan_kuanglan']), hand: [], equipment: [], empty: [1, 2, 3, 4, 5], alive: true,
    isIn() { return this.alive; }, hasSkill(id) { return this.held.has(id); },
    addSkill(id) { timeline.push('add:' + id); this.held.add(id); },
    removeSkill(id) { timeline.push('remove:' + id); this.held.delete(id); },
    getCards(zone) { return zone === 'e' ? this.equipment : zone === 'h' ? this.hand : [...this.hand, ...this.equipment]; },
    hasCard(fn, zone) { assert.equal(typeof fn, 'function'); return this.getCards(zone).some(fn); },
    countCards(zone, fn) { return this.getCards(zone).filter(fn || (() => true)).length; },
    countEmptySlot(slot) { return this.empty.filter(x => x === slot).length; },
    hasEmptySlot(slot) { return this.countEmptySlot(slot) > 0; },
    canUse(card, target) { assert.equal(target, this); return !card.banned; },
    syncStorage(key) { assert(['fan_jingwu_index', 'fan_kuanglan_count'].includes(key)); }, markSkill() {},
    async gainPlayerCard(target, zone, forced) { assert.equal(zone, 'h'); assert.equal(forced, true); timeline.push('steal'); },
    draw(num) { assert.equal(num, 2); timeline.push('draw'); return { result: { cards: [{}, {}] } }; },
    async gain(card) { timeline.push('gain:' + card.name); this.hand.push(card); ui.cardPile.childNodes.splice(ui.cardPile.childNodes.indexOf(card), 1); },
    async chooseUseTarget({ card, targets, forced, nopopup }) {
      assert.deepEqual(targets, [this]); assert.equal(forced, true); assert.equal(nopopup, true);
      assert(ui.cardPile.childNodes.includes(card)); assert(!this.hand.includes(card));
      timeline.push('equip:' + card.name); ui.cardPile.childNodes.splice(ui.cardPile.childNodes.indexOf(card), 1); this.equipment.push(card);
      for (const slot of get.subtypes(card)) { const i = this.empty.indexOf(Number(slot.slice(5))); if (i >= 0) this.empty.splice(i, 1); }
    },
    async loseHp(num) { this.hp -= num; timeline.push(['loseHp', num]); },
  };
  return p;
}
function target() {
  return { alive: true, linked: false, hand: 1, attitude: -5, isIn() { return this.alive; }, hasSkill: () => false,
    countGainableCards(p, zone) { assert.equal(zone, 'h'); return this.hand; },
    async damage(num, p) { assert.equal(num, 1); timeline.push('damage'); if (this.die) this.alive = false; },
    isLinked() { return this.linked; }, async link(value) { assert.equal(value, true); timeline.push('link'); this.linked = true; } };
}
function dispatch(player, name, trigger) {
  // Dispatch only triggers actually expanded from held skills; no unmounted recorder shortcuts.
  const mounted = [...player.held].flatMap(id => [id, ...(skills[id]?.group || [])]);
  return mounted.reduce(async (previous, id) => {
    await previous;
    const skill = skills[id], triggers = skill?.trigger?.player || skill?.trigger?.global;
    if ((triggers === name || Array.isArray(triggers) && triggers.includes(name)) && skill.filter(trigger, player)) {
      await skill.content({}, trigger, player);
    }
  }, Promise.resolve());
}
let player = actor(), enemy = target();
const sha = t => ({ name: 'useCard', skill: 'fan_jingwu_sha', card: { name: 'sha' }, targets: [t] });
await dispatch(player, 'useCard', sha(enemy));
assert.deepEqual(timeline, ['fan_jingwu_convert_voice', 'fan_jingwu_gain_voice', 'steal', 'link']); assert.equal(player.storage.fan_jingwu_index, 1);
timeline.length = 0; enemy.linked = false;
await dispatch(player, 'respond', { name: 'respond', skill: 'fan_jingwu_sha', card: { name: 'sha' }, source: enemy, targets: [target()] });
assert.deepEqual(timeline, ['fan_jingwu_convert_voice', 'fan_jingwu_damage_voice', 'damage', 'link']); assert.equal(player.storage.fan_jingwu_index, 2);
timeline.length = 0; enemy.linked = false;
await dispatch(player, 'useCard', { name: 'useCard', skill: 'fan_jingwu_shan', card: { name: 'shan' }, respondTo: [enemy] });
assert.deepEqual(timeline, ['draw', 'fan_jingwu_draw_voice', 'link']); assert.equal(player.storage.fan_jingwu_index, 0);
timeline.length = 0; enemy.hand = 0; enemy.linked = false;
await dispatch(player, 'useCard', sha(enemy)); assert.deepEqual(timeline, ['fan_jingwu_convert_voice', 'link']);
timeline.length = 0; enemy.die = true; enemy.linked = false;
await dispatch(player, 'useCard', sha(enemy)); assert.deepEqual(timeline, ['fan_jingwu_convert_voice', 'fan_jingwu_damage_voice', 'damage']);
timeline.length = 0;
await dispatch(player, 'useCard', sha(undefined)); assert.deepEqual(timeline, ['fan_jingwu_convert_voice', 'draw', 'fan_jingwu_draw_voice']);
timeline.length = 0; const index = player.storage.fan_jingwu_index;
await dispatch(player, 'useCard', { ...sha(target()), skill: undefined }); assert.deepEqual(timeline, []); assert.equal(player.storage.fan_jingwu_index, index);
player.storage.fan_jingwu_index = 2; player.draw = () => ({ result: { cards: [] } });
await dispatch(player, 'useCard', sha(undefined)); assert.deepEqual(timeline, ['fan_jingwu_convert_voice'], 'no resource voice if draw produces no cards');
// Nested activation sees the new stage; outer target remains bound despite later array edits.
player = actor(); enemy = target(); const nested = target(); let nestedIndex;
player.gainPlayerCard = async () => { nestedIndex = player.storage.fan_jingwu_index; await dispatch(player, 'useCard', sha(nested)); };
await dispatch(player, 'useCard', sha(enemy)); assert.equal(nestedIndex, 1); assert.equal(player.storage.fan_jingwu_index, 2);
player.storage.fan_jingwu_index = 1; player.held.delete('fan_jingwu');
await dispatch(player, 'useCard', sha(enemy)); assert.equal(player.storage.fan_jingwu_index, 1);
player.held.add('fan_jingwu'); skills.fan_jingwu.onremove(player); assert.equal(player.storage.fan_jingwu_index, undefined);
// Equipment material legality and state-sensitive AI, never modify player legality for preference.
player = actor();
player.hand.push(equip); status.event = { player, skill: 'fan_jingwu_sha' }; ui.selected.cards = [equip];
assert(shaConvert.filterCard(equip, player)); assert(!shaConvert.filterCard({ type: 'basic' }, player));
assert(!shaConvert.filterCard({ type: 'equip', disabled: true }, player));
assert(shaConvert.viewAsFilter(player)); assert(skills.fan_jingwu_shan.ai.respondShan);
assert.equal(shaConvert.viewAs.nature, 'fire');
const selection = { filterCard: card => card.name === 'sha' && card.nature !== 'ice' };
skills.fan_jingwu_sha.chooseButton.dialog(selection, player);
assert.deepEqual(dialogList.map(link => link[3]), [undefined, 'fire', 'thunder']);
assert(skills.fan_jingwu_sha.filter(selection, player));
assert(!skills.fan_jingwu_sha.filter({ filterCard: () => false }, player), 'all Sha forbidden, including exhausted quota');
for (const nature of [undefined, 'fire', 'thunder', 'ice']) {
  assert.equal(skills.fan_jingwu_sha.chooseButton.backup([['basic', '', 'sha', nature], equip]).viewAs.nature, nature);
}
const combinedChoice = skills.fan_jingwu_sha.chooseButton;
status.event = { player, getParent: () => selection };
const natureButton = { link: ['basic', '', 'sha', 'fire'] };
assert(combinedChoice.filter(natureButton, player));
assert.equal(status.event.position, "he");
ui.selected.buttons = [natureButton];
ui.selected.cards = [];
assert(!combinedChoice.filterOk());
ui.selected.cards = [equip];
assert(combinedChoice.filterOk());
ui.selected.buttons = [];
assert(!combinedChoice.filterOk());
ui.selected.buttons = [natureButton];
assert(combinedChoice.filterOk());
player.hand = [];
assert(!combinedChoice.filterOk());
assert(!shaConvert.viewAsFilter(player));
player.hand = [equip];
status.event = { player, skill: 'fan_jingwu_sha' };
assert(!skills.fan_jingwu_effect.filter({ skill: 'unrelated_backup' }));
assert(skills.fan_jingwu_effect.filter({ skill: 'fan_jingwu_sha_backup' }));
ui.selected.cards = []; assert(!shaConvert.filterOk());
ui.selected.targets = [enemy]; assert(!shaConvert.filterOk(), 'target-first intermediate state is not confirmable');
ui.selected.cards = [equip]; assert(shaConvert.filterOk());
ui.selected.cards = []; assert(!shaConvert.filterOk(), 'removing required material disables confirmation');
ui.selected.targets = []; ui.selected.cards = [equip]; assert(shaConvert.filterOk(), 'native target check remains responsible for target count');
enemy = target(); const friend = target(); friend.attitude = 5;
for (const stage of [0, 1]) {
  player.storage.fan_jingwu_index = stage;
  assert(skills.fan_jingwu_sha.ai.effect.player({name:'sha'}, player, enemy)[1] > skills.fan_jingwu_sha.ai.effect.player({name:'sha'}, player, friend)[1]);
}
player.storage.fan_jingwu_index = 2;
assert.equal(skills.fan_jingwu_sha.ai.effect.player({name:'sha'}, player, enemy)[1], 2);
const beforeCost = shaConvert.check(equip);
player.hand = []; player.equipment = [equip];
assert.equal(shaConvert.check(equip), beforeCost); assert(shaConvert.filterCard(equip, player));
// Fill snapshot in slot order, count and deferred cost before nested equip effects.
Array.prototype.randomGet = function () { return this[0]; };
timeline.length = 0; player = actor(); player.empty = [1, 2];
ui.cardPile.childNodes = [{ name: 'equip2', type: 'equip' }, { name: 'equip1', type: 'equip', banned: true }, equip];
const turn = { name: 'phase' }, use = { getParent: name => { assert.equal(name, 'phase'); return turn; } };
await skills.fan_kuanglan.content(use, {}, player);
assert.deepEqual(timeline, ['add:fan_kuanglan_repay', 'fan_kuanglan', 'equip:equip1', 'equip:equip2']);
assert.equal(player.hand.length, 0, 'Rongbei-style equipment never enters hand');
assert.equal(player.hp, 4); assert.equal(player.storage.fan_kuanglan_count, 1);
assert.equal(player.countEmptySlot(1), 0);
timeline.length = 0; await dispatch(player, 'phaseJieshuBegin', turn); assert.deepEqual(timeline, []);
await dispatch(player, 'loseAfter', { es: [equip] }); assert.deepEqual(timeline, [], 'equipment loss has no special penalty');
await dispatch(player, 'phaseEnd', { name: 'phase' }); assert.deepEqual(timeline, [], 'unrelated nested turn does not repay outer debt');
await dispatch(player, 'phaseEnd', turn);
assert.deepEqual(timeline, ['remove:fan_kuanglan_repay', 'fan_kuanglan_repay_voice', ['loseHp', 1]]); assert.equal(player.hp, 3);
await dispatch(player, 'phaseEnd', turn); assert.equal(timeline.length, 3, 'not paid twice');
assert.equal(player.storage.fan_kuanglan_count, 1, 'count survives turn end');
// Actual skill loss/reacquisition does not reset this game count or cancel an existing debt.
const turn2 = { name: 'phase' }; player.empty = [1]; ui.cardPile.childNodes = [];
await skills.fan_kuanglan.content({ getParent: () => turn2 }, {}, player);
player.held.delete('fan_kuanglan'); timeline.length = 0;
await dispatch(player, 'phaseEnd', turn2); assert.deepEqual(timeline, ['remove:fan_kuanglan_repay', 'fan_kuanglan_repay_voice', ['loseHp', 2]]);
player.held.add('fan_kuanglan'); assert.equal(player.storage.fan_kuanglan_count, 2);
// Multiple extra play phases each create a repayment, both read final game count X.
player = actor(); ui.cardPile.childNodes = []; const repeated = { name: 'phase' };
await skills.fan_kuanglan.content({ getParent: () => repeated }, {}, player);
await skills.fan_kuanglan.content({ getParent: () => repeated }, {}, player);
timeline.length = 0; await dispatch(player, 'phaseEnd', repeated);
assert.deepEqual(timeline, ['remove:fan_kuanglan_repay', 'fan_kuanglan_repay_voice', ['loseHp', 2], 'fan_kuanglan_repay_voice', ['loseHp', 2]]);
// Inner and outer turns hold separate debt records, including removal only after all debts paid.
player = actor(); const outer = { name: 'phase' }, inner = { name: 'phase' };
await skills.fan_kuanglan.content({ getParent: () => outer }, {}, player);
await skills.fan_kuanglan.content({ getParent: () => inner }, {}, player);
timeline.length = 0; await dispatch(player, 'phaseEnd', inner); assert.deepEqual(timeline, ['fan_kuanglan_repay_voice', ['loseHp', 2]]);
assert(player.hasSkill('fan_kuanglan_repay'));
timeline.length = 0; await dispatch(player, 'phaseEnd', outer);
assert.deepEqual(timeline, ['remove:fan_kuanglan_repay', 'fan_kuanglan_repay_voice', ['loseHp', 2]]);
// Multiple targets still use only Chongzhen's first target, not every target of the transformed Sha.
player = actor(); enemy = target(); const second = target(); timeline.length = 0;
await dispatch(player, 'useCard', { ...sha(enemy), targets: [enemy, second] });
assert(enemy.linked && !second.linked); assert.equal(player.storage.fan_jingwu_index, 1);
// Lost/disabled slots and state changes don't cause replacement or use another hand card.
player = actor(); player.empty = []; assert(!skills.fan_kuanglan.filter({}, player));
player.empty = [1, 2]; ui.cardPile.childNodes = [equip, { name: 'equip2', type: 'equip' }];
const useEquip = player.chooseUseTarget.bind(player);
player.chooseUseTarget = async options => { await useEquip(options); player.empty = []; };
timeline.length = 0; await skills.fan_kuanglan.content({}, {}, player);
assert.deepEqual(timeline, ['add:fan_kuanglan_repay', 'fan_kuanglan', 'equip:equip1'], 'recheck slots after each native equipment use');
player = actor(); player.empty = [1]; ui.cardPile.childNodes = []; timeline.length = 0;
await skills.fan_kuanglan.content({}, {}, player); assert.deepEqual(timeline, ['add:fan_kuanglan_repay', 'fan_kuanglan']);
assert.equal(player.storage.fan_kuanglan_count, 1, 'no candidate still counts an actual activation');
timeline.length = 0; await dispatch(player, 'phaseEnd', { name: 'phase' });
assert.deepEqual(timeline, ['remove:fan_kuanglan_repay', 'fan_kuanglan_repay_voice', ['loseHp', 1]], 'standalone play phase debt uses next turn-end');
player = actor(); const aiBefore = skills.fan_kuanglan.ai.result.player(player); player.empty = [];
assert(aiBefore > 0); assert(skills.fan_kuanglan.ai.result.player(player) < 0);
player = actor(); player.hp = 1; assert(skills.fan_kuanglan.ai.result.player(player) < 0);
player.hp = 2; assert(skills.fan_kuanglan.ai.result.player(player) > 0, 'low HP with enough equipment benefit can be worthwhile');
player.storage.fan_kuanglan_count = 1; assert(skills.fan_kuanglan.ai.result.player(player) < 0, 'X reevaluated after prior use');
player.hp = 4; player.storage.fan_kuanglan_count = 0; player.empty = [1];
assert(skills.fan_kuanglan.ai.result.player(player) > 0);
player.storage.fan_kuanglan_count = 2; assert(skills.fan_kuanglan.ai.result.player(player) < 0, 'small benefit does not justify large life cost');
player = actor(); player.storage.fan_kuanglan_count = 1;
const aiTurn = { name: 'phase', fan_kuanglan_due: [player] };
status.event = { getParent: () => aiTurn };
assert(skills.fan_kuanglan.ai.result.player(player) < 0, 'existing same-turn debt increases total and marginal life costs');
combined = true; player.empty = [4]; assert(!skills.fan_kuanglan.filter({}, player));
delete Array.prototype.randomGet;
// Compare the local native Chongzhen target callback directly for all interaction branches.
const sp = read('../../../character/sp.js');
const begin = sp.indexOf('    logTarget(event2, player2) {', sp.indexOf('  chongzhen: {'));
const end = sp.indexOf('    prompt2(', begin);
const nativeTarget = new Function('return ({' + sp.slice(begin, end) + '}).logTarget;')();
for (const event of [sha(enemy), { name: 'respond', source: enemy, card: { name: 'sha' } },
  { name: 'useCard', card: { name: 'shan' }, respondTo: [enemy] }]) assert.equal(nativeTarget(event, player), enemy);
// The real Fangtian modifier sees the material in ui.selected.cards during native conversion.
const standard = read('../../../card/standard.js');
const fangStart = standard.indexOf('    fangtian_skill: {');
const fangEnd = standard.indexOf('    fangtian_guozhan:', fangStart);
const fang = new Function('ui', 'get', 'return ({' + standard.slice(fangStart, fangEnd) + '}).fangtian_skill;')(ui, { mode: () => 'identity' });
player = actor(); player.hand = [equip]; ui.selected.cards = [equip];
let range = [1, 1]; fang.mod.selectTarget({ name: 'sha' }, player, range); assert.deepEqual(range, [1, 3]);
player.hand.push({ name: 'tao' }); range = [1, 1]; fang.mod.selectTarget({ name: 'sha' }, player, range); assert.deepEqual(range, [1, 1]);
range = [1, 1]; assert.deepEqual(range, [1, 1], 'without equipment modifier the normal target count stays one');
player.hand = [equip]; ui.selected.cards = [];
range = [1, 1]; fang.mod.selectTarget({ name: 'sha' }, player, range); assert.deepEqual(range, [1, 1]);
// Timing is grounded in local native content, where loss precedes useCard/respond.
const engineContent = read('../../../noname/library/element/content.js');
const useStart = engineContent.search(/^  useCard: \[/m);
const respondStart = engineContent.search(/^  respond: \[/m);
assert(useStart >= 0 && respondStart >= 0);
const useSource = engineContent.slice(useStart, respondStart);
assert(useSource.indexOf('await ownerx.lose(') >= 0);
assert(useSource.indexOf('await ownerx.lose(') < useSource.indexOf('await event.trigger("useCard")'));
const respondSource = engineContent.slice(respondStart, engineContent.indexOf('  async swapHandcards', respondStart));
assert(respondSource.indexOf('await ownerx.lose(') >= 0);
assert(respondSource.indexOf('await ownerx.lose(') < respondSource.indexOf('await event.trigger("respond")'));
assert.equal(skills.fan_jingwu.locked, false); assert.equal(skills.fan_jingwu_effect.locked, false);
assert.equal(skills.fan_jingwu_sha.locked, false); assert.equal(skills.fan_kuanglan.usable, 1);
assert(engineContent.indexOf('await event.trigger("phaseEnd")') < engineContent.indexOf('await event.trigger("phaseAfter")'));
// Use the local native unchain skill, not a custom imitation, after precision's useCard node.
const nativeSkills = read('../../../noname/library/skill.js');
const chainBegin = nativeSkills.indexOf('  _lianhuan4: {');
const chainEnd = nativeSkills.indexOf('  //休整', chainBegin);
const nativeUnchain = new Function('return ({' + nativeSkills.slice(chainBegin, chainEnd) + '})._lianhuan4;')();
for (const nature of ['fire', 'thunder']) {
  player = actor(); enemy = target(); timeline.length = 0;
  enemy.link = async function(value) { this.linked = value ?? !this.linked; timeline.push('link:' + this.linked); };
  const use = { ...sha(enemy), skill: 'fan_jingwu_sha_backup', card: { name: 'sha', nature } };
  await dispatch(player, 'useCard', use);
  assert.deepEqual(timeline, ['fan_jingwu_convert_voice', 'fan_jingwu_gain_voice', 'steal', 'link:true']);
  const damage = { name: 'damage', hasNature: value => value === 'linked', notLink: () => true };
  const hpChange = { getParent: () => damage };
  assert(nativeUnchain.filter(hpChange, enemy)); timeline.push('elemental-damage');
  await nativeUnchain.content({}, hpChange, enemy);
  assert.equal(enemy.linked, false); assert.equal(damage.lianhuanable, true);
  await dispatch(player, 'useCardAfter', use);
  assert.deepEqual(timeline.slice(-2), ['elemental-damage', 'link:false']);
  assert.equal(enemy.linked, false, 'no late precision re-link after elemental Sha');
}
// Predicted chain evaluates friend/enemy consequences, and never adds the bonus recursively.
player = actor(); enemy = target(); const chained = target(); chained.linked = true;
status.event = { player, skill: 'fan_jingwu_sha_backup' }; ui.selected.cards = [equip];
const originalEffect = get.effect, originalPlayers = game.filterPlayer;
game.filterPlayer = fn => [enemy, chained].filter(fn);
get.effect = (t, card, p, viewer, linking) => linking ? -t.attitude * 2 : 0;
chained.attitude = -5;
const enemyChainScore = skills.fan_jingwu_sha.ai.effect.player({ name: 'sha', nature: 'fire' }, player, enemy)[1];
chained.attitude = 5;
const friendChainScore = skills.fan_jingwu_sha.ai.effect.player({ name: 'sha', nature: 'fire' }, player, enemy)[1];
assert(enemyChainScore > friendChainScore);
assert.equal(skills.fan_jingwu_sha.ai.effect.player({ name: 'sha', nature: 'fire' }, player, enemy, 0, { source: enemy }), undefined);
get.effect = originalEffect; game.filterPlayer = originalPlayers;
console.log('PASS Ajax v2: mounted triggers; cyclic/nested conversion, Chongzhen targets, resource/voice/link timing, cumulative game uses, matching-turn deferred life loss, nested turns and extra phases, per-slot fill, AI costs (simulation; no live match).');
