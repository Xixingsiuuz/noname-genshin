import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { installCrownPath, evaluateCrownPath } from "../../../mode/identity-crown-path.js";
const nativeModeSource=readFileSync(new URL('../../../mode/identity.js',import.meta.url),'utf8');
const nativeRuleSource=readFileSync(new URL('../../../mode/identity-crown-path.js',import.meta.url),'utf8');
const extensionSource=readFileSync(new URL('../extension.js',import.meta.url),'utf8');
assert.ok(nativeModeSource.includes('installCrownPath(lib, game, ui, get, _status)'));
assert.equal(nativeRuleSource.includes('extension/'),false,'native rules cannot depend on an extension path');
assert.equal(extensionSource.includes('installCrownPath'),false,'extension must not install a second copy');
const candidate = {hp:4,countCards:()=>4};
const healthyLord = {hp:4,isIn:()=>true};
assert.equal(evaluateCrownPath(candidate,healthyLord,null,1,false),null);
assert.equal(evaluateCrownPath(candidate,healthyLord,null,1,true),"wild");
assert.equal(evaluateCrownPath(candidate,healthyLord,null,2,false),"wild");
candidate.hp=2;
assert.equal(evaluateCrownPath(candidate,healthyLord,null,1,false),"wild");
candidate.hp=1;candidate.countCards=()=>1;
assert.equal(evaluateCrownPath(candidate,{hp:1,isIn:()=>true},candidate,1,false),"loyal");
assert.equal(evaluateCrownPath(candidate,healthyLord,candidate,1,false),"wild");
assert.equal(evaluateCrownPath(candidate,{hp:1,isIn:()=>true},null,1,false),"wild");
const lib = { mode:{identity:{config:{}}}, skill:{}, translate:{}, arenaReady:[], onphase:[], config:{mode:"identity"}, filter:{cardDiscardable:()=>true} };
const status = {mode:"normal"};
const calls = [];
function player(identity) {
  return { identity, storage:{}, ai:{}, node:{identity:{firstChild:{textContent:''},classList:{remove(){}}}},
    isIn(){return !this.dead;}, isAlive(){return !this.dead;}, setIdentity(id){this.display=id;},
    $fullscreenpop(text,nature){calls.push(["subtitle",text,nature]);},
    $dieAfter(){this.node.dieidentity={innerHTML:this.identity};},
    addSkill(s){calls.push(s);}, async addSkills(s){calls.push(...s);},
    getStockSkills(){return ["lordSkill"];}, hasSkill(){return false;},
    countCards(zone){return this.cards?.[zone]?.length || 0;}, getCards(zone){calls.push(["zone",zone]);return this.cards?.[zone] || [];},
    async modedDiscard(cards){calls.push(["discard",cards]);},
    async gainPlayerCard(target, zone, n){calls.push(["gain",zone,n]);},
    async gainMaxHp(n){calls.push(["max",n]);}, async recover(n){calls.push(["recover",n]);},
    async loseHp(n){calls.push(["lose",n]);}, draw(n){calls.push(["draw",n]);},
    dieAfter(){calls.push("nativeDeath");}, dieAfter2(){calls.push("nativeReward");},
  };
}
const lord=player("zhu"), heir=player("zhong"), killer=player("nei");
const game={players:[lord,heir,killer], zhu:lord, addGlobalSkill(id){assert.ok(lib.skill[id]);calls.push(id);}};
const get={config:key=>key==="fan_crown_path",info:()=>({zhuSkill:true})};
const nodes=[];
function makeNode(){const n={style:{},children:[],handlers:{},classList:{contains:()=>false},offsetWidth:80,offsetHeight:30,
  setAttribute(){},addEventListener(type,fn){this.handlers[type]=fn;},replaceChildren(){this.children=[];},remove(){},
  getBoundingClientRect(){return {top:400,height:600};}};nodes.push(n);return n;}
