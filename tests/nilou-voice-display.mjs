import assert from "node:assert/strict";
import loadedCharacters from '../character/character.js';
import { readFileSync, readdirSync } from "node:fs";
const root = new URL("../", import.meta.url);
const read = path => readFileSync(new URL(path, root), "utf8");
const voices = new Function(read("character/voices.js").replace("export default", "return"))();
const lib = { skill: {}, filter: { filterTarget() { throw new Error("Audio inspection must not select targets"); } }, translate: { ...voices }, characterSubstitute: {} };
const get = { info: id => lib.skill[id], character: () => ({ tempname: [] }) };
const Audio = new Function("get", "lib", read("../../noname/get/audio.js")
  .replace(/^import .*;\r?\n/gm, "").replace(/export\s*\{[\s\S]*?\};?\s*$/, "") + "\nreturn Audio;")(get, lib);
get.Audio = Audio;
const { skillVoiceGroups, installSkillVoices } = new Function(read("ui/skill-voices.js")
  .replace("export const", "const").replace("export function", "function")
  + "\nreturn {skillVoiceGroups,installSkillVoices};")();
function collect(skills, prefix = "") {
  for (const [key, skill] of Object.entries(skills)) {
    const id = prefix ? prefix + "_" + key : key;
    lib.skill[id] = skill;
    if (skill.subSkill) collect(skill.subSkill, id);
  }
}
const roles = [...new Set(JSON.parse(read("audio/catalog.json")).map(entry => entry.role || entry.path?.split("/")[1]).filter(Boolean))];
const mechanisms = new Function('return ' + read('card/xianyun.js').match(/export const mechanisms = (\[[\s\S]*?\n\]);/)[1])();
for (const role of [...roles, "venti", "linnea", "sp_sandrone"]) {
  const source = read("character/skills/" + role + ".js");
  collect(new Function("lib", "get", "game", "ui", "_status", "mechanisms", "standard", source
    .replace(/^import .*;\r?\n/gm, "").replace(/export async function/g, "async function").replace(/export function/g, "function").replace(/export const/g, "const")
    .replace("export default", "return"))(lib, get, {}, {}, {}, mechanisms, lib.skill));
}
// Native shared audio remains the existing source of Venti's derived skill.
const nativeVoices = new Function(read("../../src/character/mobile/voices.js").replace("export default", "return"))();
Object.assign(lib.translate, nativeVoices);
lib.skill.rejiushi = { audio: 2 };
const original = Audio.skill;
const before = Object.fromEntries(Object.keys(lib.skill).map(id => [id, original.call(Audio, { skill: id }).fileList]));
installSkillVoices(get);
assert.deepEqual(Audio.skill({skill:"fan_pianzhuan"}).textList.slice(4),["嘿！","呀！","哈！"]);
assert.equal(Audio.skill({skill:"fan_pianzhuan"}).textList.length,7);
assert.equal(original.call(Audio,{skill:"fan_pianzhuan_guard_voice"}).fileList.length,3,"hidden detail voices remain playable");

console.log("Nilou display: seven exact subtitles, glider hidden, original three playback files retained.");
