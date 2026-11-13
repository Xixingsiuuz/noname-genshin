import assert from'node:assert/strict';
import{readFileSync,existsSync}from'node:fs';
const read=p=>readFileSync(new URL(p,import.meta.url),'utf8');
const strip=s=>s.replace(/^import.*;\r?\n/gm,'').replace(/export /g,'');
const data=new Function(strip(read('../card/cyberse-data.js'))+';return{cyberseFaces,sampleCyberse};')();
const sample=data.sampleCyberse;
assert.equal(sample(()=>0).filter(c=>c.source==='pile').length,2);
assert(sample(()=>0).slice(0,2).every(c=>c.name==='sha'));
assert(sample(()=>.99).slice(0,3).every(c=>c.name==='guohe'));
assert(sample(()=>0).slice(2).every(c=>c.name==='fan_yuanshishengming'));
assert.throws(()=>sample(()=>1),RangeError);
const status={},get={number:c=>c.number,name:c=>c.name};
const pile=[{number:2},{number:3}];
const ui={selected:{cards:[]},cardPile:{childNodes:pile}};
const game={hasPlayer:fn=>fn(target)};
const lib={filter:{cardDiscardable:()=>true}};
const{cyberseCards:cards,cyberseSkills:skills,matchingNumber}=new Function('game','get','lib','ui','_status','cyberseFaces','sampleCyberse',strip(read('../card/cyberse.js'))+';return{cyberseCards,cyberseSkills,matchingNumber};')(game,get,lib,ui,status,data.cyberseFaces,sample);
for(const[name,c]of Object.entries(cards)){assert.equal(c.destroy,'discardPile');assert(c.global.includes('fan_yuanshishengming_window'));assert(existsSync(new URL('../'+c.image.replace('ext:原神/',''),import.meta.url)));}
assert(matchingNumber({number:4},[{number:4}],{}));assert(!matchingNumber({number:5},[{number:4}],{}));
const p={storage:{fan_wangjichongtu_block:{source:[]}},markSkill(){}};
const blocker=skills.fan_wangjichongtu_block;
assert.equal(blocker.content.constructor, Object.getPrototypeOf(async function() {}).constructor);
await blocker.content({}, {player:{playerid:'source'},card:{number:4}}, p);
await blocker.content({}, {player:{playerid:'bystander'},card:{number:5}}, p);
for(const mod of ['cardEnabled','cardRespondable','cardSavable']){
 assert.equal(skills.fan_wangjichongtu_block.mod[mod]({name:'shan',number:4},p),false);
 assert.equal(skills.fan_wangjichongtu_block.mod[mod]({name:'sha',number:5},p),undefined);
}
const source={isIn:()=>true,getHistory:()=>Array(4)};status.currentPhase=source;
assert.equal(skills.fan_yuanshishengming_window.filter({player:source}),false);
source.getHistory=()=>Array(5);assert.equal(skills.fan_yuanshishengming_window.filter({player:source}),true);
status.currentPhase={};assert.equal(skills.fan_yuanshishengming_window.filter({player:source}),false);
let hits=0,alive=true;
const target={isIn:()=>alive};
const chain={isIn:()=>true,canUse(card,t,distance,count){assert.equal(distance,false);assert.equal(count,false);return alive},
 chooseToDiscard(position,range,forced){assert.equal(position,'he');assert.deepEqual(range,[1,Infinity]);assert.equal(forced,true);return{set(){return this},async forResult(){return{bool:true,cards:[{number:4},{number:4},{number:4}]}}}},
 chooseTarget(){return{set(){return this},async forResult(){return{bool:true,targets:[target]}}}},
 async useCard(card,t,count){assert.equal(count,false);hits++;if(hits===2)alive=false;}};
await cards.fan_lianmayuzhe.content({},null,chain);assert.equal(hits,2,'逐次重验，目标离场停止剩余杀');
const conflictUser = {playerid:"caster"};
let mountedSkill;
const conflictTarget = {storage:{},isIn:()=>true,markSkill(){},addTempSkill(skill,expire){
 assert.equal(skill,"fan_wangjichongtu_block");
 assert.deepEqual(expire,{player:"phaseAfter"});
 mountedSkill = skills[skill];
}};
const initial = {player:conflictUser,card:{number:1}};
await cards.fan_wangjichongtu.content({target:conflictTarget},null,conflictUser);
assert.equal(blocker.mod.cardEnabled({number:1},conflictTarget),undefined);
assert.equal(mountedSkill.trigger.global,"useCardAfter");
assert(mountedSkill.filter(initial,conflictTarget));
await mountedSkill.content({},initial,conflictTarget);
assert.equal(blocker.mod.cardEnabled({number:1},conflictTarget),false);
assert(!mountedSkill.filter(initial,conflictTarget));
await mountedSkill.content({}, {player:conflictUser,card:{number:7}},conflictTarget);
assert.equal(blocker.mod.cardRespondable({number:7},conflictTarget),false);

let gained;
Array.prototype.randomGet = function(){return this.at(-1)};
Array.prototype.randomGets = function(count){return this.slice(0,count)};
const miner = {
 async gain(cards,animation){gained=cards;assert.equal(animation,"draw");},
};
const mining = cards.fan_wangjiwakuang;
const matching = {number:2};
pile.push(matching);
assert.equal(mining.ai.result.target(),2);
await mining.content({},null,miner);
assert.deepEqual(gained,[pile[0],matching]);
pile.pop();
assert.equal(mining.ai.result.target(),1);
await mining.content({},null,miner);
assert.deepEqual(gained,[pile[1]]);
pile.length = 0;
gained = undefined;
assert.equal(mining.ai.result.target(),0);
await mining.content({},null,miner);
assert.equal(gained,undefined);
delete Array.prototype.randomGet;
delete Array.prototype.randomGets;
assert.deepEqual(data.cyberseFaces.fan_wangjiwakuang,["spade",2]);
console.log("PASS 电子界：抽样、同点选牌、点数封锁、随机挖矿、第五张窗口及连杀（模拟）");
