import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL(p,import.meta.url),'utf8');
Array.prototype.randomGet=function(){return this[0];};
Array.prototype.add=function(x){if(!this.includes(x))this.push(x);return this;};
Array.prototype.remove=function(x){const i=this.indexOf(x);if(i>=0)this.splice(i,1);return this;};
const characters=new Function(read('../character/character.js').replace('export default','return'))();
assert.deepEqual(characters.fan_qiqi.slice(0,4),['female','wei','3/3/3',['fan_due','fan_huihai']]);
assert(read('../character/skill.js').includes('...qiqiSkills'));
const trace=[];let yes=true;
const status={_rest_return:{},dying:[]};
const lib={config:{border_style:'none'},skill:{}};
const ui={};
const game={players:[],dead:[],reserveDead:false,me:null,
 log(){},logv(){},addVideo(){},arrangePlayers(){},broadcastAll(fn,...args){fn(...args);},
 broadcast(fn,...args){fn(...args);},
 callHook(){},tryDieAudio(p){trace.push(['deathAudio',p.id]);},trySkillAudio(id,p){trace.push([id,p.id]);}};
const get={translation:p=>p.id,attitude:(p,t)=>p===t?5:t.friend};
const compile=s=>new Function('game','lib','ui','get','_status','return '+s)(game,lib,ui,get,status);
const content=read('../../../noname/library/element/content.js');
const dieSteps=compile(content.slice(content.indexOf('  die: [')+7,content.indexOf('  //进入休整状态')).trim().replace(/,$/,''));
const nativeRest=compile(content.slice(content.indexOf('  async rest('),content.indexOf('  //结束休整状态')).trim().replace(/^async rest/, 'async function').replace(/,$/,''));
const nativeEnd=compile(content.slice(content.indexOf('  async restEnd('),content.indexOf('  //复活事件')).trim().replace(/^async restEnd/,'async function').replace(/,$/,''));
const nativeRevive=compile(content.slice(content.indexOf('  async revive('),content.indexOf('  //暂时还是只能一次加一张牌')).trim().replace(/^async revive/,'async function').replace(/,$/,''));
const nativeSkills=read('../../../noname/library/skill.js');
const nativeReturn=compile(nativeSkills.slice(nativeSkills.indexOf('  _rest_return: {')+16,nativeSkills.indexOf('  /**',nativeSkills.indexOf('  _rest_return: {'))).trim().replace(/,$/,''));
const skills=new Function('game','get','_status',read('../character/skills/qiqi.js').replace(/^import .*;\r?\n/gm,'').replace(/export function/g,'function').replace('export default','return'))(game,get,status);
Object.assign(lib.skill,skills,{_rest_return:nativeReturn});
function box(){return {style:{},innerHTML:'',show(){},hide(){}};}
function actor(id){const classes=new Set();return {id,playerid:id,hp:0,maxHp:3,storage:{},mounted:new Set(),friend:3,stat:[{}],tempSkills:{},marks:{},cards:[{},{}],
 classList:{contains:x=>classes.has(x),add:x=>classes.add(x),remove:x=>classes.delete(x)},
 node:{count:box(),hp:box(),equips:box(),avatar:box(),avatar2:box(),marks:{childNodes:[{}]}},
 isDead(){return classes.has('dead');},isAlive(){return !this.isDead();},isOut(){return classes.has('out');},isIn(){return !this.isDead()&&!this.isOut();},
 isRest(){return this.isAlive()&&this.isOut()&&status._rest_return[this.id];},
 removeLink(){},update(){},removeAttribute(){},removeTip(){},$die(){},
 markSkill(s){if(this.marks[s])return;const list=this.node.marks.childNodes;const node={name:s,remove(){list.remove(node);}};this.marks[s]=node;list.push(node);},
 unmarkSkill(s){this.marks[s]?.remove();delete this.marks[s];},
 getCards(){return this.cards;},getSkills(){return [...this.mounted];},addSkill(s){this.mounted.add(s);if(lib.skill[s]?.mark)this.markSkill(s);},removeSkill(s){this.mounted.delete(s);this.unmarkSkill(s);},hasSkill(s){return this.mounted.has(s);},
 async recover(){this.hp=Math.min(this.maxHp,this.hp+1);trace.push(['recover',this.id]);},
 chooseBool(){return {set(k,v){if(k==='ai')trace.push(['AI',v()]);return this;},async forResult(){return {bool:yes};}};},
 awakenSkill(s){trace.push(['spent',s]);},logSkill(s,t,a,b,args){assert.deepEqual(args,[]);assert.equal(lib.skill[s].audio,false);},
 changeHp(n){this.hp=Math.min(this.maxHp,this.hp+n);trace.push(['hp',this.id,this.hp]);return {set(){return this;},then(resolve){resolve();}};},
 discard(cs){assert.equal(cs,this.cards);this.cards=[];trace.push(['discard',this.id]);return {set(){return this;},then(resolve){resolve();}};},
 async draw(n){trace.push(['draw',this.id,n,this.hp]);this.cards.push(...Array(n).fill({}));},
 async rest(map){await nativeRest({restMap:map,trigger:async n=>dispatch(n,{player:this})},null,this);},
 async restEnd(){await nativeEnd({restEndMap:{hp:this.maxHp},trigger:async n=>dispatch(n,{player:this})},null,this);},
 async reviveEvent(hp,log){await nativeRevive({hp,log},null,this);},
 dieAfter(){trace.push(['modeResult',this.id]);},dieAfter2(){trace.push(['modeReward',this.id]);},
 };}
