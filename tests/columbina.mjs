import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const source = readFileSync(new URL('../character/skills/columbina.js', import.meta.url), 'utf8');
const get = { is: { shownCard: c => c.shown }, type: c => c.type || 'basic', translation: c => c.name, value: () => 3 };
const status = {};
let people = [], skipped = 0, choices = [], restored = 0;
const effectCalls=[];
const queueCalls=[];
const voiceCalls=[];
const game = { roundNumber: 1, filterPlayer: () => people, countPlayer: () => people.length,
  trySkillAudio(...args) {voiceCalls.push(args);},
  broadcastAll(fn,active,...args) {if(typeof active==='boolean')effectCalls.push(active);else queueCalls.push([active,...args]);},
  hasPlayer: f => people.some(f), log(...args) {if(args.includes('因无合法使用方式，跳过了'))skipped++;}, async delay() {}, async delayx() {}, createCard: name => ({ name, delete() {} }) };
const lib = { filter: { targetEnabledx: (c,p,t) => !t.disabled,
  cardEnabled:c=>!c.disabled, cardUsable:c=>!c.exhausted, cardAiIncluded:()=>true } };
const ui = {selected:{buttons:[]}};
const skills = new Function('lib','game','get','ui','_status','setSulvEffect','showSulvQueue',source.replace(/^import .*;\r?\n/gm,'').replace('export default','return'))(lib,game,get,ui,status,()=>{},()=>{});
const card = (id, zone='h', shown=false) => ({ cardid: id, name:'sha', zone, shown, hasGaintag: t => t === 'faceup_tag' && !!id?.startsWith('legacy') });
function holder(cards=[]) {
  return { cards, storage:{}, group:'wei', isIn:()=>true,
    getCards(z,f=()=>true) { return this.cards.filter(c=>z.includes(c.zone)&&f(c)); },
    countCards(z) { return this.getCards(z).length; }, hasCard(f,z) { return this.getCards(z,f).length>0; },
    hasZhuSkill:()=>false, logSkill() {},
    async addShownCards(cs) { cs.filter(c=>this.cards.includes(c)).forEach(c=>c.shown=true); },
    async hideShownCards(cs) { cs.forEach(c=>c.shown=false); }, removeGaintag() {},
  };
}
const p = holder(), other = holder(); people=[p,other];
assert(skills.fan_sulv.filter({},p)); // 首次发动不要求明置数量。
const record=skills.fan_sulv.subSkill.record;
const real=card('a');
const use={card:{isCard:true,cardid:'a',name:'sha'},cards:[real],targets:[other]};
let loss={hs:[real],es:[],gaintag_map:{a:['visible_other']},getParent:()=>use};
p.getHistory=(type,f)=>[loss].filter(f);
assert(record.filter(use,p));
await record.content({},use,p); await record.content({},use,p);
assert.equal(p.storage.fan_sulv_records.length,2);
loss.gaintag_map={}; assert(!record.filter(use,p));
loss.gaintag_map={a:['faceup_tag']}; assert(record.filter(use,p));
use.card.isCard=false; assert(!record.filter(use,p)); // 转化牌
use.card.isCard=true; use.card.cardid='different'; assert(!record.filter(use,p));
use.card.cardid='a'; use.cards=[]; assert(!record.filter(use,p)); // 无素材重放
use.cards=[real]; use.card.type='delay'; assert(!record.filter(use,p));
use.card.type='basic'; use.targets=[]; assert(!record.filter(use,p));
use.targets=[other]; loss={hs:[],es:[real],getParent:()=>use}; assert(record.filter(use,p));

