import assert from "node:assert/strict";
import {readFileSync,existsSync} from "node:fs";
const read=p=>readFileSync(new URL(p,import.meta.url),"utf8");
const skills=new Function("game","get","ui","_status",read("../character/skills/shenhe.js").replace(/^import .*;\r?\n/gm,"").replace(/export (const|function) /g,"$1 ").replace("export default","return"))({}, {}, {}, {});
const voices=new Function(read("../character/voices.js").replace("export default","return"))();
const lib={skill:skills,translate:voices,characterSubstitute:{}};
const get={info:id=>skills[id],character:()=>({tempname:[]})};
const Audio=new Function("get","lib",read("../../../noname/get/audio.js").replace(/^import .*;\r?\n/gm,"").replace(/export\s*\{[\s\S]*?\};?\s*$/,"")+"\nreturn Audio;")(get,lib);
const {skillVoiceGroups}=new Function(read("../ui/skill-voices.js").replace("export const","const").replace("export function","function")+"\nreturn {skillVoiceGroups};")();
for(const [id,count] of Object.entries({fan_yizhou:2,fan_yizhou_move:3,fan_lingwei:3,fan_xinzhai:3})) {
  const pool=Audio.skill({skill:id}).audioList;
  assert.equal(pool.length,count,id);
  for(const item of pool){assert.ok(item.text,id+" subtitle");assert.ok(existsSync(new URL("../"+item.file.replace(/^ext:原神\//,""),import.meta.url)),item.file);}
}
assert.deepEqual(skillVoiceGroups.fan_yizhou,["fan_yizhou","fan_yizhou_move"]);
assert.equal(skillVoiceGroups.fan_yizhou.flatMap(id=>Audio.skill({skill:id}).audioList).length,5);
assert.equal(Audio.skill({skill:"fan_lingwei",info:"fan_lingwei"}).audioList.length,3);
const characterSource=read("../character/character.js");
const line=characterSource.split(/\r?\n/).find(line=>line.includes("fan_shenhe:"));
const dieInfo=[...line.matchAll(/"die:([^"]+)"/g)].map(match=>match[1]);
const diePool=Audio.die({player:{name:"fan_shenhe"},info:dieInfo}).audioList;
assert.equal(diePool.length,3);
assert.deepEqual(new Set(diePool.map(clip=>clip.text)),new Set(["难逃…宿命…","死丧既定…","劫煞为灾…"]));
for(const clip of diePool)assert.ok(existsSync(new URL("../"+clip.file.replace(/^ext:原神\//,""),import.meta.url)));
console.log("Shenhe audio: native pools 2/3/3/3, subtitles, existing final grouping and files verified.");
