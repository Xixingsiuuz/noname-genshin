import assert from "node:assert/strict";
import loadedCharacters from '../character/character.js';
import { readFileSync, existsSync } from "node:fs";
import { createHash } from "node:crypto";
const read = path => readFileSync(new URL(path, import.meta.url), "utf8");
for (const [name, fn] of Object.entries({ add(item) { if (!this.includes(item)) this.push(item); }, addArray(items) { for(const item of items)this.add(item); }, removeArray(items) { for(const item of items)this.remove(item); }, remove(item) { const i=this.indexOf(item); if(i>=0)this.splice(i,1); }, randomGet() { return this[0]; }, randomRemove() { return this.shift(); } }))
  Object.defineProperty(Array.prototype, name, { value: fn, configurable: true });
let people = [], trace = [], played = [], enabled = true;
const lib = { skill: { global: [] }, config: { background_speak: true }, filter: {} };
const ui = { discardPile: { childNodes: [] }, cardPile: { childNodes: [] }, selected: { cards: [] }, clear() {} };
const _status = { skillaudio: [], event: null };
const get = {
  name: card => card.name, type2: card => card.type, cardNameLength: card => card.length,
  value: card => card.value ?? 5, owner: card => card.owner, position: card => card.pos,
  color: card => card.color, info: id => lib.skill[id], translation: x => x?.name || String(x),
  skillTranslation: x => x, prompt: id => id, is: { object: x => !!x && typeof x === "object" },
  event: () => _status.event,
};
const game = {
  hasPlayer(func, includeOut) { assert.equal(typeof func, "function"); return people.some(func); },
  expandSkills(list) { for (const id of [...list]) for (const child of [].concat(lib.skill[id]?.group || [])) list.add(child); },
  log() {}, logv() {}, stopCountChoose() {}, broadcastAll(fn, ...args) { fn(...args); },
  trySkillAudio(id) { if(lib.config.background_speak) played.push(id); },
  createEvent(name) { return new Event(name); }, delayx: async () => {},
};
assert.throws(() => game.hasPlayer()); assert.equal(game.hasPlayer(() => true), false);
const { skills, nextQiyunVoice, matchingCards } = new Function("lib", "game", "ui", "get", "_status", read("../character/skills/hutao.js")
  .replace(/^import .*;\r?\n/gm, "").replace(/export function/g, "function").replace("export default", "const skills =")
  + "\nreturn {skills,nextQiyunVoice,matchingCards};")(lib, game, ui, get, _status);
Object.assign(lib.skill, skills);
for (const [id, info] of Object.entries(skills)) for (const [sub, value] of Object.entries(info.subSkill || {})) lib.skill[id+"_"+sub]=value;
const nativeSource = read("../../../noname/library/element/content.js");
const Content = new Function("lib", "game", "ui", "get", "_status", "document", nativeSource
  .replace(/^import .*;\r?\n/gm, "").replace(/export\s*\{[\s\S]*?\};?\s*$/, "") + "\nreturn Content;")
  (lib, game, ui, get, _status, { getElementsByClassName: () => [] });
lib.element={content:Content};
const standard = read("../../../character/standard.js");
const nativeSkills = new Function("lib", "game", "ui", "get", "_status", standard.slice(standard.indexOf("const skills ="),standard.indexOf("const translates ="))+"return skills;")(lib,game,ui,get,_status);
Object.assign(lib.skill, { zhiheng: nativeSkills.zhiheng, qingnang: nativeSkills.qingnang });
const nativeLoopSource = read("../../../noname/library/element/gameEvent.js");
const nativeLoop = new Function("lib", "game", "_status", "return " + nativeLoopSource.slice(nativeLoopSource.indexOf("  async loop()"), nativeLoopSource.indexOf("  async checkSkipped()"))
  .replace("async loop()", "async function()").replaceAll("this.#inContent", "this.inContent"))(lib, game, _status);

