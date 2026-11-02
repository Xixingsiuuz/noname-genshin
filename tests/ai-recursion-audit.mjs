import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=role=>readFileSync(new URL('../character/skills/'+role+'.js',import.meta.url),'utf8');
for(const role of ['eula','citlali']) {
 let hook,depth=0,fail=false,calls=0;
 const material={name:'sha',color:'black'};
 const player={storage:{},hp:3,hujia:5,hasSkill:id=>id==='fan_zhuyao',getCards:()=>[material],
 getHistory:()=>[],getAllHistory:()=>Array.from({length:7},()=>({card:{number:11}}))};
 const target={hp:3,isIn:()=>true,isLinked:()=>false};
 const nested=()=>{assert(++depth<4);calls++;try {if(fail)throw Error('evaluation failed');assert.equal(hook(material,player,target),undefined);return 3;}finally{depth--;}};
 const get={number:()=>11,tag:()=>true,nature:()=>undefined,damageEffect:nested,effect:nested,
 attitude:()=>-5,color:c=>c.color};
 const game={countPlayer:()=>1,filterPlayer:()=>[player]};
 const skills=new Function('game','get','lib','ui','_status',read(role).replace(/^import .*;\r?\n/gm,'').replace(/export function/g,'function').replace('export default','return'))(game,get,{}, {},{});
 hook=skills[role==='eula'?'fan_langhua':'fan_yingxin_share'].ai.effect.player;
 assert(hook(material,player,target));assert(calls>0);
 assert(hook(material,player,target),'independent evaluation is not suppressed');
 fail=true;assert.throws(()=>hook(material,player,target),/evaluation failed/);
 fail=false;assert(hook(material,player,target),'guard is cleared on exception');
}
console.log('PASS: Eula virtual-number damage and Citlali last-black-hand nested AI evaluation terminate; repeated evaluation and exception cleanup (simulation).');
