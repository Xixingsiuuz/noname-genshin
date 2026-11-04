import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

// Local 1.11.6 loadExtension calls content BEFORE merging package.skill.skill.
// Reproduce that boundary so a nonexistent global recorder cannot silently pass tests.
const lib = { skill: {}, hooks: {checkEnd: []} }, attempts = [];
const game = { addGlobalSkill(name) {
  const found = !!lib.skill[name]; attempts.push({ name, found }); return found;
} };
const skillSource = readFileSync(new URL("../character/skills/zibai.js", import.meta.url), "utf8");
const skills = new Function("lib", "game", "get", "ui", "_status", "setZibaiEyes",
  skillSource.replace(/^import .*;\r?\n/gm, "").replace("export default", "return"))
  (lib, game, {}, {}, {}, () => {});
const source = readFileSync(new URL("../extension.js", import.meta.url), "utf8")
  .replace(/^import .*;\r?\n/gm, "").replace(/^export const type = .*;\r?\n/m, "")
  .replace("export default function", "return function");
const installMechanismCardStyle = () => {};
const factory = new Function("createCharacterPackage", "createSkillPackage", "createCardPackage", "lib", "game", "ui", "_status", "installSelectionConfirm", "characterTitles", "installZibaiEyes", "installDetailPortraits", "installZibaiControlPrivacy", "installMoranFrost", "installSkillVoices", "get", "installMechanismCardStyle", "createUpdateChecker", "EXTENSION_VERSION", "installSharedZhinang", "installHuanyanReplay", "characterIntros", "smoothPortraits", source)
  (() => ({}), () => ({ skill: skills }), () => ({}), lib, game, {}, {}, () => {}, {}, () => {}, () => {}, () => {}, () => {}, () => {}, {}, installMechanismCardStyle, () => ({ start() {} }), "0.2.0", () => {}, () => {}, {}, {});
const extension = factory();
extension.content();
assert(!lib.skill.fan_zibai_record, "skill package has not yet been merged at this point");
assert.deepEqual(attempts.filter(item => !item.found), [], "content must not register globals whose definitions are still in package.skill");
Object.assign(lib.skill, extension.package.skill.skill);
assert(lib.skill.fan_renjian.group.includes("fan_zibai_record"));
assert.equal(lib.skill.fan_zibai_record.trigger.player, "useCard1");
assert.equal(lib.skill.fan_renjian.subSkill.give.trigger.global, "cardsDiscardAfter");
console.log("Extension loading: content-before-package order, existing global definitions and attached Renjian recorder passed.");