// Native loop and native discard/loseToDiscardpile/useSkill bodies. Only DOM movement is modeled.
class Event {
  constructor(name) { Object.assign(this,{name,parent:_status.event,_triggered:0,finished:false,after:[],next:[],step:0,history:[]}); this.parent?.next?.push(this); }
  set(key,value) { this[key]=value; return this; }
  setContent(value) {
    const content=typeof value === "string" ? Content[value] : value;
    assert(content, String(value)); this.definition=content;
    this.content=async () => {
      const old=_status.event; _status.event=this;
      try {
        if(Array.isArray(content)) {
          const i=this.step; this.nextStep=i+1; await content[i](this,null,this.player);
          this.step=this.nextStep; if(this.step>=content.length)this.finish();
        } else { await content(this,null,this.player); this.finish(); }
      } finally { _status.event=old; }
    }; return this;
  }
  getParent(name) { let p=this.parent; if(!name)return p; while(p && p.name!==name)p=p.parent; return p || null; }
  finish() { this.finished=true; }
  goto(i) { this.nextStep=i; }
  redo() { this.nextStep=this.step; }
  checkSkipped() { return false; }
  async waitNext() { while(this.next.length)await this.next.shift().start(); }
  async trigger(name) {
    trace.push(name);
    // Resolve only skills actually held, including expanded groups, respecting temporary blocking.
    for(const owner of people) {
      const ids=[...owner.owned].filter(id=>owner.hasSkill(id)); game.expandSkills(ids);
      for(const id of ids) {
        const info=lib.skill[id]; if(!info?.trigger)continue;
        const matches=[].concat(info.trigger.global||[]).includes(name)
          || (this.player===owner && [].concat(info.trigger.player||[]).includes(name));
        if(matches && (!info.filter || info.filter(this,owner))) await info.content({},this,owner);
      }
    }
  }
  start() { return this.promise ||= nativeLoop.call(this); }
  then(resolve,reject) { return this.start().then(()=>resolve?.(),reject); }
  async forResult() { await this.start(); return this.result; }
}
Content.lose = async (event,trigger,player) => {
  event.cards2=event.cards.filter(card=>player.hand.includes(card));
  for(const card of event.cards2) { player.hand.remove(card); card.owner=null; card.pos="d"; }
  player.hist.lose.push(event);
};
Content.gain = async (event, trigger, player) => {
  if (typeof event.animate === "function") assert.equal(event.animate(event),null);
  for (const card of event.cards) {
    player.hand.push(card);card.owner=player;card.pos="h";ui.cardPile.childNodes.remove(card);ui.discardPile.childNodes.remove(card);
  }
};
function person(name, owned=[]) {
  return {
    name, playerid:name, owned:new Set(owned), storage:{}, hp:3,maxHp:6,hand:[],alive:true,
    hist:{custom:[],useCard:[],lose:[],useSkill:[]},stat:[{skill:{}}],draws:0,heals:0,
    hasSkill(id) { return this.owned.has(id) && (id!=="fan_wangsheng" || enabled); },
    isIn() { return this.alive; }, isDead() { return !this.alive; },isOut:()=>false,
    getSkills() { return [...this.owned]; }, getHistory(type,filter) { const list=this.hist[type] ||= []; return filter?list.filter(filter):list; },
    getDamagedHp() { return this.maxHp-this.hp; }, needsToDiscard:()=>0,
    checkShow() {}, trySkillAnimate() {}, line() {}, line2() {}, $throw() {}, addTempClass() {}, $gain2() {},
    logSkill(id, target, a, b, args) { game.trySkillAudio(id,this,true,true,null,args); },
    awakenSkill(id) { this.awakened=id; }, addSkill(id) { this.owned.add(id); },
    async recover(n=1) { this.hp=Math.min(this.maxHp,this.hp+n); this.heals+=n; },
    async draw(n=1) { this.draws+=n; }, getStat(key) { return key ? (this.stat.at(-1)[key] ||= {}) : this.stat.at(-1); },
    gain(card,animate) { const e=new Event("gain");Object.assign(e,{player:this,cards:[].concat(card),animate});return e.setContent("gain"); },
    lose(cards, position) { const e=new Event("lose"); Object.assign(e,{player:this,cards,position}); return e.setContent("lose"); },
    discard(cards) { const e=new Event("discard"); Object.assign(e,{player:this,cards}); return e.setContent("discard"); },
  };
}
const hutao=person("hutao",["fan_qiyun","fan_wangsheng","fan_youdie"]), user=person("user",["zhiheng","qingnang"]), ally=person("ally");
people=[hutao,user,ally];
get.Audio={skill:({skill})=>({fileList:[`ext:原神/audio/hutao/skill/${skill}.mp3`]})};
// Log and playback use the native parser/entry separately below; silence automatic main skill calls here.
game.trySkillAudio=(id,player,direct,nobroadcast,info,args)=>{if(lib.config.background_speak && id!=="fan_qiyun" && id!=="fan_wangsheng" && id!=="fan_youdie"){played.push(id);trace.push("audio:"+id);}};
for(const id of ["zhiheng","qingnang"]) {
  for(const active of [false,true]) {
    enabled=active; trace=[]; user.draws=0; ally.heals=0; ally.hp=2;
    const card={name:"shan",pos:"h",owner:user}; user.hand=[card];
    const e=new Event("useSkill"); Object.assign(e,{player:user,skill:id,cards:[card],targets:id==="qingnang"?[ally]:[] ,num:0});
    e.setContent("useSkill"); await e.start();
    assert.equal(card.pos,"d");
    assert.equal(user.hist.lose.at(-1).type, active?"loseToDiscardpile":"discard");
    assert.equal(id==="zhiheng"?user.draws:ally.heals,1,`${id} preserves its effect, active=${active}`);
    assert.equal(trace.includes("discardAfter"),!active);
    assert.equal(e.fan_wangsheng,undefined,"the useSkill parent is not interrupted");
  }
}
// Internal chooseToDiscard costs: exercise native final payment step, then the actual caller.
enabled=true;
async function chosenCost(parentName) {
  const parent={name:parentName}; const choice=new Event("chooseToDiscard"); choice.parent=parent;
  const card={name:"shan",owner:user,pos:"h"};user.hand=[card];
  Object.assign(choice,{player:user,result:{bool:true,cards:[card]}});
  _status.event=choice; await Content.chooseToDiscard.at(-1)(choice,null,user); _status.event=null;
  assert.equal(card.pos,"d"); assert.equal(choice.result.bool,true); return choice.result;
}
for(const id of ["fan_yinyou","fan_nichi"]) await chosenCost(id);
// Reuse the actual local modedDiscard factory and MOU Sun Quan's async skill content.
const nativePlayer=read("../../../noname/library/element/player.js");
const modStart=nativePlayer.indexOf("  modedDiscard(params) {");
const modEnd=nativePlayer.indexOf("\n  }",modStart)+4;
user.modedDiscard=new Function("lib","game","get","ui","_status","return "+nativePlayer.slice(modStart,modEnd).trim().replace("modedDiscard(","function("))(lib,game,get,ui,_status);
user.getModableSkills=()=>[];get.itemtype=()=>null;
user.countCards=zone=>zone==="h"?user.hand.length:0;
const sbSource=read("../../../character/sb.js");
const sbSkills=new Function("lib","game","get","ui","_status",sbSource.slice(sbSource.indexOf("const skills ="),sbSource.indexOf("const translates ="))+"return skills;")(lib,game,get,ui,_status);
for(const active of [false,true]) {
  enabled=active;user.hand=[{name:"shan",pos:"h",owner:user}];user.draws=0;
  const root=new Event("useSkill"),skill=new Event("sbzhiheng");skill.parent=root;
  skill.player=user;skill.cards=[...user.hand];
  const normalDraw=user.draw;user.draw=async options=>{user.draws+=typeof options==="object"?options.num:options;};
  _status.event=skill;await sbSkills.sbzhiheng.content(skill,null,user);_status.event=null;user.draw=normalDraw;
  assert.equal(user.draws,4,"MOU Zhiheng still draws its normal cards and area bonus");
  assert.equal(user.hist.lose.at(-1).type,active?"loseToDiscardpile":"discard");
  const payment=skill.next.find(e=>e.name===(active?"loseToDiscardpile":"discard"));
  assert.equal(payment.result.bool,true);assert.equal(payment.result.cards.length,1);
}
enabled=true;
// The native choices keep their successful results; actual callers continue normally.
const choice=result=>({set(){return this;},forResult:async()=>result});
const costChoice=id=>({set(){return this;},forResult:()=>chosenCost(id)});
const zibai=new Function("lib","game","get","ui","_status","setZibaiEyes",read("../character/skills/zibai.js")
  .replace(/^import .*;\r?\n/gm,"").replace("export default","return"))(lib,game,get,ui,_status,()=>{});
