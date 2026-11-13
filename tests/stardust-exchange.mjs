import { createCynoReward } from "../ui/cyno-rarity.js";
import assert from'node:assert/strict';
import{readFileSync}from'node:fs';
const read=p=>readFileSync(new URL(p,import.meta.url),'utf8');
const strip=s=>'const playCynoSound = () => {};\n'+s.replace(/^import .*;\r?\n/gm,'').replace(/export /g,'');
const get={number:c=>c.number,value:()=>2,tag:c=>c.damage?1:0,poptip:id=>id};
const game={createCard:(name,suit,number)=>({name,suit,number})};
const lib={filter:{cardDiscardable:c=>!c.protected}},ui={selected:{cards:[]}},status={};
const{qualifiesForCosmic,exchangeStardust}=new Function('get','game','lib','ui','createCynoReward',strip(read('../card/stardust-sync.js'))+';return{qualifiesForCosmic,exchangeStardust};')(get,game,lib,ui,createCynoReward);
const data=new Function(strip(read('../card/stardust-data.js'))+';return{stardustFaces,sampleStardust};')();
const{stardustCards:cards,stardustSkills:skills,stardustTranslate:translate}=new Function('game','get','lib','ui','_status','stardustFaces','sampleStardust','exchangeStardust','cosmicMovementSkill','createCynoReward',strip(read('../card/stardust.js'))+';return{stardustCards,stardustSkills,stardustTranslate};')(game,get,lib,ui,status,data.stardustFaces,data.sampleStardust,exchangeStardust,{},createCynoReward);
assert(!skills.fan_tongbu);assert(!cards.fan_xingchendehuiguang.derivationSkills);assert(!translate.fan_tongbu);
assert.equal(translate.fan_xingchendehuiguang_info,'出牌阶段，对你使用。你随机获得五张【星尘同步】卡组相关的牌。');
async function scenario(numbers,starNumber=8,actualCount=numbers.length){
 const material={name:'fan_xingchenlong',number:starNumber};
 const available=numbers.map(number=>({number}));let drawn=0,rewards=[],requested;
 const player={isIn:()=>true,getCards(zone,filter){assert.equal(zone,'he');return available.filter(filter);},
  chooseToDiscard(zone,count,forced){assert.equal(zone,'he');assert.equal(forced,true);requested=count;
   const choice={done:{done:{cards2:available.slice(0,actualCount)}},set(){return this;},async forResult(){return{bool:true,cards:available};}};
   return choice;
  },async draw(n){drawn+=n;for(const card of available)card.number=13;},async gain(card,animation){assert.equal(animation,'draw');rewards.push(card);}};
 status.event={type:'phase'};
 assert.equal(cards.fan_xingchenlong.notarget,false);assert(cards.fan_xingchenlong.enable());assert(cards.fan_xingchenlong.filterTarget({},player,player));assert(!cards.fan_xingchenlong.filterTarget({},player,{}));
 await cards.fan_xingchenlong.content({target:player,cards:[material],card:material},null,player);
 return{drawn,rewards,requested};
}
for(const pair of [[1,3],[2,2]]){const r=await scenario(pair);assert.equal(r.drawn,2);assert.equal(r.rewards[0]?.name,'fan_yuzhouyaobian');assert.equal(r.requested,2);}
assert.equal((await scenario([4])).rewards.length,0,'不足两张，即使点数之和为12仍无奖励');
assert.equal((await scenario([1,2])).rewards.length,0);
assert.equal((await scenario([1,1],10)).rewards.length,1,'使用实际星尘龙点数，不硬编码两牌和4');
assert.equal((await scenario([])).drawn,0);
const replaced=await scenario([2,2],8,1);assert.equal(replaced.drawn,1);assert.equal(replaced.rewards.length,0,'被替换去向而未实际弃置的牌不计入');
assert(!qualifiesForCosmic([{number:1},{number:1},{number:2}],8));
// 保留在使用牌时反制整张牌：反制时不要求选择自身目标、不执行换牌。
const originalUse={card:{damage:true},all_excluded:false};status.event={name:'chooseToUse',fanStardustUse:originalUse,fanStardustOpen:true};
assert.equal(cards.fan_xingchenlong.notarget,true);assert(cards.fan_xingchenlong.enable());
await cards.fan_xingchenlong.content({parent:status.event},null,{});assert.equal(originalUse.all_excluded,true);
for(const name of ['fan_xingchenlong','fan_liuxinglong'])for(const original of ['wuxie','fan_yuzhouyaobian','zixing']){
 status.event={name:'chooseToUse',fanStardustOpen:true,fanStardustUse:{card:{name:original},all_excluded:false}};
 assert.equal(cards[name].enable(),false,'非伤害牌窗口不得提供星尘龙或流星龙');
}
assert(!skills.fan_xingchen_chain);assert(!translate.fan_xingchen_chain);
status.event={name:'chooseToRespond',type:'respond'};assert.equal(cards.fan_xingchenlong.enable(),false);
// 独立使用后效果即便整牌无效也结算，重复全局挂载只生成一张。
const meteor=skills.fan_liuxinglong_after;let obtained=[];
const user={isIn:()=>true,async gain(c){obtained.push(c);}};
const used={card:{name:'fan_liuxinglong'},cards:[],player:user,all_excluded:true};assert(meteor.filter(used));
await meteor.content({},used);await meteor.content({},used);assert.equal(obtained.length,1);assert.deepEqual(obtained[0],{name:'fan_xingchenlong',suit:'heart',number:8});
assert(meteor.filter({card:{name:'wuxie'},cards:[{name:'fan_liuxinglong'}],player:user}));
assert(Object.values(cards).every(c=>c.global.includes('fan_liuxinglong_after')));
console.log('PASS 星尘改版：双用途与目标、实际弃两张、实际点数/销毁前快照、不足/替换无奖励、移除同步、流星使用后独立奖励（模拟，非对局实测）');
