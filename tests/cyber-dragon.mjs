import assert from'node:assert/strict';
import{readFileSync,existsSync}from'node:fs';
const read=p=>readFileSync(new URL(p,import.meta.url),'utf8');
const lib={character:{a:{skills:['locked','ordinary']}},skill:{locked:{locked:true},ordinary:{},equipment:{equipSkill:true},cardEffect:{},internal:{charlotte:true}}};
let marks=0,sealed,expansions=0,choices=0;
const target={isIn:()=>true,addTempSkill(id,expiry){sealed={id,expiry}}};
const game={hasPlayer:fn=>fn(target),expandSkills:list=>{expansions++;return list;}};
const{cyberDragonCards:cards,cyberDragonSkills:skills,sampleCyberDragon:sample}=new Function('game','get','lib','ui','_status',read('../card/cyber-dragon.js').replace(/^import.*;\r?\n/gm,'').replace(/export /g,'')+';return{cyberDragonCards,cyberDragonSkills,sampleCyberDragon};')(game,{},lib,{},{});
assert.equal(sample(()=>0).filter(c=>c.source==='pile').length,2);
assert(sample(()=>0).slice(0,2).every(c=>c.kind==='tiesuo'));
assert(sample(()=>.99).slice(0,3).every(c=>c.kind==='armor'));
let rolls=[0,0,0,.4,0,.4,.9,.9];
assert.deepEqual(sample(()=>rolls.shift()).slice(2).map(c=>c.name),['fan_wuxian','fan_xinxing','fan_wuxianpaoying']);
for(const[name,c]of Object.entries(cards)){assert.equal(c.destroy,'discardPile');assert(c.global.includes('fan_wuxian_after'));assert(existsSync(new URL('../'+c.image.replace('ext:原神/',''),import.meta.url)));}
const owner={isIn:()=>true,addSkill(){},addMark(id,n){marks+=n},countMark:()=>marks,chooseTarget(){choices++;return{set(){return this},async forResult(){return{bool:true,targets:[target]}}}}};
await cards.fan_xinxing.content({},null,owner);await cards.fan_wuxian.content({},null,owner);
assert.equal(marks,2);assert.equal(skills.fan_dianzilong_growth.mod.maxHandcard(owner,4),6);
const draw={num:2};await skills.fan_dianzilong_growth.content({},draw,owner);assert.equal(draw.num,4);
assert.equal(skills.fan_dianzilong_growth.filter({numFixed:true},owner),false);
for(const neutralized of [false,true]){
 const use={card:{name:'fan_wuxian'},player:owner,all_excluded:neutralized};
 assert(skills.fan_wuxian_after.filter(use));await skills.fan_wuxian_after.content({},use);
 assert.equal(sealed.id,'fan_dianzilong_seal');assert.deepEqual(sealed.expiry,{player:'phaseAfter'});
}
assert(skills.fan_dianzilong_seal.skillBlocker('locked',owner));assert(skills.fan_dianzilong_seal.skillBlocker('ordinary',owner));
assert(!skills.fan_dianzilong_seal.skillBlocker('equipment',owner));assert(!skills.fan_dianzilong_seal.skillBlocker('cardEffect',owner));assert(!skills.fan_dianzilong_seal.skillBlocker('internal',owner));
assert.equal(skills.fan_wuxianpaoying_window.trigger.global,'phaseBefore');
const repeated={card:{name:'fan_wuxian'},player:owner};const before=choices;
await skills.fan_wuxian_after.content({},repeated);await skills.fan_wuxian_after.content({},repeated);
assert.equal(choices,before+1,'多个全局派发只选择一次');
let windows=0;const responder={isIn:()=>true,async chooseToUse(){windows++;}};
const list=[responder];list.sortBySeat=()=>list;game.filterPlayer=()=>list;
const phase={player:target};await skills.fan_wuxianpaoying_window.content({},phase,owner);await skills.fan_wuxianpaoying_window.content({},phase,owner);
assert.equal(windows,1);
for(let i=0;i<10000;i++)skills.fan_dianzilong_seal.skillBlocker('ordinary',owner);
assert.equal(expansions,1,'高频封技查询不得重复扫描/展开全部技能');
console.log('PASS 电子龙：概率/升格、挂载/资源、永久叠加、固定摸牌例外、整牌无效后封技、锁定武将/装备/卡牌区分（模拟，非对局实测）');