user.storage.fan_nichi_level=3;user.getStat("triggerSkill").fan_nichi=1;
user.chooseToDiscard=()=>costChoice("fan_nichi");user.getCards=()=>[];ally.getCards=()=>[];
let cancelled=0;const userDraws=user.draws,allyDraws=ally.draws;
await zibai.fan_nichi.content({}, {player:ally,cancel(){cancelled++;}},user);
assert.equal(cancelled,1,"level 3 Nichi still prevents damage");
assert.equal(user.draws,userDraws+1);assert.equal(ally.draws,allyDraws+1);
assert.equal(user.getStat("triggerSkill").fan_nichi,1);
const discardOther=new Event("discardPlayerCard");const otherCard={name:"shan",pos:"h",owner:user};user.hand=[otherCard];
Object.assign(discardOther,{player:ally,target:user,cards:[otherCard],result:{bool:true,cards:[otherCard]}});
discardOther.setContent(async e=>{await Content.discardPlayerCard.at(-1)(e,null,ally);});await discardOther.start();
assert.equal(discardOther.result.bool,true,"discardPlayerCard preserves its successful selection result");
assert.equal(otherCard.pos,"d");
// Mingshen has an explicit async material loss, which must not suppress its draw/charge.
lib.filter.cardDiscardable=()=>true;user.getCards=()=>user.hand;
const yae=new Function("lib","game","get","ui","_status",read("../character/skills/yaemiko.js")
  .replace(/^import .*;\r?\n/gm,"").replace("export default","return"))(lib,game,get,ui,_status);
