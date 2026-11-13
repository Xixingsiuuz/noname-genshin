import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
const read=p=>readFileSync(new URL(p,import.meta.url),'utf8');
const data=new Function(read('../card/hero-data.js').replace(/export /g,'')+';return {heroFaces,sampleHeroes};')();
const {sampleHeroes:sample,heroFaces:faces}=data;
assert.equal(sample(()=>0).filter(c=>c.source==='pile').length,2);
assert(sample(()=>0).slice(0,2).every(c=>c.kind==='sha'));
assert(sample(()=>.99).slice(0,3).every(c=>c.kind==='equip'));
let rolls=[0,0,0,.4,0,.4,.9,.9];
assert.deepEqual(sample(()=>rolls.shift()).slice(2).map(c=>c.name),['fan_shanguangxinyi','fan_xinyuzhouxia','fan_jueduilingdu']);
assert.throws(()=>sample(()=>1),RangeError);
const lib={card:{},skill:{},translate:{}},game={},get={};
const {heroCards:cards,fusionDefinition:build}=new Function('game','get','lib','ui','heroFaces','sampleHeroes','const playCynoSound = () => {};\n'+read('../card/heroes.js').replace(/^import .*;\r?\n/gm,'').replace(/export /g,'')+';return {heroCards,fusionDefinition};')(game,get,lib,{},faces,sample);
for(const [name,card] of Object.entries(cards)){
 assert.equal(card.destroy,'discardPile');assert.equal(faces[name][0],'heart');
 assert(existsSync(new URL('../'+card.image.replace('ext:原神/',''),import.meta.url)));
}
const lose=()=>{}, otherLose=()=>{};
const defs={a:{skills:['a'],distance:{attackFrom:-2,globalFrom:-1},onLose:lose},b:{skills:['b','a'],distance:{attackFrom:-4,globalFrom:-1,globalTo:1},onLose:otherLose}};
const fused=build(['a','b'],'equip5',defs);
lib.skill.a={usable:1,enable:'phaseUse'};lib.skill.b={usable:1,enable:'phaseUse'};
const independent=build(['a','b'],'equip5',defs,'fan_ronghe_test');
assert.deepEqual(independent.skills,['fan_ronghe_test_a','fan_ronghe_test_b']);
assert.equal(lib.skill.fan_ronghe_test_a.usable,1);
assert.notEqual(lib.skill.fan_ronghe_test_a,lib.skill.a);
const used={a:1};assert.equal(used[independent.skills[0]]||0,0,'已用过原技能不消耗融合技能额度');
assert.deepEqual(fused.skills,['a','b']);assert.equal(fused.distance.attackFrom,-4);
assert.equal(fused.distance.globalFrom,-2);assert.equal(fused.distance.globalTo,1);
assert.deepEqual(fused.onLose,[lose,otherLose]);assert.deepEqual(fused.source,['fan_ronghe','a','b']);
assert.equal(fused.subtype,'equip5');assert.equal(fused.destroy,'discardPile');
assert.equal(cards.fan_xinyuzhouxia.distance.globalFrom,-1);
assert.equal(cards.fan_jueduilingdu.distance.attackFrom,-2);
// 固定X：摸牌引起装备变化后，弃牌数量仍使用开始时的值。
let equipment=3, discarded=0;
const target={isIn:()=>true,countDiscardableCards:()=>2};
game.hasPlayer=fn=>fn(target);
const player={countCards:()=>equipment,isIn:()=>true,async draw(n){assert.equal(n,3);equipment=0},chooseTarget(){return {set(){return this},async forResult(){return {bool:true,targets:[target]}}}},async discardPlayerCard(t,pos,n){discarded=n}};
await cards.fan_shanguangxinyi.content({},null,player);assert.equal(discarded,2);
assert(read('../card/index.js').includes('...heroCards'));
assert(read('../card/cyno-faces.js').includes('heroFaces') && read('../character/skills/tester.js').includes('faces[link[2]]'));
const emptyTarget = {isIn:()=>true,countDiscardableCards:()=>0};
const chooser = {
  chooseTarget(prompt, filter) {
    assert(filter(null,this,emptyTarget));
    assert(!filter(null,this,this));
    return {set(){return this},async forResult(){return {bool:true,targets:[emptyTarget]}}};
  },
  discardPlayerCard(){assert.fail('空手牌目标无需执行弃牌');},
};
await cards.fan_jueduilingdu.onLose({},null,chooser);
console.log('PASS 英雄卡组：抽样升格、牌面/测试入口、融合技能距离离场复制、固定X及不足弃尽（模拟）。');