p.awakenSkill=(skill,keepMark)=>{assert.equal(keepMark,true);p.storage.fan_sulv=true;};
p.restoreSkill=()=>{restored++;p.storage.fan_sulv=false;};
p.chooseUseTarget=opts=>({async forResult() {
  choices.push(opts);
  assert.equal(opts.addCount,false); assert(!opts.nodistance); assert.deepEqual(opts.cards,[]);
  assert.equal(opts.throw,false); // 当前牌由展示队列绘制，原生指示线与结算保留。
  assert(!skills.fan_sulv.filter({},p)); // 嵌套濒死不可重入
  p.storage.fan_sulv_records.push({name:'new'}); // 当前快照不受新增记录影响
  return {bool:opts.card.name!=='shunshou'};
}});
p.$throw=()=>{skipped++;};
p.storage.fan_sulv_records=[{name:'sha',nature:'fire'},{name:'shunshou'},{name:'sha'}];
// 两名存活角色，主公阈值6：三张装备、三张明置手牌、一张判定牌共七张。
p.hasZhuSkill=()=>true;
p.cards=[card('1','e'),card('2','e'),card('3','e')];
other.cards=[card('4','h',true),card('5','h',true),card('legacy6'),card('7','j',true),card('8')];
assert.equal(skills.fan_sulv.intro.fixed,true);
assert.match(skills.fan_sulv.intro.content(false,p),/可于进入濒死时发动<br>场上明置牌：7<br>再次发动所需：6/);
await skills.fan_sulv.content({},null,p);
assert.deepEqual(choices.map(c=>c.card.name),['sha','shunshou','sha']);
assert.equal(choices[2].card.nature,'fire'); assert.equal(skipped,1); assert.equal(restored,1);
assert(!p.storage.fan_sulv_running);
assert.deepEqual(queueCalls.map(c=>c[0]),['start','settle','advance','settle','advance','settle','advance','stop']);
// 非主公阈值8，不恢复；装备离开后不再计入。
p.hasZhuSkill=()=>false; choices=[]; await skills.fan_sulv.content({},null,p); assert.equal(restored,1);
assert.match(skills.fan_sulv.intro.content(true,p),/已发动，当前数量不足，不能再次发动<br>场上明置牌：7<br>再次发动所需：8/);
p.hasZhuSkill=()=>true; p.cards[0].zone='h'; p.cards[1].zone='h'; await skills.fan_sulv.content({},null,p); assert.equal(restored,1);
assert.match(skills.fan_sulv.intro.content(false,p),/场上明置牌：5<br>再次发动所需：6/);
p.chooseUseTarget=()=>({forResult:async()=>{throw Error('interrupted');}});
await assert.rejects(skills.fan_sulv.content({},null,p)); assert(!p.storage.fan_sulv_running);
assert.deepEqual(effectCalls.slice(-2),[true,false]); // 异常退出也必须关闭边缘特效。
assert.equal(queueCalls.at(-1)[0],'stop');

const protection=skills.fan_xiangchou.mod;
status.currentPhase=other; const hand=p.cards[0];
assert.equal(protection.cardDiscardable(hand,p),undefined);
hand.shown=true;
assert.equal(protection.cardDiscardable(hand,p),false);
assert.equal(protection.canBeDiscarded(hand,other,p),false);
assert.equal(protection.cardDiscardable(p.cards[2],p),undefined);
status.currentPhase=p; assert.equal(protection.cardDiscardable(hand,p),false);
assert.equal(protection.ignoredHandcard(hand,p),true);
hand.shown=false;assert.equal(protection.ignoredHandcard(hand,p),undefined);
assert.equal(protection.canBeDiscarded(hand,other,p),undefined);
const legacy=card('legacy-protection');p.cards.push(legacy);
assert.equal(protection.ignoredHandcard(legacy,p),true);
assert.equal(protection.cardDiscardable(legacy,p),false);
legacy.zone='e';assert.equal(protection.ignoredHandcard(legacy,p),undefined);
assert.equal(protection.cardDiscardable(legacy,p),undefined);