const blackCards=[{name:"shan",color:"black",pos:"h",owner:user},{name:"shan",color:"black",pos:"h",owner:user}];
user.hand=[...blackCards];ally.addCharge=n=>{ally.charge=(ally.charge||0)+n;};const beforeDraw=ally.draws;
const mingshen=new Event("fan_mingshen");_status.event=mingshen;
await yae.fan_mingshen.content({cards:blackCards,target:ally},{},user);_status.event=null;
assert.equal(user.hand.length,0);assert.equal(ally.draws,beforeDraw+2);assert.equal(ally.charge,3);
// The replacement also applies to Hu Tao's own discard.
const selfCard={name:"shan",owner:hutao,pos:"h"};hutao.hand=[selfCard];await hutao.discard([selfCard]);
assert.equal(hutao.hist.lose.at(-1).type,"loseToDiscardpile");assert.equal(selfCard.pos,"d");
// Direct and bulk losses also lose the discard nature; unrelated use-card ordering cleanup is unchanged.
const bulk={name:"loseAsync",type:"discard"};
const lost=user.lose([{name:"shan",pos:"h",owner:user}],ui.discardPile); user.hand=[...lost.cards]; lost.type="discard";lost.parent=bulk;await lost.start();
assert.equal(lost.type,"loseToDiscardpile");assert.equal(bulk.type,"loseToDiscardpile");
const ordering=user.lose([],ui.discardPile);ordering.type="use";assert(!skills.fan_wangsheng.filter(ordering));
assert(!skills.fan_wangsheng.filter({name:"discard",cards:[{}],position:ui.cardPile}));
enabled=false;const plain=user.discard([]);assert.equal(plain.name,"discard");enabled=true;
// Native discard-dependent effects see the new nature; ordinary loss snapshots still exist.
const qinyinSource=read("../../../character/extra.js").split("  qinyin: {")[1];
const qinyinBody=qinyinSource.match(/    filter\(event, player\) \{([\s\S]*?)\n    \}/)[1];
const qinyinFilter=new Function("return function(event,player){"+qinyinBody+"}")();
const luoyingSource=read("../../../character/refresh.js").split("  reluoying: {")[1];
const luoyingBody=luoyingSource.match(/        filter\(event, player\) \{([\s\S]*?)\n        \}/)[1];
get.suit=card=>card.suit;
const luoyingFilter=new Function("get","return function(event,player){"+luoyingBody+"}")(get);
for(const active of [false,true]) {
  enabled=active;const phase={name:"phaseDiscard",player:user};
  const cards=[{name:"shan",suit:"club",owner:user,pos:"h"},{name:"sha",suit:"club",owner:user,pos:"h"}];
  user.hand=[...cards];const e=user.discard(cards);e.parent=phase;await e.start();
  const loss=user.hist.lose.at(-1);loss.getl=()=>({cards:[]});
  assert.equal(qinyinFilter(phase,user),!active,"Qinyin counts only actual discard history");
  assert.equal(luoyingFilter(loss,ally),!active,"Luoying discard branch rejects replaced loss");
  assert.equal(loss.cards2.length,2,"hand loss remains recorded for loss-based skills");
}
enabled=true;
// Navia only responds to discarded cards (compare-card cleanup remains eligible).
const navia=new Function("lib","get",read("../character/skills/navia.js").replace(/^import .*;\r?\n/gm,"").replace("export default","return"))(lib,get);
assert.equal(navia.fan_xianjing.filter(lost,{hasUseTarget:()=>true}),false);
// Dynamic Qiyun quota, real pile candidates, name history, phase boundary, no payment on stale state.
const phase={name:"phaseUse",player:hutao};
const use={card:{name:"sha",type:"basic",length:1},player:hutao,getParent:()=>phase};
const shan={name:"shan",type:"basic",length:1}, tao={name:"tao",type:"basic",length:1}, wrong={name:"duel",type:"trick",length:2};
// Both piles contribute to one uniformly sampled physical-card pool, without priority.
const discardOwner=person("discardHuTao",["fan_qiyun"]),discardPhase={name:"phaseUse",player:discardOwner};
const discardUse={...use,player:discardOwner,getParent:()=>discardPhase};discardOwner.hist.useCard=[discardUse];
const discardedShan={...shan,pos:"d"},discardedSha={...use.card,pos:"d"},discardedWrong={...wrong,pos:"d"};
ui.cardPile.childNodes=[tao];ui.discardPile.childNodes=[discardedShan,discardedSha,discardedWrong];
assert.deepEqual(matchingCards(discardOwner,discardUse),[tao,discardedShan]);
_status.event={getParent:()=>discardPhase};tao.value=5;discardedShan.value=-5;
assert.equal(skills.fan_qiyun.ai.effect.player(use.card,discardOwner)[1],0,"AI averages candidates from both piles");_status.event=null;
ui.cardPile.childNodes=[];assert(skills.fan_qiyun.filter(discardUse,discardOwner));
await skills.fan_qiyun.content({},discardUse,discardOwner);
assert(discardOwner.hand.includes(discardedShan));assert(!ui.discardPile.childNodes.includes(discardedShan));
assert(!skills.fan_qiyun.filter(discardUse,discardOwner),"wrong type and already used name are excluded from discard pile too");
const countBeforeStale=discardOwner.hist.custom.length;ui.discardPile.childNodes=[{...shan}];
assert(skills.fan_qiyun.filter(discardUse,discardOwner));ui.discardPile.childNodes=[];
await skills.fan_qiyun.content({},discardUse,discardOwner);
assert.equal(discardOwner.hist.custom.length,countBeforeStale,"removed candidate does not consume quota");
hutao.hist.useCard=[use];ui.cardPile.childNodes=[shan,tao,wrong];
assert(skills.fan_qiyun.filter(use,hutao));trace=[];await skills.fan_qiyun.content({},use,hutao);assert(hutao.hand.includes(shan));
assert(trace.indexOf("audio:fan_qiyun_intro")<trace.indexOf("gainBefore"),"voice starts immediately after committed confirmation, before gain animation");
assert.equal(played.at(-1),"fan_qiyun_intro");hutao.hp=5;assert(!skills.fan_qiyun.filter(use,hutao));
hutao.hp=3;hutao.hist.useCard.push({card:tao});assert(!skills.fan_qiyun.filter(use,hutao));
hutao.hist.useCard=[use];assert(skills.fan_qiyun.filter(use,hutao));
const before=hutao.hist.custom.length;hutao.hp=6;await skills.fan_qiyun.content({},use,hutao);assert.equal(hutao.hist.custom.length,before);
hutao.hp=3;assert.equal(skills.fan_qiyun.forced,true);assert.equal(skills.fan_qiyun.locked,false);
assert.equal(skills.fan_qiyun.check,undefined);assert.equal(skills.fan_qiyun.prompt,undefined);
_status.event={getParent:()=>phase};
assert(skills.fan_qiyun.ai.effect.player(use.card,hutao)[1]>0);
tao.value=-5;assert(skills.fan_qiyun.ai.effect.player(use.card,hutao)[1]<0);
assert(skills.fan_qiyun.filter(use,hutao),"bad acquisition value cannot disable mandatory rules");
tao.value=5;_status.event=null;
const isSource=read("../../../noname/get/is.js");
const lockedStart=isSource.indexOf("  locked(skill, player) {");
const lockedEnd=isSource.indexOf("\n  }",lockedStart)+4;
const nativeLocked=new Function("lib","return "+isSource.slice(lockedStart,lockedEnd).trim().replace("locked(","function("))(lib);
assert.equal(nativeLocked("fan_qiyun",hutao),false,"native engine must not infer locked from forced");
// Dispatch from an actual held skill; no optional activation check or dialog exists.
const autoOwner=person("autoHuTao",["fan_qiyun"]),autoPhase={name:"phaseUse",player:autoOwner};
const autoUse=new Event("useCard");Object.assign(autoUse,{player:autoOwner,parent:autoPhase,card:use.card});
autoOwner.hist.useCard=[autoUse];const badCard={...tao,value:-5};ui.cardPile.childNodes=[badCard];
people.push(autoOwner);autoUse.setContent(async e=>{await e.trigger("useCard");});await autoUse.start();people.remove(autoOwner);
assert(autoOwner.hand.includes(badCard),"mandatory gain occurs even when AI values the result negatively");
// Intro is once per game, across phase/turn history resets and skill loss/reacquisition.
assert.equal(nextQiyunVoice(hutao,()=>"fan_qiyun_sun"),"fan_qiyun_sun");
hutao.hist.custom=[];
assert.equal(nextQiyunVoice(hutao,list=>{assert(list.includes("fan_qiyun_ningguang"));return "fan_qiyun_ningguang";}),"fan_qiyun_ningguang");
hutao.owned.delete("fan_qiyun");hutao.owned.add("fan_qiyun");
assert.equal(nextQiyunVoice(hutao,()=>"fan_qiyun_sun"),"fan_qiyun_sun");
const freshHuTao=person("fresh",["fan_qiyun"]);
assert.equal(nextQiyunVoice(freshHuTao),"fan_qiyun_intro");
assert.notEqual(nextQiyunVoice(freshHuTao),"fan_qiyun_intro");
// There is no skill exclusion or replacement of an AI choice callback in this version.
assert.equal(lib.skill.fan_wangsheng_ai,undefined);
assert.deepEqual(skills.fan_wangsheng.group,["fan_wangsheng_voice"]);
assert.equal(yae.fan_mingshen.ai.order,5);assert.equal(yae.fan_mingshen.ai.result.target,1);
// Limited recovery, repeated dying rejection, red/black/indirect damage and temporary skill blocking.
hutao.hp=-2;assert(skills.fan_youdie.filter({},hutao));await skills.fan_youdie.content({}, {},hutao);assert.equal(hutao.hp,1);
hutao.hp=0;assert(!skills.fan_youdie.filter({},hutao));await skills.fan_youdie.content({}, {},hutao);assert.equal(hutao.hp,0);
const red={color:"red"}, redUse={player:hutao,card:red};const damage={num:1,card:red,getParent:()=>redUse};
assert(skills.fan_youdie_damage.filter(damage,hutao));await skills.fan_youdie_damage.content({},damage);assert.equal(damage.num,2);
assert(!skills.fan_youdie_damage.filter({...damage,card:{color:"black"}},hutao));
assert(!skills.fan_youdie_damage.filter({...damage,getParent:()=>({player:user,card:red})},hutao));
assert.equal(skills.fan_youdie_damage.locked,false);assert.equal(skills.fan_wangsheng.locked,true);
// Asset and skin configuration references resolve; exact source bytes are retained separately.
const characters=loadedCharacters;
assert.deepEqual(characters.fan_hutao.slice(0,4),["female","shu","3/6/1",["fan_qiyun","fan_wangsheng","fan_youdie"]]);
assert(characters.fan_hutao[4].includes("skinPath:ext:原神/image/skin/fan_hutao/"));
for(const file of ["image/skin/fan_hutao/1.png","image/skin/fan_hutao/2.png","image/character/portraits/hutao-select.png"])
 assert(existsSync(new URL("../"+file,import.meta.url)));
