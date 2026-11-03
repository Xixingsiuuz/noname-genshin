import fs from "node:fs";
import assert from "node:assert/strict";
const source=fs.readFileSync(new URL("../character/skills/sandrone.js",import.meta.url),"utf8");
const ui={cardPile:{childNodes:[]},discardPile:{childNodes:[]}};
const get={is:{virtualCard:c=>!c.cards?.length,convertedCard:c=>!c.isCard&&!!c.cards?.length},type2:c=>c.type,suit:c=>c.suit,number:c=>c.number};
const order=[],voices=[],recordings=[];
const card=(number=7)=>({number,suit:"heart",type:"equip"});
const foreign=[card(),card(),card(),card()];
const owner={isIn:()=>true,getCards(zone){assert.equal(zone,"hejx");return foreign;}};
const game={trySkillAudio:id=>voices.push(id),filterPlayer:fn=>[owner].filter(fn)};
Array.prototype.sortBySeat=function(){return this;};
const skills=new Function("get","ui","lib","game","_status",source.replace(/^import .*;\r?\n/,"").replace("export default","return"))(get,ui,{card:{list:[]}},game,{});
const p={storage:{fan_xigou:[7,"heart"]},markSkill(){},syncStorage(key){recordings.push(JSON.parse(JSON.stringify(this.storage[key])));},isIn:()=>true,hp:3,logSkill(){},getStat:()=>({fan_wanli:1}),gain(cards,animation){assert.equal(animation,"gain2");order.push(cards);return {cards};},draw(n){order.push(n);return {result:{cards:[{},{}]}};},async loseHp(n){assert.equal(n,1);order.push("loseHp");}};
assert.deepEqual(skills.fan_xigou.trigger.player,["useCard","respond"]);
assert.equal(skills.fan_xigou.filter({card:{cards:[]}}),false);
ui.cardPile.childNodes=[card(),card(8)];ui.discardPile.childNodes=[card()];
await skills.fan_xigou.content({}, {card:{type:"equip"}},p);
assert.equal(order[0].length,5);assert.ok(!order[0].includes(ui.discardPile.childNodes[0]));assert.deepEqual(p.storage.fan_xigou,[]);
p.storage.fan_xigou=[7,"heart"];p.storage.fan_wanli_discard=true;
await skills.fan_xigou.content({}, {card:{type:"equip"}},p);
assert.equal(order[1].length,6);assert.equal(p.storage.fan_wanli_discard,undefined);
let choices=[{control:"背水"},{control:"修改点数"},{index:6},{index:2}];
p.chooseControl=(...options)=>({set(){return this;},async forResult(){const result=choices.shift();if(result.control)assert.ok(options.includes(result.control));return result;}});
p.storage.fan_xigou=[7,"heart"];
await skills.fan_wanli.content({}, {},p);
assert.equal(order[2],"loseHp");assert.equal(order[3].length,6);assert.deepEqual(p.storage.fan_xigou,[]);assert.equal(p.storage.fan_wanli_discard,undefined);assert.equal(choices.length,0);
foreign.length=0;ui.cardPile.childNodes=[];ui.discardPile.childNodes=[];p.storage.fan_xigou=[7,"heart"];
await skills.fan_xigou.content({}, {card:{type:"equip"}},p);assert.equal(order.at(-1),2);
console.log("Sandrone: use/respond timing, all foreign zones, one-shot discard access, backwater order and fallback passed (simulation)");

