import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("../character/skills/raiden.js", import.meta.url), "utf8");
const lib = { filter: { selectTarget: card => ["shan", "wuxie"].includes(card.name) ? [0, 0] : [1, 1] }, card: { shandian: { judge: () => -5, judge2: () => true } }, skill: {}, inpile: ["sha", "shan", "lebu", "wuxie"] };
const ui = { selected: { cards: [], targets: [], buttons: [] }, create: { dialog: (...args) => args } };
const status = {};
const played = [];
const game = { trySkillAudio(id) { played.push(id); }, players: [], dead: [], checkMod: () => true, hasPlayer: filter => game.players.some(filter) };
const get = { info: card => ({ notarget: ["shan", "wuxie"].includes(card.name) }), value: () => 3, position: card => card.pos, type: name => name === "lebu" ? "delay" : name === "wuxie" ? "trick" : "basic",
  inpileVCardList: filter => [["basic", "", "sha"], ["basic", "", "shan"], ["delay", "", "lebu"], ["trick", "", "wuxie"]].filter(filter),
  is: { locked: skill => !!lib.skill[skill]?.locked }, attitude: () => 1 };
const skills = new Function("lib", "game", "get", "ui", "_status",
  source.replace(/^import .*;\r?\n/, "").replace("export default", "return"))(lib, game, get, ui, status);
Object.assign(lib.skill, skills);
function choice(result) { return { set() { return this; }, async forResult() { return typeof result === "function" ? result() : result; } }; }
function player(ids = []) {
  const p = { storage: {}, ids: new Set(ids), hand: [], charge: 0, group: "qun", inGame: true, drawn: 0,
    hasSkill(id) { return this.ids.has(id); }, hasZhuSkill(id) { return this.isLord && this.hasSkill(id); },
    isIn() { return this.inGame; }, countCharge() { return this.charge; },
    getMaxCharge() { return this.hasSkill("fan_wuxiang") ? 9 : 0; },
    addCharge(n) { this.charge = Math.min(this.getMaxCharge(), this.charge + n); },
    removeCharge(n) { this.charge -= n; },
    addSkill(id) { this.ids.add(id); skills[id]?.init?.(this, id); },
    addTempSkill(id, expiry) { assert.deepEqual(expiry, { global: "phaseAfter" }); this.addSkill(id); },
    removeSkill(id) { this.ids.delete(id); skills[id]?.onremove?.(this, id); },
    async removeSkills(ids) { for (const id of ids) this.removeSkill(id); },
    async addSkills(id) { this.addSkill(id); },
    addSkillBlocker(id) { this.blocker = id; }, removeSkillBlocker() { this.blocker = null; },
    getCards(zone, filter) { return filter ? this.hand.filter(filter) : this.hand; },
    gain(input) {
      const tags = [];
      return { gaintag: { add(tag) { tags.push(tag); } }, then(resolve) {
        for (const card of Array.isArray(input) ? input : [input]) {
          card.pos = "h"; card.tags = tags; card.hasGaintag = tag => card.tags.includes(tag); p.hand.push(card);
        }
        resolve();
      } };
    }, logSkill() {}, async draw() { this.drawn++; },
  };
  return p;
}
// Dispatch only skills actually attached through a held main skill's groups.
function attached(p) {
  const result = new Set();
  function expand(id) {
    if (result.has(id)) return;
    result.add(id);
    const group = skills[id]?.group;
    for (const child of typeof group === "string" ? [group] : group || []) expand(child);
  }
  for (const id of p.ids) expand(id);
  return [...result];
}
async function dispatch(p, name, event) {
  for (const id of attached(p)) {
    const skill = skills[id], trigger = skill?.trigger;
    if (!trigger) continue;
    const matches = Object.entries(trigger).some(([role, values]) => (Array.isArray(values) ? values : [values]).includes(name)
      && (role === "global" || (role === "player" ? event.player : event.source) === p));
    if (matches && (!skill.filter || skill.filter(event, p))) await skill.content({ triggername: name }, event, p);
  }
}
const raiden = player(["fan_wuxiang", "fan_suoguo"]), other = player(), third = player();
raiden.isLord = true;
game.players = [raiden, other, third]; status.currentPhase = raiden;
skills.fan_wuxiang.init(raiden); skills.fan_wuxiang.init(raiden);
assert.equal(raiden.charge, 3, "reinitialization must not grant charge twice");
const realSort = Array.prototype.sortBySeat;
Array.prototype.sortBySeat = function(start) { assert.equal(start, raiden); return this; };
await dispatch(raiden, "phaseBeginStart", { name: "phase", player: raiden });
Array.prototype.sortBySeat = realSort;
assert(other.blocker);
lib.skill.normal = { locked: false }; lib.skill.locked = { locked: true }; lib.skill.persistent = { persevereSkill: true };
const block = skills.fan_suoguo_block;
assert.equal(block.skillBlocker("normal", other), true);
assert.equal(block.skillBlocker("locked", other), false);
assert.equal(block.skillBlocker("persistent", other), false);
other.group = "wei";
assert.equal(block.skillBlocker("normal", other), false);
other.group = "qun";
await dispatch(other, "damageEnd", { name: "damage", player: other, num: 1 });
assert(other.blocker, "still sealed during damageEnd");
await dispatch(other, "damageAfter", { name: "damage", player: other, num: 1 });
assert(other.blocker, "damage no longer lifts the blockade");
await dispatch(raiden, "damageSource", { name: "damage", player: other, source: raiden, num: 2 });
assert.equal(raiden.charge, 5);
await dispatch(raiden, "damageEnd", { name: "damage", player: raiden, num: 1 });
assert.equal(raiden.charge, 7);
assert(!raiden.hasSkill("fan_yushen"));
await dispatch(raiden, "damageEnd", { name: "damage", player: raiden, num: 1 });
assert(raiden.hasSkill("fan_yushen"));
assert(!raiden.hasSkill("fan_wuxiang")); assert(!raiden.hasSkill("fan_suoguo"));
assert.equal(third.blocker, null, "transformation clears other players' blockers");
assert.equal(raiden.charge, 0);
const before = raiden.charge;
await dispatch(raiden, "damageSource", { name: "damage", player: other, source: raiden, num: 3 });
assert.equal(raiden.charge, before, "removed groups must not trigger");

