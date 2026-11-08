import fs from 'node:fs';import assert from 'node:assert/strict';
const read=p=>fs.readFileSync(p,'utf8');
const voices=new Function(read('character/voices.js').replace('export default','return'))();
const lib={config:{background_speak:true},translate:voices};const get={character:()=>({tempname:[]})};
const Audio=new Function('get','lib',read('../../noname/get/audio.js').replace(/^import .*;\r?\n/gm,'').replace(/export\s*\{[\s\S]*?\};?\s*$/,'')+';return Audio;')(get,lib);get.Audio=Audio;
const install=new Function(read('ui/wanderer-voices.js').replace('export function','function')+';return installWandererDeathAudio;')();
let played=[],fallback=0;const game={tryDieAudio(){fallback++;},broadcastAll(fn,...args){fn(...args);},tryAudio(x){played.push(x.audioList);}};
// Serialized native broadcast callbacks resolve the engine globals on each client.
globalThis.lib=lib;globalThis.get=get;globalThis.game=game;
install(game,lib,get);const first=game.tryDieAudio;install(game,lib,get);assert.equal(first,game.tryDieAudio);
const p={name:'fan_wanderer',storage:{},skin:{},tempname:[]};game.tryDieAudio(p);assert.equal(played.at(-1).length,3);
p.storage.fan_genchu_result='success';game.tryDieAudio(p);assert.equal(played.at(-1).length,3);
p.storage.fan_genchu_result='failure';game.tryDieAudio(p);assert.equal(played.at(-1).length,2);assert.ok(played.at(-1).every(x=>x.includes('fan_wanderer_failure')));
for(const list of played)for(const file of list)assert.ok(fs.existsSync(file.replace('ext:原神/','').replace('../extension/原神/','').replace('extension/原神/','')),file);
lib.config.background_speak=false;const n=played.length;game.tryDieAudio(p);assert.equal(played.length,n);game.tryDieAudio({name:'other'});assert.equal(fallback,1);
const manifest=JSON.parse(read('audio/wanderer/originals/sources.json'));for(const clip of Object.values(manifest.clips)){assert.ok(fs.existsSync(clip.output));assert.ok(fs.existsSync(clip.original));assert.ok(read('extension.js').includes(clip.output));}
console.log('PASS: native state-specific death pools, speech switch, fallback, idempotence and packaged audio files');



assert.equal(get.Audio.die({player:p}).fileList.length,5);
assert.equal(get.Audio.die({player:p}).textList.length,5);
lib.skill={};lib.character={fan_wanderer:['male','wei',3,[],['die:ext:原神/audio/wanderer/die:3']]};
const mounted=[];const legacy={broadcastAll(fn,...args){fn(...args);},addGlobalSkill(id){assert.ok(lib.skill[id]);mounted.push(id);}};
globalThis.game=legacy;
install(legacy,lib,{});install(legacy,lib,{});assert.equal(mounted.length,1);
const recorder=lib.skill[mounted[0]];
for(const state of ['failure','success',undefined]){
 p.storage.fan_genchu_result=state;
 assert(recorder.filter({player:p}));
 await recorder.content({}, {player:p});
 const tag=lib.character.fan_wanderer[4][0];
 assert.equal(tag.includes('failure'),state==='failure');
 assert(fs.existsSync(tag.replace('die:ext:原神/','')+'.mp3'));
}
assert.equal(recorder.filter({player:{name:'other'}}),false);
console.log('PASS: five detail lines and mounted legacy death recorder with valid native paths');
