import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const types = { sha: "basic", shan: "basic", tao: "basic", jiu: "basic", wuzhong: "trick", huogong: "trick", wugu: "trick" };
let hand = [], phase = true, dying;
const player = {
  countCards(position, filter) { assert.equal(position, "h"); return hand.filter(filter).length; },
  getUseValue(card) { return { wuzhong: 9, huogong: -2, sha: 3, wugu: 12 }[card.name] || 0; },
};
const lib = { inpile: Object.keys(types) };
const get = { type2: card => types[typeof card === "string" ? card : card.name], player: () => player,
  attitude: (from, to) => to.friend ? 5 : -5 };
const status = { get event() { return { getParent: () => ({ type: phase ? "phase" : "respond" }), dying }; } };
const source = readFileSync(new URL("../character/skills/emilie.js", import.meta.url), "utf8");
const skills = new Function("lib", "get", "game", "ui", "_status", source
  .replace(/^import .*;\r?\n/gm, "").replace("export default", "return"))(lib, get, {}, {}, status);
const skill = skills.fan_xiecui_gift;
const gift = name => ({ name, gaintag: ["fan_xiecui_owner"] });
const button = name => ({ link: [types[name], "", name] });
assert.equal(skill.ai.order, 7);
hand = [gift("sha")];
assert.equal(skill.hiddenCard(player, "shan"), true);
assert.equal(skill.hiddenCard(player, "wuzhong"), false);
assert.equal(skill.ai.skillTagFilter(player, "respondShan"), true);
hand = [gift("wuzhong")];
assert.equal(skill.ai.skillTagFilter(player, "respondShan"), false);
assert.equal(skill.ai.skillTagFilter(player, "fireAttack"), true);
assert.ok(skill.chooseButton.check(button("wuzhong")) > skill.chooseButton.check(button("huogong")));
assert.equal(skill.chooseButton.check(button("wugu")), 0);
phase = false;
assert.equal(skill.chooseButton.check(button("shan")), 1);
dying = { friend: true }; assert.equal(skill.ai.result.player(player), 5);
dying = { friend: false }; assert.equal(skill.ai.result.player(player), -5);
hand = [{ name: "sha", gaintag: [] }];
assert.equal(skill.hiddenCard(player, "shan"), false);
hand = [];
assert.equal(skill.ai.skillTagFilter(player, "respondSha"), false);
console.log("PASS Emilie AI: active value ranking, cautious mass cards, response needs, category/tag restrictions, friend/enemy rescue, material depletion");
