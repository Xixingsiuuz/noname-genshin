import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
const status = {};
const context = vm.createContext({ _status: status, ui: {selected:{cards:[],targets:[]}}, lib:{filter:{cardDiscardable:()=>true}}, get:{ name:c=>c.name } });
vm.runInContext(readFileSync(new URL('../character/skills/jahoda.js',import.meta.url),'utf8').replace(/^import .*;\r?\n/,'').replace('export default','globalThis.skills ='), context);
const {fan_baocang: skill, fan_haigou_range: range, fan_haigou: theft} = context.skills;
assert.equal(skill.forced,true); assert.equal(skill.locked,false);
for (const [damaged,hand,hp,want] of [[true,1,2,true],[true,2,2,false],[false,0,3,false],[true,3,2,false]]) {
 assert.equal(skill.filter({}, {isDamaged:()=>damaged,countCards:()=>hand,hp}),want);
}
const steps=[];
await skill.content({}, {}, {draw:async()=>steps.push('draw'),isIn:()=>true,recover:async()=>steps.push('recover')});
assert.deepEqual(steps,['draw','recover']);
const source={}, target={}, other={}, card={name:'sha'};
status.event={player:source,fan_haigou_card:card,fan_haigou_target:target};
assert.equal(range.mod.targetInRange(card,source,target),true);
assert.equal(range.mod.targetInRange(card,source,other),undefined);
assert.equal(range.mod.targetInRange({name:'sha'},source,target),undefined);
status.event={}; assert.equal(range.mod.targetInRange(card,source,target),undefined);
assert.equal(theft.usable,1);
const chars=readFileSync(new URL('../character/character.js',import.meta.url),'utf8');
const titles=readFileSync(new URL('../character/title.js',import.meta.url),'utf8');
const intros=readFileSync(new URL('../character/intro.js',import.meta.url),'utf8');
for(const id of chars.matchAll(/^  (fan_\w+):/gm)) {
 assert.ok(new RegExp('(?:"'+id[1]+'"|'+id[1]+')\\s*:\\s*"[^"\\n]+"').test(titles),id[1]+' title');
 assert.ok(new RegExp('(?:"'+id[1]+'"|'+id[1]+')\\s*:\\s*"[^"\\n]+"').test(intros),id[1]+' intro');
}
console.log('Jahoda: condition, forced/nonlocked, draw/recover, scoped distance and all character profiles passed');


// 完整技能流程：展示快照、连续杀、嵌套结算移走余牌、角色离场。
async function runTheft(leave=false) {
 const a={name:'sha'},b={name:'sha'},loot={name:'tao'},moved={name:'shan'};
 let hand=[a,b,loot,moved], alive=true, uses=0, gained=[];
 const owner={isIn:()=>alive,choosePlayerCard:()=>({set(){return this},forResult:async()=>({cards:[a,b,loot,moved]})}),gain:async cards=>gained.push(...cards)};
 const victim={isIn:()=>true,getCards:()=>hand,countCards:()=>hand.length,showCards:async()=>{},canUse:()=>true,
 chooseToUse:async options=>{uses++;assert.equal(options.fan_haigou_target,owner);assert.equal(options.selectCard,-1);assert.equal(options.selectTarget,-1); hand=hand.filter(c=>c!==options.fan_haigou_card && c!==moved);if(leave)alive=false;}};
 await theft.content({target:victim,cards:[1,2,3,4]},null,owner);
 assert.equal(uses,leave?1:2);assert.deepEqual(gained,leave?[]:[loot]);
}
await runTheft();await runTheft(true);
console.log('Jahoda: sequential Sha, moved loot and owner leaving passed');

// 激进策略边界：普通牌可发动、目标容量限制、敌友及每次操作后的资源变化。
const cheap={name:'sha',value:4}, peach={name:'tao',value:9}, dodge={name:'shan',value:7};
context.get.value=c=>c.value;
context.get.name=c=>c.name;
context.get.attitude=(p,t)=>t.attitude;
let own=[cheap,peach,dodge];
const actor={hp:3,hujia:0,getCards:()=>own};
const enemy={attitude:-5,isIn:()=>true,countCards:()=>1};
const friend={attitude:5,isIn:()=>true,countCards:()=>3};
context.game={filterPlayer:()=>[enemy,friend]};
status.event={player:actor};
context.ui.selected.cards=[];context.ui.selected.targets=[];
assert.ok(theft.check(cheap)>0,'ordinary cards are worth trading');
context.ui.selected.cards=[cheap];
assert.equal(theft.check(peach),-Infinity,'cannot overselect beyond enemy hand size');
assert.ok(theft.ai.result.target(actor,enemy)<0);
assert.equal(theft.ai.result.target(actor,friend),0);
actor.hp=1;own=[cheap];context.ui.selected.cards=[];
assert.equal(theft.check(cheap),-Infinity,'avoid dying without defense or self rescue');
actor.hujia=1;assert.ok(theft.check(cheap)>0,'armor enables aggressive trade');
actor.hujia=0;own=[cheap,dodge];assert.ok(theft.check(cheap)>0,'remaining dodge enables trade');
own=[cheap];assert.equal(theft.check(cheap),-Infinity,'reassess after dodge is gone');
console.log('Jahoda AI: ordinary cost, target capacity, enemies/allies, armor, dodge and fresh resource checks passed');
