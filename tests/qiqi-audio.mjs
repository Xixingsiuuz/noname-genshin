import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const root=new URL('../',import.meta.url),read=p=>readFileSync(new URL(p,root),'utf8');
const lib={skill:{},translate:{},characterSubstitute:{},config:{background_speak:true}};
const get={info:id=>lib.skill[id],character:()=>({tempname:[]})};
const source=readFileSync(new URL('../../noname/get/audio.js',root),'utf8');
const Audio=new Function('get','lib',source.replace(/^import .*;\r?\n/gm,'').replace(/export\s*\{[\s\S]*?\};?\s*$/,'')+'\nreturn Audio;')(get,lib);get.Audio=Audio;
Object.assign(lib.skill,new Function('game','get','_status',read('character/skills/qiqi.js').replace(/^import .*;\r?\n/gm,'').replace(/export function/g,'function').replace('export default','return'))({},get,{}));
Object.assign(lib.translate,new Function(read('character/voices.js').replace('export default','return'))());
const manifest=JSON.parse(read('audio/qiqi/originals/qiqi-sources.json'));
assert.equal(Object.keys(manifest.clips).length,10);
for(const [id,c] of Object.entries(manifest.clips)) {
 for(const [path,bytes,hash] of [[c.original,c.bytes,c.original_sha256],[c.output,c.output_bytes,c.sha256]]) {
  const buffer=readFileSync(new URL(path,root));assert.equal(buffer.length,bytes);assert.equal(createHash('sha256').update(buffer).digest('hex'),hash);
 }
 assert.equal(c.trim_seconds,null);assert(c.volume.after.true_peak_dbtp<=-1);
 assert(read('extension.js').includes('"'+c.output+'"'));
 if(!id.startsWith('fan_qiqi')) {
  const audio=Audio.skill({skill:id});assert.deepEqual(audio.fileList,['ext:原神/'+c.output]);assert(audio.textList.includes(c.text));
 }
}
const played=[],game={broadcast(){},tryAudio({audioList}){played.push(audioList);}};lib.skill.global=[];
const method=readFileSync(new URL('../../noname/game/index.js',root),'utf8').match(/  trySkillAudio\(skill, player, directaudio, nobroadcast, skillInfo, args\) \{([\s\S]*?)\n  \}/);
game.trySkillAudio=new Function('game','lib','get','return function(skill,player,directaudio,nobroadcast,skillInfo,args){'+method[1]+'}')(game,lib,get);
game.trySkillAudio('fan_due','fan_qiqi',true,true,null,[]);assert.deepEqual(played.at(-1),[]);
game.trySkillAudio('fan_due_gain1','fan_qiqi');assert.equal(played.at(-1).length,1);
lib.config.background_speak=false;const before=played.length;game.trySkillAudio('fan_due_gain1','fan_qiqi');assert.equal(played.length,before);
const characters=new Function(read('character/character.js').replace('export default','return'))();
const death=Audio.die({player:'fan_qiqi',info:characters.fan_qiqi[4].find(t=>t.startsWith('die:')).slice(4)}).fileList;
assert.deepEqual(death,[1,2,3].map(i=>`ext:原神/audio/qiqi/die/fan_qiqi${i}.mp3`));
game.trySkillAudio('fan_huihai','fan_qiqi',true,true,null,[]);
assert.equal(played.length,before,'voice switch also suppresses Huihai');
lib.config.background_speak=true;
game.trySkillAudio('fan_huihai','fan_qiqi',true,true,null,[]);assert.deepEqual(played.at(-1),[]);
for(let i=1;i<=3;i++){game.trySkillAudio('fan_huihai_voice'+i,'fan_qiqi');assert.equal(played.at(-1).length,1);}
console.log('PASS Qiqi audio: ten source/output hashes, measured peaks, native paths/subtitles, silent log, branch playback, voice switch, three death clips. No manual listening.');
