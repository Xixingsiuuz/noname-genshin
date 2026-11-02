import assert from 'node:assert/strict';
import {readFileSync, existsSync} from 'node:fs';
const read = path => readFileSync(new URL('../'+path, import.meta.url), 'utf8');
const lib = {skill:{},translate:{},characterSubstitute:{}};
const get = { info: id => lib.skill[id], character: () => ({tempname:[]}) };
const source = readFileSync(new URL('../../../noname/get/audio.js', import.meta.url),'utf8');
const Audio = new Function('get','lib',source.replace(/^import .*;\r?\n/gm,'').replace(/export\s*\{[\s\S]*?\};?\s*$/,'')+'\nreturn Audio;')(get,lib);
Object.assign(lib.translate, new Function(read('character/voices.js').replace('export default','return'))());
const skills = new Function('game','get','ui','_status',read('character/skills/arlecchino.js').replace(/^import .*;\r?\n/gm,'').replace('export default','return'))({},get,{},{});
function register(entries,prefix='') {
 for (const [key,skill] of Object.entries(entries)) {
  const id=prefix ? prefix+'_'+key : key; lib.skill[id]=skill;
  if (skill.subSkill) register(skill.subSkill,id);
 }
}
register(skills);
for (const [id,count] of Object.entries({fan_chiyi:2,fan_luhuo_start:3,fan_luhuo_draw:2,fan_luhuo_attack:2,fan_ruyue_rise:2,fan_ruyue_fall:2,fan_ruyue_convert_voice:3,fan_luhuo:7,fan_ruyue:0})) {
 const result=Audio.skill({skill:id});
 assert.equal(result.fileList.length,count,id);
 assert.equal(result.textList.length,count,id);
 for(const file of result.fileList) assert.ok(existsSync(new URL('../'+file.replace('ext:原神/',''),import.meta.url)),file);
}
assert.ok(Audio.skill({skill:'fan_ruyue_rise'}).textList.includes('如月长存。'));
assert.ok(Audio.skill({skill:'fan_ruyue_fall'}).textList.includes('如月长存。'));
assert.equal(skills.fan_luhuo.logAudio(),false);
assert.equal(skills.fan_ruyue.logAudio(),false);
assert.equal(Audio.skill({skill:'fan_ruyue',args:undefined}).fileList.length,0, 'logSkill无args也必须静音');
assert.equal(Audio.skill({skill:'fan_ruyue',args:[]}).fileList.length,0, '触发确认不得提前播音');
assert.equal(Audio.skill({skill:'fan_ruyue_rise'}).fileList.length,2, '升起仅两个等概率候选');
assert.equal(Audio.skill({skill:'fan_ruyue_fall'}).fileList.length,2, '坠落仅两个等概率候选');
const characters=new Function(read('character/character.js').replace('export default','return'))();
const death=characters.fan_arlecchino[4].find(tag=>tag.startsWith('die:'));
assert.equal(Audio.die({player:'fan_arlecchino',info: {dieAudios:death.slice(4)}}).fileList.length,3);
console.log('PASS 阿蕾奇诺原生 Audio：全部分支随机池、台词、文件路径、阵亡与静默日志');
