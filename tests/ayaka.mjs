import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../character/skills/ayaka.js',import.meta.url),'utf8');
const actors=[];
Array.prototype.sortBySeat=function(){return this.reverse()};
const game={hasPlayer: fn=>actors.some(fn)};
const get={name:c=>c.name,position:c=>c.pos,color:c=>c.color,
  effect:()=>5,attitude:(a,b)=>a===b?5:-5};
const skills=new Function('game','get','_status',source.replace(/^import .*;\r?\n/gm,'').replace('export default','return'))(game,get,{});
const old={name:'sha',pos:'h',hasGaintag:t=>t==='fan_moran_sha'};
const fresh={name:'sha',pos:'h',hasGaintag:()=>false};
const p={storage:{},getStorage(k){return this.storage[k]||[]},getCards:()=>[old,fresh],getHistory(type,fn){return this.history.filter(fn)},history:[]};
actors.push(p);
const phase={},other={};
assert.equal(skills.fan_moran.filter(phase,p),true);
p.history=[{card:{name:'sha'},getParent:()=>other}];
assert.equal(skills.fan_moran.filter(phase,p),true);
p.history.push({card:{name:'sha'},getParent:()=>phase});
assert.equal(skills.fan_moran.filter(phase,p),false);
const mod=skills.fan_moran.subSkill.effect.mod;
assert.equal(mod.ignoredHandcard(old,p),true);
assert.equal(mod.ignoredHandcard(fresh,p),undefined);
assert.equal(mod.cardUsable(old,p),Infinity);
assert.equal(mod.cardUsable({name:'sha',cards:[old]},p),Infinity);
assert.equal(mod.cardUsable(fresh,p),undefined);
assert.equal(mod.cardUsable({name:'sha',cards:[old,fresh]},p),undefined);
assert.equal(mod.cardUsable({name:'sha',cards:[]},p),undefined);
// 普通杀已经占用一次额度时，墨染杀仍有使用资格，退还的只是自身计数。
const cappedStat={sha:1};
assert.ok(cappedStat.sha < mod.cardUsable(old,p));
cappedStat.sha++;
await skills.fan_moran_refund.content({}, {addCount:true}, {getStat:()=>cappedStat});
assert.equal(cappedStat.sha,1);
// 效果结束后不再展开该 mod；普通杀仍按一次数量检查。
assert.equal(cappedStat.sha < 1,false);
const use={card:{name:'sha'},cards:[old],addCount:true};
old.cardid='old';
const loss={getParent:()=>use,hs:[old],gaintag_map:{old:['fan_moran_sha']}};
const stat={sha:1};
const holder={getHistory:(type,fn)=>[loss].filter(fn),getStat:()=>stat};
assert.equal(skills.fan_moran_refund.filter(use,holder),true);
await skills.fan_moran_refund.content({},use,holder);
assert.equal(stat.sha,0);
assert.equal(use.addCount,false);
assert.equal(skills.fan_moran_refund.filter(use,holder),false);
const targets=[p,other]; targets.remove=who=>targets.splice(targets.indexOf(who),1);
const black={card:{color:'black'},player:other,getParent:()=>({targets})};
assert.equal(skills.fan_bailu.filter(black,p),true);
assert.equal(skills.fan_bailu.filter({...black,card:{color:'red'}},p),false);
let drawn=0; p.isIn=()=>true; p.draw=async num=>{drawn+=num};
await skills.fan_bailu.content({},black,p);
assert.equal(targets.includes(p),false);
assert.equal(targets.includes(other),true);
assert.equal(drawn,1);
assert.equal(skills.fan_bailu.filter(black,p),false);
const bailuAI=skills.fan_bailu.ai.effect.target;
assert.deepEqual(bailuAI({color:'black'},other,p,-2),[0,1]);
assert.equal(bailuAI({color:'red'},other,p,-2),undefined);
assert.equal(bailuAI({color:'black'},other,p,-2,true),undefined);
// 敌人看到的是对绫华有益的摸牌，队友可将其作为送牌收益；不设规则禁用。
const benefit=bailuAI({color:'black'},other,p,-2)[1];
assert.ok(benefit * -5 < 0);
assert.ok(benefit * 5 > 0);
get.effect=()=>0;
assert.deepEqual(bailuAI({color:'black'},other,p,-2),[0,0]);
get.effect=()=>-5;
assert.deepEqual(bailuAI({color:'black'},other,p,-2),[0,-1]);
get.effect=()=>5;
// 原生 usable 在发动内容前消耗 triggerSkill；每个回合为全体角色创建新统计。
p.storage.counttrigger={fan_bailu:1};
assert.equal(skills.fan_bailu.filter({...black,getParent:()=>({targets:[p]})},p),false);
assert.equal(bailuAI({color:'black'},other,p,-2),undefined, 'after first cancellation black cards retain normal AI effects');
p.storage.counttrigger={};
assert.equal(skills.fan_bailu.filter({...black,getParent:()=>({targets:[p]})},p),true);
assert.deepEqual(bailuAI({color:'black'},other,p,-2),[0,1]);
p.storage.fan_binghua_links=[{target:other,mode:0}];
assert.equal(skills.fan_binghua_links.trigger.global,'phaseAfter');
const dispatchLinkEnd=async(name,turnPlayer)=>{
  if(skills.fan_binghua_links.trigger.global===name && skills.fan_binghua_links.filter({player:turnPlayer},p))
    await skills.fan_binghua_links.content({}, {player:turnPlayer},p);
};
await dispatchLinkEnd('phaseJieshuBegin',other);
assert.equal(p.storage.fan_binghua_links.length,1,'link survives target end-phase entry');
await dispatchLinkEnd('phaseEnd',other);
assert.equal(p.storage.fan_binghua_links.length,1,'link survives end-of-turn effects');
await dispatchLinkEnd('phaseAfter',p);
assert.equal(p.storage.fan_binghua_links.length,1,'another player ending a turn cannot expire the link');
assert.equal(skills.fan_binghua_links.filter({player:other},p),true);
await skills.fan_binghua_links.content({}, {player:other},p);
assert.equal(p.storage.fan_binghua_links.length,0);
assert.equal(skills.fan_binghua_seal,undefined);
const sequence=[];
const drawHolder={
  draw:async num=>sequence.push(['draw',num]),isIn:()=>true,
  addCharge:num=>sequence.push(['charge',num]),
  getCards:()=>[old,fresh],addGaintag:cards=>sequence.push(['tag',cards]),addSkill:()=>{},
};
await skills.fan_moran.content({}, {},drawHolder);
assert.deepEqual(sequence.map(x=>x[0]),['charge','tag']);
assert.deepEqual(sequence[1][1],[old,fresh]);
console.log('Ayaka targeted simulation checks passed');

