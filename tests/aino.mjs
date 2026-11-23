import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

const discardPile = {};
const context = vm.createContext({
  ui: { discardPile },
  get: { position: card => card.position },
});
function load(path, transform) {
  const source = readFileSync(new URL(path, import.meta.url), "utf8")
    .replace(/^import .*;\r?\n/gm, "");
  vm.runInContext(transform(source), context);
}

load("../card/aino.js", source => source.replaceAll("export const", "const")
  + "\nglobalThis.weapon = ainoCards[duck];");
load("../character/skills/aino.js", source => source.replace("export default", "globalThis.skills ="));
const { weapon, skills } = context;
const equipMove = { type: "equip", getParent: () => ({ name: "equip" }) };
assert.equal(weapon.destroy({}, "equip"), false);
assert.equal(weapon.destroy({}, "special", null, equipMove), false);
assert.equal(weapon.destroy({}, "special", null, { type: "discard" }), true);
assert.equal(weapon.destroy({}, "handcard"), true);
assert.equal(weapon.destroy({}, "discardPile"), true);

const destroyed = { position: "d", _selfDestroyed: true };
const equipment = { position: "d" };
const moved = { position: "e" };
const miaoxie = skills.fan_miaoxie;
assert.equal(miaoxie.locked, false);
assert.equal(skills.fan_chongya.locked, true);
assert.equal(miaoxie.filter({ position: discardPile, es: [destroyed, moved] }), false);
const loss = { position: discardPile, es: [destroyed, equipment, { position: "d" }] };
assert.equal(miaoxie.filter(loss), true);
await miaoxie.content({}, loss, { draw: count => assert.equal(count, 2) });
console.log("爱诺：装备换位、跨区销毁及妙械摸牌检查通过。");
