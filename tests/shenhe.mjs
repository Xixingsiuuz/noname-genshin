import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
const game = { players: [], dead: [], roundNumber: 1,
  filterPlayer(fn = () => true) { return this.players.filter(p => p.isIn() && fn(p)); },
};
// 复用本地1.11.6方法体：func为必填，测试不得额外提供默认回调掩盖漏参。
const engineSource = readFileSync(new URL("../../../noname/game/index.js", import.meta.url), "utf8");
const nativeHasPlayer = engineSource.match(/  hasPlayer\(func, includeOut\) \{([\s\S]*?)\n  \}/);
assert.ok(nativeHasPlayer, "local hasPlayer implementation must be found");
game.hasPlayer = new Function("game", `return function(func, includeOut) {${nativeHasPlayer[1]}\n}`)(game);
Array.prototype.sortBySeat = function () { return this.sort((a, b) => game.players.indexOf(a) - game.players.indexOf(b)); };
const ui = { selected: { targets: [] } }, status = { event: {} };
const get = { name: c => c.name, color: c => c.color || "none", tag: (c, tag) => tag === "damage" && c.name === "sha", attitude: () => 5, value: () => 5 };
const source = readFileSync(new URL("../character/skills/shenhe.js", import.meta.url), "utf8")
  .replace(/^import .*;\r?\n/gm, "").replace(/export const /g, "const ").replace(/export function /g, "function ").replace("export default", "const skills =");