// Real event ordering: use/respondAfter first, then orderingDiscard -> cardsDiscardAfter.
const card = { pos: "o" }, foreign = { pos: "d" };
const response = { name: "respond", player: other, respondTo: [raiden, {}], cards: [card] };
const ordering = { name: "orderingDiscard", relatedEvent: response };
const discarded = { name: "cardsDiscard", cards: [card, foreign], getParent: () => ordering };
const yushen = skills.fan_yushen;
assert.equal(yushen.filter(discarded, raiden), false);
await dispatch(raiden, "respondAfter", response);
assert.equal(raiden.drawn, 0);
card.pos = "d";
assert.equal(yushen.filter(discarded, raiden), true);
raiden.chooseTarget = () => choice({ bool: false });
await dispatch(raiden, "cardsDiscardAfter", discarded);
assert(!raiden.hasSkill("fan_yushen_used"), "cancel does not consume limit");
raiden.chooseTarget = () => choice({ bool: true, targets: [third] });
await dispatch(raiden, "cardsDiscardAfter", discarded);
assert.equal(raiden.drawn, 1); assert(third.hand.includes(card)); assert(!third.hand.includes(foreign));
assert.equal(yushen.filter(discarded, raiden), false);
assert(attached(third).includes("fan_yushen_convert"));
const convert = skills.fan_yushen_convert, context = { filterCard: () => true };
assert(convert.filter(context, third)); assert(convert.hiddenCard(third, "lebu"));
status.event = { name: "chooseToUse", filterCard: () => true, fan_yushen_material: card };
const backup = convert.chooseButton.backup([["basic", "", "sha"]], third);
ui.selected.cards = []; assert.equal(backup.filterOk(), false);
ui.selected.cards = [card]; assert.equal(backup.filterOk(), true);
ui.selected.cards = []; assert.equal(backup.filterOk(), false);
// Native lose strips ordinary tags. Returning to hand does not restore the privilege.
card.tags = []; card.pos = "d"; third.hand = [];
assert.equal(convert.filter(context, third), false);
third.hand = [card]; card.pos = "h";
assert.equal(convert.filter(context, third), false);

raiden.removeSkill("fan_yushen_used");
card.pos = "d";
// Reciprocal direction includes response-use (e.g. wuxie), but excludes unrelated uses/discards.
response.name = "useCard"; response.player = raiden; response.respondTo = [other, {}];
assert.equal(yushen.filter(discarded, raiden), true);
response.respondTo = [third, {}]; response.player = other;
assert.equal(yushen.filter(discarded, raiden), false);
response.player = raiden; delete response.respondTo;
assert.equal(yushen.filter(discarded, raiden), false);
ordering.name = "discard";
assert.equal(yushen.filter(discarded, raiden), false);
ordering.name = "orderingDiscard"; response.respondTo = [other, {}];
raiden.chooseTarget = () => choice(() => { card.pos = "h"; return { bool: true, targets: [third] }; });
await dispatch(raiden, "cardsDiscardAfter", discarded);
assert(!raiden.hasSkill("fan_yushen_used"), "recheck discard location after choice");

