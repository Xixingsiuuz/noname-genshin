import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const selected={cards:[],targets:[]}, hooks={checkEnd:[],uncheckEnd:[]};
let roster=[], actions=[];
const c=vm.createContext({lib:{hooks,filter:{cardDiscardable:()=>true}},ui:{selected,create:{div:()=>({style:{},dataset:{},remove(){this.removed=true;}})}},_status:{},game:{filterPlayer:(f=()=>true)=>roster.filter(f),hasNature:e=>!!e.nature},get:{}});
vm.runInContext(readFileSync(new URL('../character/skills/chevreuse.js',import.meta.url),'utf8').replace(/^import .*;\r?\n/,'').replace('export const','const').replace('export default','globalThis.skills ='),c);
const {fan_hewei:h,fan_guzhen:g}=c.skills;
assert.equal(h.filterTarget(),false);selected.cards.push({});assert.equal(h.filterTarget(),true);
assert.equal(h.manualConfirm,true);assert.equal(h.fanPairedConfirm,true);
const p={isIn:()=>true,inRange:t=>t.common,discardPlayerCard:async t=>actions.push('discard'+t.id)};
const partner={isIn:()=>true,inRange:t=>t.common};
roster=[{id:1,common:true},{id:2,common:false},{id:3,common:true}].map(t=>Object.assign(t,{isIn:()=>true,countDiscardableCards:()=>1,link:async state=>actions.push('link'+t.id+state)}));
vm.runInContext('Array.prototype.sortBySeat=function(){return this.reverse()}',c);
// Host array uses the same seat adapter as the native engine for this simulation.
Array.prototype.sortBySeat=function(){return this.reverse()};
await h.content({targets:[partner]},null,p);
assert.deepEqual(actions,['discard3','link3true','discard1','link1true']);
delete Array.prototype.sortBySeat;
assert.equal(g.filter({num:1,nature:'fire'}),true);assert.equal(g.filter({num:1}),false);assert.equal(g.filter({num:0,nature:'fire'}),false);
h.onChooseToUse();h.onChooseToUse();assert.equal(hooks.checkEnd.length,1);
const e={skill:'fan_hewei',player:p,isMine:()=>true};c._status.event=e;selected.targets.push(partner);hooks.checkEnd[0](e);hooks.uncheckEnd[0]();
console.log('Chevreuse simulation passed (selection gates, seat order, chain state, nature trigger, preview hooks).');
// Run the actual trigger chooser with native-shaped controls; effect clicks submit once.
for (const heal of [false,true]) {
  selected.targets.length=0;let callback,done,closed=false,effect='';
  const recipient={isIn:()=>true,isDamaged:()=>heal,recover:async()=>{effect='heal'},draw:async n=>{effect='draw'+n}};
  const chooser={isMine:()=>true,set(){return this},forResult(){return new Promise(resolve=>done=resolve)}};
  c.get.recoverEffect=()=>10;c.get.effect=()=>5;
  c.ui.create.control=(...args)=>{callback=args.pop();return {childNodes:args.map(link=>({link,classList:{toggle(){}},setAttribute(){},style:{}})),close(){closed=true}}};
  c.ui.click={ok(){done({bool:true,targets:[...selected.targets]})},cancel(){done({bool:false})}};
  const owner={chooseTarget:()=>chooser,logSkill(){}};c._status.event=chooser;
  const pending=g.content({},null,owner);
  const hook=hooks.checkEnd.at(-1);hook(chooser);
  callback('摸两张牌');assert.equal(effect,'');assert.equal(chooser.fanGuzhenChoice,undefined);
  selected.targets.push(recipient);hook(chooser);
  callback(heal?'回复体力':'摸两张牌');await pending;
  assert.equal(effect,heal?'heal':'draw2');assert.equal(closed,true);assert.equal(hooks.checkEnd.includes(hook),false);
}
console.log('Guzhen combined controls passed: no target, direct heal/draw, cleanup.');