const { skills, curseCount, fieldCurses, canLingwei, changeCurse, lingweiUses } = new Function("game", "get", "ui", "_status", source + ";return {skills,curseCount,fieldCurses,canLingwei,changeCurse,lingweiUses};")(game, get, ui, status);
function player(id, names = []) {
  const p = { playerid: id, storage: {}, skills: new Set(), cards: names.map(name => ({ name })), alive: true,
    isIn() { return this.alive; }, isOut() { return !this.alive; }, addSkill(id) { this.skills.add(id); }, removeSkill(id) { this.skills.delete(id); },
    markSkill() {}, unmarkSkill() {}, syncStorage() {},
    countCards(zone, filter = () => true) { return this.cards.filter(filter).length; },
    getStat() { return this.stat ||= { sha: 1 }; },
  };
  game.players.push(p); return p;
}
const shenhe = player("shenhe"), ally = player("ally", ["sha"]), enemy = player("enemy");
const lingweiBackup = nature => skills.fan_lingwei.chooseButton.backup([["基本", "", "sha", nature]], shenhe);
assert.throws(() => game.hasPlayer(), TypeError, "the previous missing callback must fail under the actual local API");
assert.equal(game.hasPlayer(p => p.isIn()), true);
// 从本地原生 filterEnable 展开实际技能按钮，覆盖函数式 viewAs 不会被原生自动过滤的分支。
const filterSource = readFileSync(new URL("../../../noname/library/index.js", import.meta.url), "utf8");
const nativeFilterEnable = filterSource.match(/    filterEnable\(event, player, skill\) \{([\s\S]*?)\n    \},/);
assert.ok(nativeFilterEnable);
const lib = { skill: { ...skills, global: [] } };
get.info = id => skills[id];
game.expandSkills = ids => ids;
shenhe.getSkills = () => ["fan_lingwei"];
const filterEnable = new Function("game", "get", "lib", "_status", `return function(event,player,skill) {${nativeFilterEnable[1]}\n}`)(game,get,lib,status);
const need = (name, response) => ({ name:response?"chooseToRespond":"chooseToUse", filterCard:card=>card.name===name });
assert.equal(filterEnable(need("shan",true),shenhe,"fan_lingwei"),false,"Sha response needs Shan, never show Lingwei");
assert.equal(filterEnable(need("sha",true),shenhe,"fan_lingwei"),true,"Duel and Nanman responses may use Lingwei");
assert.equal(filterEnable(need("tao",false),shenhe,"fan_lingwei"),false,"dying rescue does not permit Sha");
assert.equal(filterEnable(need("wuxie",false),shenhe,"fan_lingwei"),false);
const exhausted = { name:"chooseToUse", filterCard:card=>card.name==="sha" && skills.fan_lingwei.mod.cardUsable(card,shenhe)===Infinity };
assert.equal(filterEnable(exhausted,shenhe,"fan_lingwei"),true,"no marks: free Sha still available after normal quota exhausted");
assert.equal(skills.fan_lingwei.filter({},shenhe),false);
assert.equal(lingweiUses(shenhe),0,"filter checks and cancelled menus never spend round uses");
for (const nature of [undefined,"fire","thunder"]) {
  const card=lingweiBackup(nature).viewAs;
  assert.equal(card.nature,nature);
  assert.equal(card.storage.fan_lingwei_free,true);
  const context={name:"chooseToRespond",filterCard:c=>c.name==="sha"&&c.nature===nature};
  status.event={getParent:()=>context};
  assert.equal(skills.fan_lingwei.filter(context,shenhe),true);
  assert.equal(skills.fan_lingwei.chooseButton.filter({link:["基本","","sha",nature]},shenhe),true);
  for (const rejected of [undefined,"fire","thunder"].filter(n=>n!==nature)) {
    assert.equal(skills.fan_lingwei.chooseButton.filter({link:["基本","","sha",rejected]},shenhe),false);
  }
}
assert.equal(lingweiUses(shenhe),0,"nature selection alone is not a committed use");
status.event={};
assert.equal(skills.fan_lingwei.direct,true,"click skill opens nature chooser directly");
const hookSource=readFileSync(new URL("../../../noname/library/hooks/index.js",import.meta.url),"utf8");
const autoConfirmSource=hookSource.match(/function autoConfirm\(event, \{ ok, auto, autoConfirm \}\) \{([\s\S]*?)\n    \},/);
assert.ok(autoConfirmSource);
const nativeAutoConfirm=new Function("game","get","ui","_status",`return function(event,{ok,auto,autoConfirm}) {${autoConfirmSource[1]}\n}`)(game,get,ui,status);
let submitted=0;
ui.click={ok(){submitted++}};
const pending={skill:"fan_lingwei_backup",isMine:()=>true,skillDialog:true};
status.event={name:"chooseToRespond"};
skills.fan_lingwei_backup=lingweiBackup("thunder");
assert.equal(skills.fan_lingwei_backup.direct,false);
nativeAutoConfirm(pending,{ok:true,auto:true,autoConfirm:false});
assert.equal(submitted,0,"do not submit synchronously before native chooseToRespond pauses");
assert.equal(lingweiUses(shenhe),0,"opening or cancelling the nature chooser does not spend quota");
status.event={name:"chooseToUse"};
skills.fan_lingwei_backup=lingweiBackup("fire");
assert.equal(skills.fan_lingwei_backup.direct,false);
nativeAutoConfirm(pending,{ok:true,auto:true,autoConfirm:false});
assert.equal(submitted,0,"active use keeps target confirmation");
// 复用完整原生响应首步，重现check已提交后又pause的真实先后顺序。
const contentSource=readFileSync(new URL("../../../noname/library/element/content.js",import.meta.url),"utf8");
const respondSource=contentSource.slice(contentSource.indexOf("  chooseToRespond: [")).match(/async \(event, trigger, player\) => \{([\s\S]*?)\n    \},\n    async/);
assert.ok(respondSource);
const respondStep=new Function("game","get","ui","lib","_status",`return async function(event,trigger,player){${respondSource[1]}\n}`)(game,get,ui,lib,status);
lib.config={auto_confirm:false,skip_shan:false};
get.card=()=>skills.fan_lingwei_backup.viewAs;
game.pause=()=>{game.paused=true};
ui.click.ok=()=>{submitted++;status.event.result={bool:true,card:get.card(),skill:"fan_lingwei_backup"};game.paused=false};
game.check=()=>{
  const ok=status.event.filterCard(get.card(),shenhe);
  nativeAutoConfirm(status.event,{ok,auto:true,autoConfirm:lib.config.auto_confirm});
  return ok;
};
const response=()=>({name:"chooseToRespond",skill:"fan_lingwei_backup",player:shenhe,isMine:()=>true,filterCard:card=>card.name==="sha"});
const schedule=skills.fan_lingwei.onChooseToRespond;
delete skills.fan_lingwei.onChooseToRespond;
status.event=response();skills.fan_lingwei_backup.direct=true;
await respondStep(status.event,{},shenhe);
assert.equal(game.paused,true,"old direct path re-pauses after synchronous confirmation");
assert.ok(status.event.result.card);
skills.fan_lingwei.onChooseToRespond=schedule;
skills.fan_lingwei_backup.direct=false;
status.event=response();
await respondStep(status.event,{},shenhe);
assert.equal(game.paused,true);
assert.equal(status.event.result,undefined);
await new Promise(resolve=>setTimeout(resolve,10));
assert.equal(game.paused,false,"deferred validated submission releases the native pause");
assert.equal(status.event.result.card.name,"sha");
const beforeCancel=submitted;
status.event=response();schedule(status.event);status.event={name:"chooseButton"};
await new Promise(resolve=>setTimeout(resolve,10));
assert.equal(submitted,beforeCancel,"cancelled or replaced response cannot submit from a stale timer");
status.event={};
shenhe.addSkill("fan_yizhou"); shenhe.addSkill("fan_lingwei"); shenhe.addSkill("fan_xinzhai");
// 只从角色实际拥有的主技能展开分组，验证挂载。
function expand(p) { const ids = [...p.skills]; for (let i = 0; i < ids.length; i++) { const group = skills[ids[i]]?.group; for (const id of typeof group === "string" ? [group] : group || []) if (!ids.includes(id)) ids.push(id); } return ids; }
assert.ok(expand(shenhe).includes("fan_yizhou_death"));
assert.ok(expand(shenhe).includes("fan_lingwei_refund"));
assert.equal(skills.fan_yizhou.locked, false);
assert.equal(canLingwei(shenhe), true);
const choice = result => ({ set() { return this; }, forResult: async () => result });
shenhe.chooseTarget = () => choice({ targets: [ally] });
shenhe.chooseControl = () => choice({ index: 3 });
assert.equal(skills.fan_yizhou.filter({}, shenhe), true);
await skills.fan_yizhou.content({}, {}, shenhe);
assert.equal(curseCount(ally), 4);
assert.equal(fieldCurses(), 4);
assert.equal(canLingwei(shenhe), false);
assert.equal(skills.fan_yizhou.filter({}, shenhe), false);
await skills.fan_yizhou.content({}, {}, shenhe);
assert.equal(curseCount(ally), 4, "repeat initialization cannot grant more marks");
assert.ok(expand(ally).includes("fan_yizhou_mark"));
const damage = { num: 1 };
assert.equal(skills.fan_yizhou_mark.filter(damage, ally), true);
await skills.fan_yizhou_mark.content({}, damage, ally);
assert.equal(damage.num, 2);
assert.equal(curseCount(ally), 3);
assert.equal(canLingwei(shenhe), true);
const first = { card: lingweiBackup("fire").viewAs };
lingweiBackup("fire").onuse(first, shenhe);
assert.equal(lingweiUses(shenhe), 1);
assert.equal(canLingwei(shenhe), false);
assert.equal(first.card.storage.fan_lingwei_free, false);
changeCurse(ally, "shenhe", -1);
assert.equal(canLingwei(shenhe), true, "consuming a mark raises the dynamic cap");
lingweiBackup("thunder").onrespond({ card: lingweiBackup("thunder").viewAs }, shenhe);
assert.equal(lingweiUses(shenhe), 2);
assert.equal(canLingwei(shenhe), false);
game.roundNumber++;
assert.equal(lingweiUses(shenhe), 0);
assert.equal(canLingwei(shenhe), true);
changeCurse(ally, "shenhe", -2);
assert.equal(fieldCurses(), 0);
const free = { card: lingweiBackup().viewAs, addCount: true };
lingweiBackup().onuse(free, shenhe);
assert.equal(skills.fan_lingwei.mod.cardUsable(free.card, shenhe), Infinity);
assert.equal(skills.fan_lingwei.mod.cardUsable({name:"sha"}, shenhe), undefined);
assert.equal(skills.fan_lingwei_refund.filter(free, shenhe), true);
await skills.fan_lingwei_refund.content({}, free, shenhe);
assert.equal(shenhe.getStat().sha, 0);
assert.equal(free.addCount, false);
for (let i = 1; i < 4; i++) lingweiBackup().onrespond({ card: lingweiBackup().viewAs }, shenhe);
assert.equal(canLingwei(shenhe), false, "free Sha still consumes the four-per-round quota");
assert.equal(lingweiUses(shenhe), 4);
assert.equal(skills.fan_xinzhai.filter({num:1,card:{color:"black"}}, shenhe), false, "no marks means no reduction");
changeCurse(ally, "shenhe", 2);
assert.equal(skills.fan_xinzhai.filter({num:1,card:{color:"black"}}, shenhe), true);
assert.equal(skills.fan_xinzhai.filter({num:1,card:{color:"red"}},shenhe),false);
assert.equal(skills.fan_xinzhai.filter({num:1,card:{name:"sha",isCard:true}},shenhe),false,"colorless virtual Sha is not black");
assert.equal(skills.fan_xinzhai.filter({num:1},shenhe),false,"non-card damage is not reduced");
assert.equal(skills.fan_xinzhai.filter({num:2,card:{color:"black",nature:"thunder"}},shenhe),true);
assert.equal(skills.fan_xinzhai.ai.effect.target({name:"sha",color:"red"},enemy,shenhe),undefined);
assert.equal(skills.fan_xinzhai.ai.effect.target({name:"sha"},enemy,shenhe),undefined);
const incoming={num:1,card:{color:"black"}};
await skills.fan_xinzhai.content({}, incoming, shenhe);
assert.equal(incoming.num,0);
const large={num:3,card:{color:"black"}}; await skills.fan_xinzhai.content({},large,shenhe); assert.equal(large.num,2);
changeCurse(shenhe,"shenhe",1);
assert.equal(skills.fan_xinzhai.filter({num:2,card:{color:"black"}},shenhe),false,"a mark on Shenhe disables reduction even if others also hold marks");
changeCurse(shenhe,"shenhe",-1);
assert.equal(skills.fan_xinzhai.filter({num:0,card:{color:"black"}},shenhe),false);
assert.deepEqual(skills.fan_xinzhai.ai.effect.target({name:"sha",color:"black"},enemy,shenhe),[0,0]);
assert.deepEqual(skills.fan_xinzhai.ai.effect.target({name:"sha",color:"black"},ally,shenhe),[0.5,0]);
changeCurse(ally,"shenhe",-1);
assert.equal(skills.fan_xinzhai.ai.effect.target({name:"sha",color:"black"},ally,shenhe),undefined);
const finalMarkDamage={num:1,card:{color:"black"}};
await skills.fan_yizhou_mark.content({},finalMarkDamage,ally);
assert.equal(finalMarkDamage.num,2);
assert.equal(skills.fan_xinzhai.filter(finalMarkDamage,shenhe),false,"last mark gone before damageBegin4: no reduction");
changeCurse(ally,"shenhe",2);
await skills.fan_yizhou_move.content({ targets: [ally, enemy] }, {}, shenhe);
assert.equal(curseCount(ally), 1); assert.equal(curseCount(enemy), 1);
assert.equal(fieldCurses(), 2, "moving does not consume or create marks");
ally.alive = false; game.dead.push(ally); game.players = game.players.filter(p => p !== ally);
shenhe.chooseTarget = () => choice({ targets: [enemy] });
assert.equal(skills.fan_yizhou_death.filter({ player: ally }, shenhe), true);
await skills.fan_yizhou_death.content({}, { player: ally }, shenhe);
assert.equal(curseCount(ally), 0); assert.equal(curseCount(enemy), 2);
const other = player("otherShenhe"); changeCurse(enemy, other.playerid, 1);
shenhe.alive = false; game.dead.push(shenhe); game.players = game.players.filter(p => p !== shenhe);
await skills.fan_yizhou_death.content({}, { player: shenhe }, shenhe);
assert.equal(curseCount(enemy), 1, "owner death removes only her own marks");
assert.equal(enemy.storage.fan_yizhou_tokens.otherShenhe, 1);
assert.equal(fieldCurses(), 1);
assert.equal(skills.fan_lingwei_refund.filter({ card: first.card, addCount:true }, shenhe), false, "last mark consumed later cannot retroactively make an earlier Sha free");
for (const file of ["fan_xinzhai", "fan_yizhou1", "fan_yizhou2", "fan_lingwei"]) assert.ok(existsSync(new URL(`../audio/shenhe/skill/${file}.mp3`, import.meta.url)));
console.log("Shenhe: attached groups, allocation, per-damage consumption, dynamic round quota, free Sha, Xinzhai, transfer and owner death passed (simulation).");