let q,a;
function reset(){trace.length=0;yes=true;status._rest_return={};status.dying=[];q=actor('q');a=actor('a');q.hp=3;q.mounted.add('fan_huihai');game.players=[q,a];game.dead=[];
 for(const [p,other] of [[q,a],[a,q]])p.previous=p.next=p.previousSeat=p.nextSeat=other;
 status.roundStart=q;}
async function dispatch(name,event){
 const holders=[...new Set([...game.players,...game.dead])];
 for(const p of holders)for(const id of [...p.mounted,'_rest_return']){
  const s=lib.skill[id];if(!s?.trigger)continue;
  if(!p.isIn()&&!(p.isDead()?s.forceDie:s.forceOut))continue;
  const matches=(s.trigger.global===name||Array.isArray(s.trigger.global)&&s.trigger.global.includes(name))
    ||event.player===p&&(s.trigger.player===name||Array.isArray(s.trigger.player)&&s.trigger.player.includes(name))
    ||event.source===p&&(s.trigger.source===name||Array.isArray(s.trigger.source)&&s.trigger.source.includes(name));
  if(matches&&(!s.filter||s.filter(event,p,name)))await s.content({triggername:name,name:id},event,p);
 }
}
async function death(target){const event={player:target,excludeMark:[],getParent:()=>({name:'dying'}),trigger:async n=>dispatch(n,event),cancel(){this.cancelled=true;}};
 await dispatch('dieBefore',event);if(!event.cancelled){for(const step of dieSteps)await step(event,null,target);await dispatch('dieAfter',event);}return event;}
