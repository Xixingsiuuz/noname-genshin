import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const read = path => readFileSync(new URL(path, import.meta.url), 'utf8');
const choice = result => ({ set() { return this; }, async forResult() { return result; } });
const status = {}, ui = { selected: { cards: [], targets: [] } };
const lib = { skill: {}, filter: { cardDiscardable: card => !card.protected } };
const voices = [];
const game = {
  trySkillAudio: id => voices.push(id),
  players: [], phaseNumber: 0,
  filterPlayer: fn => game.players.filter(fn || (() => true)),
  hasPlayer: fn => game.players.some(fn), countPlayer: () => game.players.length,
  createCard: (name, suit, number) => ({ name, suit, number }),
};
const get = { color: card => card.color, translation: () => '目标', effect: () => -1, value: () => 1 };
const skills = new Function('lib', 'game', 'get', 'ui', '_status', read('../character/skills/yaemiko.js')
  .replace(/^import .*;\r?\n/, '').replace('export default', 'return'))(lib, game, get, ui, status);
const cards = new Function('game', 'get', '_status', read('../card/yaemiko.js')
  .replace(/^import .*;\r?\n/, '').replace('export const yaemikoCards', 'const yaemikoCards')
  .replace('export const yaemikoCardTranslate', 'const yaemikoCardTranslate') + '\nreturn yaemikoCards;')(game, get, status);
