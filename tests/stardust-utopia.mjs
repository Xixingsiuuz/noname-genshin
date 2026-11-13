import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
const read=p=>readFileSync(new URL(p,import.meta.url),'utf8');
const strip=s=>'const playCynoSound = () => {};\n'+s.replace(/^import .*;\r?\n/gm,'').replace(/export /g,'');
const load=(path,names,args={})=>new Function(...Object.keys(args),strip(read(path))+`;return {${names}};`)(...Object.values(args));
const sd=load('../card/stardust-data.js','stardustFaces,sampleStardust');
const ud=load('../card/utopia-data.js','utopiaFaces,sampleUtopia');
for(const sample of [sd.sampleStardust,ud.sampleUtopia]){
 assert.equal(sample(()=>0).filter(c=>c.source==='pile').length,2);
 assert.equal(sample(()=>.99).filter(c=>c.source==='pile').length,3);
 for(let i=0;i<100;i++)assert(!sample().some(c=>c.name==='fan_yuzhouyaobian'));
 assert.throws(()=>sample(()=>1),RangeError);
}
const sync=load('../card/stardust-sync.js','qualifiesForCosmic,exchangeStardust',{get:{},game:{},lib:{},ui:{}});
assert(sync.qualifiesForCosmic([{number:1},{number:3}],8));
assert(!sync.qualifiesForCosmic([{number:4}],8));
assert(!sync.qualifiesForCosmic([{number:1},{number:1},{number:2}],8));
assert(sync.qualifiesForCosmic([{number:1},{number:1}],10));
const get={tag:c=>c.damage?1:0,position:c=>c.position,poptip:id=>id};
const game={players:[],createCard:(name,suit,number)=>({name,suit,number})};
const s=load('../card/stardust.js','stardustCards,stardustSkills',{game,get,lib:{},ui:{},_status:{},...sd,exchangeStardust:sync.exchangeStardust,cosmicMovementSkill:{}});
const u=load('../card/utopia.js','utopiaCards,utopiaSkills,cancelUtopiaTarget',{game,get,lib:{},ui:{},_status:{},...ud});
// 实际挂载入口必须列出结束时触发器，不能仅靠未展开的group。
const registered=new Set(Object.values(u.utopiaCards).flatMap(c=>c.global||[]));
assert(registered.has('fan_fanbei_after'));
assert.equal(u.utopiaSkills.fan_fanbei_after.trigger.global,'useCardAfter');
const a={id:'a'},b={id:'b'};

const targetUse={targets:[a,b],excluded:{add(){}}};
u.cancelUtopiaTarget({target:a,getParent:()=>targetUse});
assert.deepEqual(targetUse.targets,[b]);