// 阳→阴，摸牌后明置；不足数量时尽可能执行，原明置牌不重复选择。
p.cards=[]; p.storage.fan_xiangchou=false;
let drew=[];
p.draw=async n=>{drew.push(n);p.cards.push(...Array.from({length:n},(_,i)=>card(`draw${drew.length}-${i}`)));};
p.changeZhuanhuanji=()=>{p.storage.fan_xiangchou=!p.storage.fan_xiangchou;};
p.chooseCard=(zone,n)=>({set(){return this;},forResult:async()=>({bool:true,cards:p.getCards('h',c=>!c.shown).slice(0,n)})});
await skills.fan_xiangchou.content({},null,p);
assert.equal(p.cards.filter(c=>c.shown).length,1); assert(p.storage.fan_xiangchou);
await skills.fan_xiangchou.content({},null,p);
assert.deepEqual(drew,[1,2]); assert.equal(p.cards.filter(c=>c.shown).length,2); assert(!p.storage.fan_xiangchou);

let result={bool:true,links:['反转明暗']};
let selectionOptions;
p.chooseButton=()=>({set(k,v){(selectionOptions ||= {})[k]=v;return this;},forResult:async()=>result});
other.cards=[card('light','h',true),card('dark'),card('equip','e')];
other.hasUseTarget=()=>true;
await skills.fan_xiayin.content({}, {player:other},p);
assert.equal(voiceCalls.at(-1)[0],'fan_xiayin_flip');
assert.equal(voiceCalls.at(-1)[1],p);
assert.deepEqual(other.cards.map(c=>c.shown),[false,true,false]);
assert.equal(selectionOptions.fanPairedConfirm,true);
assert.deepEqual(selectionOptions.selectButton,[0,1]);
assert(!selectionOptions.filterOk());
ui.selected.buttons=[{link:'反转明暗'}]; assert(selectionOptions.filterOk());
ui.selected.buttons=[{link:other.cards[1]}]; assert(selectionOptions.filterOk());
other.cards[1].shown=false; assert(!selectionOptions.filterOk()); other.cards[1].shown=true;
ui.selected.buttons=[]; assert(!selectionOptions.filterOk());
let used=0,useOptions;
other.chooseToUse=opts=>{used++;useOptions=opts;assert.equal(opts.fan_xiayin_card,other.cards[1]);assert(opts.forced);};
result={bool:true,links:[other.cards[1]]};
await skills.fan_xiayin.content({}, {player:other},p); assert.equal(used,1);
assert.equal(voiceCalls.at(-1)[0],'fan_xiayin_use');
assert.equal(voiceCalls.at(-1)[1],p);
assert.equal(p.storage.fan_xiayin_flips,1); // 第一项不消耗反转次数
const voiceCountBeforeCancel=voiceCalls.length;
result={bool:false}; await skills.fan_xiayin.content({}, {player:other},p);
assert.equal(voiceCalls.length,voiceCountBeforeCancel);
assert.equal(p.storage.fan_xiayin_flips,1); // 取消不消耗
result={bool:true,links:['反转明暗']};
await skills.fan_xiayin.content({}, {player:other},p);
assert.equal(p.storage.fan_xiayin_flips,2);
const before=other.cards.map(c=>c.shown);
await skills.fan_xiayin.content({}, {player:other},p);
assert.deepEqual(other.cards.map(c=>c.shown),before); // 第三次不能结算
assert(!selectionOptions.filterButton({link:'反转明暗'}));
ui.selected.buttons=[{link:'反转明暗'}]; assert(!selectionOptions.filterOk());
assert(skills.fan_xiayin.filter({player:other},p)); // 用尽后仍可发动第一项
const held=other.cards; other.cards=[card('darkOnly')];
assert(!skills.fan_xiayin.filter({player:other},p));
game.roundNumber++;
assert(skills.fan_xiayin.filter({player:other},p));
await skills.fan_xiayin.content({}, {player:other},p);
assert.equal(p.storage.fan_xiayin_flips,1); // 新轮重置
other.cards=held;

