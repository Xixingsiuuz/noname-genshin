import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const read = path => readFileSync(new URL(path, import.meta.url), "utf8");
for (const [name, fn] of Object.entries({
  add(item) { if (!this.includes(item)) this.push(item); return this; },
  remove(item) { const i = this.indexOf(item); if (i >= 0) this.splice(i, 1); return this; },
  sortBySeat(start) { return this.sort((a,b) => ((a.seat-start.seat+20)%20)-((b.seat-start.seat+20)%20)); },
})) Object.defineProperty(Array.prototype,name,{configurable:true,value:fn});
const status = {}, ui = { selected: { cards: [], targets: [] } }, sounds = [], hits = [], logs = [];
let players = [], choice, options, payment = true, onHit;
const lib = { skill: {}, linked: ["fire","thunder"], natureSeparator: "|", filter: {
  cardDiscardable: card => !card.fixed,
  targetEnabled: (card, source, target) => !target.immune,
}};
const get = {
  itemtype: x => Array.isArray(x) ? "cards" : x?.playerid ? "player" : x?.physical ? "card" : ["fire","thunder"].includes(x) ? "nature" : undefined,
  natureList: x => x ? x.split("|") : [], is: { sameNature: (a,b) => a.some(x => b.includes(x)) },
  value: card => card.value ?? 3, attitude: (p,t) => t.friend ? 5 : -5,
  damageEffect: (t,s,p) => t.friend || t === p ? -6 : 6,
  effect: (t,c,s,p) => t.friend || t === p ? -6 : 6,
};
const game = {
  filterPlayer: (fn = () => true) => players.filter(p => p.isIn() && fn(p)),
  hasPlayer(fn) { if (typeof fn !== "function") throw new TypeError("callback required"); return this.filterPlayer(fn).length > 0; },
  trySkillAudio: id => sounds.push(id),
  createEvent(name) { const parent = status.event; return { name, getParent(type) {
    let current = parent; if (!type) return current;
    while (current) { if (current.name === type) return current; current = current.getParent?.(); }
    return {};
  },setContent(){},getLogv(){return null;} }; },
};
assert.throws(() => game.hasPlayer(), TypeError);
// 实际编译器类：普通 content 经过 StepCompiler 的 new Function，会丢失模块闭包。
// 仅替换沙盒函数构造器选择和报错片段登记；编译、分发与执行方法保留原体。
const compilerFiles = ["ContentCompilerBase", "ArrayCompiler", "AsyncCompiler", "StepCompiler", "ContentCompiler"];
const compilerCode = compilerFiles.map(name => read("../../../noname/library/element/GameEvent/compilers/"+name+".js")
  .replace(/^import .*;\r?\n/gm, "").replace(/export\s*\{[\s\S]*?\};?\s*$/, "")).join("\n");
const compiler = new Function("game","get","lib","ui","_status","AsyncFunction","GeneratorFunction","AsyncGeneratorFunction","security","ErrorManager","CodeSnippet","const ai = {};\n"+compilerCode+"\nreturn compiler;")(
  game,get,lib,ui,status,Object.getPrototypeOf(async function(){}).constructor,Object.getPrototypeOf(function*(){}).constructor,
  Object.getPrototypeOf(async function*(){}).constructor,
  {getIsolatedsFrom:()=>[null,null,Function],isSandboxRequired:()=>false}, {setCodeSnippet(){}}, class CodeSnippet {});
async function compiledContent(content,event,trigger,player) {
  let step=0,nextStep=null;
  Object.assign(event,{player,_trigger:trigger,finished:false,
    getDefaultHandlerType:()=>"onStage",callHandler(){},clearStepCache(){},
    updateStep(){if(nextStep!==null){step=nextStep;nextStep=null}},
    finish(){this.finished=true},waitNext:async()=>undefined});
  Object.defineProperty(event,"step",{get:()=>step,set:value=>{nextStep=value},configurable:true});
  return compiler.compile(content).call(event,event);
}
const source = read("../character/skills/klee.js");
const skills = new Function("game","get","lib","ui","_status",source.replace(/^import .*;\r?\n/gm,"").replace("export default","return"))(game,get,lib,ui,status);
Object.assign(lib.skill,skills);
for (const [id,info] of Object.entries(skills)) for (const [sub,skill] of Object.entries(info.subSkill || {})) lib.skill[id+"_"+sub] = skill;
// 保存原来的错误实现，确认真正走编译路径时会复现截图错误。
const brokenSkills = new Function("game","get","lib","ui","_status",source.replace(/^import .*;\r?\n/gm,"")
  .replace("async content(event, trigger, player) { snapshot(trigger, player); }", "content(event, trigger, player) { snapshot(trigger, player); }")
  .replace("export default","return"))(game,get,lib,ui,status);