get.tag=()=>false; get.distance=()=>1;
const aiPlayer={getStorage:()=>[],getCards:()=>[],countGainableCards:()=>1,countCharge:()=>2,countCards:()=>2};
const enemy={countCharge:()=>0,countCards:()=>4,getDiscardableCards:()=>[]};
assert.ok(skills.fan_binghua.ai.result.player(aiPlayer,enemy)>0, 'AI actively targets enemies when either branch benefits it');
const previousAttitude=get.attitude;
get.attitude=()=>5;
assert.ok(skills.fan_binghua.ai.result.player(aiPlayer,enemy)<=0, 'no blind friendly targeting');
get.attitude=previousAttitude;
aiPlayer.countCharge=()=>0;
assert.equal(skills.fan_binghua.ai.result.player(aiPlayer,enemy),0, 'no fixed positive score without useful pressure');
const logs=[];
const actor={chooseBool:()=>({set(){return this},forResult:async()=>({bool:true})}),
  isIn:()=>true,countCharge:()=>1,countGainableCards:()=>1,removeCharge:n=>logs.push(['charge',n]),
  logSkill:id=>logs.push(['audio',id]),gainPlayerCard:async()=>logs.push(['gain'])};
const victim={isIn:()=>true};
await skills.fan_binghua_take.content({}, {player:actor,target:victim,card:{name:'sha'}},actor);
assert.deepEqual(logs,[['charge',1],['audio','fan_binghua_take'],['gain']]);
logs.length=0;
await skills.fan_binghua_take.content({}, {player:actor,target:victim,card:{name:'juedou'}},actor);
assert.equal(logs[1][1],'fan_binghua_take');
console.log('Binghua AI and voice routing checks passed');

const voiceCalls=[];
game.trySkillAudio=(...args)=>voiceCalls.push(args);
game.broadcastAll=(fn,...args)=>fn(...args);
const listeners=new Map();
const intro={src:'extension/原神/audio/ayaka/skill/fan_binghua_intro.mp3',ended:false,
  addEventListener:(name,fn)=>listeners.set(name,fn),
  removeEventListener:name=>listeners.delete(name)};
globalThis.document={querySelectorAll:()=>[intro]};
const exchangeLog=[];
const chain={set(){return this},then(resolve){resolve({bool:true})}};
const chooser={isIn:()=>true,addSkill:()=>{},getDiscardableCards:()=>[old,fresh],
  chooseToDiscard:(zone,count)=>{exchangeLog.push(['discardTarget',count]);return chain},
  draw:async num=>exchangeLog.push(['drawTarget',num]),
  chooseControl:()=>({set(){return this},forResult:async()=>({index:1})})};