u.cancelUtopiaTarget({target:b,getParent:()=>targetUse});
assert.equal(targetUse.targets.length,0);
const sword=read('../../../card/standard.js');
assert.match(sword.slice(sword.indexOf('    cixiong_skill: {'),sword.indexOf('    cixiong_skill: {')+150),/useCardToPlayered/);
const native=read('../../../noname/library/element/content.js');
const begin=native.indexOf('        function getTriggerTarget(event2, triggered)');
const end=native.indexOf('\n      };',begin);
const nextTarget=new Function('_status',native.slice(begin,end)+';return getTriggerTarget;')({});
Object.defineProperty(Array.prototype,'sortBySeat',{configurable:true,value(){return this;}});
assert.equal(nextTarget(targetUse,[]),null,'真实原生目标分发不再生成雌雄剑的目标事件');
delete Array.prototype.sortBySeat;
const canOffer=u.utopiaSkills.fan_fanbei_after.filter({card:{name:'sha'},targets:[],player:{isIn:()=>true,getHistory:()=>[],countCards:()=>1}});
assert.equal(canOffer,true,'目标全取消且无伤害仍允许翻倍机会');
for(const [cards,faces] of [[s.stardustCards,sd.stardustFaces],[u.utopiaCards,ud.utopiaFaces]])for(const[name,card]of Object.entries(cards)){
 assert.equal(card.destroy,'discardPile');assert(faces[name]);assert(existsSync(new URL('../'+card.image.replace('ext:原神/',''),import.meta.url)));
}
let discarded=0;
const source={isIn:()=>true,countDiscardableCards:()=>1};
const owner={async discardPlayerCard(){discarded++},isIn:()=>true};
const use={card:{damage:true},player:source,all_excluded:false};
await s.stardustCards.fan_liuxinglong.content({parent:{name:'chooseToUse',fanStardustUse:use,fanStardustOpen:true}},null,owner);
assert.equal(use.all_excluded,true);assert.equal(discarded,1);
for(const name of ['fan_xingchenlong','fan_liuxinglong']){
 const dragonUse={card:{name},player:source,all_excluded:false};
 assert(s.stardustSkills.fan_xingchen_window.filter(dragonUse));
 await s.stardustCards.fan_yuzhouyaobian.content({parent:{name:'chooseToUse',fanStardustUse:dragonUse,fanStardustOpen:true}},null,source);
 assert.equal(dragonUse.all_excluded,false,'不能反制自己使用的牌');
 await s.stardustCards.fan_yuzhouyaobian.content({parent:{name:'chooseToUse',fanStardustUse:dragonUse,fanStardustOpen:true}},null,owner);
 assert.equal(dragonUse.all_excluded,true);
}
assert.equal(discarded,3);
assert.equal(s.stardustSkills.fan_xingchen_chain,undefined,'不得提供龙牌转化无懈入口');
assert(!s.stardustSkills.fan_xingchen_window.group.includes('fan_xingchen_chain'));
assert(Object.values(s.stardustCards).every(c=>!c.global.includes('fan_xingchen_chain')));
for(const name of ['fan_xingchenlong','fan_liuxinglong'])for(const original of ['wuxie','fan_yuzhouyaobian','zixing']){
 const nonDamage={card:{name:original},player:source,all_excluded:false};
 await s.stardustCards[name].content({parent:{name:'chooseToUse',fanStardustUse:nonDamage,fanStardustOpen:true}},null,owner);
 assert.equal(nonDamage.all_excluded,false,'不能令非伤害牌无效');
}
const closed={card:{damage:true},player:source,all_excluded:false};
await s.stardustCards.fan_xingchenlong.content({parent:{name:'chooseToUse',parent:{fanStardustUse:closed,fanStardustOpen:true}}},null,owner);
assert.equal(closed.all_excluded,false,'新的逐目标响应不能继承星尘窗口');
const mapOwner={storage:{fan_fanbei_pending:2},countMark:()=>2};
const tao=u.utopiaSkills.fan_xingguangliqiu_tao;
assert.equal(u.utopiaSkills.fan_xiwang_break.trigger.target,'useCardToTargeted');
assert.equal(u.utopiaSkills.fan_xiwang_break.locked,true);
assert.equal(u.utopiaSkills.fan_xiwang_cancel.trigger.global,'useCardToTarget');
assert.equal(u.utopiaSkills.fan_xiwang_cancel.locked,false);
assert(!u.utopiaSkills.fan_xiwang_store);
const hopefulCard={name:'fan_xiwanghuang'};
let hopefulUsed=false,broken=false;
const hopeful={isIn:()=>true,countCards:()=>1,getEquip:()=>hopefulCard,getCards:()=>[hopefulCard],hasSkill:()=>hopefulUsed,
 addTempSkill(){hopefulUsed=true},async discard(c){assert.equal(c,hopefulCard);broken=true},
 chooseToDiscard(){return {done:{done:{cards2:[{}]}},set(){return this},async forResult(){return {bool:true}}}}};
const hopeUse={targets:[hopeful],excluded:{add(){}}};
const hopeTrigger={card:{name:"sha",damage:true},target:hopeful,getParent:()=>hopeUse};
assert(u.utopiaSkills.fan_xiwang_cancel.filter(hopeTrigger,hopeful));
await u.utopiaSkills.fan_xiwang_cancel.content({},hopeTrigger,hopeful);
assert.equal(hopeUse.targets.length,0);
assert.equal(u.utopiaSkills.fan_xiwang_cancel.filter(hopeTrigger,hopeful),false);
// 未取消的后续伤害牌进入成为目标后，执行锁定弃置。
await u.utopiaSkills.fan_xiwang_break.content({},hopeTrigger,hopeful);
assert(broken);
assert.equal(tao.viewAs.name,'tao');
assert.equal(tao.filterCard({name:'fan_xingguangliqiu'}),true);
assert.equal(tao.filterCard({name:'sha'}),false);
assert.equal(tao.viewAsFilter({countCards:()=>0}),false);
assert.equal(tao.viewAsFilter({countCards:()=>1}),true);
assert.equal(tao.ai.skillTagFilter({countCards:()=>0}),false);
assert(!u.utopiaSkills.fan_kuriboh_guard);
for(const card of Object.values(u.utopiaCards))assert(card.global.includes('fan_xingguangliqiu_tao'));
const damage={player:{playerid:'a'},num:1};
await u.utopiaSkills.fan_fanbei_buff.content({},damage,mapOwner);
assert.equal(damage.num,4);assert.equal(mapOwner.storage.fan_fanbei_pending,undefined);
assert.equal(u.utopiaSkills.fan_fanbei_buff.mod.cardUsable({name:'sha'},mapOwner,1),3);
console.log('PASS 星尘/希望皇：抽样、奖励、资源、无效后弃牌、桃转化及倍率消耗（模拟，非对局实测）。');



