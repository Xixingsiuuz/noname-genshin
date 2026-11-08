import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
let s=fs.readFileSync('character/skills/wanderer.js','utf8').replace(/^import .*;\r?\n/,'').replaceAll('export async function','async function').replaceAll('export function','function').replace('export default','globalThis.skills =');
const ctx={lib:{filter:{cardDiscardable:()=>true}},game:{players:[],dead:[],trySkillAudio(){}},get:{}};vm.createContext(ctx);vm.runInContext(s,ctx);
const skills=ctx.skills;
assert.equal(skills.fan_genchu_success.trigger.player,'dying');
assert.equal(skills.fan_genchu_failure.trigger.source,'dieAfter');
function player(n=2){return {storage:{},n,hp:3,isIn:()=>true,getStorage(){return this.storage.fan_shixin||[];},countCards(){return this.n;},async draw(n){this.n+=n;},chooseToDiscard(z,n){this.n-=n;return Promise.resolve();},getStat(){return {card:this.stat};},markAuto(k,v){this.storage[k]=v;},awakenSkill(){},hasSkill:()=>true,async recoverTo(n){this.hp=n;},async removeSkill(k){this.removed=k;},async addSkill(k){this.added=k;}};}
let p=player(0);await ctx.adjustWandererHand(p);assert.equal(p.n,2);p.n=5;await ctx.adjustWandererHand(p);assert.equal(p.n,2);
await skills.fan_genchu_failure.content({}, {},p);assert.equal(p.n,4);assert.equal(p.storage.fan_genchu_result,"failure");assert.equal(skills.fan_genchu_success.filter({},p),false);assert.equal(skills.fan_genchu_failure.filter({},p),false);
p=player(1);await skills.fan_genchu_success.content({}, {},p);assert.equal(p.storage.fan_genchu_result,'success');assert.equal(p.hp,1);assert.equal(p.removed,'fan_xunshen');assert.equal(p.added,'fan_wendao');assert.equal(p.n,2);p.n=5;await ctx.adjustWandererHand(p,true);assert.equal(p.n,5);
p=player();const enemy={};assert.equal(skills.fan_shixin.filter({num:0,source:enemy},p),false);await skills.fan_shixin.content({}, {source:enemy},p);assert.equal(skills.fan_shixin.mod.cardUsableTarget({},p,enemy),true);assert.equal(skills.fan_shixin.mod.cardUsableTarget({},p,{}),undefined);
p.stat={sha:1};let use={card:{name:'sha'},targets:[enemy]};assert.equal(skills.fan_shixin_count.filter(use,p),true);await skills.fan_shixin_count.content({},use,p);assert.equal(p.stat.sha,0);assert.equal(use.addCount,false);assert.equal(skills.fan_shixin_count.filter({targets:[enemy,{}]},p),false);
p.storage.fan_genchu_result='success';assert.equal(skills.fan_genchu.filter({player:enemy,num:1},p),true);p.storage.fan_genchu_used=true;assert.equal(skills.fan_genchu.filter({player:enemy,num:1},p),false);await skills.fan_genchu_reset.content({}, {},p);assert.equal(skills.fan_genchu.filter({player:enemy,num:1},p),true);
console.log('Wanderer simulation passed');


const spoken=[];ctx.game.trySkillAudio=(...args)=>spoken.push(args[0]);
p=player();p.storage.fan_shixin=[enemy];let evt={targets:[enemy]};
assert.equal(skills.fan_shixin_voice.filter(evt,p),true);
await skills.fan_shixin_voice.content({},evt,p);assert.equal(spoken.at(-1),'fan_shixin_pending');
assert.equal(skills.fan_shixin_voice.filter(evt,p),false);
await skills.fan_shixin_voice_reset.content({}, {},p);assert.equal(skills.fan_shixin_voice.filter(evt,p),true);
p.storage.fan_genchu_result='success';await skills.fan_shixin_voice.content({},evt,p);assert.equal(spoken.at(-1),'fan_shixin_success_voice');
p.storage.fan_genchu_result='failure';for(let i=0;i<2;i++){assert.equal(skills.fan_shixin_voice.filter(evt,p),true);await skills.fan_shixin_voice.content({},evt,p);}assert.equal(spoken.at(-1),'fan_shixin_failure_voice');
assert.equal(skills.fan_shixin_voice.filter({targets:[{}]},p),false);
assert.equal(skills.fan_xunshen_draw_voice.filter({num:0},p),false);
assert.equal(skills.fan_xunshen_loss_voice.filter({num:1},p),false);
await skills.fan_xunshen_draw_voice.content({}, {},p);assert.equal(spoken.at(-1),'fan_xunshen_draw_failure');
ctx.game.players=[{name:'fan_raiden',isAlive:()=>true}];assert.equal(ctx.wandererFailureVoice(),'fan_genchu_raiden_alive');
ctx.game.players=[];ctx.game.dead=[{name2:'fan_raiden'}];assert.equal(ctx.wandererFailureVoice(),'fan_genchu_raiden_dead');ctx.game.dead=[];assert.equal(ctx.wandererFailureVoice(),'fan_genchu_failure_voice');
console.log('Wanderer voice state tests passed');