reset();let e=await death(a);assert(e.reserveOut);assert(q.storage.fan_huihai_used);assert(a.isRest());assert.equal(a.cards.length,0);
assert(!trace.some(t=>t[0]==='modeResult'||t[0]==='modeReward'||t[0]==='deathAudio'));
assert.equal(trace.filter(t=>t[0]==='fan_huihai_voice1').length,1);assert.equal(status._rest_return.a.count,1);
assert(!skills.fan_huihai.filter({player:q},q));
assert.equal(skills.fan_huihai.locked,false);
// Owner loss and departure do not cancel the granted return effect.
q.mounted.clear();q.classList.add('out');await dispatch('phaseBefore',{player:q});assert(a.isRest());
await dispatch('phaseBefore',{player:a,skill:'extra'});assert(a.isRest());
await dispatch('phaseBefore',{player:a});assert(a.isIn());assert.equal(a.hp,2);assert.equal(a.cards.length,2);
assert(!a.hasSkill('fan_huihai_rest'));assert(!a.storage.fan_huihai_rest);
assert.deepEqual(trace.at(-1),['draw','a',2,2]);await dispatch('restEnd',{player:a});assert.equal(a.cards.length,2);
// Self rescue retains the spent limited state through death, rest and revival.
reset();e=await death(q);assert(e.reserveOut);assert(q.isRest());assert.equal(status.roundStart,q);
await dispatch('phaseBefore',{player:q});assert(q.isIn());assert.equal(q.hp,2);assert(q.storage.fan_huihai_used);assert.equal(q.cards.length,2);
// Cancel: native mode result/reward and three-way native death routing remain enabled.
reset();yes=false;e=await death(a);assert(!e.reserveOut);assert(a.isDead());assert(!q.storage.fan_huihai_used);
assert(trace.some(t=>t[0]==='modeResult'));assert(trace.some(t=>t[0]==='modeReward'));assert(trace.some(t=>t[0]==='deathAudio'));
assert(!trace.some(t=>t[0]==='fan_huihai_voice1'));assert.equal(a.cards.length,0);
// Enemy AI declines; self AI accepts. Reserved native rests are not stolen.
reset();a.friend=-4;yes=false;await death(a);assert(trace.some(t=>t[0]==='AI'&&t[1]===false));
reset();assert(!skills.fan_huihai.filter({player:a,reserveOut:true,getParent:()=>({})},q));
assert(!skills.fan_huihai.filter({player:a,getParent:()=>({name:'giveup'})},q));
// Rest immunity follows mbmowang; a nested death cannot destroy the reservation.
reset();await death(a);e=await death(a);assert(e.cancelled);assert(a.isRest());
// HP adjustment obeys the current upper limit and does not increase max HP.
a.maxHp=1;await dispatch('phaseBefore',{player:a});assert.equal(a.hp,1);assert.equal(a.maxHp,1);assert.equal(a.cards.length,2);
// Real native death mark cleanup is enabled (reserveDead:false). Keep only the
// existing talisman, for both self and ally rescues; never recreate after return.
for(const self of [false,true]){
 reset();const target=self?q:a;target.addSkill('fan_due_zhenfu');target.markSkill('unrelated');
 const mark=target.marks.fan_due_zhenfu;
 e=await death(target);assert.deepEqual(e.excludeMark,['fan_due_zhenfu']);
 assert.equal(target.marks.fan_due_zhenfu,mark);assert(!target.marks.unrelated);assert(target.hasSkill('fan_due_zhenfu'));
 await dispatch('damageSource',{source:target,num:1});assert(target.hasSkill('fan_due_zhenfu'),'rest disables ordinary triggers');
 await dispatch('phaseBefore',{player:target});assert.equal(target.marks.fan_due_zhenfu,mark);assert.equal(target.hp,2);
 await dispatch('damageSource',{source:target,num:1});assert.equal(target.hp,3);assert(!target.hasSkill('fan_due_zhenfu'));assert(!target.marks.fan_due_zhenfu);
 const heals=trace.filter(t=>t[0]==='recover').length;await dispatch('damageSource',{source:target,num:1});assert.equal(trace.filter(t=>t[0]==='recover').length,heals);
}
reset();e=await death(a);assert.deepEqual(e.excludeMark,[]);assert(!a.marks.fan_due_zhenfu,'no talisman is created');
reset();a.addSkill('fan_due_zhenfu');yes=false;e=await death(a);assert.deepEqual(e.excludeMark,[]);assert(!a.marks.fan_due_zhenfu,'declining does not exempt normal cleanup');
console.log('PASS Qiqi Huihai: actual native die/rest/restEnd/revive/return bodies, mounted triggers, self/ally/cancel/enemy AI, native mode bypass, cleanup, extra-turn exclusion, independent return, limited state, low max HP. Harness simulation, not a game session.');
