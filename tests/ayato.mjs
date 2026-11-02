import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../character/skills/ayato.js',import.meta.url),'utf8');
const status={},actors=[],log=[];
Array.prototype.sortBySeat=function(start){return this.sort((a,b)=>a.seat-b.seat)};
const get={color:c=>c.color,value:c=>c.value??3,translation:p=>p.name,attitude:(a,b)=>a.team===b.team?5:-5,is:{shownCard:c=>!!c.shown}};
const lib={filter:{cardDiscardable:c=>!c.protected,canBeGained:c=>!c.blocked}};
const game={filterPlayer:f=>actors.filter(f),hasPlayer:f=>actors.some(f)};
const skills=new Function('game','get','lib','_status',source.replace(/^import .*;\r?\n/gm,'').replace('export default','return'))(game,get,lib,status);
const chain=(result,capture)=>({set(k,v){capture?.(k,v);return this},async forResult(){return result}});
function actor(name,seat,team){return {name,seat,team,hand:[],equip:[],alive:true,owned:[],stat:{fan_xingjia_visit:1},isIn(){return this.alive},hasSkill(id){return this.owned.includes(id)},getCards(zone,filter){const cards=[...(zone.includes('h')?this.hand:[]),...(zone.includes('e')?this.equip:[])];return filter?cards.filter(filter):cards},countCards(zone){return this.getCards(zone).length},countGainableCards(owner,zone){return this.getCards(zone).filter(c=>!c.blocked).length},getStat(){return this.stat},logSkill(id){log.push(id)},chooseCard(){return chain(this.selection)},choosePlayerCard(...args){assert.ok(args.includes('visible'));assert.ok(args.includes(true),'revealed hand selection must be forced');return chain(this.take,(k,v)=>{this.takeOptions??={};this.takeOptions[k]=v})},chooseButton(dialog,forced){this.dialog=dialog;assert.equal(forced,true);return chain({bool:true,links:[this.branch||'弃置同色牌']},(k,v)=>{this.options??={};this.options[k]=v})},give(cards,target){cards=Array.isArray(cards)?cards:[cards];this.hand=this.hand.filter(c=>!cards.includes(c));this.equip=this.equip.filter(c=>!cards.includes(c));target.hand.push(...cards);const move=Promise.resolve();move.getg=p=>p===target?cards:[];this.transfer=move;return move},async discard(cards){this.discarded=cards;this.hand=this.hand.filter(c=>!cards.includes(c));this.equip=this.equip.filter(c=>!cards.includes(c));log.push('discard')},async draw(n){log.push('draw'+n);this.drawn=(this.drawn||0)+n}}}
const owner=actor('绫人',0,0),t=actor('得牌者',2,1),other=actor('其他',1,1);actors.push(owner,t,other);owner.owned=['fan_sanxing','fan_xingjia'];
const red={color:'red'},black={color:'black'},gift={color:'black'},safe={color:'red',protected:true};
const move={name:'gain',getl:p=>({cards2:p===owner?[red]:[]}),getg:p=>p===t?[red]:[]};
async function dispatch(holder,trigger,name){for(const id of holder.owned){const info=skills[id];if(!(info.trigger?.global?.includes(name)||info.trigger?.player===name&&trigger.player===holder))continue;for(const indexedData of info.getIndex(trigger,holder)){if(info.filter(trigger,holder,name,indexedData))await info.content({indexedData},trigger,holder)}}}
owner.hand=[gift];owner.selection={bool:true,cards:[gift]};t.hand=[red,black];t.equip=[safe];
await dispatch(owner,move,'gainAfter');assert.deepEqual(t.discarded,[red,black,gift]);assert.deepEqual(t.equip,[safe]);assert.ok(owner.transfer.fan_sanxing);
assert.ok(t.dialog[1][0].includes('交给手牌'));assert.equal(t.options.filterButton({link:'交给手牌'}),false,'short payment remains visible but unselectable');
t.hand=[red,black,red,black];assert.equal(t.options.filterButton({link:'交给手牌'}),true,'recheck after hand count changes');
assert.deepEqual(skills.fan_sanxing.getIndex({...move,fan_sanxing:true},owner),[]);
assert.deepEqual(skills.fan_sanxing.getIndex({...move,getlx:false},owner),[]);
status.currentPhase=owner;assert.deepEqual(skills.fan_sanxing.getIndex({...move,getl:()=>({cards2:[]})},owner),[],'own turn no longer triggers foreign gains');
// 一次获得2张，再交1张，须交6张；伤害无原先获得牌，须交2张。
owner.hand=[gift];t.hand=Array.from({length:6},()=>({color:'red'}));t.branch='交给手牌';t.selection={bool:true,cards:t.hand.slice()};
await dispatch(owner,{...move,getl:()=>({cards2:[red,black]}),getg:p=>p===t?[red,black]:[]},'gainAfter');assert.equal(t.transfer.getg(owner).length,6);
owner.hand=[gift];owner.selection={bool:true,cards:[gift]};t.hand=[red,black];t.selection={bool:true,cards:t.hand.slice()};
const damage={name:'damage',player:owner,source:t,num:3};
assert.deepEqual(skills.fan_sanxing.getIndex(damage,owner),[t]);
await dispatch(owner,damage,'damageEnd');assert.equal(t.transfer.getg(owner).length,2);
assert.deepEqual(skills.fan_sanxing.getIndex({...damage,source:null},owner),[]);assert.deepEqual(skills.fan_sanxing.getIndex({...damage,source:owner},owner),[]);assert.deepEqual(skills.fan_sanxing.getIndex({...damage,num:0},owner),[]);
// 三行取消不交牌；离场不交牌。
owner.hand=[gift];owner.selection={bool:false};const old=owner.transfer;await dispatch(owner,move,'gainAfter');assert.equal(owner.transfer,old);
t.alive=false;await skills.fan_sanxing.content({indexedData:t},move,owner);t.alive=true;
// 从兴家的原生 global 关系展开按钮，不在扩展 content 中提前挂载。
const globalId=skills.fan_xingjia.global,visit=skills[globalId];assert.equal(globalId,'fan_xingjia_visit');assert.equal(visit.enable,'phaseUse');assert.equal(visit.usable,1);assert.equal(visit.filterTarget(null,owner,owner),false);
owner.hand=[red,gift];t.hand=[];t.branch='弃置同色牌';t.take={bool:true,links:[red]};owner.selection={bool:true,cards:[gift]};owner.drawn=0;
assert.equal(visit.filter({},t),true);
t.gain=function(card,from){const evt={name:'gain',getl:p=>({cards2:p===from?[card]:[]}),getg:p=>p===this?[card]:[]};return {getg:evt.getg,then:async(resolve,reject)=>{try{from.hand=from.hand.filter(c=>c!==card);this.hand.push(card);log.push('gain');await dispatch(from,evt,'gainAfter');log.push('sanxingDone');resolve()}catch(e){reject(e)}}}};
log.length=0;await visit.content({target:owner},null,t);assert.equal(owner.drawn,2);assert.ok(log.indexOf('sanxingDone')<log.indexOf('draw2'));assert.deepEqual(t.discarded,[red,gift]);
// AI 计入敌人三行的风险；队友可正常合作，不写入规则目标限制。
owner.hand=[red,gift];t.hand=[black,red,black,red];t.team=1;assert.ok(visit.ai.result.player(t,owner)<0);assert.equal(visit.filterTarget(null,t,owner),true);
t.team=0;assert.ok(visit.ai.result.player(t,owner)>0);t.team=1;
owner.owned=['fan_xingjia'];assert.ok(visit.ai.result.player(t,owner)>0);
owner.owned=[];assert.equal(visit.filter({},t),false);owner.owned=['fan_xingjia'];
t.take={bool:false};t.stat.fan_xingjia_visit=1;await visit.content({target:owner},null,t);assert.equal(t.stat.fan_xingjia_visit,1,'no refund after revealed selection');assert.equal(owner.drawn,2);
owner.hand=[{color:'red',blocked:true}];assert.equal(visit.filter({},t),false);
console.log('Ayato: indexed triggers, damage/gain counts, disabled payment, Xingjia global action, ordering, legality, cancellation and AI passed');

