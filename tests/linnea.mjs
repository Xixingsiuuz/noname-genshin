import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../character/skills/linnea.js',import.meta.url),'utf8');
const get={itemtype:x=>x?.material?'card':null,tag:()=>true,effect:(t)=>t.value,translation:x=>x};
const skills=new Function('lib','game','get','ui','_status',source.replace(/^import .*;\r?\n/gm,'').replace('export default','return'))({card:{sha:{}}}, {trySkillAudio(){}},get,{},{event:{fanBowenMaterial:{material:true},result:{skill:"fan_bowen_convert"}}});
const target={value:-6}, other={value:2};
let disabled=false,draws=0,choice='取消该目标';
const player={storage:{fan_bowen:['sha']},hasSkill:()=>disabled,isIn:()=>true,logSkill(){},draw:async()=>draws++,addTempSkill(id,expiry){assert.equal(id,'fan_shizhi_disabled');assert.equal(expiry.global,'roundStart');disabled=true;},chooseControl(){const next={set(k,v){if(k==='ai')assert.equal(v(),choice==='取消该目标'?1:0);return next;},async forResult(){return {control:choice};}};return next;}};
const use={targets:[target,other],card:{name:'sha'},player:{}};
use.targets.remove=function(t){this.splice(this.indexOf(t),1);};
const trigger={target,card:use.card,getParent:()=>use};
assert.equal(skills.fan_shizhi.filter(trigger,player),true);
await skills.fan_shizhi.content({},trigger,player);
assert.deepEqual([...use.targets],[other]);assert.equal(use.all_excluded,undefined);
assert.equal(skills.fan_shizhi.filter({...trigger,target:other},player),false);
disabled=false;choice='摸牌';other.value=2;
await skills.fan_shizhi.content({}, {...trigger,target:other},player);
assert.equal(draws,1);assert.equal(disabled,false);
assert.equal(skills.fan_shizhi.filter({...trigger,card:{name:'juedou'},target:other},player),false);
const backup=skills.fan_bowen_convert.chooseButton.backup([['basic','','sha','fire']]);
assert.equal(backup.viewAs.nature,'fire');
player.addTempSkill=(id,expiry)=>{assert.equal(id,'fan_bowen_used');assert.equal(expiry.global,'phaseBefore');};
backup.onuse({},player);
console.log('Linnea: target cancellation, round disable, draw continuation, name matching and turn limit passed (simulation).');

// Native backup selects live materials and targets together; no secondary use event.
assert.equal(backup.selectCard, -1);
assert.equal(backup.position, "hes");
assert.equal(backup.content, undefined);
assert.equal(backup.precontent, undefined);
assert.equal(backup.manualConfirm, true);
assert.equal(source.includes('chooseUseTarget('), false);
assert.equal(source.includes('player.useCard('), false);
console.log('Linnea conversion: native material/target selection, no extra use or confirmation stage.');

assert.equal(backup.viewAsFilter({hasSkill:()=>false,getCards:()=>[]}), false);
console.log('Missing or moved materials cannot enable conversion.');
const material={id:'hand'}, replacement={id:'other'}, selected={cards:[material],buttons:[{link:['basic','','sha']}]};
const status={event:null}, parent={result:{skill:'fan_bowen_convert'}};
const owner={hasSkill:()=>false,getCards:()=>[material,replacement]};
const loaded=new Function('lib','game','get','ui','_status',source.replace(/^import .*;\r?\n/gm,'').replace('export default','return'))({card:{sha:{}}},{checkMod:()=> 'unchanged'},get,{selected},status);
status.event={player:owner,getParent:()=>parent};
assert.equal(loaded.fan_bowen_convert.chooseButton.filterOk(),true);
assert.equal(parent.fanBowenMaterial,material);
status.event=parent;
const bound=loaded.fan_bowen_convert.chooseButton.backup([['basic','','sha']]);
assert.equal(bound.filterCard(material,owner),true);
assert.equal(bound.filterCard(replacement,owner),false);
assert.equal(bound.filterOk(),true);
assert.equal(bound.viewAsFilter(owner),true);
selected.cards=[];
assert.equal(bound.filterOk(),false); // zero materials cannot become a free virtual card
selected.cards=[replacement];
assert.equal(bound.filterOk(),false); // never substitute another material
assert.equal(bound.viewAsFilter({...owner,getCards:()=>[replacement]}),false);
status.event=parent;
const missing=loaded.fan_bowen_convert.chooseButton.backup([['basic','','sha']]);
assert.equal(missing.viewAsFilter(owner),false);
console.log('Joint selection binds exact material despite stale parent.result; zero, substituted and moved materials rejected.');
