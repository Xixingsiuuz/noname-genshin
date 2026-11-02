import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const source = readFileSync(new URL("../character/skills/lauma.js", import.meta.url), "utf8");
const status = {};
const get = {
  is: { shownCard: c => c.gaintag.some(t => t.startsWith("visible_") || t.startsWith("eternal_visible_")) },
  position: c => c.zone, name: c => c.name, value: () => 3,
};
const game = {
  filterPlayer() { const list = [p, other]; list.sortBySeat = () => list; return list; },
  hasPlayer: fn => [p, other].some(fn),
};
const { skills, reveal } = new Function("game", "get", "_status", source
  .replace(/^import .*;\r?\n/, "")
  .replace("export async function", "async function")
  .replace("export default", "const skills =") + "\nreturn {skills,reveal:revealShengyong};")(game, get, status);
const card = (name, zone = "h", gaintag = []) => ({ name, zone, gaintag, cardid: Math.random().toString(), hasGaintag(t) { return this.gaintag.includes(t); } });
const answer = value => ({ set() { return this; }, forResult: async () => value });
function holder(cards) {
  return {
    cards, used: false, isIn: () => true, isDamaged: () => true,
    hasSkill(name) { return name === "fan_daoge_used" ? this.used : true; },
    addTempSkill(name, expiry) {
      assert.equal(name, "fan_daoge_used");
      assert.deepEqual(expiry, { global: "phaseAfter" });
      this.used = true;
    },
    getCards(zone, fn = () => true) { return this.cards.filter(c => zone.includes(c.zone) && fn(c)); },
    hasCard(fn, zone) { return this.getCards(zone, fn).length > 0; },
    logSkill() {},
    async addShownCards(cards, tag) { for (const c of cards) if (this.cards.includes(c) && c.zone === "h") c.gaintag.push(tag); },
  };
}
const a = card("sha"), b = card("sha"), dark = card("shan");
const p = holder([a, dark]), other = holder([b, card("tao")]);
p.chooseCard = () => answer({ bool: true, cards: [a] });
await reveal(p);
assert(get.is.shownCard(a)); assert(get.is.shownCard(b)); assert(!get.is.shownCard(dark));
assert.equal(skills.fan_shengyong.mod.ignoredHandcard(a), true);
assert.equal(skills.fan_shengyong.mod.ignoredHandcard(dark), undefined);
assert.equal(skills.fan_shengyong.mod.cardDiscardable(a, p, "phaseDiscard"), false);
assert.equal(skills.fan_shengyong.mod.cardDiscardable(a, p, "skill"), undefined);
const draw = skills.fan_shengyong.subSkill.draw;
assert(draw.filter({ player: other, card: { name: "sha" } }, p));
assert(!draw.filter({ player: p, card: { name: "sha" } }, p));
p.cards = [card("zhuge", "e"), card("lebu", "j"), card("tao", "h", ["faceup_tag"])];
assert(draw.filter({ player: other, card: { name: "zhuge" } }, p));
assert(draw.filter({ player: other, card: { name: "tao" } }, p));
assert(!draw.filter({ player: other, card: { name: "lebu" } }, p));
const sync = skills.fan_shengyong.subSkill.sync;
// 重现截图：原有明置闪，自己和孙权后来摸到的闪都必须明置。
const sourceShan = card("shan", "h", ["visible_fan_shengyong"]);
const newOwnShan = card("shan"), newSunquanShan = card("shan");
const unrelated = card("sha");
p.cards = [sourceShan, newOwnShan]; other.cards = [newSunquanShan, unrelated];
assert(sync.filter({}, p));
await sync.content({}, {}, p);
assert(get.is.shownCard(newOwnShan)); assert(get.is.shownCard(newSunquanShan));
assert(!get.is.shownCard(unrelated));
assert.equal(skills.fan_shengyong.mod.ignoredHandcard(newOwnShan), true);
assert(!sync.filter({}, p)); // 明置产生的嵌套触发必须终止。
// 孙权制衡后新获得的同名牌，仍由获得牌事件同步。
const replacement = card("shan"); other.cards = [replacement];
await sync.content({}, {}, p);
assert(get.is.shownCard(replacement));
// 装备也是当前明置牌的来源；判定区不提供牌名。
p.cards = [card("zhuge", "e"), card("lebu", "j")];
const weapon = card("zhuge"), delay = card("lebu"); other.cards = [weapon, delay];
await sync.content({}, {}, p);
assert(get.is.shownCard(weapon)); assert(!get.is.shownCard(delay));
// 同名明置来源全部离开菈乌玛后，不凭历史牌名继续明置新牌。
p.cards = []; const later = card("shan"); other.cards = [later];
assert(!sync.filter({}, p));
assert(!get.is.shownCard(later));
const daoge = skills.fan_daoge;
const lost = card("sha");
const lossEvent = tags => ({ getl: () => ({ hs: [lost], gaintag_map: { [lost.cardid]: tags } }) });
assert(daoge.filter(lossEvent(["visible_fan_shengyong"]), p));
assert(daoge.filter(lossEvent(["faceup_tag"]), p));
assert(!daoge.filter(lossEvent([]), p));
assert(!daoge.filter({ getl: () => ({ hs: [], gaintag_map: { [lost.cardid]: ["visible_x"] } }) }, p));
status.currentPhase = p;
assert(!daoge.filter(lossEvent(["visible_x"]), p));
status.currentPhase = other;
const drawn = card("shan"), old = card("tao"); p.cards = [old, drawn];
p.draw = () => answer({ bool: true, cards: [drawn] });
p.chooseTarget = () => answer({ bool: true, targets: [other] });
let given;
p.give = async cards => { given = cards; };
await draw.content({}, {}, p);
assert.deepEqual(given, [drawn]);
// 摸牌引发其他技能，摸到的实体牌已离手时，不能改送旧手牌。
p.cards = [old]; given = undefined;
await draw.content({}, {}, p);
assert.equal(given, undefined);
let recovered = 0;
other.recover = async () => recovered++;
p.chooseControl = () => answer({ control: "回复体力" });
await daoge.content({}, {}, p);
assert.equal(recovered, 1);
assert(p.used);
assert(!daoge.filter(lossEvent(["visible_x"]), p));
// 下一回合由原生临时技能到期清除后可再次发动。
p.used = false;
assert(daoge.filter(lossEvent(["visible_x"]), p));
p.chooseControl = () => answer({ control: "cancel2" });
await daoge.content({}, {}, p);
assert(!p.used);
p.chooseControl = () => answer({ control: "回复体力" });
p.chooseTarget = () => answer({ bool: false });
await daoge.content({}, {}, p);
assert(!p.used);
p.cards = [card("sha")];
p.chooseControl = () => answer({ control: "发动圣咏" });
p.chooseCard = () => answer({ bool: false });
await daoge.content({}, {}, p);
assert(!p.used);
p.chooseCard = () => answer({ bool: true, cards: [p.cards[0]] });
await daoge.content({}, {}, p);
assert(p.used);
console.log("lauma: reveal, equipment/judgment scope, loss snapshots, turn limits, draw/give and recovery passed");
