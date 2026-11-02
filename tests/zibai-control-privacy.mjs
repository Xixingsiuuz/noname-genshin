import assert from "node:assert/strict";
import { installZibaiControlPrivacy } from "../ui/zibai-control-privacy.js";

const lib = { config: { mode: "identity" } };
let writes = 0;
const prototype = { setIdentity(identity) { this.label = identity; writes++; return this; } };
function player(label, controlled = false) {
  return Object.assign(Object.create(prototype), {
    identity: "fan", label, identityShown: false,
    storage: { fan_zibai_control: controlled },
  });
}
const owner = player("zhong"), target = player("猜", true);
const game = {
  me: owner,
  // Reproduce the native synchronous swap and its two-player recursive branch.
  swapPlayer(next, other) {
    if (other) {
      if (next === this.me) this.swapPlayer(other);
      else if (other === this.me) this.swapPlayer(next);
    } else this.me = next;
    if (this.beforeIdentity) this.beforeIdentity();
    if (lib.config.mode === "identity") this.me.setIdentity(this.me.identity);
    if (this.fail) throw Error("swap failed");
    return "swapped";
  },
};
installZibaiControlPrivacy(game, lib);
const wrapped = game.swapPlayer;
installZibaiControlPrivacy(game, lib);
assert.equal(game.swapPlayer, wrapped, "installation is idempotent");
assert.equal(game.swapPlayer(owner, target), "swapped");
assert.equal(target.label, "猜");
assert.equal(writes, 0, "hidden identity must never be written, even transiently");
assert.equal(target.identity, "fan");
assert.equal(target.identityShown, false);
assert.equal(Object.hasOwn(target, "setIdentity"), false);
game.swapPlayer(owner);
game.swapPlayer(target);
assert.equal(target.label, "猜", "repeated decision swaps keep the original guess");

// Outside a swap, genuine identity revelation is unaffected.
target.identityShown = true;
target.setIdentity("fan");
game.swapPlayer(owner);
game.swapPlayer(target);
assert.equal(target.label, "fan");
target.identityShown = false;
target.label = "猜";
game.beforeIdentity = () => { target.identityShown = true; };
game.swapPlayer(target);
assert.equal(target.label, "fan", "public revelation during a swap is allowed");
delete game.beforeIdentity;

target.identityShown = false;
target.label = "猜";
game.fail = true;
assert.throws(() => game.swapPlayer(target), /swap failed/);
assert.equal(target.label, "猜");
assert.equal(Object.hasOwn(target, "setIdentity"), false, "exceptions restore the native method");
delete game.fail;
target.storage.fan_zibai_control = false;
game.swapPlayer(target);
assert.equal(target.label, "fan", "unrelated native control is unchanged");
lib.config.mode = "guozhan";
target.storage.fan_zibai_control = true;
target.label = "unknown";
game.swapPlayer(target);
assert.equal(target.label, "unknown");
assert.equal(Object.hasOwn(target, "setIdentity"), false);
console.log("Zibai control privacy: hidden guesses, recursive/repeated swaps, public reveals, cleanup and scope passed (simulation).");