// Actual extension hook: chooseToUse need not define filterOk.
const ext=fs.readFileSync(new URL("../extension.js",import.meta.url),"utf8");
const body=ext.slice(ext.indexOf("const submit ="),ext.indexOf("submit.fanTianlinAuto ="));
const status={},timeline=[];let legal=true,checks=0,submit;
const hookGame={check(){checks++;submit(status.event,{ok:legal});return legal;}};
submit=new Function("lib","ui","_status","game",body+"return submit;")({skill:skills},{confirm:{close(){timeline.push("closeConfirm");}},click:{ok(){timeline.push("ok");}}},status,hookGame);
const ev={skill:"fan_wanli",isMine:()=>true};status.event=ev;
assert.equal(ev.filterOk,undefined);
submit(ev,{ok:true});timeline.push("pause");await Promise.resolve();await Promise.resolve();
assert.deepEqual(timeline,["pause","closeConfirm","ok"]);assert.equal(checks,1);assert.equal(ev.fan_tianlin_submitting,false);
timeline.length=0;legal=false;submit(ev,{ok:true});await Promise.resolve();assert.deepEqual(timeline,[]);
legal=true;submit(ev,{ok:true});status.event={};await Promise.resolve();assert.deepEqual(timeline,[]);
console.log("Wanli entry: missing filterOk, deferred native check, recursion guard, stale and illegal events passed");

assert.ok(source.includes("弃牌堆获得牌"));assert.ok(!source.includes("弃牌堆取牌"));

// AI re-evaluates the current health; this preference does not restrict manual choice.
for(const hp of [1,2]){
 p.hp=hp;p.storage.fan_xigou=[7,"heart"];
 p.chooseControl=()=>({set(key,val){if(key==="ai")assert.equal(val(),hp>1?"背水":"修改点数");return this;},async forResult(){return {control:"取消"};}});
 await skills.fan_wanli.content({}, {},p);
}

// Replay uses storage video events rather than executing the skill again.
assert.ok(recordings.some(s=>s.length===3));assert.deepEqual(recordings.at(-1),[]);
const playerSource=fs.readFileSync(new URL("../../../noname/library/element/player.js",import.meta.url),"utf8");
const syncBody=playerSource.slice(playerSource.indexOf("  syncStorage(skill) {")+"  syncStorage(skill) {".length,playerSource.indexOf("  syncSkills() {")).trim().replace(/}$/,"");
const videos=[];
const nativeSync=new Function("get","game","skill",syncBody);
const live={storage:{fan_xigou:[11,"heart"]}};
nativeSync.call(live,{itemtype:()=>"array"},{addVideo(type,player,data){videos.push({type,data});}},"fan_xigou");
live.storage.fan_xigou.length=0;assert.deepEqual(videos[0].data,["fan_xigou",[11,"heart"]]);
const gameSource=fs.readFileSync(new URL("../../../noname/game/index.js",import.meta.url),"utf8");
const replayBody=gameSource.slice(gameSource.indexOf("    storage: function(player, content) {")+"    storage: function(player, content) {".length,gameSource.indexOf("    markId: function(player, content) {")).trim().replace(/},$/,"");
const replay=new Function("get","player","content",replayBody);const computer={storage:{}};
replay({},computer,videos[0].data);assert.deepEqual(computer.storage.fan_xigou,[11,"heart"]);
console.log("Replay: native storage serialization preserves snapshots and restores computer records");

ui.selected={targets:[]};
const male=()=>({hasSex:s=>s==="male",countCards:()=>1,isIn:()=>true});
const female={hasSex:s=>s==="female",countCards:()=>1,isIn:()=>true};
const men=[male(),male(),male()];
assert.equal(skills.fan_yaoyue.filterTarget(null,p,men[0]),true);
ui.selected.targets.push(men[0],men[1]);
assert.equal(skills.fan_yaoyue.filterTarget(null,p,men[2]),false);
assert.equal(skills.fan_yaoyue.filterTarget(null,p,female),true);
assert.equal(skills.fan_yaoyue.filterTarget(null,p,men[0]),true);
ui.selected.targets.pop();assert.equal(skills.fan_yaoyue.filterTarget(null,p,men[2]),true);
let complex=false;
p.chooseTarget=()=>({set(key,value){if(key==="complexTarget")complex=value;return this;},async forResult(){return {bool:true,targets:men};}});
const oldVoices=voices.length;await skills.fan_yaoyue.content({}, {},p);
assert.equal(complex,true);assert.equal(voices.length,oldVoices);
console.log("Yaoyue: dynamic male quota, female exemption, deselection and invalid result rejection passed");