await assert.rejects(compiledContent(brokenSkills.fan_huohua.subSkill.record.content,{}, {}, {isDead:()=>false,isOut:()=>false}),
  error=>error instanceof ReferenceError && /snapshot is not defined/.test(error.message));
assert.equal(compiler.compile(skills.fan_huohua.subSkill.record.content).type,"async");
const engine = read("../../../noname/library/element/player.js");
const damageBody = engine.slice(engine.indexOf("  damage(params) {"), engine.indexOf("\n  recover(params) {"));
const nativeDamage = new Function("game","get","lib","_status","return ({"+damageBody+"}).damage")(game,get,lib,status);
const globalSource = read("../../../noname/library/skill.js");
const chain = new Function("game","lib","_status","return ({"+globalSource.slice(globalSource.indexOf("  _lianhuan: {"),globalSource.indexOf("  _lianhuan4: {"))+"})._lianhuan")(game,lib,status);
lib.sort = { seat: (a,b) => ((a.seat-lib.tempSortSeat.seat+20)%20)-((b.seat-lib.tempSortSeat.seat+20)%20) };
async function dispatch(name, trigger) {
  for (const player of [...players]) {
    const ids = [...player.skills];
    for (let i=0; i<ids.length; i++) for (const id of [].concat(lib.skill[ids[i]]?.group || [])) if (!ids.includes(id)) ids.push(id);
    for (const id of ids) {
      const info = lib.skill[id];
      if (![].concat(info?.trigger?.global || []).includes(name) || !info.filter(trigger,player)) continue;
      const before = status.event;
      const event = { name:id,triggername:name,getParent:()=>trigger };
      status.event = event;
      await compiledContent(info.content,event,trigger,player);
      status.event = before;
    }
  }
}
function person(id,seat) {
  return { playerid:id, seat, storage:{}, skills:[], cards:[], losses:[], alive:true, linked:false,
    isIn(){return this.alive}, isDead(){return !this.alive}, isOut(){return false}, isLinked(){return this.linked},
    getPrevious(){return this.prev}, getNext(){return this.next},
    inRange(target){return target.range !== false}, getCards(){return this.cards},
    countCards(){return this.cards.length}, countDiscardableCards(){return this.cards.filter(lib.filter.cardDiscardable).length},
    addSkill(id){this.skills.add(id)}, removeSkill(id){this.skills.remove(id);lib.skill[id]?.onremove?.(this)},
    logSkill(id,targets){logs.push([id,targets])},
    chooseCardTarget(opt){options=opt;return {forResult:async()=>choice}},
    discard({cards}){const evt={name:"discard"};evt.then=resolve=>{if(payment){this.cards.remove(cards[0]);this.losses.push({cards,getParent:()=>evt})}resolve()};return evt},
    getHistory(name,fn){return this.losses.filter(fn)},
    damage(...args){ const event=nativeDamage.apply(this,args); return {then: (resolve,reject) => processDamage(event).then(resolve,reject)}; },
  };
}
function setup() {
  const klee=person("k",0), a=person("a",1), b=person("b",2), c=person("c",3), d=person("d",4);
  players=[klee,a,b,c,d]; players.forEach((p,i)=>{p.prev=players[(i+4)%5];p.next=players[(i+1)%5]});
  status.currentPhase=b; sounds.length=hits.length=logs.length=0;payment=true;onHit=null;
  return {klee,a,b,c,d};
}
function damageEvent(use,target,source=use.player,num=1) {
  return {name:"damage",num,card:use.card,source,player:target,getParent: name => name === "useCard" ? use : use,getLogv:()=>null};
}
async function processDamage(evt, afterDamage) {
  const before=status.event; status.event=evt;
  hits.push([evt.player.playerid,evt.card?.name,evt.source?.playerid]);
  const spreads = evt.nature && evt.player.linked && evt.getParent()?.name !== "_lianhuan";
  if (evt.nature && evt.player.linked) evt.player.linked=false;
  await dispatch("damage",evt);
  if(afterDamage) afterDamage();
  if(onHit) await onHit(evt);
  await dispatch("damageSource",evt);
  if(spreads) {
    const queued=[]; const original=players.map(p=>p.damage);
    const chainEvent={name:"_lianhuan",player:evt.player,getParent:()=>evt,redo(){}};
    status.event=chainEvent;
    // 原生 _lianhuan.content：快照、排序、保留 card/source，逐人执行。
    await chain.content[0](chainEvent,evt,evt.player); await chain.content[1](chainEvent,evt,evt.player);
    // 原生非 await 的 damage 子事件由引擎队列等待；模拟器显式收集每一步。
    while(chainEvent.targets.length) {
      for(const p of players) p.damage=function(...args){const child=nativeDamage.apply(this,args);queued.push(child);return child};
      await chain.content[2](chainEvent,evt,evt.player);
      players.forEach((p,i)=>p.damage=original[i]);
      while(queued.length) await processDamage(queued.shift());
      status.event=chainEvent;
    }
  }
  status.event=before;
}
let {klee,a,b,c,d}=setup();
klee.skills=["fan_huohua"];
let use={name:"useCard",player:klee,card:{name:"sha"},getParent:()=>null};
await processDamage(damageEvent(use,b));
assert.deepEqual(hits.map(h=>h[0]),["b","c","a"],"neighbors resolve from current phase seat");
assert.deepEqual(hits.slice(1).map(h=>h[1]),[undefined,undefined],"native damage nocard prevents inheritance");
assert.deepEqual(sounds,["fan_huohua_blast"],"one voice for both neighbors");
sounds.length=0;await processDamage(damageEvent(use,b,klee,2));assert.equal(sounds.length,1,"multi-point damage still one trigger");
await processDamage(damageEvent(use,b));assert.equal(sounds.length,2,"independent damage triggers may speak again");
sounds.length=0;await processDamage(damageEvent(use,b,klee,0));assert.equal(sounds.length,0);
await processDamage(damageEvent(use,klee));assert.equal(sounds.length,0,"own sha damaging self excluded");
({klee,a,b,c,d}=setup());klee.skills=["fan_huohua"];
use={name:"useCard",player:klee,card:{name:"sha",nature:"fire"},getParent:()=>null};
a.linked=c.linked=true;
await processDamage({...damageEvent(use,a),nature:"fire"});
assert.equal(sounds.length,2,"direct and native chain damage each splash once");
assert.equal(hits.filter(h=>h[1]==="sha").length,2);
// 溅射先命中横置邻居，抢先引发技能伤害传导，不能将其误认为杀。
({klee,a,b,c,d}=setup());klee.skills=["fan_huohua"];
use={name:"useCard",player:klee,card:{name:"sha",nature:"fire"},getParent:()=>null};
a.linked=b.linked=c.linked=true;
await processDamage({...damageEvent(use,a),nature:"fire"});
assert.equal(sounds.length,1);assert.equal(hits.filter(h=>h[1]==="sha").length,1);
// 致死时保留已扣血时的邻居；首个溅射导致另一邻居离场时跳过。
({klee,a,b,c,d}=setup());klee.skills=["fan_huohua"];
use={name:"useCard",player:klee,card:{name:"sha"},getParent:()=>null};
onHit=evt=>{if(evt.player===c)a.alive=false};
await processDamage(damageEvent(use,b),()=>{b.alive=false;b.prev=d;b.next=d});
assert.deepEqual(hits.map(h=>h[0]),["b","c"]);
// 转移操作同屏支持先目标后牌，以及取消、支付失败。
({klee,a,b,c,d}=setup());klee.skills=["fan_taopao"];
use={name:"useCard",player:d,card:{name:"sha",nature:"fire"},targets:[klee,c],triggeredTargets2:[klee],getParent:()=>null};
let trigger={name:"useCardToTarget",player:d,card:use.card,getParent:()=>use};
const cost={physical:true,value:3};klee.cards=[cost];choice={bool:false};
assert(skills.fan_taopao.filter(trigger,klee));
a.range=b.range=false;assert(!skills.fan_taopao.filter(trigger,klee),"no eligible target rejects activation");delete a.range;delete b.range;
await compiledContent(skills.fan_taopao.content,{},trigger,klee);assert.equal(sounds.length,0);
ui.selected.cards=[];ui.selected.targets=[a];assert(options.filterTarget(null,klee,a));assert(!options.filterOk());
ui.selected.cards=[cost];assert(options.filterOk());ui.selected.targets=[];assert(!options.filterOk());
assert(!options.filterTarget(null,klee,c));assert(!options.filterTarget(null,klee,d));
choice={bool:true,cards:[cost],targets:[a]};payment=false;
await compiledContent(skills.fan_taopao.content,{},trigger,klee);assert.deepEqual(use.targets,[klee,c]);assert.equal(sounds.length,0);
payment=true;await compiledContent(skills.fan_taopao.content,{},trigger,klee);
assert.deepEqual(use.targets,[a,c]);assert.deepEqual(sounds,["fan_taopao"]);assert(klee.skills.includes("fan_taopao_effect"));
assert(!skills.fan_taopao.filter(trigger,klee),"actual cost consumed");
// 原技能暂时失效不撤销已经赋予此杀的效果。
klee.skills.remove("fan_taopao");a.linked=c.linked=true;
await processDamage({...damageEvent(use,a,d),nature:"fire"});
assert.equal(sounds.filter(id=>id==="fan_huohua_blast").length,2);
const nested={name:"useCard",player:d,card:use.card,getParent:()=>use};
const count=sounds.length;await processDamage(damageEvent(nested,b,d));assert.equal(sounds.length,count,"nested use of same card is distinct");
await dispatch("useCardAfter",nested);assert(klee.skills.includes("fan_taopao_effect"));
await dispatch("useCardAfter",use);assert(!klee.skills.includes("fan_taopao_effect"));
await processDamage(damageEvent(use,b,d));assert.equal(sounds.length,count,"effect ends with its use");
// 友方传导也触发；规则不按敌友过滤。
({klee,a,b,c,d}=setup());klee.skills=["fan_huohua"];b.friend=true;
use={name:"useCard",player:klee,card:{name:"sha"},getParent:()=>null};
await processDamage(damageEvent(use,b));assert.equal(sounds.length,1);
// 两人局上下家同一人去重，排除可莉。
b.prev=b.next=a;sounds.length=hits.length=0;
await processDamage(damageEvent(use,b));assert.deepEqual(hits.map(h=>h[0]),["b","a"]);
const positive=skills.fan_huohua.ai.effect.player_use(use.card,klee,b)[1];a.friend=true;
const negative=skills.fan_huohua.ai.effect.player_use(use.card,klee,b)[1];assert(positive>negative);
// 同一界面选牌价值与目标收益随最新状态重新计算，允许急救式高代价转移。
klee.skills=["fan_taopao"];klee.cards=[{physical:true,value:3}];a.friend=false;
use={name:"useCard",player:d,card:{name:"sha"},targets:[klee],triggeredTargets2:[klee]};
trigger={card:use.card,player:d,getParent:()=>use};choice={bool:false};
await compiledContent(skills.fan_taopao.content,{},trigger,klee);
const enemyScore=options.ai2(a);a.friend=true;const friendScore=options.ai2(a);assert(enemyScore>friendScore);
ui.selected.cards=[klee.cards[0]];ui.selected.targets=[a];assert(options.filterOk());
ui.selected.cards=[];assert(!options.filterOk(),"removing material disables confirmation");
assert.equal(skills.fan_huohua.locked,true);assert.equal(skills.fan_taopao.locked,false);
for(const key of ["add","remove","sortBySeat"]) delete Array.prototype[key];
console.log("PASS: Klee native content compilers (old snapshot ReferenceError reproduced), attached triggers, native damage/nocard and chain bodies, damage/chain splash order, death snapshot, seat order, one voice, redirect joint selection/cancel/payment, multi-target, nested use isolation, expiry and friend/enemy AI (simulation; no live game).");