const reveal=skills.fan_zhenyue.subSkill.reveal;
assert(reveal.filter({},other));
p.hasZhuSkill=()=>false; assert(!reveal.filter({},other));
p.hasZhuSkill=()=>true; other.group='shu'; assert(!reveal.filter({},other));
// 已结束重放后，后续达到数量仍须恢复；每次变化读取当前区域和存活人数。
const refresh=skills.fan_sulv.subSkill.refresh;
p.hasZhuSkill=()=>true;
p.cards=Array.from({length:5},(_,i)=>card(`continuous${i}`,'e'));
other.cards=[card('laterReveal')]; people=[p,other];
p.storage.fan_sulv=true;
assert(!refresh.filter({},p));
other.cards[0].shown=true;
assert(refresh.filter({},p));
await refresh.content({},null,p); assert.equal(p.storage.fan_sulv,false);
assert(!refresh.filter({},p));
// 达标恢复发生于重放中，也不能在当前重放尚未结束时嵌套发动。
p.storage.fan_sulv=true; p.storage.fan_sulv_running=true;
await refresh.content({},null,p);
assert.equal(p.storage.fan_sulv,false); assert(!skills.fan_sulv.filter({},p));
delete p.storage.fan_sulv_running;
assert(skills.fan_sulv.filter({},p));
// 减员降低阈值，无须等待再次用牌或重放结束。
people.push(holder()); p.storage.fan_sulv=true;
assert(!refresh.filter({},p)); people.pop(); assert(refresh.filter({},p));
await refresh.content({},null,p); assert.equal(p.storage.fan_sulv,false);
// 曾经达标不能锁存资格：数量下降后，即使刷新尚未运行，发动过滤也拒绝。
other.cards[0].shown=false;
assert(!skills.fan_sulv.filter({},p));
assert(refresh.filter({},p));
await refresh.content({},null,p); assert.equal(p.storage.fan_sulv,true);
assert(!refresh.filter({},p));
other.cards[0].shown=true;
await refresh.content({},null,p); assert(skills.fan_sulv.filter({},p));
// 判定牌无需明置标签：进入判定区即计入，回到暗置手牌则不再计入。
other.cards=[card('judgment','j',false)];
await refresh.content({},null,p); assert(skills.fan_sulv.filter({},p));
assert.match(skills.fan_sulv.intro.content(false,p),/场上明置牌：6/);
other.cards[0].zone='h';
assert(!skills.fan_sulv.filter({},p));
await refresh.content({},null,p); assert.equal(p.storage.fan_sulv,true);
assert.match(skills.fan_sulv.intro.content(true,p),/场上明置牌：5/);
console.log('Columbina: replay, round limits, persistent marks, continuous recovery, death thresholds and nesting checks passed.');

// 原生随机池映射、音频文件与来源清单一致，内部监听不播放语音。
assert.equal(skills.fan_xiangchou.audio,'ext:原神/audio/columbina/skill:3');
assert.equal(skills.fan_sulv.audio,'ext:原神/audio/columbina/skill:2');
assert.equal(skills.fan_xiayin.audio,false);
assert.equal(skills.fan_xiayin.subSkill.use.audio,'ext:原神/audio/columbina/skill:2');
assert.equal(skills.fan_xiayin.subSkill.flip.audio,'ext:原神/audio/columbina/skill:2');
assert.equal(skills.fan_sulv.subSkill.record.audio,false);
assert.equal(skills.fan_sulv.subSkill.refresh.audio,false);
assert.equal(skills.fan_zhenyue.subSkill.reveal.audio,false);
const manifest=JSON.parse(readFileSync(new URL('../audio/columbina/originals/columbina-sources.json',import.meta.url),'utf8'));
assert.deepEqual([1,2,3].map(i=>manifest.clips['fan_xiangchou'+i].label),['突破的感受·起','突破的感受·承','突破的感受·转']);
assert.deepEqual([1,2].map(i=>manifest.clips['fan_sulv'+i].label),['元素爆发·其二','元素爆发·其三']);
assert.deepEqual([1,2].map(i=>manifest.clips['fan_xiayin_use'+i].label),['打开宝箱·其一','打开宝箱·其二']);
for(const [name,clip] of Object.entries(manifest.clips)) {
  const data=readFileSync(new URL(`../audio/columbina/${name==='fan_columbina'?'die':'skill'}/${name}.mp3`,import.meta.url));
  assert.equal(data.length,clip.bytes);
  assert(data.subarray(0,4).toString()==='OggS'||data.subarray(0,3).toString()==='ID3'||data[0]===0xff,`Audio header: ${name}`);
}
console.log('Columbina audio: branch selection, cancellation silence, native random pools and 11 original voice assets passed.');

