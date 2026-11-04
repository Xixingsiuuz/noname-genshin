import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { compareVersions, createUpdateChecker, EXTENSION_VERSION } from "../ui/update-check.js";
assert.equal(JSON.parse(readFileSync(new URL("../info.json", import.meta.url))).version, EXTENSION_VERSION);
assert.equal(compareVersions("v0.10.0", "0.2.0"), 1);
assert.equal(compareVersions("v1.0.0", "1.0.0"), 0);
assert.equal(compareVersions("0.1.9", "0.2.0"), -1);
assert.throws(() => compareVersions("v1.0.0-beta", "0.2.0"));
const config = {}, messages = [], shown = [];
const game = {
  getExtensionConfig(name, key) { assert.equal(name, "原神"); return config[key]; },
  saveExtensionConfig(name, key, value) { assert.equal(name, "原神"); config[key] = value; },
};
let release = { tag_name: "v0.3.0", body: "<script>example</script>" }, status = 200;
const checker = createUpdateChecker(game, {
  fetch: async () => ({ status, ok: status === 200, json: async () => release }),
  notify: message => messages.push(message), display: value => shown.push(value),
});
await checker.check();
await checker.check();
assert.equal(shown.length, 1, "same release auto-notified once");
await checker.check(true);
assert.equal(shown.length, 2, "manual check bypasses suppression");
config.auto_check_update = false;
release = { tag_name: "v0.4.0" };
await checker.check();
assert.equal(shown.length, 2);
await checker.check(true);
assert.equal(shown.length, 3);
release = { tag_name: EXTENSION_VERSION };
await checker.check(true);
assert.match(messages.at(-1), /最新版本/);
status = 403;
const count = messages.length;
await checker.check();
assert.equal(messages.length, count, "automatic failures silent");
await checker.check(true);
assert.match(messages.at(-1), /403/);
status = 404;
await checker.check(true);
assert.match(messages.at(-1), /尚无/);
console.log("PASS release comparison, version consistency, notification persistence, manual/automatic checks, disabled checks and HTTP failures (simulation; no live game UI).");