// 进入看牌前目标已失效：未展示任何信息，可退还原生发动计数。
owner.hand=[red];owner.alive=false;t.stat.fan_xingjia_visit=1;
await visit.content({target:owner},null,t);assert.equal(t.stat.fan_xingjia_visit,0);owner.alive=true;
assert.equal(t.takeOptions.fanPairedConfirm,undefined,'forced reveal must not add Cancel via shared UI hook');
// 即使AI认为每张牌都是负收益，也由原生forced选择承担代价，不能退回窥牌。
owner.owned=['fan_xingjia','fan_sanxing'];owner.hand=[red,gift];t.hand=[black,red,black];
t.take={bool:true,links:[red]};owner.selection={bool:false};t.stat.fan_xingjia_visit=1;
await visit.content({target:owner},null,t);assert.equal(t.stat.fan_xingjia_visit,1);assert.equal(owner.drawn,4);
console.log('Xingjia committed reveal: forced selection, no paired Cancel, no post-reveal refund, pre-reveal invalidation passed');

// 原生派发即使未保留自定义标记，三行直接产生的gain仍按父事件排除。
const nestedGift={...move,getParent:()=>({name:'fan_sanxing'})};
assert.deepEqual(skills.fan_sanxing.getIndex(nestedGift,owner),[]);
assert.equal(skills.fan_sanxing.filter(nestedGift,owner,'gainAfter',t),false);
// 伤害索偿只涉及追加牌的颜色，不能再由追加得牌嵌套成四色/4张索偿。
owner.hand=[gift];owner.selection={bool:true,cards:[gift]};t.hand=[red,black];t.branch='弃置同色牌';
await dispatch(owner,damage,'damageEnd');assert.deepEqual(t.discarded,[black,gift]);
assert.ok(t.dialog[0].includes('2张'));
console.log('Sanxing damage single-color and direct-child gain recursion regression passed');
