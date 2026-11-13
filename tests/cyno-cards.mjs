import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
const read = path => readFileSync(new URL(path, import.meta.url), 'utf8');
const source = read('../card/qisheng-pool.js').replace(/export /g, '');
const sample = new Function(source + ';return sampleDarkMagician;')();
const low = sample(() => 0);
assert.equal(low.length, 5);
assert.equal(low.filter(c => c.source === 'pile').length, 2);
assert(low.slice(2).every(c => c.name === 'fan_modaoqishi'));
const high = sample(() => .999999);
assert.equal(high.filter(c => c.source === 'pile').length, 3);
assert(high.slice(0, 3).every(c => c.name === 'wuzhong'));
assert(high.slice(3).every(c => c.name === 'fan_yongyuanzhihun'));
for (const value of [-1, 1, NaN]) assert.throws(() => sample(() => value), RangeError);
const cardsSource = read('../card/cyno.js').replace(/^import .*;\r?\n/gm, '').replace(/export /g, '');
const cards = new Function('game', 'get', 'sampleDarkMagician', cardsSource + ';return cynoCards;')({}, { poptip: id => id }, sample);
assert.equal(Object.keys(cards).length, 5);
// 直接复用原生销毁判断，测试没有角色、技能或持有者的路径。
const native = read('../../../noname/library/element/card.js');
const body = native.slice(native.indexOf('  willBeDestroyed('), native.indexOf('  hasNature('));
const nativeRule = new Function('lib', 'return ({' + body + '}).willBeDestroyed;')({ skill: {} });
for (const definition of Object.values(cards)) {
  assert.equal(definition.fullskin, true);
  assert(existsSync(new URL('../' + definition.image.replace('ext:原神/', ''), import.meta.url)));
  assert.equal(definition.destroy, 'discardPile');
  const entity = { destroyed: definition.destroy };
  assert.equal(nativeRule.call(entity, 'discardPile', null, {}), true);
  for (const area of ['handcard', 'equip', 'ordering', 'special', 'expansion']) assert.equal(nativeRule.call(entity, area, null, {}), false);
}
assert(read('../card/index.js').includes('...cynoCards'));
const tester = read('../character/skills/tester.js');
assert(tester.includes('Object.keys(createCardPackage().card)'));
assert(tester.includes('lib.card[id]?.derivation'));
assert(read('../character/skill.js').includes('...cynoCardSkills'));
const skills = new Function('lib', 'get', 'ui', '_status', read('../card/cyno-skills.js').replace(/^import .*;\r?\n/gm, '').replace('export default', 'return'))({}, {}, {}, {});
assert.equal(skills.fan_yongyuanzhihun_skill.fan_cyno_open_choice, true);
assert.equal(skills.fan_yongyuanzhihun_skill.direct, true);
assert.equal(skills.fan_yongyuanzhihun_skill.chooseButton.forced, undefined, '牌名选择保留原生取消');
assert.equal(skills.fan_heimodaozhen_skill.direct, undefined, '看牌前保留确认');
assert.equal(skills.fan_heimodaozhen_skill.prompt2, false);
assert.match(skills.fan_heimodaozhen_skill.content.toString(), /chooseToMove\([^\n]+, true\)/, '看牌后的选择强制完成');
console.log('赛诺：抽样分支、原生销毁区域判定、卡包与模块测试入口检查通过（模拟测试）。');
const pile = [];
function entity(name) { const card = { name, remove() { pile.splice(pile.indexOf(card), 1); } }; return card; }
pile.push(entity('wuxie'), entity('sha'));
const batches = [];
const runtime = new Function('game', 'get', 'sampleDarkMagician', cardsSource + ';return cynoCards;')({
  updateRoundNumber() {}, createCard: (name, suit, number) => ({ name, suit, number }),
}, {
  poptip: id => id, cardPile2: fn => pile.find(fn), cards: num => pile.splice(0, num),
}, () => [{ source: 'pile', name: 'wuxie' }, { source: 'pile', name: 'wuxie' }, ...Array.from({length:3}, () => ({source:'derived',name:'fan_heimoshushi'}))]);
await runtime.fan_heimoshumiyi.content({}, null, {isIn:()=>true, async gain(cards, animation) { batches.push({cards,animation}); }});
assert.equal(batches.length, 2);
assert.deepEqual(batches[0].cards.map(c=>c.name), ['wuxie','sha']);
assert.equal(new Set(batches[0].cards).size, 2);
assert.equal(batches[1].cards.length, 3);
assert(batches[1].cards.every(c=>c.suit==='club'&&c.number===7));
assert(batches.every(batch=>batch.animation==='draw'));
assert.equal(skills.fan_heimoshushi_rule.prompt2, false);
assert.equal(typeof skills.fan_heimoshushi_rule.prompt, 'string');
console.log('两批暗置获得、重复牌名缺牌回退、衍生牌梅花7与简短居中提示配置检查通过。');