// Nested use cleanup must never fall back to the outer responded-to card's materials.
const outerCard = { pos: "d" }, innerCard = { pos: "d" };
const outer = { name: "useCard", player: other, cards: [outerCard], respondTo: [raiden, {}] };
const inner = { name: "useCard", player: third, cards: [innerCard], getParent: () => outer };
const nestedDiscard = { cards: [outerCard, innerCard], getParent: () => ({ name: "orderingDiscard", relatedEvent: inner }) };
assert.equal(yushen.filter(nestedDiscard, raiden), false);
inner.respondTo = [raiden, {}];
assert.equal(yushen.filter(nestedDiscard, raiden), true);
raiden.chooseTarget = () => choice({ bool: true, targets: [other] });
await dispatch(raiden, "cardsDiscardAfter", nestedDiscard);
assert(other.hand.includes(innerCard)); assert(!other.hand.includes(outerCard));
raiden.removeSkill("fan_yushen_used");
const first = { pos: "d" }, second = { pos: "d" };
response.player = other; response.respondTo = [raiden, {}]; response.cards = [first, second];
discarded.cards = [first, second, foreign];
raiden.chooseTarget = () => choice({ bool: true, targets: [third] });
await dispatch(raiden, "cardsDiscardAfter", discarded);
assert(third.hand.includes(first) && third.hand.includes(second));
assert(first.hasGaintag("fan_yushen_card") && second.hasGaintag("fan_yushen_card"));
assert(!third.hand.includes(foreign));

const fresh = player(["fan_wuxiang"]); fresh.charge = 6;
skills.fan_wuxiang_sha.onrespond({}, fresh);
assert.equal(fresh.charge, 5);
assert.equal(skills.fan_wuxiang_sha.filter({}, fresh), false);
assert.equal(skills.fan_wuxiang_duel.filter({}, fresh), true, "independent option limits");
console.log("Raiden: attached triggers, charge transformation, hunt timing, response discard, cancellation and tagged conversion passed (simulation).");

let judged = 0, damage = [];
other.judge = fn => { assert.equal(fn, lib.card.shandian.judge); judged++; return choice({bool:false}); };
other.damage = async (...args) => { damage.push(args); };
raiden.ids.add("fan_suoguo"); status.currentPhase = other;
await dispatch(raiden, "phaseJudgeBegin", {name:"phaseJudge", player:other});
assert.equal(judged,1); assert.deepEqual(damage, [[3,"thunder","nosource"]]);
other.judge = () => choice({bool:true});
await dispatch(raiden, "phaseJudgeBegin", {name:"phaseJudge", player:other});
assert.equal(damage.length,1);
await dispatch(raiden, "phaseJudgeBegin", {name:"phaseJudge", player:raiden});
assert.equal(damage.length,1);

assert(!skills.fan_suoguo.trigger.global.includes("phaseZhunbeiBegin"));
assert(skills.fan_wuxiang_gain.trigger.player.includes("phaseZhunbeiBegin"));

// Voice follows actual payment and final legality, never the opening selection.
const blade = player(["fan_wuxiang"]); blade.charge = 6;
const victim = player(); const order = [];
victim.damage = async () => { order.push("damage"); };
const originalPlay = game.trySkillAudio;
game.trySkillAudio = id => { order.push(id); };
await skills.fan_wuxiang_thunder.content({target:victim}, {}, blade);
assert.equal(blade.charge, 0);
assert.deepEqual(order, ["fan_wuxiang_thunder_voice", "damage"]);
order.length = 0;
await skills.fan_wuxiang_thunder.content({target:victim}, {}, blade);
assert.equal(order.length, 0);
blade.charge = 6; victim.inGame = false;
await skills.fan_wuxiang_thunder.content({target:victim}, {}, blade);
assert.equal(order.length, 0); assert.equal(blade.charge, 6);
game.trySkillAudio = originalPlay;
for (const id of ["fan_wuxiang_gain", "fan_wuxiang_sha", "fan_wuxiang_duel", "fan_wuxiang_thunder", "fan_suoguo", "fan_yushen", "fan_yushen_convert"]) assert.equal(skills[id].audio, false, id + " should not duplicate explicit voice via native logs");
console.log("PASS: Raiden blade payment/audio/damage order, invalid target, insufficient charge and silent native logs (simulation)");

