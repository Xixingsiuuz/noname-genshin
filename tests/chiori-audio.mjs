import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import characters from '../character/character.js';
const read = path => readFileSync(new URL('../'+path, import.meta.url),'utf8');
const heard=[];
const game={trySkillAudio(id,player,direct){assert.equal(direct,true);heard.push(id);}};
const skills=new Function('game','get','ui',read('character/skills/chiori.js').replace(/^import .*;\r?\n/gm,'').replace('export default','return'))(game,{},{});
const lib={skill:{fan_yuxiu:skills.fan_yuxiu,fan_yuxiu_use:skills.fan_yuxiu.subSkill.use,fan_feiren:skills.fan_feiren},translate:{},characterSubstitute:{}};
const get={info:id=>lib.skill[id],character:()=>({tempname:[]})};
const audioSource=readFileSync(new URL('../../../noname/get/audio.js',import.meta.url),'utf8');
const Audio=new Function('get','lib',audioSource.replace(/^import .*;\r?\n/gm,'').replace(/export\s*\{[\s\S]*?\};?\s*$/,'')+'\nreturn Audio;')(get,lib);
const files=[];
for(const id of Object.keys(lib.skill)){
 const pool=Audio.skill({skill:id,info:lib.skill[id]}).fileList;
 assert.equal(pool.length,3);files.push(...pool);
}
const die=characters.fan_chiori[4].find(tag=>tag.startsWith('die:'));
const deaths=Audio.die({player:'fan_chiori',info:die.slice(4)}).fileList;
assert.equal(deaths.length,3);files.push(...deaths);
const packaged=new Set([...read('extension.js').matchAll(/"(audio\/[^\"]+\.mp3)"/g)].map(m=>m[1]));
const catalog=JSON.parse(read('audio/catalog.json')).filter(item=>item.role==='chiori');
assert.equal(catalog.length,24);
for(const item of catalog){const data=readFileSync(new URL('../'+item.path,import.meta.url));assert.equal(data.length,item.bytes);assert.equal(createHash('sha256').update(data).digest('hex'),item.sha256);}
for(const file of files)assert(packaged.has(file.replace('ext:原神/','')),file);
const a={cardid:'a'},b={cardid:'b'};
let losses=[];
const player={getHistory(type,filter){assert.equal(type,'lose');return losses.filter(filter);}};
const voice=skills.fan_yuxiu.subSkill.use;
assert(skills.fan_yuxiu.group.includes('fan_yuxiu_use'));
for(const name of ['useCard','respond']){
 const event={name,cards:[a,b],card:{}};
 losses=[{getParent:()=>event,ss:[a,b],gaintag_map:{a:['fan_yuxiu'],b:['fan_yuxiu']}}];
 assert(voice.filter(event,player));await voice.content({},event,player);
 event.card.storage={fan_feiren:true};assert.equal(voice.filter(event,player),false);
 event.card={};losses[0].getParent=()=>({});assert.equal(voice.filter(event,player),false);
}
assert.deepEqual(heard,['fan_yuxiu_use','fan_yuxiu_use']);
assert.equal(skills.fan_yuxiu.subSkill.gain.audio,false);
console.log('PASS: Chiori native 3+3+3+3 audio pools, asset hashes/package, attached use/respond trigger, two sleeves once, unrelated loss and Feiren overlap excluded (simulation).');
