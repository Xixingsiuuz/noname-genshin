import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { installSkillButtons, orderCharacterSkills } from "../ui/confirm.js";

const orderLib = { character: { fan_ajax: { skills: ['fan_jingwu', 'fan_kuanglan'] } }, skill: {
  fan_jingwu: { group: ['fan_jingwu_sha', 'fan_jingwu_shan'] },
  fan_jingwu_sha_backup: { sourceSkill: 'fan_jingwu_sha' },
} };
const orderPlayer = { name: 'fan_ajax' };
assert.deepEqual(orderCharacterSkills(['fan_kuanglan', 'fan_jingwu_sha', 'recast'], orderPlayer, orderLib), ['fan_jingwu_sha', 'fan_kuanglan', 'recast']);
assert.deepEqual(orderCharacterSkills(['fan_kuanglan', 'fan_jingwu_shan', 'fan_jingwu_sha'], orderPlayer, orderLib), ['fan_jingwu_shan', 'fan_jingwu_sha', 'fan_kuanglan']);
assert.deepEqual(orderCharacterSkills(['fan_kuanglan', 'fan_jingwu_sha_backup'], orderPlayer, orderLib), ['fan_jingwu_sha_backup', 'fan_kuanglan']);
assert.deepEqual(orderCharacterSkills(['fan_kuanglan'], orderPlayer, orderLib), ['fan_kuanglan']);
const fakeControl = { skills: ['fan_kuanglan', 'fan_jingwu_sha'], style: {},
  classList: { add() {} }, childNodes: [{ link: 'fan_kuanglan' }, { link: 'fan_jingwu_sha' }],
  appendChild(node) { this.childNodes.splice(this.childNodes.indexOf(node), 1); this.childNodes.push(node); } };
// No document yet: DOM cache correction is tested below after installing the fixture document.

// Use the local engine's real positioning calculation, including its extra 8px
// padding and 6px between controls, rather than duplicating our implementation.
const engine = readFileSync(new URL("../../../noname/ui/index.js", import.meta.url), "utf8");
const body = engine.slice(engine.indexOf("  updatec() {") + "  updatec() {".length, engine.indexOf("  updatex() {"));
const frames = [], observers = [], fontEvents = {};
globalThis.requestAnimationFrame = fn => frames.push(fn);
globalThis.ResizeObserver = class {
  nodes = new Set();
  constructor(callback) { this.callback = callback; observers.push(this); }
  observe(node) { this.nodes.add(node); }
  unobserve(node) { this.nodes.delete(node); }
};
globalThis.document = { getElementById: () => true, fonts: { addEventListener: (name, fn) => { fontEvents[name] = fn; } } };
const cachedUI = { create: { skills: () => undefined }, skills: fakeControl };
installSkillButtons(cachedUI, { event: { player: orderPlayer } }, orderLib);
cachedUI.create.skills(['fan_kuanglan', 'fan_jingwu_sha']);
assert.deepEqual(fakeControl.childNodes.map(node => node.link), ['fan_jingwu_sha', 'fan_kuanglan']);
assert.deepEqual(fakeControl.skills, ['fan_jingwu_sha', 'fan_kuanglan']);
function control(widths) {
  const values = new Set();
  return { style: {}, childNodes: widths.map(offsetWidth => ({ offsetWidth })),
    get offsetWidth() { return this.childNodes.reduce((sum, child) => sum + child.offsetWidth, 8); },
    classList: { add: name => values.add(name), contains: name => values.has(name) },
    addTempClass() {},
  };
}
const ui = { control: { childNodes: [] }, create: {} };
const status = {}, lib = { config: {} }, game = { layout: "long2" }, get = { is: { phoneLayout: () => false } };
ui.updatec = new Function("ui", "_status", "lib", "game", "get", `return function() {${body}`)(ui, status, lib, game, get);
for (const name of ["skills", "skills2", "skills3"]) {
  ui.create[name] = widths => {
    const old = ui[name];
    if (old) ui.control.childNodes = ui.control.childNodes.filter(node => node !== old);
    ui[name] = control(widths); ui.control.childNodes.push(ui[name]);
    ui.updatec();
    return ui[name];
  };
}
installSkillButtons(ui);
const own = ui.create.skills([115, 140, 140]);
const recast = ui.create.skills2([60]);
const weapon = ui.create.skills3([120]);
const confirm = control([100]);
ui.control.childNodes.push(confirm);
ui.updatec();
function visibleRight(node) {
  const sizes = node.childNodes.map(child => child.offsetWidth);
  return node._offset + 4 + sizes.reduce((sum, width) => sum + width, 0) + Math.max(0, sizes.length - 1) * 16;
}
function assertGaps() {
  const visible = ui.control.childNodes.filter(node => node.style.display !== "none");
  for (let i = 1; i < visible.length; i++) {
    const previous = visible[i - 1], next = visible[i];
    if (!previous.classList.contains("fan-skill-buttons")) continue;
    assert(next._offset + 4 - visibleRight(previous) >= 40, "visible skill/control boundaries need a clear group gap");
  }
}
assertGaps();
assert(observers[0].nodes.has(weapon.childNodes[0]));
// Realistic late font/label resize: no manual ui.updatec call.
own.childNodes[2].offsetWidth = 230;
observers[0].callback(); observers[0].callback();
assert.equal(frames.length, 1, "coalesce resize notifications");
frames.shift()(); assertGaps();
recast.style.display = "none";
ui.updatec(); assertGaps();
recast.style.display = "";
ui.updatec(); assertGaps();
// Reordering global and equipment groups must also preserve separation.
ui.control.childNodes = [weapon, own, recast, confirm];
ui.updatec(); assertGaps();
const oldNode = weapon.childNodes[0];
weapon.childNodes = [{ offsetWidth: 180 }, { offsetWidth: 90 }];
ui.updatec(); assertGaps();
assert(!observers[0].nodes.has(oldNode), "release removed buttons");
fontEvents.loadingdone(); frames.shift()(); assertGaps();
// During creation a control may already exist in DOM before ui.skills points to it.
delete ui.skills;
own.childNodes[0].offsetWidth = 190;
ui.updatec(); assertGaps();
// Font events can fire in the main menu, before the arena/control exists.
const savedControl = ui.control;
delete ui.control;
assert.doesNotThrow(() => ui.updatec());
fontEvents.loadingdone();
assert.doesNotThrow(() => frames.shift()());
ui.control = savedControl;
ui.updatec(); assertGaps();
delete globalThis.document; delete globalThis.ResizeObserver; delete globalThis.requestAnimationFrame;
console.log("PASS: real engine control positioning, recast/equipment/confirm gaps, late resize, hide/show and dynamic controls (simulation)");