// Full charge transition speaks only after the actual new skill is held.
const transformed = player(["fan_wuxiang", "fan_suoguo"]); transformed.charge = 8;
const transitionVoices = [];
game.trySkillAudio = id => {
 transitionVoices.push(id);
 if (id === "fan_yushen_awaken_voice") {
  assert(transformed.hasSkill("fan_yushen"));
  assert(!transformed.hasSkill("fan_wuxiang"));
  assert(!transformed.hasSkill("fan_suoguo"));
 }
};
await dispatch(transformed, "phaseZhunbeiBegin", { name:"phaseZhunbei", player:transformed });
assert.deepEqual(transitionVoices, ["fan_yushen_awaken_voice"]);
await dispatch(transformed, "damageEnd", { name:"damage", player:transformed, num:1 });
assert.equal(transitionVoices.length, 1);
game.trySkillAudio = originalPlay;
console.log("PASS: full charge transition audio after skill changes, replaces gain voice, no repeat (simulation)");

// Joint first stage uses real hand cards and a separate native name-button dialog.
const receiver = player(["fan_yushen_convert"]);
const tagged = { pos:"h", hasGaintag: tag => tag === "fan_yushen_card" };
const otherTagged = { pos:"h", hasGaintag: tag => tag === "fan_yushen_card" };
const untagged = { pos:"h", hasGaintag: () => false };
receiver.hand = [tagged, otherTagged, untagged];
const origin = {name:"chooseToUse", filterCard: () => true};
const config = convert.chooseButton.dialog(origin, receiver);
status.event = { player:receiver, getParent: () => origin };
ui.selected.cards=[]; ui.selected.buttons=[{link:["basic","","sha"]}];
assert(config.filterCard(tagged)); assert(!config.filterCard(untagged));
assert.equal(convert.chooseButton.filterOk(),false);
ui.selected.cards=[tagged]; assert.equal(convert.chooseButton.filterOk(),true);
ui.selected.buttons=[]; assert.equal(convert.chooseButton.filterOk(),false);
ui.selected.buttons=[{link:["basic","","sha"]}]; assert.equal(convert.chooseButton.filterOk(),true);
ui.selected.cards=[]; assert.equal(convert.chooseButton.filterOk(),false);
config.callback(receiver,{bool:false,cards:[tagged]}); assert.equal(origin.fan_yushen_material,null);
config.callback(receiver,{bool:true,cards:[tagged]}); status.event=origin;
const bound=convert.chooseButton.backup([["basic","","sha"]],receiver);
assert.equal(bound.selectCard,-1); assert(bound.filterCard(tagged)); assert(!bound.filterCard(otherTagged));
ui.selected.cards=[tagged]; assert(bound.filterOk());
receiver.hand=[otherTagged,untagged]; assert(!bound.filterOk()); assert(!bound.filterCard(otherTagged));
receiver.hand=[tagged,otherTagged,untagged];
// No empty second confirmation for respond; automatic use is checked after the native check.
const responding={name:"chooseToRespond",filterCard:()=>true,fan_yushen_material:tagged};
status.event=responding;
const respondBackup=convert.chooseButton.backup([["basic","","shan"]],receiver);
assert.equal(respondBackup.direct,false); assert.equal(respondBackup.manualConfirm,true);
assert(respondBackup.filterOk());
let confirmed=0;ui.click={ok(){confirmed++;}};game.check=()=>true;
const noTarget={name:"chooseToUse",filterCard:()=>true,fan_yushen_material:tagged,isMine:()=>true,skill:"fan_yushen_convert_backup"};
status.event=noTarget;
const automatic=convert.chooseButton.backup([["trick","","wuxie"]],receiver);
assert.equal(automatic.manualConfirm,true);
automatic.filterOk(); automatic.filterOk(); await Promise.resolve();assert.equal(confirmed,1);
responding.isMine=()=>true;responding.skill="fan_yushen_convert_backup";status.event=responding;
respondBackup.filterOk();assert.equal(confirmed,1);await Promise.resolve();assert.equal(confirmed,2,"Yushen response submits after the native check, never synchronously");
console.log("PASS: Yushen joint material/name choices, both orders, cancel, bound material loss, native respond and automatic no-target use (simulation)");