const ui={updatec(){},arena:makeNode(),control:makeNode(),create:{div(selector,text,parent){
  if(typeof text!=='string'){parent=text;text='';}const node=makeNode();node.textContent=text;parent?.children.push(node);return node;
}}};
const nativeInterval=globalThis.setInterval;
globalThis.setInterval=()=>0;
installCrownPath(lib,game,ui,get,status);
assert.equal(lib.mode.identity.config.fan_crown_path.name,"储君&野心家");
assert.equal(status.fanCrownActive,undefined);
assert.equal(lib.arenaReady.length,0,"native mode registers directly, without extension arenaReady");
assert.ok(calls.includes("fan_crown_bootstrap"));
// Run the local engine's actual async/array compiler methods. Directly calling
// content would miss the StepCompiler closure loss seen in the game.
const compilerRoot = new URL("../../../noname/library/element/GameEvent/compilers/", import.meta.url);
function loadCompiler(file, names, values, className) {
  const source = readFileSync(new URL(file, compilerRoot), "utf8")
    .replace(/^import .*;\r?\n/gm, "").replace(/export\s*\{[\s\S]*?\};?\s*$/, "");
  return new Function(...names, source + `\nreturn ${className};`)(...values);
}
const Base = loadCompiler("ContentCompilerBase.js", ["game","_status"], [game,status], "ContentCompilerBase");
const ArrayCompiler = loadCompiler("ArrayCompiler.js", ["ContentCompilerBase"], [Base], "ArrayCompiler");
const arrayCompiler = new ArrayCompiler();
const AsyncFunction = (async function(){}).constructor;
const AsyncCompiler = loadCompiler("AsyncCompiler.js", ["AsyncFunction","compiler","ContentCompilerBase"],
  [AsyncFunction,{compile: content => arrayCompiler.compile(content)},Base], "AsyncCompiler");
const asyncCompiler = new AsyncCompiler();
for (const [id,skill] of Object.entries(lib.skill)) {
  if (skill.content) assert.equal(asyncCompiler.filter(skill.content),true,`${id} must preserve its closure`);
}
const bootstrap = lib.skill.fan_crown_bootstrap.content;
assert.equal(asyncCompiler.filter(function content() {}),false,"ordinary functions must not pass async dispatch");
await asyncCompiler.compile(bootstrap)({
  _step:0, _nextStep:null,
  get step(){return this._step;}, set step(value){this._nextStep=value;},
  finished:false, finish(){this.finished=true;},
  getDefaultHandlerType(){return "test";},callHandler(){},
  updateStep(){if(this._nextStep!==null){this._step=this._nextStep;this._nextStep=null;}},
  async waitNext(){},clearStepCache(){},
});
globalThis.setInterval=nativeInterval;
assert.equal(status.fanCrownActive,true);
game.me=killer;status.currentPhase=lord;
game.players.push(player('fan'),player('fan'));
const row=nodes.find(n=>n.style.display==='none' && n.children.length===1);
assert.ok(row,'independent hand-area controls created');
let stopped=0;
row.children[0].handlers.click({stopPropagation(){stopped++;}});
assert.deepEqual(row.children.map(n=>n.textContent),['侍奉明主','自立','取消']);
row.children[2].handlers.click({stopPropagation(){stopped++;}});
assert.equal(killer.storage.fan_zetu_used,undefined,'cancel leaves path unused during pending response');
assert.equal(stopped,2);
// A paused chooseToUse must not prevent immediate identity/skill publication.
const queued=[];
game.checkResult=()=>{};
game.createEvent=name=>({setContent(fn){queued.push(fn);}});
status.currentPhase=killer;
let resumed=0,unchecked=0;
game.resume=()=>{resumed++;status.paused=false;};game.uncheck=()=>{unchecked++;};
status.paused=true;
status.event={name:'chooseToUse',type:'phase',player:killer,
  getParent:()=>({name:'phaseUse'}),finish(){this.finished=true;}};
