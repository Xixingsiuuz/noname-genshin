import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const source=readFileSync(new URL('../character/skills/xiao.js',import.meta.url),'utf8');
const timeline=[],nodes=[];
const game={players:[],broadcastAll(fn,...args){fn(...args)},trySkillAudio(id){timeline.push(id);const events={};const audio={addEventListener(n,f){events[n]=f}};nodes.push(events);return audio}};
const get={effect:(target)=>target.effect,damageEffect:target=>target.effect,nature:card=>card.nature};
const skills=new Function('game','get',source.replace(/^import .*;\r?\n/gm,'').replace('export default','return'))(game,get);
let yes=true,marks=0,bonusExpiry;
const choice={set(key,value){if(key==='ai')this.ai=value;return this},async forResult(){return {bool:yes}}};
const player={hp:4,maxHp:4,isLinked:()=>false,isIn:()=>true,chooseBool:()=>choice,logSkill(...args){assert.deepEqual(args[4],[])},countCards:()=>1,loseHp:async()=>{player.hp--;timeline.push('loseHp')},draw:async n=>timeline.push('draw'+(n||1)),recover:async()=>{player.hp=Math.min(player.hp+1,player.maxHp);timeline.push('recover')},addTempSkill(id,expiry){bonusExpiry=expiry},addMark(id,n){marks+=n},countMark:()=>marks};
game.players=[player];
function use(){const card={name:'sha'};return {card,player,targets:[{hp:4,effect:2,isLinked:()=>false,isIn:()=>true}],directHit:{addArray(ps){this.players=[...ps]}},excluded:[]}}
function trigger(u){return {card:u.card,isFirstTarget:true,getParent:()=>u}}
let u=use();yes=false;await skills.fan_nuowu.content({},trigger(u),player);assert(!u.fan_nuowu);assert.equal(nodes.length,0);
yes=true;await skills.fan_nuowu.content({},trigger(u),player);await Promise.resolve();assert.deepEqual(timeline,['fan_nuowu_start']);assert.deepEqual(u.directHit.players,game.players);
assert(!skills.fan_nuowu.filter({...trigger(u),isFirstTarget:false}));assert(skills.fan_nuowu.filter(trigger(u)));
const mounted=new Set(['fan_nuowu',...skills.fan_nuowu.group]);
async function dispatch(name,event){for(const id of mounted){const skill=skills[id];if(Object.values(skill.trigger||{}).includes(name)&&skill.filter(event,player))await skill.content({},event,player)}}
const damage={card:u.card,player:{hp:4},num:1,notLink:()=>true,getParent:()=>u};
assert(skills.fan_nuowu_damage_effect.filter(damage,player));await dispatch('damageBegin1',damage);assert.equal(damage.num,2);await Promise.resolve();assert.equal(nodes.length,1,'damage voice waits for actual ended');
nodes[0].ended();await new Promise(resolve=>setImmediate(resolve));assert.equal(timeline[1],'fan_nuowu_damage');
await skills.fan_nuowu_damage_effect.content({},damage,player);assert.equal(damage.num,3);assert.equal(nodes.length,2,'same use voice deduplicated');
// Native _lianhuan preserves the original card, source and damage amount.
const chainParent={name:'_lianhuan',getParent:name=>{assert.equal(name,'useCard');return u}};
const chain={...damage,num:2,notLink:()=>false,getParent:name=>name==='useCard'?chainParent.getParent(name):chainParent};
await dispatch('damageBegin1',chain);assert.equal(chain.num,3,'qualifying chain damage receives another bonus');
const chainLow={...chain,num:2,player:{hp:3}};await dispatch('damageBegin1',chainLow);assert.equal(chainLow.num,2);
player.hp=3;await dispatch('damageBegin1',chainLow);assert.equal(chainLow.num,3,'current HP is checked again for each recipient');player.hp=4;
const chainOther={...chain,num:2,getParent:()=>use()};await dispatch('damageBegin1',chainOther);assert.equal(chainOther.num,2,'unmarked nested Sha remains isolated');
assert.equal(nodes.length,2,'chain bonus does not replay the same Sha damage voice');
assert(!skills.fan_nuowu_damage_effect.filter({...damage,player:{hp:3}},player));
assert(!skills.fan_nuowu_damage_effect.filter({...damage,getParent:()=>use()},player),'nested use isolated');
await skills.fan_nuowu_after.content({},u,player);assert.equal(player.hp,3);assert.equal(marks,1);assert.deepEqual(bonusExpiry,['phaseChange','phaseAfter','phaseBeforeStart']);assert.equal(skills.fan_nuowu_quota.mod.cardUsable({name:'sha'},player,1),2);assert(!skills.fan_nuowu_after.filter(u,player));
u=use();u.fan_nuowu={player};player.hp=1;await skills.fan_nuowu_after.content({},u,player);assert.equal(marks,1);assert.equal(player.hp,1);
// Kill recovery happens before the parent Sha's after trigger.
await skills.fan_jiangmo.content({}, {},player);assert.equal(player.hp,2);u=use();u.fan_nuowu={player};await skills.fan_nuowu_after.content({},u,player);assert.equal(player.hp,1);assert.equal(marks,2);
assert.equal(skills.fan_jiangmo.mod.maxHandcardBase(player),4);
player.hp=4;u=use();u.targets[0].effect=-5;await skills.fan_nuowu.content({},trigger(u),player);assert.equal(choice.ai(),false,'harmful ally attack rejected');u.targets[0].effect=5;assert.equal(choice.ai(),true,'enemy evaluated');player.hp=1;assert.equal(choice.ai(),true);
player.hp=4;u=use();u.card.nature='fire';u.targets[0].isLinked=()=>true;u.targets[0].effect=0;
const linked={hp:4,effect:-20,isIn:()=>true,isLinked:()=>true};game.players=[player,linked];await skills.fan_nuowu.content({},trigger(u),player);assert.equal(choice.ai(),false,'linked ally bonus counted as a cost');
linked.effect=20;assert.equal(choice.ai(),true,'linked enemy bonus counted as a benefit');linked.hp=3;assert.equal(choice.ai(),false,'nonqualifying chain recipient grants no bonus estimate');game.players=[player];
marks=0;assert.equal(skills.fan_nuowu_quota.mod.cardUsable({name:'sha'},player,1),1);
// Drive actual local native Audio and trySkillAudio parsing, including mute.
const audioLib={skill:skills,translate:{},characterSubstitute:{},config:{background_speak:true},};audioLib.skill.global=[];
const audioGet={info:id=>skills[id],character:()=>({tempname:[]})};
const Audio=new Function('get','lib',readFileSync(new URL('../../../noname/get/audio.js',import.meta.url),'utf8').replace(/^import .*;\r?\n/gm,'').replace(/export\s*\{[\s\S]*?\};?\s*$/,'')+'\nreturn Audio;')(audioGet,audioLib);audioGet.Audio=Audio;
const engine=readFileSync(new URL('../../../noname/game/index.js',import.meta.url),'utf8');
const method=engine.slice(engine.indexOf('  trySkillAudio(skill,'),engine.indexOf('  /**',engine.indexOf('  trySkillAudio(skill,')));
const nativeLists=[];
const nativeGame={broadcast(){},tryAudio({audioList}){nativeLists.push(audioList);return audioList},logv(){},createEvent(){return {setContent(){}}}};
const native=new Function('game','lib','get','return ({'+method+'});')(nativeGame,audioLib,audioGet).trySkillAudio;nativeGame.trySkillAudio=native;
assert.equal(native('fan_nuowu_start',player,true,true).length,3);assert.equal(native('fan_nuowu_damage',player,true,true).length,3);assert.equal(native('fan_jiangmo',player,true,true).length,2);assert.deepEqual(native('fan_nuowu',player,true,true,null,[]),[],'main skill logs cannot play branch audio');
const playerCode=readFileSync(new URL('../../../noname/library/element/player.js',import.meta.url),'utf8');
const logMethod=playerCode.slice(playerCode.indexOf('  logSkill(name2,'),playerCode.indexOf('  unprompt()',playerCode.indexOf('  logSkill(name2,')));
const status={event:{next:{remove(){}},after:[]}};audioGet.itemtype=()=>undefined;audioGet.event=()=>status.event;
const nativeLog=new Function('game','lib','get','_status','return ({'+logMethod+'});')(nativeGame,audioLib,audioGet,status).logSkill;
Object.assign(player,{checkShow(){},line(){},getSkills:()=>['fan_nuowu'],getHistory:()=>[]});
player.logSkill=nativeLog;u=use();yes=true;await skills.fan_nuowu.content({},trigger(u),player);assert.deepEqual(nativeLists.at(-1),[],'actual native logSkill remains silent');
audioLib.config.background_speak=false;assert.equal(native('fan_nuowu_start',player,true,true),undefined);
console.log('PASS Xiao: confirmation, current HP bonus, chain bonus and nested isolation, once-per-use voice queue, post-use HP gating, kill recovery order, quota cleanup, hand limit, AI, native audio pools and mute (simulation).');