const previousValue=get.value;get.value=card=>card.value ?? 3;
tagged.value=7;otherTagged.value=1;
receiver.getUseValue=card=>card.name === "sha" ? 5 : -2;
const phaseOrigin={name:"chooseToUse",type:"phase",filterCard:()=>true};
const phaseConfig=convert.chooseButton.dialog(phaseOrigin,receiver);
assert.equal(phaseConfig.processAI().cards[0],otherTagged);
assert.equal(phaseConfig.processAI().links[0][2],"sha");
receiver.getUseValue=()=>-1;assert.equal(phaseConfig.processAI().bool,false);
receiver.hand=[];assert.equal(phaseConfig.processAI().bool,false);
receiver.hand=[tagged];get.value=previousValue;
const dyingTarget=player();
const rescue={name:"chooseToUse",type:"dying",dying:dyingTarget,filterCard:()=>true,filterTarget:(card,who,target)=>target===dyingTarget,fan_yushen_material:tagged};
// Add tao to the mocked native name list solely for rescue verification.
const previousList=get.inpileVCardList;
get.inpileVCardList=filter=>previousList(filter).concat([["basic","","tao"]].filter(filter));
status.event=rescue;
const rescueBackup=convert.chooseButton.backup([["basic","","tao"]],receiver);
assert.equal(rescueBackup.selectTarget,-1);assert(rescueBackup.filterTarget({name:"tao"},receiver,dyingTarget));
assert(!rescueBackup.filterTarget({name:"tao"},receiver,other));
ui.selected.cards=[tagged];ui.selected.targets=[dyingTarget];assert(rescueBackup.filterOk());
dyingTarget.inGame=false;assert(!rescueBackup.filterOk());
get.inpileVCardList=previousList;
console.log("PASS: Yushen AI material cost/use value, negative benefit, changing resources and fixed dying target (simulation)");

const oldShaList=get.inpileVCardList;
get.inpileVCardList=filter=>[undefined,"fire","thunder","ice","stab"].map(n=>["basic","","sha",n]).filter(filter);
const shaOwner=player(["fan_wuxiang"]);shaOwner.charge=3;
const shaContext={name:"chooseToUse",type:"phase",filterCard:card=>card.nature!=="ice"};
assert(skills.fan_wuxiang_sha.filter(shaContext,shaOwner));
status.event={getParent:()=>shaContext};
assert(skills.fan_wuxiang_sha.chooseButton.filter({link:["basic","","sha","stab"]},shaOwner));
assert(!skills.fan_wuxiang_sha.chooseButton.filter({link:["basic","","sha","ice"]},shaOwner));
status.event=shaContext;
const stabBackup=skills.fan_wuxiang_sha.chooseButton.backup([["basic","","sha","stab"]],shaOwner);
assert.equal(stabBackup.viewAs.nature,"stab");assert(stabBackup.filterOk());assert.equal(shaOwner.charge,3);
stabBackup.onuse({},shaOwner);assert.equal(shaOwner.charge,2);assert(!stabBackup.filterOk());
get.inpileVCardList=oldShaList;
console.log("PASS: Wuxiang sha nature range, current legality, no cost before confirmation, shared cost and limit (simulation)");

// Replay check -> pause -> deferred recheck; neither auto-confirm setting
// may leave the confirmation created by game.check behind.
for (const autoConfirm of [false,true]) {
 const responder=player(["fan_wuxiang"]);responder.charge=3;
 const responseEvent={name:"chooseToRespond",filterCard:()=>true,isMine:()=>true,skill:"fan_wuxiang_sha_backup",skillDialog:true};
 status.event=responseEvent;
 const responseSkill=skills.fan_wuxiang_sha.chooseButton.backup([["basic","","sha"]],responder);
 let closed=0, submitted=0, paused=false;
 ui.confirm={close(){closed++;delete ui.confirm;}};
 game.check=()=>{ responseSkill.filterOk();ui.confirm={close(){closed++;delete ui.confirm;}};
  if(autoConfirm){ui.confirm.close();delete responseEvent.skill;submitted++;paused=false;}
  return true;
 };
 ui.click={ok(){assert(!ui.confirm);submitted++;delete responseEvent.skill;paused=false;}};
 responseSkill.filterOk();paused=true;
 await new Promise(resolve=>setTimeout(resolve,10));
 assert.equal(submitted,1);assert.equal(paused,false);assert.equal(ui.confirm,undefined);assert.equal(closed,1);
}
console.log("PASS: Wuxiang response check/pause deferred completion clears confirmation with auto-confirm on/off (simulation)");
