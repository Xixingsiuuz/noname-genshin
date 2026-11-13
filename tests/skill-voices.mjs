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
for (const role of new Set([...roles, "alhaitham", "venti", "linnea", "sp_sandrone", "cyno", "tighnari"])) {
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
assert.equal(Audio.skill({ skill: "fan_bowu" }).textList.length, 4);
assert.equal(Audio.skill({ skill: "fan_xunlin" }).textList.length, 6);
assert.equal(Audio.skill({ skill: "fan_zhaohuan" }).textList.length, 18);
assert.equal(Audio.skill({ skill: "fan_zhaohuan" }).fileList.length, 18);
assert.deepEqual(skillVoiceGroups.fan_huanwu, ["fan_huanwu", "fan_huanwu_use_voice"]);
for (const [skill, count] of [["fan_zhengyan", 5], ["fan_jipin", 4], ["fan_huanwu", 6], ["fan_miwen", 3], ["fan_wenbu", 3], ["fan_tongxuan", 3], ["fan_shiqi", 3]]) {
  assert.equal(Audio.skill({ skill }).fileList.length, count, skill + " detail pool count");
  assert.equal(Audio.skill({ skill }).textList.length, count, skill + " detail subtitle count");
}
for (const [id, count] of [["fan_huaqiu", 5], ["fan_wenshou", 8], ["fan_huanjing", 3]]) {
  assert.equal(Audio.skill({ skill: id }).fileList.length, count, id + " preview count");
  assert.ok(!Audio.skill({ skill: id }).textList.includes("此技能暂无语音。"));
}
assert.deepEqual(Audio.skill({ skill: "fan_lanyin" }).textList, ["此技能暂无语音。"]);
assert.deepEqual(skillVoiceGroups.fan_yinyou, ["fan_yinyou"]);
assert.deepEqual(skillVoiceGroups.fan_qingzhan, ["fan_qingzhan", "fan_qingzhan_success"]);
assert.deepEqual(skillVoiceGroups.fan_songshi, ["fan_songshi_voice"]);
for (const [id, count] of [["fan_yinyou", 3], ["fan_qingzhan", 4], ["fan_jiushi", 2], ["fan_songshi", 3], ["fan_bowen", 7], ["fan_shizhi", 5]]) {
  assert.equal(Audio.skill({skill:id}).textList.length, count);
  assert(!Audio.skill({skill:id}).textList.includes("此技能暂无语音。"));
}
const installed = Audio.skill;
installSkillVoices(get);
assert.equal(Audio.skill, installed, "installation is idempotent");
for (const [id, group] of Object.entries(skillVoiceGroups)) {
  assert(lib.skill[id], id);
  const lines = Audio.skill({ skill: id }).textList;
  assert(lines.length, id + " has native detail text");
  const expected = group.flatMap(skill => {
    assert(lib.skill[skill], skill);
    const audio = original.call(Audio, { skill });
    assert(audio.fileList.length, skill + " has playback files");
    assert.equal(audio.textList.length, audio.fileList.length, skill + " has every subtitle");
    return audio.textList;
  });
  const seenText = new Set(), seenFile = new Set(), expectedFiles = [];
  for (const skill of group) {
    const branch = original.call(Audio, { skill });
    branch.fileList.forEach((file, index) => {
      const text = branch.textList[index];
      if (seenFile.has(file) || (text && seenText.has(text))) return;
      seenFile.add(file); if (text) seenText.add(text); expectedFiles.push(file);
    });
  }
  assert.deepEqual(Audio.skill({ skill: id }).fileList, expectedFiles, id + " detail preview order");
  assert.deepEqual(lines, expected.length ? [...new Set(expected)] : ["此技能暂无语音。"], id);
  assert.deepEqual(Audio.skill({ skill: id, args: [] }).textList,
    original.call(Audio, { skill: id, args: [] }).textList, "playback arguments bypass display aggregation");
}
for (const [id, files] of Object.entries(before)) {
  assert.deepEqual(Audio.skill({ skill: id, info: undefined, args: undefined }).fileList, files, id + " playback unchanged");
}
const characters = loadedCharacters;
for (const role of [...roles, "alhaitham", "venti", "linnea"]) {
  const characterId = role === "zhongli_rework" ? "fan_re_zhongli" : "fan_" + role;
  for (const id of characters[characterId][3]) assert(id in skillVoiceGroups, role + ":" + id);
  const die = characters[characterId][4].find(tag => tag.startsWith("die:"));
  if (die) {
    const audio = Audio.die({ player: characterId, info: die.slice(4) });
    assert.equal(audio.textList.length, audio.fileList.length, role + " death subtitles");
  }
}
assert.deepEqual(Audio.skill({ skill: "fan_zhenyue" }).fileList, []);
assert.equal(Audio.skill({skill:'fan_yanjian'}).fileList.length,8);
assert.equal(Audio.skill({skill:'fan_yanjian'}).textList.filter(line=>line==='黄毛小儿！').length,1);
assert(!Audio.skill({skill:'fan_yanjian'}).fileList.some(file=>file.includes('fan_yanjian_full_damage3')));
assert(original.call(Audio,{skill:'fan_yanjian_full_damage',args:[]}).textList.includes('黄毛小儿！'));
assert.deepEqual(Audio.skill({ skill: "fan_sanxiang" }).textList, ["此技能暂无语音。"]);
for (const [skill, voice] of [["fan_yunjian", "fan_sanxiang_leave_yun"],
  ["fan_yanjian", "fan_sanxiang_leave_yan"], ["fan_renjian", "fan_sanxiang_leave_ren"]]) {
  for (const line of original.call(Audio, { skill: voice }).textList) {
    assert(Audio.skill({ skill }).textList.includes(line), skill + " includes its form farewell");
    for (const other of ["fan_yunjian", "fan_yanjian", "fan_renjian"].filter(id => id !== skill)) {
      assert(!Audio.skill({ skill: other }).textList.includes(line), other + " excludes another form's farewell");
    }
  }
}
assert.deepEqual(Audio.skill({ skill: "fan_langhua", info: false }).textList, []);
assert("fan_shanyao" in skillVoiceGroups, "Furina now has audio");
console.log(`PASS: native Audio detail text for ${Object.keys(skillVoiceGroups).length} skills across ${roles.length + 1} characters; branch/death subtitles, silent skills, idempotence and unchanged playback (no live UI test).`);



for (const [skill, count] of Object.entries({fan_shanyao_loss:3,fan_shanyao_heal:3,fan_shanyao_loss_success:5,fan_shanyao_heal_success:5,fan_huanyan:3,fan_zhongyu_guard:2,fan_zhongyu_success:1,fan_zhongyu_failure:1,fan_duqi:2})) {
 assert.equal(Audio.skill({skill,args:[]}).fileList.length,count,skill+' actual pool');
}
console.log('PASS: Furina native audio pool sizes');

assert.deepEqual(Audio.skill({skill:"fan_pianzhuan"}).textList.slice(4),["嘿！","呀！","哈！"]);
assert.equal(Audio.skill({skill:"fan_pianzhuan"}).textList.length,7);
assert.equal(original.call(Audio,{skill:"fan_pianzhuan_guard_voice"}).fileList.length,3,"hidden detail voices remain playable");

// Native Audio regression: logAudio suppression requires an explicit args array.
for (const id of ["fan_baie", "fan_huohua", "fan_taopao"]) {
  assert(original.call(Audio, {skill: id}).fileList.length > 0, id + " manual pool stays playable");
  assert.deepEqual(original.call(Audio, {skill: id, args: []}).fileList, [], id + " explicit log args suppress duplicate playback");
}
for (const [path, call] of [
  ["albedo", 'player.logSkill("fan_baie", target, null, null, []);'],
  ["klee", 'owner.logSkill(skill, targets, null, null, []);'],
  ["klee", 'player.logSkill("fan_taopao", target, null, null, []);'],
]) assert(read("character/skills/" + path + ".js").includes(call), path + " passes explicit suppression args");
console.log("PASS: Albedo and Klee native log/manual audio deduplication; manual pools retained.");

assert.deepEqual(original.call(Audio, {skill: "fan_ruyue"}).fileList, [], "Arlecchino main log is already silent");

