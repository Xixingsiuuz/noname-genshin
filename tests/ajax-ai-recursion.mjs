import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../character/skills/ajax.js',import.meta.url),'utf8');
let skills,depth=0,calls=0,fail=false;
const equipment={name:'weapon'};
const player={storage:{},getCards:()=>[],hasSkill:()=>false};
const target={isIn:()=>true,isLinked:()=>false,countGainableCards:()=>1};
const ui={selected:{cards:[equipment],targets:[target]}};
const status={event:{skill:'fan_jingwu_sha_backup',player}};
const get={type:()=> 'equip',attitude:()=>-5,value:()=>3,
 effect(t,card,p){
  assert(++depth<5,'recursive AI evaluation must terminate');calls++;
  try{
   if(fail)throw new Error('native evaluation failed');
   // Simulate native Tiesuo evaluation asking about a Sha, with the same selection context.
   const result=skills.fan_jingwu.subSkill.sha.ai.effect.player({name:'sha'},p,t);
   assert.equal(result,undefined,'nested native card evaluation must not reapply precision bonus');
   return 10;
  }finally{depth--;}
 },damageEffect(t,p){return get.effect(t,{name:'damage'},p);}};
skills=new Function('game','get','lib','ui','_status',source.replace(/^import .*;\r?\n/gm,'').replace('export default','return'))
 ({checkMod:()=> 'unchanged',hasNature:()=>false},get,{},ui,status);
const ai=skills.fan_jingwu.subSkill.sha.ai.effect.player;
assert.equal(ai({name:'tiesuo'},player,target),undefined);
for(const index of [0,1,2,0]){
 player.storage.fan_jingwu_index=index;
 assert(Number.isFinite(ai({name:'sha'},player,target)[1]));
}
assert(calls>0);
fail=true;assert.throws(()=>ai({name:'sha'},player,target),/native evaluation failed/);
fail=false;assert(Number.isFinite(ai({name:'sha'},player,target)[1]),'exception cleanup permits future independent evaluations');
console.log('PASS Ajax AI: nested Tiesuo/damage-to-Sha evaluations terminate, unrelated cards excluded, repeated evaluations and exception cleanup (simulation).');
