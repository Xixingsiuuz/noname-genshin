import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";

const read = name => readFileSync(new URL("../card/" + name + ".js", import.meta.url), "utf8")
  .replace(/^import[^\n]*\n/gm, "").replace(/^export /gm, "");
const sounds = [];
const lib = { config: { background_audio: true }, card: { derived: { derivation: "fan_cyno" } } };
const skill = new Function("game", "lib", read("cyno-sound") + ";return cynoSoundSkill;")({
  playAudio: (directory, name) => sounds.push(name),
}, lib);
// 无名杀的 AsyncCompiler 只接收 async 函数。普通函数会被 StepCompiler
// 重新构造，从而丢失音效模块内的闭包。
const nativeCompiler = readFileSync(new URL(
  "../../../noname/library/element/GameEvent/compilers/AsyncCompiler.js", import.meta.url
), "utf8").replace(/^import[^\n]*\n/gm, "").split("export {")[0];
const asyncCompiler = new Function("AsyncFunction", "ContentCompilerBase", "compiler",
  nativeCompiler + ";return new AsyncCompiler();"
)(Object.getPrototypeOf(async function () {}).constructor, class {}, { compile: ([content]) => content });
assert(asyncCompiler.filter(skill.content), "音效回调必须保留模块闭包");
const run = asyncCompiler.compile(skill.content);
const physical = { name: "derived" };
const use = { cards: [physical], card: { name: "sha" }, player: { getHistory: (name, filter) => [loss].filter(filter) } };
const loss = { getParent: () => use, hs: [physical] };
assert(skill.filter(use, null, "useCard1"));
await run({ triggername: "useCard1" }, use);
await run({ triggername: "useCard1" }, use);
assert(!skill.filter({ ...use }, null, "useCard1"));
const cosmicUse = { card: { name: "fan_yuzhouyaobian" }, player: { getHistory: () => [] } };
assert(skill.filter(cosmicUse, null, "useCard1"));
await run({ triggername: "useCard1" }, cosmicUse);
const conversion = { skill: "fan_kaiyiya_shan", player: { getVCards: () => [] } };
assert(skill.filter(conversion, null, "respond"));
await run({ triggername: "respond" }, conversion);
const neutralized = { card: { name: "derived" } };
assert(skill.filter(neutralized, null, "eventNeutralized"));
await run({ triggername: "eventNeutralized" }, neutralized);
lib.config.background_audio = false;
await run({ triggername: "respond" }, { ...conversion });
assert.deepEqual(sounds, ["set.ogg", "set.ogg", "activate.ogg", "destroyed.wav"]);
for (const name of ["set.ogg", "activate.ogg", "addcounter.ogg", "destroyed.wav", "explode.ogg", "specialsummon2.ogg"]) {
  assert(existsSync(new URL("../audio/cyno/card/" + name, import.meta.url)));
}
const played = [];
const trains = new Function("playCynoSound", "game", read("trains") + ";return trainSkills;")(
  name => played.push(name), { phaseNumber: 1 },
);
const target = { isIn: () => true, async damage() { played.push("damage"); } };
const player = { isIn: () => true, inRange: () => true, getEquip: () => turret };
const turret = { name: "fan_paotalieche" };
for (const id of ["fan_paotalieche_shoot", "fan_potianjuai_shoot"]) {
  await trains[id].content({ targets: [target] }, null, player);
  assert.deepEqual(played.splice(0), ["attack", "explode", "damage"]);
}
const range = [1, 1];
trains.fan_potianjuai_targets.mod.selectTarget({ name: "sha" }, player, range);
assert.equal(range[1], Infinity);
assert.deepEqual(played, []);
console.log("PASS 赛诺卡牌音效：手牌来源、重复触发、转化、无效、静音与列车开炮");
