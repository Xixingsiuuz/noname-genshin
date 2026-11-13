import assert from'node:assert/strict';
import{readFileSync,existsSync}from'node:fs';
const read=p=>readFileSync(new URL(p,import.meta.url),'utf8');
const strip=s=>s.replace(/^import.*;\r?\n/gm,'').replace(/export /g,'');
const data=new Function(strip(read('../card/blackwing-data.js'))+';return{blackwingFaces,sampleBlackwing};')();
const{sampleBlackwing:sample,blackwingFaces:faces}=data;
assert.equal(sample(()=>0).filter(i=>i.source==='pile').length,2);
assert(sample(()=>0).slice(0,2).every(i=>i.kind==='blackSha'));
assert(sample(()=>.99).slice(0,3).every(i=>i.kind==='blackOther'));
assert(sample(()=>0).slice(2).every(i=>i.name==='fan_chongzhuangkaiyi'));
assert.throws(()=>sample(()=>1),RangeError);
let seed=1,piles=0,sha=0,derived={};
for(let i=0;i<20000;i++)for(const item of sample(()=>((seed=(1664525*seed+1013904223)>>>0)/2**32))){if(item.source==='pile'){piles++;sha+=item.kind==='blackSha';}else derived[item.name]=(derived[item.name]||0)+1;}
assert(Math.abs(piles/20000-2.5)<.03);assert(Math.abs(sha/piles-2/3)<.015);
assert(Math.abs(derived.fan_chongzhuangkaiyi/(derived.fan_chongzhuangkaiyi+derived.fan_kaiyiya)-1/3)<.02);
Object.defineProperty(Array.prototype,'sortBySeat',{configurable:true,value(){return this;}});
const get={color:c=>c.color,position:c=>c.position,name:c=>c.name,type:c=>c.type,value:()=>2,order:()=>5};
const lib={card:{fan_ronghe_test:{source:['fan_ronghe','fan_chongzhuangkaiyi']}},filter:{cardDiscardable:c=>!c.protected}};
const game={},ui={};
const{blackwingCards:cards,blackwingSkills:skills,wedgeTargets}=new Function('game','get','lib','ui','_status','blackwingFaces','sampleBlackwing','const playCynoSound = () => {};\n'+strip(read('../card/blackwing.js'))+';return{blackwingCards,blackwingSkills,wedgeTargets};')(game,get,lib,ui,{},faces,sample);
for(const[name,c]of Object.entries(cards)){assert.equal(c.destroy,'discardPile');assert.equal(c.derivation,'fan_cyno');assert(faces[name]);assert(existsSync(new URL('../'+c.image.replace('ext:原神/',''),import.meta.url)));assert.equal(c.global,'fan_chongzhuangkaiyi_record');}
assert.equal(cards.fan_kaiyiya.subtype,'equip2');assert.equal(cards.fan_chongzhuangkaiyi.subtype,'equip2');assert.equal(cards.fan_heixuanfeng.subtype,'equip5');
for(const id of ['fan_kaiyiya_sha','fan_kaiyiya_shan','fan_chongzhuangkaiyi_sha','fan_chongzhuangkaiyi_shan']){assert(skills[id].filterCard({color:'black'},{}));assert(!skills[id].filterCard({color:'red'},{}));assert.equal(skills[id].equipSkill,true);}
function player(){return{storage:{},hand:[],isIn:()=>true,addSkill(){},markSkill(){},removeSkill(){},getCards(){return this.hand;},async give(c,p){p.hand.push(...c);this.hand=[];}};}
const owner=player(),target=player(),other=player();target.hand=[{name:'sha'}];
const use={name:'useCard',card:{name:'sha'},skill:'fan_chongzhuangkaiyi_sha',player:owner,targets:[target]};
assert(skills.fan_chongzhuangkaiyi_record.filter(use));
await skills.fan_chongzhuangkaiyi_record.content({},use);
await skills.fan_chongzhuangkaiyi_record.content({},use);
await skills.fan_chongzhuangkaiyi_record.content({},{...use,fanChongzhuangRecorded:false});
assert.deepEqual(target.storage.fan_chongzhuangkaiyi_xie,[owner],'重复转化不叠加来源标记');
assert(!skills.fan_chongzhuangkaiyi_record.filter({...use,skill:'fan_kaiyiya_sha'}));
assert(skills.fan_chongzhuangkaiyi_record.filter({...use,skill:'fan_ronghe_42_fan_chongzhuangkaiyi_sha'}));
assert.deepEqual(wedgeTargets({name:'respond',card:{name:'shan'},source:other}),[other]);
assert.deepEqual(wedgeTargets({name:'useCard',card:{name:'shan'},respondTo:[other,{}]}),[other]);
const multi={...use,fanChongzhuangRecorded:false,targets:[target,other]};
await skills.fan_chongzhuangkaiyi_record.content({},multi);
assert.deepEqual(other.storage.fan_chongzhuangkaiyi_xie,[owner]);
// 后续取消目标不回滚在使用时已经建立的楔；响应杀同样标记来源。
multi.targets=[];assert.deepEqual(target.storage.fan_chongzhuangkaiyi_xie,[owner]);
await skills.fan_chongzhuangkaiyi_record.content({},{name:'respond',card:{name:'sha'},skill:'fan_chongzhuangkaiyi_sha',player:owner,source:other});
assert.deepEqual(other.storage.fan_chongzhuangkaiyi_xie,[owner]);
const mark=skills.fan_chongzhuangkaiyi_xie,ready=skills.fan_chongzhuangkaiyi_xie_ready;
assert.equal(mark.trigger.player,'phaseEnd');assert.equal(mark.trigger.global,undefined);
assert.equal(mark.group,'fan_chongzhuangkaiyi_xie_ready');assert.equal(ready.trigger.player,'phaseBegin');
assert.equal(mark.filter({},target),false,'获得标记的当前回合结束不结算');
get.translation=p=>p===owner?'模块测试':'另一武将';
assert.equal(mark.intro.content(target.storage.fan_chongzhuangkaiyi_xie,target),'你的下个回合结束时，模块测试获得你的所有手牌。');
await ready.content({}, {player:target},target);
assert(mark.filter({},target));assert.equal(mark.intro.content(target.storage.fan_chongzhuangkaiyi_xie,target),'本回合结束时，模块测试获得你的所有手牌。');
// 同一来源再次加楔不会延后既定到期时间；新来源则等待下一次本人的回合。
await skills.fan_chongzhuangkaiyi_record.content({},{...use,fanChongzhuangRecorded:false});
await skills.fan_chongzhuangkaiyi_record.content({},{...use,player:other,fanChongzhuangRecorded:false});
await mark.content({}, {player:target},target);assert.equal(owner.hand.length,1);assert.equal(target.hand.length,0);assert.deepEqual(target.storage.fan_chongzhuangkaiyi_xie,[other]);
assert(!mark.filter({},target));await ready.content({}, {player:target},target);await mark.content({}, {player:target},target);assert.equal(target.storage.fan_chongzhuangkaiyi_xie.length,0);
mark.onremove(target);assert(!target.storage.fan_chongzhuangkaiyi_xie);assert(!target.storage.fan_chongzhuangkaiyi_xie_ready);
owner.isIn=()=>false;other.hand=[{name:'shan'}];await ready.content({}, {player:other},other);await mark.content({}, {player:other},other);assert.equal(other.hand.length,1);assert.equal(other.storage.fan_chongzhuangkaiyi_xie.length,0);owner.isIn=()=>true;
let draws=0;
const blackWhirlwind=skills.fan_heixuanfeng_draw;
assert.deepEqual(blackWhirlwind.trigger,{player:'useCard'});
assert(blackWhirlwind.locked && blackWhirlwind.forced);
for(const type of ['basic','trick','equip']){
 assert(blackWhirlwind.filter({card:{type,color:'black'}}));
 assert(!blackWhirlwind.filter({card:{type,color:'red'}}));
 assert(!blackWhirlwind.filter({card:{type,color:'none'}}));
}
await skills.fan_heixuanfeng_draw.content({}, {},{async draw(){draws++;}});assert.equal(draws,1);
assert.equal(skills.fan_chongzhuangkaiyi_protect.mod.canBeDiscarded({name:'fan_chongzhuangkaiyi',position:'e'},owner,target),false);
assert.equal(skills.fan_chongzhuangkaiyi_protect.mod.canBeDiscarded({name:'fan_chongzhuangkaiyi',position:'h'},owner,target),undefined);
assert.equal(skills.fan_chongzhuangkaiyi_protect.mod.canBeDiscarded({name:'fan_ronghe_test',position:'e'},owner,target),false);
let discarded=0;
const choice={set(){return this;},async forResult(){return{bool:true,cards:[{color:'black'},{color:'black'}]};}};
await cards.fan_zhouyuleiqie.content({target:{isIn:()=>true,countDiscardableCards:()=>1}},null,{chooseToDiscard(){return choice;},async discardPlayerCard(t,zone,n){assert.equal(zone,'hej');discarded=n;}});
assert.equal(discarded,1,'目标不足时弃尽');
const taken=[],gains=[];let pile=[{name:'sha',color:'black'},{name:'sha',color:'red'},{name:'shan',color:'black'}];
for(const c of pile)c.remove=()=>{pile=pile.filter(x=>x!==c);taken.push(c);};
ui.cardPile={get childNodes(){return pile;}};
get.cards=()=>[{name:'fallback'}];game.updateRoundNumber=()=>{};game.createCard=(name,suit,number)=>({name,suit,number});
// 强制两个牌堆分支，再检查只发生两次获得，且所有实体牌保留花色点数。
const oldRandom=Math.random;Math.random=()=>0;
try{await cards.fan_qiheizhixuanfeng.content({},null,{isIn:()=>true,async gain(c,animation){assert.equal(animation,'draw');gains.push(c);}});}finally{Math.random=oldRandom;}
assert.equal(taken.length,1);assert.equal(taken[0].color,'black');assert.equal(gains.length,2);assert.equal(gains[0].length,2);assert.equal(gains[1].length,3);assert(gains[1].every(c=>c.suit==='club'&&c.number===10));
delete Array.prototype.sortBySeat;
console.log('PASS 黑羽：概率、资源注册、转化、使用/响应标记、不叠加、回合结束收牌、黑色用牌摸牌及装备保护（模拟，非对局实测）');