const click=()=>({stopPropagation(){}});
row.children[0].handlers.click(click());
row.children[1].handlers.click(click());
assert.equal(killer.storage.fan_yexinjia,true);
assert.equal(killer.node.identity.firstChild.textContent,'野');
assert.ok(calls.includes('fan_crown_bahu'));
assert.equal(queued.length,1,'reward queued without resuming pending response');
assert.equal(resumed,1,'idle phase choice resumes immediately to process reward');
assert.equal(unchecked,1);
assert.equal(status.event.finished,true);
assert.equal(status.event.result.bool,true,'phaseUse must reopen selection instead of ending phase');
assert.equal(status.event.result.cards,undefined,'refresh does not use cards');
assert.equal(killer.storage.fan_zetu_pending.immediateApplied,true);
delete killer.storage.fan_yexinjia;delete killer.storage.fan_zetu_used;delete killer.storage.fan_zetu_pending;
status.currentPhase=lord;
row.children[0].handlers.click(click());
row.children[1].handlers.click(click());
assert.equal(killer.storage.fan_yexinjia,undefined,'other player turn remains deferred');
assert.equal(killer.storage.fan_zetu_pending.turn,lord);
delete killer.storage.fan_zetu_used;delete killer.storage.fan_zetu_pending;
delete status.event;
game.players.splice(3);delete game.me;
game.roundNumber=1;
assert.equal(lib.skill.fan_lichu.filter({},lord),true);
assert.equal(lib.skill.fan_lichu_end.filter({player:heir},lord),true);
assert.equal(lib.skill.fan_lichu_end.filter({player:lord},lord),false);
for (const round of [0,2,3]) {
  game.roundNumber=round;
  assert.equal(lib.skill.fan_lichu.filter({},lord),false);
  assert.equal(lib.skill.fan_lichu_end.filter({player:heir},lord),false);
}
game.roundNumber=1;
status.fanCrownAppointed=true;
assert.equal(lib.skill.fan_lichu.filter({},lord),false);
assert.equal(lib.skill.fan_lichu_end.filter({player:heir},lord),false);
assert.equal(lib.skill.fan_crown_rule.trigger.global.includes("phaseJieshuBegin"),false);
assert.equal(lib.skill.fan_crown_rule.silent,true);
assert.equal(lib.skill.fan_crown_rule.filter({player:lord},lord,"phaseAfter"),false);
status.fanCrownHeir=heir; lord.dead=true;
heir.$dieAfter();
assert.equal(heir.node.dieidentity.innerHTML,"储君");
assert.equal(heir.identity,"zhong");
assert.equal(calls.some(c=>Array.isArray(c)&&c[0]==="subtitle"&&c[1].includes('储君')),false,"heir death has no subtitle");
lord.cards={hej:[1,2,3]};heir.cards={he:[4]};
await lord.dieAfter(heir);
assert.ok(calls.some(c=>Array.isArray(c)&&c[0]==="subtitle"&&c[1]==="储君夺位"&&c[2]==="fire"));
assert.equal(game.zhu,heir);
assert.equal(lord.identity,"zhong");
assert.equal(heir.identity,"zhu");
assert.deepEqual(calls.find(c=>Array.isArray(c)&&c[0]==="gain"),["gain","hej",2]);
assert.ok(calls.find(c=>Array.isArray(c)&&c[0]==="zone"&&c[1]==="he"));
assert.ok(calls.indexOf("lordSkill")<calls.indexOf("nativeDeath"));
assert.equal(calls.filter(c=>Array.isArray(c)&&c[0]==="max").length,1);
killer.storage.fan_yexinjia=true;
calls.length=0;
lord.dieAfter2(killer);
assert.deepEqual(calls,[["draw",3]]);
killer.setIdentity("nei");assert.equal(killer.display,"fan_yexinjia");
assert.equal(killer.node.identity.firstChild.textContent,"野");
assert.equal(lib.translate.fan_yexinjia2,"野心家");
game.zhu=lord; lord.identity="zhu"; heir.identity="zhong";
calls.length=0;
await lord.dieAfter(killer);
assert.ok(calls.some(c=>Array.isArray(c)&&c[0]==="subtitle"&&c[1]==="储君继位"&&c[2]==="metal"));
assert.equal(calls.some(c=>Array.isArray(c)&&c[0]==="discard"),false);
console.log("crown-path: bootstrap, compulsory succession, native discard zones, lord skills and non-stacking rewards passed (simulation)");
