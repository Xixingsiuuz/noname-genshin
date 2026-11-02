import assert from "node:assert/strict";
import {readFileSync,existsSync} from "node:fs";
const read=p=>readFileSync(new URL(p,import.meta.url),"utf8");
const skills=new Function("game","get","_status",read("../character/skills/flins.js").replace(/^import .*;\r?\n/gm,"").replace("export default","return"))({}, {}, {});
const voices=new Function(read("../character/voices.js").replace("export default","return"))();
const lib={skill:skills,translate:voices,characterSubstitute:{}};
const get={info:id=>skills[id],character:()=>({tempname:[]})};
const Audio=new Function("get","lib",read("../../../noname/get/audio.js").replace(/^import .*;\r?\n/gm,"").replace(/export\s*\{[\s\S]*?\};?\s*$/,"")+"\nreturn Audio;")(get,lib);
const {skillVoiceGroups}=new Function(read("../ui/skill-voices.js").replace("export const","const").replace("export function","function")+"\nreturn {skillVoiceGroups};")();

assert.deepEqual(skillVoiceGroups.fan_zhangdeng,['fan_zhangdeng','fan_zhangdeng_use_voice']);
for(const id of ['fan_zhangdeng','fan_zhangdeng_use_voice','fan_moke_voice']){
 const clips=Audio.skill({skill:id}).audioList;
 const expected={fan_zhangdeng:['看。','闭眼。','安静。'],fan_zhangdeng_use_voice:['怕黑吗？','入夜了。'],fan_moke_voice:['坠灭。','夜客致访。','谨防，榻下爪眼。','睡吧，无梦地安眠。']}[id];
 assert.deepEqual(clips.map(c=>c.text),expected);
 for(const c of clips){assert(c.text);assert(existsSync(new URL('../'+c.file.replace(/^ext:原神\//,''),import.meta.url)));}
}
const roleBlock=read('../character/character.js').split('fan_flins:')[1].split(']],')[0];
const info=[...roleBlock.matchAll(/"die:([^"]+)"/g)].map(x=>x[1]);
const deaths=Audio.die({player:{name:'fan_flins'},info}).audioList;
assert.equal(deaths.length,3);
for(const c of deaths){assert(c.text);assert(existsSync(new URL('../'+c.file.replace(/^ext:原神\//,''),import.meta.url)));}
let calls=[];
// 只在确认使用转化牌后的 precontent 播放，调用原生接口。
const runtime=new Function('lib','game','get','ui','_status',read('../character/skills/flins.js').replace(/^import .*;\r?\n/,'').replace('export default','return'))({}, {trySkillAudio(...args){calls.push(args)}},{},{},{});
runtime.fan_zhangdeng.subSkill.backup.precontent({},null,{});
assert.equal(calls.length,1);assert.equal(calls[0][0],'fan_zhangdeng_use_voice');
console.log('Flins native audio: 3/2/4 skill pools, 3 death clips, subtitles, files, grouping and confirmed-use hook passed.');

let currentCard={name:'sha',type:'basic'};
const owner={}, enemy={getCards:()=>[{}],hasCard:()=>false};
const nativeGet={type:c=>c.type,card:()=>currentCard,player:()=>owner};
const mockLib={skill:{}};
const hookSkills=new Function('lib','game','get','ui','_status',read('../character/skills/flins.js').replace(/^import .*;\r?\n/,'').replace('export default','return'))(mockLib,{trySkillAudio(...a){calls.push(a)},filterPlayer:()=>[enemy]},nativeGet,{},{});
mockLib.skill=hookSkills;
const moke=hookSkills.fan_moke;
for(const [name,type,speaks] of [['sha','basic',true],['shunshou','trick',true],['shan','basic',false],['tao','basic',false],['jiu','basic',false],['du','basic',false],['bagua','equip',false],['lebu','delay',false]]){
 currentCard={name,type};calls=[];
 await moke.content({}, {card:currentCard,directHit:{addArray(){}}},owner);
 assert.equal(calls.length,speaks?1:0);
 assert.equal(moke.targetprompt2(enemy),speaks?'不可响应':undefined);
 assert.equal(moke.targetprompt2(owner),undefined);
}
const registered=new Set();registered.add=Set.prototype.add;
moke.onChooseToUse({targetprompt2:registered});moke.onChooseTarget({targetprompt2:registered});
assert.equal(registered.size,1);
console.log('Flins Moke: Fuqi card scope, silent equipment/healing/response cards, native target hints and hooks passed.');
