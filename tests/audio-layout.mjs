import assert from 'node:assert/strict';
import loadedCharacters from '../character/character.js';
import {readFileSync,existsSync,readdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
const root=new URL('../',import.meta.url),read=path=>readFileSync(new URL(path,root),'utf8');
const catalog=JSON.parse(read('audio/catalog.json'));
for(const entry of catalog){const data=readFileSync(new URL(entry.path,root));assert.equal(data.length,entry.bytes);assert.equal(createHash('sha256').update(data).digest('hex'),entry.sha256,entry.path)}
const lib={skill:{},translate:{},characterSubstitute:{}};
const get={info:id=>lib.skill[id],character:()=>({tempname:[]})};
const audioSource=readFileSync(new URL('../../noname/get/audio.js',root),'utf8');
const Audio=new Function('get','lib',audioSource.replace(/^import .*;\r?\n/gm,'').replace(/export\s*\{[\s\S]*?\};?\s*$/,'')+'\nreturn Audio;')(get,lib);
const roles=['zhongli_rework','xilonen','varesa','chiori','kokomi','kinich','citlali','mona','qiqi','jean','navia','hutao','ganyu','nilou','albedo','raiden','ajax','mavuika','klee','itto','zhongli','eula','ayaka','ayato','yoimiya','columbina','yelan','diluc','keqing','zibai','xianyun'],referenced=new Set();
const mechanisms = new Function('return ' + read('card/xianyun.js').match(/export const mechanisms = (\[[\s\S]*?\n\]);/)[1])();
function checkAudioFile(file,role){
 assert.ok(file.startsWith('ext:原神/audio/'+role+'/'),file);
 const path=file.replace('ext:原神/','');assert.ok(existsSync(new URL(path,root)),path);referenced.add(path);
}
function collect(skills,prefix,role){for(const [key,skill] of Object.entries(skills)){
 const id=prefix?prefix+'_'+key:key;lib.skill[id]=skill;
 if((typeof skill.audio==='string'&&skill.audio.startsWith('ext:原神/')) || (Array.isArray(skill.audio)&&skill.audio.every(item=>typeof item==='string'&&item.startsWith('ext:原神/')))){
  const files=Audio.skill({skill:id,info:skill}).fileList;assert.ok(files.length);files.forEach(file=>checkAudioFile(file,role));
 }
 if(skill.subSkill)collect(skill.subSkill,id,role);
}}
const characters=loadedCharacters;
for(const role of roles){
 const source=read('character/skills/'+role+'.js');
 const skills=new Function('lib','get','game','ui','_status','mechanisms',source.replace(/^import .*;\r?\n/gm,'').replace(/export function/g,'function').replace(/export const/g,'const').replace('export default','return'))(lib,get,{}, {},{},mechanisms);
 collect(skills,'',role);
 const character=role==='zhongli_rework'?'fan_re_zhongli':'fan_'+role,die=characters[character][4].find(tag=>tag.startsWith('die:'));
 if(!['zibai','hutao'].includes(role))assert.ok(die,character);
 if(die)Audio.die({player:character,info:die.slice(4)}).fileList.forEach(file=>checkAudioFile(file,role));
}
const packaged=new Set([...read('extension.js').matchAll(/"(audio\/[^"]+\.(?:mp3|ogg))"/g)].map(match=>match[1]));
for(const file of referenced)assert.ok(packaged.has(file),'not packaged: '+file);
for(const file of packaged)assert.ok(existsSync(new URL(file,root)),file);
for(const role of roles){const path='audio/'+role+'/originals/'+role+'-sources.json';if(!existsSync(new URL(path,root)))continue;
 const manifest=JSON.parse(read(path));for(const clip of Object.values(manifest.clips||manifest))for(const key of ['output','original'])if(clip[key])assert.ok(existsSync(new URL(clip[key],root)),clip[key]);
}
// Use the actual local 1.11.6 playback entry: config switch and native pools.
lib.config={background_speak:true};lib.skill.global=[];get.Audio=Audio;
const played=[];
const game={broadcast(){},tryAudio({audioList}){played.push(audioList);return audioList;}};
const gameSource=readFileSync(new URL('../../noname/game/index.js',root),'utf8');
const method=gameSource.match(/  trySkillAudio\(skill, player, directaudio, nobroadcast, skillInfo, args\) \{([\s\S]*?)\n  \}/);
assert.ok(method);
game.trySkillAudio=new Function('game','lib','get','return function(skill,player,directaudio,nobroadcast,skillInfo,args){'+method[1]+'}')(game,lib,get);
// Native logSkill forwards its fifth argument to trySkillAudio: undefined bypasses logAudio.
for (const id of ['fan_linji','fan_xingzuo']) {
 game.trySkillAudio(id,'fan_ganyu',true,true);
 assert.equal(played.at(-1).length,1,'reproduce unsuppressed legacy log: '+id);
 game.trySkillAudio(id,'fan_ganyu',true,true,null,[]);
 assert.deepEqual(played.at(-1),[],'explicit args enable logAudio suppression: '+id);
 game.trySkillAudio(id,'fan_ganyu',true,true);
 assert.equal(played.at(-1).length,1,'manual playback retains one clip: '+id);
}
game.trySkillAudio('fan_linji','fan_ganyu',true,true,null,[]);
game.trySkillAudio('fan_linji_charge','fan_ganyu',true,true);
assert.deepEqual(played.at(-2),[]);
assert.deepEqual(played.at(-1),['ext:原神/audio/ganyu/skill/fan_linji_charge.mp3']);
for(const [id,count] of Object.entries({fan_nichi:3,fan_yunjian_full:4,fan_yunjian_form:2,fan_sanxiang_leave_ren:2,fan_yanjian_damage:2,fan_yanjian_full_damage:3,fan_yanjian_control_voice:2,fan_yanjian_full_control_voice:1,fan_renjian_reveal:2,fan_renjian_full_reveal:2,fan_renjian_gift:1,fan_renjian_full_gift:1})){
 game.trySkillAudio(id,'fan_zibai',true,true);assert.equal(played.at(-1).length,count,id);
}
for(const [id,count] of Object.entries({fan_langhua_start:1,fan_langhua_low:2,fan_langhua_mid:2,fan_langhua_high:2})){
 game.trySkillAudio(id,'fan_eula',true,true);assert.equal(played.at(-1).length,count,id);
 assert(played.at(-1).every(file=>file.startsWith('ext:原神/audio/eula/skill/')));
}
for(const id of ['fan_huohua_blast','fan_taopao']){
 game.trySkillAudio(id,'fan_klee',true,true);assert.equal(played.at(-1).length,3,id);
 assert(played.at(-1).every(file=>file.startsWith('ext:原神/audio/klee/skill/')));
}
for(const id of ['fan_huohua','fan_taopao']){
 game.trySkillAudio(id,'fan_klee',true,true,null,[{},{}]);
 assert.deepEqual(played.at(-1),[],id+' skill logs must not duplicate explicit splash/redirect voice');
}
for(const [id,count] of Object.entries({fan_dixin_give:2,fan_dixin_remove:1,fan_qianyan_armor:1,fan_xianyou:1})){
 game.trySkillAudio(id,'fan_zhongli',true,true);assert.equal(played.at(-1).length,count,id);
 assert(played.at(-1).every(file=>file.startsWith('ext:原神/audio/zhongli/skill/')));
}
for(const id of ['fan_qianyan_armor','fan_xianyou']){
 game.trySkillAudio(id,'fan_zhongli',true,true,null,[{},{}]);
 assert.deepEqual(played.at(-1),[],id+' automatic logging has no playable files');
}
for (const [id, count] of Object.entries({fan_guiwang_damage:1,fan_guiwang:2,fan_guiwang_hurt:2,fan_guiwang_move:2,fan_yongyi:4,fan_yongyi_lose:3})) {
 game.trySkillAudio(id, 'fan_itto', true, true);
 assert.equal(played.at(-1).length, count, id);
 assert(played.at(-1).every(file => file.startsWith('ext:原神/audio/itto/skill/')));
 if (!['fan_guiwang','fan_yongyi'].includes(id)) continue;
 game.trySkillAudio(id, 'fan_itto', true, true, null, [{}, {}]);
 assert.deepEqual(played.at(-1), [], id + ' automatic logging is silent');
}
const mavuikaPools={fan_chihun_gain:3,fan_chihun_overflow:2,fan_chihun_convert:2,fan_fentian_charge:2,fan_fentian_fire:3,fan_zailin:3};
const ajaxVoices=['fan_jingwu_convert_voice','fan_jingwu_gain_voice','fan_jingwu_damage_voice','fan_jingwu_draw_voice','fan_kuanglan','fan_kuanglan_repay_voice'];
for(const id of ajaxVoices){
 game.trySkillAudio(id,'fan_ajax',true,true);assert.equal(played.at(-1).length,2,id);
 assert(played.at(-1)[0].startsWith('ext:原神/audio/ajax/skill/'));
}
for(const id of ['fan_jingwu_sha','fan_jingwu_shan','fan_jingwu_effect','fan_kuanglan']){
 game.trySkillAudio(id,'fan_ajax',true,true,null,[{},{}]);
 assert.deepEqual(played.at(-1),[],id+' logging does not duplicate the explicit branch voice');
}
for(const [id,count] of Object.entries(mavuikaPools)){
 game.trySkillAudio(id,'fan_mavuika',true,true);assert.equal(played.at(-1).length,count,id);
 assert(played.at(-1).every(file=>file.startsWith('ext:原神/audio/mavuika/skill/')));
}
for(const id of ['fan_chihun','fan_chihun_use','fan_fentian','fan_fentian_end','fan_zailin']){
 game.trySkillAudio(id,'fan_mavuika',true,true,null,[{},{}]);
 assert.deepEqual(played.at(-1),[],id+' logs do not repeat explicit branch audio');
}
for(const [id,count] of Object.entries({fan_re_dixin_give:3,fan_re_dixin_remove:3,fan_re_xianyou:2})){
 game.trySkillAudio(id,'fan_re_zhongli',true,true,undefined,[]);
 assert.equal(played.at(-1).length,count,id);
 game.trySkillAudio(id,'fan_re_zhongli',true,true,undefined,[{},{}]);
 assert.deepEqual(played.at(-1),[],id+' stays silent at automatic logging');
}
const beforeMuted=played.length;lib.config.background_speak=false;
for(const id of ajaxVoices){game.trySkillAudio(id,'fan_ajax',true,true);assert.equal(played.length,beforeMuted);}
for(const id of Object.keys(mavuikaPools)){game.trySkillAudio(id,'fan_mavuika',true,true);assert.equal(played.length,beforeMuted);}
game.trySkillAudio('fan_dixin_give','fan_zhongli',true,true);assert.equal(played.length,beforeMuted);
game.trySkillAudio('fan_nichi','fan_zibai',true,true);assert.equal(played.length,beforeMuted);
for (const id of ['fan_guiwang', 'fan_yongyi']) { game.trySkillAudio(id, 'fan_itto', true, true); assert.equal(played.length, beforeMuted); }
game.trySkillAudio('fan_langhua_high','fan_eula',true,true);assert.equal(played.length,beforeMuted);
for(const id of ['fan_huohua_blast','fan_taopao']){game.trySkillAudio(id,'fan_klee',true,true);assert.equal(played.length,beforeMuted);}
console.log(`PASS: ${catalog.length} audio files retain SHA-256/bytes; native Audio parses ${referenced.size} skill/death paths across ${roles.length} characters; playback package and source records resolve (no live playback test).`);

lib.config.background_speak=true;
for (const [id,count] of Object.entries({fan_wuxiang_ready_voice:1,fan_wuxiang_hurt_voice:1,fan_wuxiang_sha_voice:1,fan_wuxiang_duel_voice:1,fan_wuxiang_thunder_voice:3,fan_suoguo_voice:3,fan_yushen_voice:3,fan_yushen_awaken_voice:1})) {
 game.trySkillAudio(id,'fan_raiden',true,true);
 assert.equal(played.at(-1).length,count,id);
 assert(played.at(-1).every(file=>file.startsWith('ext:原神/audio/raiden/skill/')));
}
lib.config.background_speak=false;
const raidenBefore=played.length;
game.trySkillAudio('fan_wuxiang_thunder_voice','fan_raiden',true,true);
assert.equal(played.length,raidenBefore);
console.log('PASS: Raiden native voice pools and disabled voice switch');
lib.config.background_speak=true;
for(const [id,count] of [['fan_luanyin',3],['fan_xianzhu',2]]){
 game.trySkillAudio(id,'fan_xianyun',true,true);
 const files=played.at(-1);
 assert.equal(files.length,count);
 assert.deepEqual(files,Array.from({length:count},(_,i)=>`ext:原神/audio/xianyun/skill/${id}${i+1}.mp3`));
}
const xianyunManifest=JSON.parse(read('audio/xianyun/originals/xianyun-sources.json'));
assert.deepEqual([1,2,3].map(i=>xianyunManifest.clips['fan_luanyin'+i].label),['元素爆发·其一','元素爆发·其二','元素爆发·其三']);
assert.deepEqual([1,2].map(i=>xianyunManifest.clips['fan_xianzhu'+i].label),['加入队伍·其一','加入队伍·其三']);
for(const clip of Object.values(xianyunManifest.clips)){
 assert.equal(createHash('sha256').update(readFileSync(new URL(clip.original,root))).digest('hex'),clip.original_sha256);
 assert(clip.volume.after.true_peak_dbtp<=-1);
}
lib.config.background_speak=false;
const mutedXianyun=played.length;
for(const id of ['fan_luanyin','fan_xianzhu'])game.trySkillAudio(id,'fan_xianyun',true,true);
assert.equal(played.length,mutedXianyun);
console.log('PASS: Xianyun exact 3/2 native pools, specified source entries, original hashes, encoded true peaks and muted playback');

lib.config.background_speak=true;
for(const [id,count] of [['fan_cijue_start',5],['fan_cijue_win',2],['fan_xianjing_damage',3],['fan_xianjing_other',3]]){
 game.trySkillAudio(id,'fan_navia',true,true);
 assert.deepEqual(played.at(-1),Array.from({length:count},(_,i)=>`ext:原神/audio/navia/skill/${id}${i+1}.mp3`));
}
assert.equal(Audio.die({player:'fan_navia',info:characters.fan_navia[4].find(s=>s.startsWith('die:')).slice(4)}).fileList.length,3);
const navia=JSON.parse(read('audio/navia/originals/navia-sources.json'));
assert.equal(Object.keys(navia.clips).length,16);
for(const [id,clip] of Object.entries(navia.clips)){
 assert.equal(createHash('sha256').update(readFileSync(new URL(clip.original,root))).digest('hex'),clip.original_sha256);
 assert(clip.volume.after.true_peak_dbtp<=-1);
 assert.equal(!!clip.separation,false,'rejected separation must not be used: '+id);
 if (['fan_cijue_start1','fan_cijue_start2','fan_cijue_start3'].includes(id)) assert(clip.processing.includes('BGM retained'));
}
lib.config.background_speak=false;
const naviaMuted=played.length;
for(const id of ['fan_cijue_start','fan_cijue_win','fan_xianjing_damage','fan_xianjing_other'])game.trySkillAudio(id,'fan_navia',true,true);
assert.equal(played.length,naviaMuted);
console.log('PASS: Navia exact 5/2/3/3 pools, three death clips, original hashes, restored original question recordings, peak bounds and native mute switch');

lib.config.background_speak=true;
// Jean's manual logs are silent; explicit branches resolve one exact source file.
for(const id of ['fan_fengya','fan_shiya']) { game.trySkillAudio(id,'fan_jean',true,true,null,[]); assert.deepEqual(played.at(-1),[]); }
for(let i=1;i<=3;i++) for(const id of ['fan_fengya_voice'+i,'fan_shiya_heal'+i]) {
 game.trySkillAudio(id,'fan_jean',true,true);assert.deepEqual(played.at(-1),['ext:原神/audio/jean/skill/'+id+'.mp3']);
}
const jeanSources=JSON.parse(read('audio/jean/originals/jean-sources.json'));
for(const clip of Object.values(jeanSources.clips)) {
 const original=readFileSync(new URL(clip.original,root));assert.equal(original.length,clip.bytes);
 assert.equal(createHash('sha256').update(original).digest('hex'),clip.original_sha256);
 assert(clip.volume.after.true_peak_dbtp<=-1);assert.equal(clip.trim_seconds,null);
}
console.log('PASS: Jean exact E/Q clips, silent logs, original hashes and measured output peaks.');
lib.config.background_speak=true;
for(const id of ['fan_jiliu','fan_shuijing']) {
 game.trySkillAudio(id,'fan_mona',true,true);
 assert.deepEqual(played.at(-1),[1,2,3].map(i=>`ext:原神/audio/mona/skill/${id}${i}.mp3`));
}
game.trySkillAudio('fan_shuijing','fan_mona',true,true,null,[]);assert.deepEqual(played.at(-1),[]);
assert.deepEqual(Audio.die({player:'fan_mona',info:characters.fan_mona[4].find(s=>s.startsWith('die:')).slice(4)}).fileList,[1,2,3].map(i=>`ext:原神/audio/mona/die/fan_mona${i}.mp3`));
const mona=JSON.parse(read('audio/mona/originals/mona-sources.json'));
const labels=['元素战技·其一','元素战技·其二','重受击·其一','元素战技·其三','加入队伍·其一','加入队伍·其三','倒下·其一','倒下·其二','倒下·其三'];
assert.deepEqual(Object.values(mona.clips).map(c=>c.label),labels);
for(const clip of Object.values(mona.clips)){
 const original=readFileSync(new URL(clip.original,root));assert.equal(original.length,clip.bytes);
 assert.equal(createHash('sha256').update(original).digest('hex'),clip.original_sha256);
 assert(clip.volume.after.true_peak_dbtp<=-1);assert.equal(clip.trim_seconds,null);
}
lib.config.background_speak=false;const monaMuted=played.length;
for(const id of ['fan_jiliu','fan_shuijing'])game.trySkillAudio(id,'fan_mona',true,true);
assert.equal(played.length,monaMuted);
console.log('PASS Mona exact specified 3/3/3 pools, originals/volume/subtitles, silent start logs and native mute switch.');

assert(mona.clips.fan_jiliu3.url.endsWith('VO_ZH_Mona_Heavy_Hit_Taken_02.ogg'));
assert.equal(mona.clips.fan_jiliu3.text,'离我…远点！');
const monaVoiceText=JSON.parse(read('audio/mona/originals/mona-fandom-voice-page.json')).parse.wikitext['*'];
assert.match(monaVoiceText,/hit-h_1_file\s*= Heavy Hit Taken 02/);
assert.match(monaVoiceText,/hit-h_1_tx_s\s*= 离我…远点！/);
console.log('PASS Mona spoken heavy-hit line maps to audio file 02, not grunt file 01.');