const speaker={isIn:()=>true,addSkill:()=>{},storage:{},countCharge:()=>2,getDiscardableCards:()=>[],
  draw:async num=>exchangeLog.push(['drawAyaka',num])};
await skills.fan_binghua.content({target:chooser},{},speaker);
assert.deepEqual(exchangeLog,[['discardTarget',2],['drawTarget',2],['drawAyaka',2]],'target pays two Sha; zero-Sha Ayaka still draws; both discard before drawing');
assert.equal(speaker.storage.fan_binghua_links,undefined,'second option has no lasting restriction');
assert.equal(voiceCalls.length,0,'fast AI choice waits for intro');
listeners.get('ended')();
assert.equal(voiceCalls.length,1);
assert.equal(voiceCalls[0][0],'fan_binghua_choice');
assert.equal(listeners.size,0);
intro.ended=true;
await skills.fan_binghua.content({target:chooser},{},speaker);
assert.equal(voiceCalls.length,2,'slow choice plays immediately after intro ended');
intro.ended=false;
await skills.fan_binghua.content({target:chooser},{},speaker);
listeners.get('error')();
assert.equal(voiceCalls.length,3,'failed intro releases the queued voice');
delete globalThis.document;
chooser.getDiscardableCards=()=>[old];
chooser.chooseControl=()=>{throw new Error('ineligible target cannot choose option two')};
await skills.fan_binghua.content({target:chooser},{},speaker);
assert.equal(speaker.storage.fan_binghua_links[0].mode,0);
chooser.getDiscardableCards=()=>[old,fresh];
chooser.chooseControl=()=>({set(){return this},forResult:async()=>({index:1})});
speaker.getDiscardableCards=()=>[old];
speaker.chooseToDiscard=(zone,count)=>{exchangeLog.push(['discardAyaka',count]);return chain};
exchangeLog.length=0;
await skills.fan_binghua.content({target:chooser},{},speaker);
assert.deepEqual(exchangeLog,[['discardTarget',2],['discardAyaka',1],['drawTarget',2],['drawAyaka',2]]);
speaker.getDiscardableCards=()=>[old,fresh,{name:'sha'}];
exchangeLog.length=0;
await skills.fan_binghua.content({target:chooser},{},speaker);
assert.deepEqual(exchangeLog,[['discardTarget',2],['discardAyaka',2],['drawTarget',2],['drawAyaka',2]]);
get.value=card=>card.value??5;
aiPlayer.getDiscardableCards=()=>[];
aiPlayer.countCharge=()=>2;
enemy.getDiscardableCards=()=>[{name:'sha',value:8},{name:'sha',value:8}];
assert.ok(skills.fan_binghua.ai.result.player(aiPlayer,enemy)>0,'AI considers free draw for Ayaka and costly discard for an eligible enemy');
console.log('Binghua voice sequencing checks passed');

for (const charge of [0,1,2,3,4]) {
  const x=Math.max(1,charge);
  speaker.countCharge=()=>charge;
  chooser.getDiscardableCards=()=>Array.from({length:x},()=>old);
  speaker.getDiscardableCards=()=>[old];
  exchangeLog.length=0;
  await skills.fan_binghua.content({target:chooser},{},speaker);
  assert.deepEqual(exchangeLog,[['discardTarget',x],['discardAyaka',1],['drawTarget',x],['drawAyaka',x]],`X at ${charge} charges`);
  chooser.getDiscardableCards=()=>Array.from({length:x-1},()=>old);
  chooser.chooseControl=()=>{throw new Error('cannot select exchange below X')};
  exchangeLog.length=0;
  await skills.fan_binghua.content({target:chooser},{},speaker);
  assert.equal(exchangeLog.length,0);
  chooser.chooseControl=()=>({set(){return this},forResult:async()=>({index:1})});
}
// 弃牌触发其他效果改变蓄力时，仍按发动时固定的X摸牌。
speaker.countCharge=()=>3;
chooser.getDiscardableCards=()=>[old,old,old];
chooser.chooseToDiscard=(zone,count)=>{exchangeLog.push(['discardTarget',count]);speaker.countCharge=()=>0;return chain};
exchangeLog.length=0;
await skills.fan_binghua.content({target:chooser},{},speaker);
assert.deepEqual(exchangeLog,[['discardTarget',3],['discardAyaka',1],['drawTarget',3],['drawAyaka',3]]);
console.log('Binghua X=1..4 and snapshot checks passed');