// 调用本地引擎真实选牌检查与真实方天画戟修正，不在测试里模拟“+2”。
const engine=readFileSync(new URL('../../../noname/game/check.js',import.meta.url),'utf8');
const Check=new Function('ui','get','game','lib',engine.slice(engine.indexOf('class Check {'),engine.indexOf('\nexport {'))+';return Check;')(ui,get,game,lib);
const standard=readFileSync(new URL('../../../card/standard.js',import.meta.url),'utf8');
const fangtian=new Function('ui','get','game','return ({'+standard.slice(standard.indexOf('    fangtian_skill: {'),standard.indexOf('    fangtian_guozhan: {'))+'}).fangtian_skill;')(ui,get,game);
get.mode=()=> 'identity'; get.select=n=>Array.isArray(n)?n:[n,n]; game.callHook=()=>{};
const fixed=useOptions.fan_xiayin_card;
fixed.shown=true;other.cards=[fixed];
for(const c of [fixed,real]) {
  c.classList={set:new Set(),add(x){this.set.add(x);},remove(x){this.set.delete(x);},contains(x){return this.set.has(x);}};
}
status.event={...useOptions,player:other};
ui.selected.cards=[];
ui.selected.cards.add=function(c){if(!this.includes(c))this.push(c);};
ui.selected.cards.remove=function(c){const i=this.indexOf(c);if(i>=0)this.splice(i,1);};
new Check().processSelection({type:'card',items:other.cards,event:status.event,useCache:false,
  isSelectable:c=>useOptions.filterCard(c,other)});
assert.deepEqual([...ui.selected.cards],[fixed]); // 指定牌由原生自动选中。
assert(useOptions.filterOk());
let range=[1,1];fangtian.mod.selectTarget(fixed,other,range);assert.deepEqual(range,[1,3]);
other.cards.push(real);range=[1,1];fangtian.mod.selectTarget(fixed,other,range);assert.deepEqual(range,[1,1]);
assert(!useOptions.filterCard(real,other)); // 不允许临时改用其他牌。
other.cards=[];assert(!useOptions.filterCard(fixed,other));assert(!useOptions.filterOk());
other.cards=[fixed];fixed.disabled=true;assert(!useOptions.filterCard(fixed,other));assert(!useOptions.filterOk());delete fixed.disabled;
fixed.exhausted=true;assert(!useOptions.filterCard(fixed,other));assert(!useOptions.filterOk());delete fixed.exhausted;
fixed.shown=false;assert(!useOptions.filterCard(fixed,other));fixed.shown=true;
ui.selected.cards.length=0;assert(!useOptions.filterOk());
assert.equal(useOptions.selectTarget,undefined); // 无装备则使用原生目标范围，不硬编码三目标。
assert.equal(useOptions.ai2,undefined); // 保留原生 cacheEffectUse 对各目标的敌友与收益评估。
console.log('Xiayin: native auto-selection and Fangtian last-hand range 1–3, other-hand range 1, fixed-card legality and native AI defaults passed.');