// Actual Audio parser, native logSkill, trySkillAudio, tryAudio and playAudio, with DOM/audio devices modeled.
lib.translate=new Function(read("../character/voices.js").replace("export default","return"))();
lib.assetURL="";lib.path={extname:path=>path.endsWith(".mp3")?".mp3":""};lib.config.volumn_audio=8;
get.character=()=>({tempname:[]});get.objtype=value=>value && typeof value==="object"?"object":"";
get.itemtype=value=>value?.storage?"player":null;
const Audio=new Function("get","lib",read("../../../noname/get/audio.js").replace(/^import .*;\r?\n/gm,"")
  .replace(/export\s*\{[\s\S]*?\};?\s*$/,"")+"\nreturn Audio;")(get,lib);get.Audio=Audio;
const nodes=[];ui.window={appendChild(audio){nodes.push(audio);audio.onplay?.({});}};
const doc={createElement(name){assert.equal(name,"audio");return {remove(){},play:async()=>{}};}};
game.broadcast=()=>{};game.addVideo=()=>{};
const nativeGame=read("../../../noname/game/index.js");
for(const method of ["playAudio","tryAudio","trySkillAudio","tryDieAudio"]) {
  const start=nativeGame.indexOf("  "+method+"(");const end=nativeGame.indexOf("\n  }",start)+4;
  const body=nativeGame.slice(start,end).trim().replace(method+"(","function(");
  game[method]=new Function("game","lib","get","ui","_status","document","setTimeout","return "+body)(game,lib,get,ui,_status,doc,()=>{});
}
const playerSource=read("../../../noname/library/element/player.js");
const logStart=playerSource.indexOf("  logSkill(name2, targets, nature, logv, args) {");
const logEnd=playerSource.indexOf("\n  }",logStart)+4;
hutao.logSkill=new Function("lib","game","get","_status","return "+playerSource.slice(logStart,logEnd).trim().replace("logSkill(","function("))(lib,game,get,_status);
_status.event=new Event("testAudio");
const silentBefore=nodes.length;
for(const id of ["fan_qiyun","fan_wangsheng","fan_youdie"])hutao.logSkill(id,null,null,null,[]);
await Promise.resolve();assert.equal(nodes.length,silentBefore,"native main skill logs cannot play branch audio");
// Start a fresh-game fixture for the native playback assertions.
delete hutao.storage.fan_qiyun_intro_played;
hutao.hp=3;hutao.hist.custom=[];hutao.hist.useCard=[use];ui.cardPile.childNodes=[{...shan},{...tao}];
await skills.fan_qiyun.content({},use,hutao);await Promise.resolve();
assert.equal(nodes.length,silentBefore+1);assert(nodes.at(-1).src.endsWith("fan_qiyun_intro.mp3"));
hutao.hist.custom=[];ui.cardPile.childNodes=[{...shan}];
await skills.fan_qiyun.content({},use,hutao);await Promise.resolve();
assert.equal(nodes.length,silentBefore+2);assert(nodes.at(-1).src.endsWith("fan_qiyun_sun.mp3"));
hutao.hist.custom=[];ui.cardPile.childNodes=[{...shan}];
await skills.fan_qiyun.content({},use,hutao);await Promise.resolve();
assert.equal(nodes.length,silentBefore+3,"Qiyun can overlap the exact same random playback file");
assert(nodes.at(-1).src.endsWith("fan_qiyun_sun.mp3"));
assert.equal(nodes.filter(node=>node.src.endsWith("fan_qiyun_intro.mp3")).length,1);
const countBefore=nodes.length;
const loss={cards2:[{}],fan_wangsheng:true,player:user,getParent:()=>null};
assert(lib.skill.fan_wangsheng_voice.filter(loss,hutao));await lib.skill.fan_wangsheng_voice.content({},loss,hutao);await Promise.resolve();
assert.equal(nodes.length,countBefore+1);assert(!lib.skill.fan_wangsheng_voice.filter(loss,hutao));
for(const n of [2,4]) {
  const moved={...loss,cards:Array.from({length:n},()=>({})),cards2:[]};
  assert(lib.skill.fan_wangsheng_voice.filter(moved,hutao));await lib.skill.fan_wangsheng_voice.content({},moved,hutao);await Promise.resolve();
  assert(nodes.at(-1).src.endsWith(`fan_wangsheng_customer${Math.min(3,n)}.mp3`));
  assert(!lib.skill.fan_wangsheng_voice.filter(moved,hutao));
}
assert.equal(Audio.skill({skill:"fan_youdie_burst",player:hutao}).fileList.length,3);
const deathInfo=characters.fan_hutao[4].find(tag=>tag.startsWith("die:")).slice(4);
const deathAudio=Audio.die({player:"fan_hutao",info:deathInfo});
assert.deepEqual(deathAudio.fileList,[1,2,3].map(n=>`ext:原神/audio/hutao/die/fan_hutao${n}.mp3`));
assert.equal(deathAudio.textList.length,3);
get.character=name=>({tempname:[],...(name==="fan_hutao"?{dieAudios:[deathInfo]}:{})});
const beforeDeath=nodes.length;game.tryDieAudio("fan_hutao");await Promise.resolve();
assert.equal(nodes.length,beforeDeath+1,"native death playback chooses exactly one entry");
assert(nodes.at(-1).src.endsWith("/die/fan_hutao1.mp3"));
const beforeMuted=nodes.length;lib.config.background_speak=false;hutao.hist.custom=[];ui.cardPile.childNodes=[{...shan}];
await skills.fan_qiyun.content({},use,hutao);await Promise.resolve();assert.equal(nodes.length,beforeMuted);
game.tryDieAudio("fan_hutao");await Promise.resolve();assert.equal(nodes.length,beforeMuted,"death playback respects the voice switch");
const manifest=JSON.parse(read("../audio/hutao/originals/hutao-sources.json"));
for(const clip of Object.values(manifest.clips)) {
  assert(clip.volume.after.true_peak_dbtp<=-1);
  const data=readFileSync(new URL("../"+clip.original,import.meta.url));assert.equal(data.length,clip.bytes);
  assert.equal(createHash("sha256").update(data).digest("hex"),clip.original_sha256);
}
console.log("PASS: Hu Tao native event loop/useSkill/discard nature replacement with preserved effects; Qiyun dynamic quota/pool/AI/voice order; Youdie limited recovery/red damage; assets (simulation, no live game).");
