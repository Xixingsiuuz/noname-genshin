import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL(p,import.meta.url),'utf8');
Array.prototype.randomGet=function(){return this[0]};
Array.prototype.remove=function(item){const i=this.indexOf(item);if(i>=0)this.splice(i,1);return this};
Array.prototype.sortBySeat=function(start){return this.sort((a,b)=>(a.seat-start.seat+8)%8-(b.seat-start.seat+8)%8)};
let choice='造成伤害',yes=true,now=1000;
const trace=[],played=[];
const game={roundNumber:1,players:[],me:null,filterPlayer(fn){assert.equal(typeof fn,'function');return this.players.filter(fn)},trySkillAudio(id,p){played.push(id)},};
const get={translation:()=>'',cnNumber:String,attitude:(p,t)=>t.attitude,effect:(t,c)=>c.name==='draw'?t.attitude: -t.attitude,recoverEffect:(t)=>t.attitude*2,damageEffect:(t)=>-t.attitude*2,nature:c=>c.nature};
const status={};
const source=read('../character/skills/jean.js');
const skills=new Function('game','get','_status','Date',source.replace(/^import .*;\r?\n/gm,'').replace(/export function/g,'function').replace('export default','return'))(game,get,status,{now:()=>now});
function actor(id,seat,attitude=-2){
 return {playerid:id,seat,attitude,h:[],x:[],storage:{},mounted:new Set(),hp:3,maxHp:4,
 isIn(){return !this.out},countCards(){return this.h.length},getCards(){return [...this.h]},getExpansions(){return [...this.x]},isUnderControl:()=>false,isDamaged(){return this.hp<this.maxHp},
 chooseBool(){return {set(k,v){if(k==='ai')this.ai=v;return this},async forResult(){return {bool:yes}}}},
 chooseControl(){return {set(k,v){if(k==='ai')trace.push(['ai',v()]);return this},async forResult(){return {control:choice}}}},
 logSkill(id,target,a,b,args){assert.deepEqual(args,[]);trace.push(id)},addSkill(id){this.mounted.add(id)},removeSkill(id){this.mounted.delete(id)},
 addToExpansion(cards,owner,animate){assert.equal(owner,this);assert.equal(animate,'giveAuto');const tags=[];tags.add=x=>tags.push(x);const self=this;
 return {gaintag:tags,then(resolve,reject){assert(tags.includes('fan_fengya_store'));const loss={name:'addToExpansion',getl:p=>({hs:p===self?cards:[]})};self.h=[];self.x.push(...cards);trace.push('store');dispatch('addToExpansionAfter',loss).then(resolve,reject)}}},
 async gain(card,animation){assert.equal(animation,'draw');this.x.remove(card);this.h.push(card);trace.push('return')},
 async draw(){this.h.push({});trace.push('draw')},async recover(){this.hp=Math.min(this.maxHp,this.hp+1);trace.push('heal')},async damage(n,from){assert.equal(from,jean);this.hp-=n;trace.push('damage')},loseToDiscardpile(cards){this.x=[]},
 };
}
const jean=actor('jean',0,2),enemy=actor('enemy',1),ally=actor('ally',2,2);
jean.mounted=new Set(['fan_fengya','fan_shiya']);game.players=[jean,enemy,ally];status.currentPhase=enemy;
async function dispatch(name,event){for(const p of game.players){for(const id of [...p.mounted]){const s=skills[id];if(Object.values(s.trigger||{}).flat().includes(name)&&s.filter(event,p))await s.content({},event,p)}}}
function use(t){const u={targets:[t],triggeredTargets1:[t]};return {card:{name:'sha'},target:t,getParent:()=>u}}
let t=use(enemy);enemy.h=[{},{}];yes=false;await skills.fan_fengya.content({},t,jean);assert.equal(enemy.h.length,2);assert.equal(played.length,0);
yes=true;await skills.fan_fengya.content({},t,jean);assert.equal(enemy.h.length,0);assert.equal(enemy.x.length,2);assert.equal(enemy.hp,2);assert.deepEqual(t.getParent().targets,[]);assert.deepEqual(trace.filter(x=>typeof x==='string'),['fan_fengya','store','fan_shiya','damage']);assert.deepEqual(played,['fan_fengya_voice1','fan_fengya_voice2']);
const loss={getl:p=>({hs:p===enemy?[{}]:[]})};assert(!skills.fan_shiya.filter(loss,jean),'per target per round');
await dispatch('phaseAfter',{});assert.equal(enemy.h.length,1);assert.equal(enemy.x.length,1);jean.mounted.clear();await dispatch('phaseAfter',{});assert.equal(enemy.x.length,0);assert(!enemy.mounted.has('fan_fengya_store'),'return remains mounted independently');
jean.mounted.add('fan_shiya');enemy.h=[];game.roundNumber++;choice='取消';await dispatch('loseAfter',loss);assert(skills.fan_shiya.filter(loss,jean),'cancel preserves quota');
choice='摸牌回血';await dispatch('loseAfter',loss);assert.deepEqual(trace.slice(-2),['draw','heal']);assert(!skills.fan_shiya.filter(loss,jean));
// A new round refreshes even without owning a recorder at roundStart.
game.roundNumber++;enemy.h=[];assert(skills.fan_shiya.filter(loss,jean));
// Only real hand losses: expansion loss, unrelated player and empty history do not qualify.
assert(!skills.fan_shiya.filter({getl:()=>({hs:[],xs:[{}]})},jean));
// Actual native getl rejects the inner loss of a composite movement.
const playerSource=read('../../../noname/library/element/player.js');
const body=playerSource.slice(playerSource.indexOf('    next.getl = function(player) {',playerSource.indexOf('  lose(')));
const match=body.match(/next.getl = function\(player\) \{([\s\S]*?)\n    \};/);assert(match);
const nativeGetl=new Function('player',match[1]);
const inner={player:enemy,hs:[{}],getlx:false,getl:nativeGetl};assert(!skills.fan_shiya.filter(inner,jean));
// Multiple losses use seat order, recheck hand/state and skip departed characters.
game.players=[jean,ally,enemy];ally.h=[];enemy.h=[];choice='造成伤害';
const both={getl:p=>({hs:p!==jean?[{}]:[]})};assert.deepEqual((()=>{const r=game.players.filter(p=>p!==jean);return r.sortBySeat(enemy)})(),[enemy,ally]);
await dispatch('loseAsyncAfter',both);assert.deepEqual(jean.storage.fan_shiya.targets,['enemy','ally']);
// Voice window is shared by E branches, resets after eight seconds, Q is separate.
const before=played.length;skills.fan_fengya_voice1 && assert.equal(played[before-1],'fan_fengya_voice2');
now+=9000;enemy.h=[{}];game.roundNumber++;jean.mounted.add('fan_fengya');await skills.fan_fengya.content({},use(enemy),jean);assert.equal(played[before],'fan_fengya_voice1');
// Exercise the installed choice AI, including its current HP and quota inputs.
game.roundNumber++;enemy.h=[];ally.h=[];trace.length=0;choice='取消';
await dispatch('loseAsyncAfter',both);assert.deepEqual(trace.filter(x=>Array.isArray(x)).map(x=>x[1]),[1,0]);
ally.hp=ally.maxHp;trace.length=0;await dispatch('loseAsyncAfter',both);assert.deepEqual(trace.filter(x=>Array.isArray(x)).map(x=>x[1]),[1,0]);
assert(Number.isFinite(skills.fan_fengya.ai.effect.player({name:'sha'},jean,{...enemy,countCards:()=>3} )[1]));
// Departed targets and targets that regain cards are not processed.
enemy.out=true;ally.h=[{}];assert(!skills.fan_shiya.filter(both,jean));enemy.out=false;

assert.equal(skills.fan_shiya.locked,false);assert.equal(skills.fan_fengya.locked,false);
console.log('PASS Jean: mounted loss/return events, inner native getl, cancellation, quota/round, seat order, draw then heal, shared voice window. Simulation, not live game.');
