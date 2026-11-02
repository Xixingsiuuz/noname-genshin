import assert from "node:assert/strict";
import { setZibaiEyes, installZibaiEyes } from "../ui/zibai-eyes.js";

class Node {
  constructor(tag = "div", classes = "") {
    this.tagName = tag; this.children = []; this.attributes = {}; this.style = {}; this.dataset = {};
    const values = new Set(classes.split(" ").filter(Boolean));
    this.classList = { add: c => values.add(c), remove: c => values.delete(c), contains: c => values.has(c) };
  }
  setAttribute(k, v) { this.attributes[k] = String(v); if (k === "class") for (const c of v.split(" ")) this.classList.add(c); if (k === "id") this.id = v; }
  getAttribute(k) { return this.attributes[k] ?? null; }
  appendChild(child) { this.children.push(child); child.parentNode = this; return child; }
  remove() { if (this.parentNode) this.parentNode.children = this.parentNode.children.filter(c => c !== this); }
  querySelectorAll(selector) {
    const match = n => selector.startsWith(".") ? selector.slice(1).split(".").every(c => n.classList.contains(c)) : n.tagName === selector;
    const descend = root => root.children.flatMap(c => [c, ...descend(c)]);
    if (selector === ".ava > .avatar") return descend(this).filter(n => n.classList.contains("avatar") && n.parentNode?.classList.contains("ava"));
    return descend(this).filter(match);
  }
  querySelector(selector) { return this.querySelectorAll(selector)[0] || null; }
}
const root = new Node(), head = root.appendChild(new Node("head")), body = root.appendChild(new Node("body"));
const previous = globalThis.document;
globalThis.document = { head, body, createElement: tag => new Node(tag), createElementNS: (ns, tag) => new Node(tag),
  getElementById: id => [root, ...root.querySelectorAll("style")].find(n => n.id === id), querySelectorAll: selector => root.querySelectorAll(selector) };
const owner = (mode, secondary = false) => {
  const avatar = body.appendChild(new Node("div", "avatar"));
  return { name: secondary ? "other" : "fan_zibai", name2: secondary ? "fan_zibai" : undefined,
    node: secondary ? { avatar2: avatar } : { avatar }, storage: { fan_zibai_form: mode } };
};
try {
  const blue = owner("yun"), red = owner("yan");
  setZibaiEyes(blue, "yun"); setZibaiEyes(red, "yan");
  const b = blue.node.avatar.querySelector(".fan-zibai-eyes"), r = red.node.avatar.querySelector(".fan-zibai-eyes");
  assert.equal(b.getAttribute("viewBox"), "0 0 400 560");
  assert.equal(b.getAttribute("preserveAspectRatio"), "xMidYMin slice");
  assert.equal(b.getAttribute("aria-hidden"), "true");
  assert.equal(b.querySelectorAll("radialGradient").length, 2);
  assert.equal(b.querySelector("radialGradient").children.length, 6);
  assert.equal(b.querySelectorAll(".fan-zibai-aura").length, 2);
  assert.equal(b.querySelectorAll(".fan-zibai-rim").length, 2);
  assert.notEqual(b.querySelector("radialGradient").id, r.querySelector("radialGradient").id);
  setZibaiEyes(blue, "yun"); assert.equal(blue.node.avatar.querySelector(".fan-zibai-eyes"), b); // animation continuity
  assert.equal(head.children.length, 1);
  assert.match(head.children[0].textContent, /@keyframes fan-zibai-flow/);
  assert.match(head.children[0].textContent, /prefers-reduced-motion/);
  const independent = new Function(`return (${setZibaiEyes.toString()})`)();
  independent(blue, "full"); assert.equal(blue.node.avatar.dataset.fanZibaiMode, "full"); // broadcast has no module closure
  const secondary = owner("ren", true); setZibaiEyes(secondary, "ren");
  assert(secondary.node.avatar2.querySelector(".fan-zibai-eyes"));

  const game = { players: [blue, red, secondary], dead: [] };
  let called = 0, callThis, callArgs;
  const ui = { click: { charactercard(...args) {
    called++; callThis = this; callArgs = args;
    if (args[0] === "blocked") return "no-dialog";
    const dialog = body.appendChild(new Node("div", "menubg charactercard"));
    dialog.appendChild(new Node("div", "ava")).appendChild(new Node("div", "avatar"));
    return dialog;
  } } };
  installZibaiEyes(ui, game); const wrapped = ui.click.charactercard;
  installZibaiEyes(ui, game); assert.equal(ui.click.charactercard, wrapped);
  blue.storage.fan_zibai_form = "yun";
  const context = {}, args = ["fan_zibai", null, null, true, blue.node.avatar];
  const blueDialog = wrapped.apply(context, args), blueLarge = blueDialog.querySelector(".ava > .avatar");
  assert.equal(callThis, context); assert.deepEqual(callArgs, args);
  assert.equal(blueLarge.dataset.fanZibaiMode, "yun");
  const redDialog = wrapped("fan_zibai", null, null, true, red.node.avatar), redLarge = redDialog.querySelector(".ava > .avatar");
  setZibaiEyes(blue, "ren");
  assert.equal(blueLarge.dataset.fanZibaiMode, "ren"); assert.equal(redLarge.dataset.fanZibaiMode, "yan");
  const gallery = wrapped("fan_zibai").querySelector(".ava > .avatar");
  assert.equal(gallery.dataset.fanZibaiMode, "ren"); // no source must not bind an arbitrary player
  setZibaiEyes(blue, "full"); assert.equal(gallery.dataset.fanZibaiMode, "ren");
  const unrelated = wrapped("other"); assert(!unrelated.querySelector(".fan-zibai-eyes"));
  assert.equal(wrapped("blocked"), "no-dialog");
  blueDialog.remove(); setZibaiEyes(blue, "yun"); // detached dialog needs no cleanup timer
  assert.equal(blueLarge.dataset.fanZibaiMode, "full");
  setZibaiEyes(red, undefined);
  assert(!red.node.avatar.querySelector(".fan-zibai-eyes")); assert(!redLarge.querySelector(".fan-zibai-eyes"));
  assert.equal(red.node.avatar.style.backgroundSize, undefined);
  assert(called >= 5);
  const oldTimer = globalThis.setTimeout, timers = [];
  globalThis.setTimeout = callback => { timers.push(callback); return timers.length; };
  try {
    blue.storage.fan_zibai_complete = true;
    setZibaiEyes(blue, "full");
    const live = wrapped("fan_zibai", null, null, true, blue.node.avatar).querySelector(".ava > .avatar");
    setZibaiEyes(blue, "pulse_full");
    assert.equal(live.querySelector("svg").getAttribute("data-intensity"), "2");
    setZibaiEyes(blue, "pulse_yun");
    timers.shift()(); // stale gold timeout cannot clear the new blue pulse
    assert.equal(live.dataset.fanZibaiMode, "yun");
    setZibaiEyes(blue, "hold_yan");
    timers.shift()();
    assert.equal(live.dataset.fanZibaiMode, "yan");
    assert.equal(live.querySelector("svg").getAttribute("data-intensity"), "1");
    setZibaiEyes(blue, "release");
    assert.equal(live.dataset.fanZibaiMode, "full");
    assert.equal(live.querySelector("svg").getAttribute("data-intensity"), "0");
  } finally { globalThis.setTimeout = oldTimer; }
} finally { globalThis.document = previous; }
console.log("Zibai eyes: layered colors, animations, unique SVG IDs, broadcast isolation, native-dialog binding, synchronization and cleanup passed.");
