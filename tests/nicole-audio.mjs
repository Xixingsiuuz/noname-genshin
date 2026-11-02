import assert from 'node:assert/strict';
import {readFileSync,existsSync,statSync} from 'node:fs';
const src=readFileSync(new URL('../ui/nicole-audio.js',import.meta.url),'utf8');
const calls=[];const lib={config:{background_speak:true}};const game={playAudio(options){calls.push(options)},broadcastAll(fn,...args){fn(...args)}};
const api=new Function('lib','game',src.replace(/^import .*;\r?\n/gm,'').replace(/export /g,'')+'\nreturn {startNicoleStory,finishNicoleStory};')(lib,game);
const player={isIn:()=>true};api.startNicoleStory(player);assert.equal(calls.length,1);calls[0].onEnded();assert.equal(calls.length,2);api.finishNicoleStory(player);calls[1].onEnded();assert.equal(calls.length,2,'finish does not enqueue another line');
api.startNicoleStory(player);for(let i=2;i<7;i++)calls[i].onEnded();assert.equal(calls.length,7,'five lines play only once');
lib.config.background_speak=false;api.startNicoleStory(player);assert.equal(calls.length,7);
lib.config.background_speak=true;api.startNicoleStory(player);const stale=calls.at(-1);api.startNicoleStory(player);const count=calls.length;stale.onEnded();assert.equal(calls.length,count,'old callbacks cannot advance a new queue');api.finishNicoleStory(player);
const manifest=JSON.parse(readFileSync(new URL('../audio/nicole/originals/nicole-sources.json',import.meta.url),'utf8'));
for(const clip of Object.values(manifest.clips)){assert(existsSync(new URL('../'+clip.output,import.meta.url)));assert.equal(statSync(new URL('../'+clip.original,import.meta.url)).size,clip.bytes);assert(clip.measurement.true_peak_dbtp<=-1)}
console.log('Nicole audio: ended-based sequence, effect completion, exhaustion, mute, stale callbacks and 20 assets/peak measurements passed.');
// Resolve every Nicole branch with the real local v1.11.6 Audio parser.
lib.translate=new Function(readFileSync(new URL('../character/voices.js',import.meta.url),'utf8').replace('export default','return'))();lib.characterSubstitute={};lib.skill={global:[]};
const get={info:id=>lib.skill[id],character:()=>({tempname:[]})};
const audioSource=readFileSync(new URL('../../../noname/get/audio.js',import.meta.url),'utf8');
const Audio=new Function('get','lib',audioSource.replace(/^import .*;\r?\n/gm,'').replace(/export\s*\{[\s\S]*?\};?\s*$/,'')+'\nreturn Audio;')(get,lib);
const skillSource=readFileSync(new URL('../character/skills/nicole.js',import.meta.url),'utf8');Object.assign(lib.skill,new Function('lib','game','get','ui','_status','startNicoleStory','finishNicoleStory',skillSource.replace(/^import .*;\r?\n/gm,'').replace('export default','return'))(lib,game,get,{}, {},()=>{},()=>{}));
for(const [id,count] of Object.entries({fan_tianlin_before:2,fan_tianlin_after:5,fan_duanyu_guard:3,fan_duanyu_success:1,fan_duanyu_failure:1,fan_tianlin_draw_voice:3,fan_xuanji_story:5})){
 const parsed=Audio.skill({skill:id,player:'fan_nicole',info:lib.skill[id]});assert.equal(parsed.fileList.length,count,id);assert.equal(parsed.textList.length,count,id);for(const file of parsed.fileList)assert(existsSync(new URL('../'+file.replace('ext:原神/',''),import.meta.url)),file);
}
console.log('Nicole native Audio parsing: every branch file and subtitle resolved.');
const characters=new Function(readFileSync(new URL('../character/character.js',import.meta.url),'utf8').replace('export default','return'))();
const death=Audio.die({player:'fan_nicole',info:characters.fan_nicole[4].find(s=>s.startsWith('die:')).slice(4)});
assert.deepEqual(death.fileList,[1,2,3].map(i=>`ext:原神/audio/nicole/die/fan_nicole${i}.mp3`));assert.equal(death.textList.length,3);
console.log('Nicole native death audio: three files and subtitles resolved from actual character configuration.');
