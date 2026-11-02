import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("../character/skills/kinich.js", import.meta.url), "utf8");
const status = {};
const get = { name: c => c.name, tag: c => c.damage || 0, translation: () => "目标" };
let limit = 1, used = 0;
const played = [];
const game = { players: [], trySkillAudio: id => played.push(id), checkMod: (c,p,n) => limit, hasPlayer2: () => false };
const lib = { filter: {
  cardEnabled: c => !c.disabled,
  filterTarget: (c,p,t) => t.isIn() && !t.outOfRange && !t.protected,
  targetEnabled: (c,p,t) => t.isIn() && !t.protected,
  targetInRange: (c,p,t) => !t.outOfRange,
} };
// 使用本地引擎的真实次数过滤器，复现嵌套父事件导致跳过次数检查的情况。
const engine = readFileSync(new URL("../../../noname/library/index.js", import.meta.url), "utf8");
const start = engine.indexOf("    cardUsable(card, player, event) {");
const end = engine.indexOf("\n    },", start) + 7;
const engineGet = { autoViewAs: c => c, info: () => ({ usable: 1, updateUsable: "phaseUse" }) };
lib.filter.cardUsable = new Function("lib", "game", "get", "_status",
  `return ({${engine.slice(start, end)}}).cardUsable;`)(lib, game, engineGet, status);
const skills = new Function("lib", "game", "get", "_status",
  source.replace(/^import .*;\r?\n/, "").replace("export default", "return"))(lib, game, get, status);
const target = { isIn: () => true }, other = { isIn: () => true };
let options;
const player = {
  countUsed: () => used,
  chooseToUse() {
    options = {};
    return { set(k,v) { options[k]=v; return this; } };
  },
};
await skills.fan_xuanlie.content({}, { target, card: { name: "wuzhong" } }, player);
const sha = { name: "sha" };
const nested = { player, getParent: () => ({ name: "fan_xuanlie" }) };
used = 1;
assert(lib.filter.cardUsable(sha,player,nested)); // 原生嵌套流程会放行。
assert(options.filterCard(sha,player,nested)); // 额度耗尽仍可追杀。
used = 0; assert(options.filterCard(sha,player,nested));
assert(!options.filterCard({ name:"shan" },player,nested));
assert(!options.filterCard({ name:"sha",disabled:true },player,nested));
limit = 2; used = 1; assert(options.filterCard(sha,player,nested));
used = 2; assert(options.filterCard(sha,player,nested));
assert.equal(options.addCount, false); // 不占用正常额度。
assert.equal(played.length,0); // 打开或取消选择不播音。
options.oncard(sha,player);
assert.equal(played.at(-1),'fan_xuanlie_sha_voice');
assert.equal(options.selectTarget, -1); // 唯一原目标由原生流程自动选中。
assert(options.manualConfirm && options.fanPairedConfirm);
assert.equal(options.prompt2, false);
status.event = options;
assert(options.filterTarget(sha,player,target));
assert(!options.filterTarget(sha,player,other));
target.outOfRange = true; assert(!options.filterTarget(sha,player,target));
target.outOfRange = false; target.isIn = () => false;
assert(!options.filterTarget(sha,player,target));

const beast = skills.fan_shouxing, yang = beast.subSkill.yang, yin = beast.subSkill.yin;
assert.equal(yang.mod.cardUsable(sha,player,1),2);
assert.equal(yang.mod.cardUsable({name:"tao"},player,1),undefined);
assert.equal(yang.mod.attackRange(player,2),3);
assert.equal(yang.trigger.source,undefined); // 已移除伤害加成触发器。
const first = {}, second = {};
player.getHistory = () => [first,second];
assert(yang.filter(first,player)); assert(!yang.filter(second,player));
let hit;
await yang.content({}, { directHit: { addArray: targets => hit = targets } });
assert.equal(hit,game.players);
player.storage = {};
player.changeZhuanhuanji = () => player.storage.fan_shouxing = !player.storage.fan_shouxing;
player.addTempSkill = (name,expiry) => { hit = name; assert.equal(expiry,"phaseAfter"); };
await beast.content({}, {}, player); assert.equal(hit,"fan_shouxing_yang");
assert.equal(played.at(-1),'fan_shouxing_yang_voice');
await beast.content({}, {}, player); assert.equal(hit,"fan_shouxing_yin");
assert.equal(played.at(-1),'fan_shouxing_yin_voice');
const draw = {num:2}; await yin.content({},draw); assert.equal(draw.num,3);
assert(!yin.filter({numFixed:true})); assert.equal(yin.mod.maxHandcard(player,4),5);
assert.equal(skills.fan_xuanlie.locked,false);
assert(beast.locked && yang.locked && yin.locked);
console.log("Kinich: native usage limits, fixed target, turn modes and first-card response checks passed.");
