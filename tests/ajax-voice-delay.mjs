import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const timers=[],timeline=[];let now=0;
const source=readFileSync(new URL('../character/skills/ajax.js',import.meta.url),'utf8');
const skills=new Function('game','get','lib','ui','_status','setTimeout','Date',source.replace(/^import .*;\r?\n/gm,'').replace('export default','return'))
 ({trySkillAudio:id=>timeline.push(id)}, {}, {}, {}, {}, (callback,delay)=>timers.push({callback,delay}), {now:()=>now});
const player={storage:{},syncStorage(){},markSkill(){},isIn:()=>true,
 gainPlayerCard:async()=>timeline.push('gain'),draw(){now+=1200;return {result:{cards:[{}]}}}};
const target={isIn:()=>true,countGainableCards:()=>1,isLinked:()=>true};
const use={name:'useCard',card:{name:'sha'},targets:[target]};
await skills.fan_jingwu.subSkill.effect.content({},use,player);
assert.deepEqual(timeline,['fan_jingwu_convert_voice','gain']);assert.equal(timers[0].delay,900);
timers.shift().callback();assert.equal(timeline.at(-1),'fan_jingwu_gain_voice');
player.storage.fan_jingwu_index=0;timeline.length=0;
await skills.fan_jingwu.subSkill.effect.content({}, {name:'useCard',card:{name:'shan'},respondTo:[target]},player);
assert.deepEqual(timeline,['fan_jingwu_gain_voice','gain']);assert.equal(timers.length,0);
player.storage.fan_jingwu_index=2;timeline.length=0;
await skills.fan_jingwu.subSkill.effect.content({},use,player);
assert.deepEqual(timeline,['fan_jingwu_convert_voice','fan_jingwu_draw_voice']);assert.equal(timers.length,0,'long effect needs no additional delay');
console.log('PASS Ajax voice-only 900ms separation; rules continue immediately; Shan unchanged; already elapsed delay is not repeated (simulation).');
