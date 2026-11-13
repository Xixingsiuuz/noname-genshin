import assert from'node:assert/strict';
import{readFileSync,existsSync}from'node:fs';
const read=p=>readFileSync(new URL(p,import.meta.url),'utf8');
const strip=s=>s.replace(/^import.*;\r?\n/gm,'').replace(/export /g,'');
const data=new Function(strip(read('../card/red-eyes-data.js'))+';return{redEyesFaces,sampleRedEyes,sampleBlackStone};')();
const sample=values=>data.sampleBlackStone(()=>values.shift());
assert.deepEqual(sample([0,0]),{source:'pile',name:'sha'});
assert.deepEqual(sample([0,.99]),{source:'pile',name:'huogong'});
assert.equal(sample([.9,0,0]).name,'fan_heiganglong');
assert.equal(sample([.9,0,.9]).name,'fan_heilong');assert.equal(sample([.9,.9]).name,'fan_heiyandan');
for(let i=0;i<100;i++)assert(!['fan_chuanshuoheishi','fan_zhenhongzhijuexing'].includes(data.sampleBlackStone().name));
assert.equal(data.sampleRedEyes(()=>0).filter(c=>c.source==='pile').length,2);
assert.equal(data.sampleRedEyes(()=>.99).filter(c=>c.source==='pile').length,3);
assert.throws(()=>data.sampleBlackStone(()=>1),RangeError);
const get={number:c=>c.number};const lib={filter:{cardDiscardable:c=>!c.protected}};
const{redEyesCards:cards,redEyesSkills:skills,flamePayment}=new Function('game','get','lib','ui','_status','redEyesFaces','sampleRedEyes','sampleBlackStone','const playCynoSound = () => {};\n'+strip(read('../card/red-eyes.js'))+';return{redEyesCards,redEyesSkills,flamePayment};')({},get,lib,{}, {},data.redEyesFaces,data.sampleRedEyes,data.sampleBlackStone);
for(const[name,c]of Object.entries(cards)){assert.equal(c.destroy,'discardPile');assert(c.global.includes('fan_heiganglong_record'));assert(existsSync(new URL('../'+c.image.replace('ext:原神/',''),import.meta.url)));}
const move=skills.fan_chuanshuoheishi_move;
const material={}, stone={name:'fan_chuanshuoheishi',cards:[material]};
let equipped=[], draws=0;
get.subtypes=()=>['equip5'];
lib.filter.canBeGained=card=>card===material;
const holder={getVEquips:()=>[],getVCards:zone=>{assert.equal(zone,'e');return[stone]},isIn:()=>true,async draw(){draws++}};
const receiver={isIn:()=>true,isMin:()=>false,countEquipableSlot:()=>1,
 getVEquips:slot=>slot==='equip5'?equipped:[],getVCards:()=>equipped,
 canEquip:(card,replace)=>card===stone&&!replace,
 async equip(card){equipped=[card]}};
assert(move.filterTarget(null,holder,receiver));
await move.content({target:receiver},null,holder);
assert.deepEqual(equipped,[stone]);
assert.equal(draws,1);
assert(!move.filterTarget(null,holder,receiver));
const flame={number:7};assert(!flamePayment(flame,{},flame));assert(flamePayment({number:7},{}));assert(!flamePayment({number:6},{}));assert(!flamePayment({number:7,protected:true},{}));
const source={playerid:'owner'};let lost=0;
const target={playerid:'victim',storage:{},addSkill(){},markSkill(){},removeSkill(){},async loseHp(){lost++}};
for(let i=0;i<2;i++)await skills.fan_heiganglong_record.content({}, {card:{name:'sha'},cards:[{name:'fan_heiganglong'}],player:source,target,getParent:()=>({})});
assert.equal(target.storage.fan_heiganglong_mark.owner,2);
const excluded=[];const use={excluded:{add:p=>excluded.push(p)}};
const reaction={player:target,target:source,getParent:()=>use};
assert(skills.fan_heiganglong_retaliation.filter(reaction));
await skills.fan_heiganglong_retaliation.content({},reaction);
assert.equal(lost,1);assert.equal(target.storage.fan_heiganglong_mark.owner,1);
assert(!skills.fan_heiganglong_retaliation.filter(reaction));
reaction.getParent=()=>({excluded:{add:p=>excluded.push(p)}});
await skills.fan_heiganglong_retaliation.content({},reaction);
assert.equal(lost,2);assert.equal(target.storage.fan_heiganglong_mark,undefined);
assert.deepEqual(excluded,[source,source]);
assert.equal(skills.fan_heiganglong_record.trigger.global,'useCardToPlayer');
console.log('PASS 真红眼：开包/黑石概率分支、排除牌、资源、黑炎弹足额支付与黑钢逐层持久标记（模拟，非对局实测）');