Array.prototype.sortBySeat = function(start) { assert.equal(start, status.currentPhase); return this.sort((a,b) => a.seat-b.seat); };
Array.prototype.remove = function(value) { const i=this.indexOf(value); if(i>=0) this.splice(i,1); return this; };
const log = [];
function player(seat, sex='male', max=0) {
  return { seat, sex, storage: {}, hand: [], charge: 0, alive: true, answer: true, hp: 3, maxHp: 3,
    hasSkill() { return false; },
    isIn() { return this.alive; }, hasSex(s) { return this.sex===s; }, getCards() { return this.hand; },
    countCards() { return this.hand.length; }, countDiscardableCards() { return this.hand.filter(lib.filter.cardDiscardable).length; },
    countCharge() { return this.charge; }, addCharge(n) { this.charge = Math.min(max, this.charge+n); }, removeCharge(n) { this.charge-=n; },
    chooseBool() { return choice({bool:this.answer}); }, logSkill() {},
    changeZhuanhuanji(id) { this.storage[id]=!this.storage[id]; },
    async gain(card) { this.hand.push(card); },
    chooseCard() { return choice({bool:!!this.offer, cards: this.offer ? [this.offer] : []}); },
    async give(cs, to) { for(const c of Array.isArray(cs)?cs:[cs]) { this.hand.remove(c); to.hand.push(c); } },
    async damage(n,nature,source) { if(typeof nature !== 'string') source=nature; log.push(['damage',this.seat,source?.seat,nature]); },
    async draw(n) { log.push(['draw',this.seat,n]); this.hand.push(...Array.from({length:n},()=>({color:'red'}))); this.afterDraw?.(); },
    async discard(cs) { for(const c of cs) {this.hand.remove(c); c.color='red';} },
    async gainPlayerCard(target) { log.push(['gain',this.seat]); this.hand.push(target.hand.shift()); this.offer=this.hand[0]; },
  };
}
const yae=player(1,'female',4), a=player(2), b=player(3,'female',4);
game.players=[yae,a,b]; status.currentPhase=yae;
// Start trigger is reachable only by expanding held skill's group.
assert.equal(skills.fan_tianhu.group,'fan_tianhu_start');
assert(skills.fan_tianhu_start.filter({},yae));
await skills.fan_tianhu_start.content({}, {}, yae);
assert(yae.storage.fan_tianhu);
assert(!skills.fan_tianhu_start.filter({},yae));
skills.fan_yingxiang.init(yae); skills.fan_yingxiang.init(yae); assert.equal(yae.charge,1);
let use={targets:[yae,b]};let trigger={player:a,target:yae,card:{name:'sha'},getParent:()=>use};
assert(skills.fan_tianhu.filter(trigger,yae));
await skills.fan_tianhu.content({},trigger,yae);
assert.deepEqual(use.targets,[b]);assert.equal(yae.storage.fan_tianhu,false);
assert.deepEqual(yae.hand.pop(),{name:'fan_xiaolicangdao',suit:'spade',number:6});
use={targets:[a,b]};trigger={player:yae,target:a,card:{name:'sha'},getParent:()=>use};
yae.answer=false;await skills.fan_tianhu.content({},trigger,yae);assert.equal(use.targets.length,2);
yae.answer=true;await skills.fan_tianhu.content({},trigger,yae);
assert.deepEqual(use.targets,[b]);assert(yae.storage.fan_tianhu);
assert.deepEqual(yae.hand.pop(),{name:'fan_meirenji',suit:'heart',number:6});
trigger.target=yae;assert(!skills.fan_tianhu.filter(trigger,yae),'self use does not trigger');
// Choice order must not control effect order; dead targets are skipped.
yae.charge=3; b.offer={color:'black'};b.hand=[b.offer];
await skills.fan_yingxiang.content({targets:[b,a]}, {}, yae);
assert.equal(yae.charge,1);assert.deepEqual(log.shift(),['damage',2,1,'thunder']);assert.equal(yae.hand[0].color,'black');
// Joint selection remains incomplete until both cards and a target exist.
ui.selected.targets=[yae];ui.selected.cards=[{}];assert(!skills.fan_mingshen.filterOk());
ui.selected.cards.push({});assert(skills.fan_mingshen.filterOk());ui.selected.targets=[];assert(!skills.fan_mingshen.filterOk());
// Snapshot black before discard mutates card state; cap applies after drawing.
yae.hand=[{color:'black'},{color:'black'}];yae.charge=3;
await skills.fan_mingshen.content({cards:[...yae.hand],target:yae},{},yae);assert.equal(yae.charge,4);
yae.hand=[{color:'black'},{color:'red'}];b.charge=0;
await skills.fan_mingshen.content({cards:[...yae.hand],target:b},{},yae);assert.equal(b.charge,0);
yae.hand=[{color:'black'},{color:'black'}];
await skills.fan_mingshen.content({cards:[...yae.hand],target:a},{},yae);assert.equal(a.charge,0,'no implicit capacity');
// Female user participates; compare hands once after all women resolve.
log.length=0;yae.hand=[];b.hand=[];a.hand=[{},{},{},{}];
await cards.fan_meirenji.content({target:a},{},yae);
assert.deepEqual(log.filter(x=>x[0]==='gain'),[['gain',1],['gain',3]]);
assert.equal(yae.hand.length,2);assert.equal(a.hand.length,2);assert(!log.some(x=>x[0]==='damage'));
log.length=0;b.alive=false;yae.hand=[];a.hand=[{},{},{},{}];
await cards.fan_meirenji.content({target:a},{},yae);
assert.deepEqual(log.at(-1),['damage',2,1,yae]);
log.length=0;a.hp=-3;a.maxHp=4;
await cards.fan_xiaolicangdao.content({target:a},{},yae);
assert.deepEqual(log[0],['draw',2,5]);assert.equal(log[1][0],'damage');assert.equal(log[1][2],1);
log.length=0;a.afterDraw=()=>a.alive=false;
await cards.fan_xiaolicangdao.content({target:a},{},yae);assert.equal(log.length,1);
for(const card of Object.values(cards)) {assert(!card.vanish);assert(!card.destroy);assert.equal(card.derivation,'fan_yaemiko');}
for(const skill of Object.values(skills).filter(s => s.persevereSkill)) {assert.equal(skill.locked,false);assert(skill.persevereSkill);}
console.log('yaemiko: skill timing, choices, charge caps, female user and physical cards passed');

// Normal voice occurs after draw and charging; conversion selects only Easter pool.
voices.length=0; yae.hand=[{color:'black'},{color:'black'}]; a.alive=true;a.afterDraw=null;
const held=new Set(['fan_wuxiang']);a.hasSkill=id=>held.has(id);
lib.skill.fan_wuxiang={resolveCharge:async(target,n,voice,silent)=>{assert.equal(n,3);assert(silent);assert.equal(voices.length,0);held.delete('fan_wuxiang');held.add('fan_yushen');}};
await skills.fan_mingshen.content({cards:[...yae.hand],target:a},{},yae);
assert.deepEqual(voices,['fan_mingshen_easter_voice']);
console.log('yaemiko voices: post-resolution Easter replaces normal voice');
