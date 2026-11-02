import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const sounds=[];
const game={trySkillAudio:id=>sounds.push(id),countPlayer:fn=>[{}].filter(fn).length};
const get={color:c=>c.color};
const s=new Function('game','get',readFileSync(new URL('../character/skills/clorinde.js',import.meta.url),'utf8').replace(/^import .*;\r?\n/gm,'').replace('export default','return'))(game,get);
const history=[],losses=[];let stat={sha:0},marks=0,drawn=0;
const p={storage:{},getCards:()=>hand,getAllHistory:(key,f)=>history.filter(f),getHistory:(key,f)=>losses.filter(f),getStat:()=>stat,countMark:()=>marks,addMark:(id,n)=>marks+=n,removeMark:(id,n)=>marks-=n,isIn:()=>true,draw:async n=>drawn+=n,canUse:()=>true};
let hand=[];
// Dispatch only actually held skills and their declared groups.
const held=['fan_zhuying','fan_canguang'];
async function dispatch(name, evt) {
 const attached=[];
 for(const id of held) {
  attached.push(s[id]);
  for(const group of [s[id].group].flat().filter(Boolean)) {
   const key=group.slice(id.length+1);
   if(s[id].subSkill?.[key])attached.push(s[id].subSkill[key]);
  }
 }
 for(const skill of attached.sort((a,b)=>(b.priority||0)-(a.priority||0)))
  if(skill.trigger?.player===name && (!skill.filter || skill.filter(evt,p))) await skill.content({},evt,p);
}
async function use(color,{handOrigin=true,targets=2}={}) {
 const material={color,name:'sha'},card={name:'sha',color,cards:[material]};hand=handOrigin?[material]:[];
 const before=s.fan_canguang.mod.cardUsable(card,p);
 const evt={card,cards:[material],effectCount:1};history.push(evt);stat.sha++;
 if(handOrigin)losses.push({getParent:()=>evt,hs:[material]});
 hand=[];await dispatch("useCard1",evt);
 for(let i=0;i<targets;i++) {const targetEvent={card,isFirstTarget:i===0,getParent:()=>evt};await dispatch("useCardToPlayered",targetEvent);}
 // No draw before useCardAfter, even when a card resolves twice.
 const old=drawn;
 await dispatch("useCardAfter",evt);
 assert.equal(drawn-old,evt.fan_zhuying_draw?2:0);
 assert.equal(s.fan_zhuying.subSkill.draw.filter(evt),false);
 return {evt,before};
}
const sequence=[];for(const color of ['red','black','red','black','red','black']){const {evt,before}=await use(color);sequence.push(evt.effectCount);assert.equal(before,history.length===1?undefined:Infinity);}
assert.deepEqual(sounds.slice(0,5),['fan_zhuying_gain_voice','fan_canguang','fan_zhuying_gain_voice','fan_canguang','fan_zhuying']);
assert.equal(sounds.filter(id=>id==='fan_zhuying').length,2);
assert.equal(sounds.filter(id=>id==='fan_zhuying_gain_voice').length,4);
assert.deepEqual(sequence,[1,1,2,1,1,2]);assert.equal(marks,0);assert.equal(drawn,4);assert.equal(stat.sha,1); // quota exhausted by first, later exemptions remain legal
const {evt:outside,before}=await use('red',{handOrigin:false});assert.equal(before,undefined);assert.notEqual(outside.addCount,false);
const prior=marks;await use('black',{targets:0});assert.equal(marks,prior);
hand=[{name:'sha',color:'red'}];const other={name:'sha',color:'red'};assert.equal(s.fan_canguang.mod.cardUsable({name:'sha',color:'red',cards:[hand[0],other]},p),undefined);
assert.equal(s.fan_canguang.mod.cardUsable({name:'sha',color:'unsure',cards:hand},p),undefined);
assert.deepEqual(s.fan_zhuying.ai.effect.player({name:'sha'}, {...p,countMark:()=>2}),[2,0.8]);
assert.equal(s.fan_zhuying.ai.effect.player({name:'sha'}, {...p,countMark:()=>1}),undefined);
console.log('PASS clorinde: markers, multi-target dedupe, one use-after draw, hand snapshots, exemptions, AI');
