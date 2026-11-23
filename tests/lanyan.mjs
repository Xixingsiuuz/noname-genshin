import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../character/skills/lanyan.js',import.meta.url),'utf8');
const ui={selected:{cards:[],targets:[]}};
const get={suit:c=>c.suit,color:c=>c.color,attitude:()=>5,value:()=>2};
const skills=new Function('lib','game','get','ui','_status',source.replace(/^import .*;\r?\n/gm,'').replaceAll('export function','function').replace('export default','return'))({}, {},get,ui,{});
const a={suit:'heart'},b={suit:'heart'},c={suit:'spade'};
const target={getCards:()=>[a,b],isIn:()=>true};
const owner={storage:{fan_yinling_records:[{target,cards:[a,b]}]},getCards:()=>[a,b,c]};
// Expand actual grouped triggers, rather than invoking an unattached recorder.
const grouped=skills.fan_yinling.group.map(id=>skills.fan_yinling.subSkill[id.replace('fan_yinling_','')]);
assert(grouped[0].filter({player:target,cards:[a]},owner));
assert(grouped[0].filter({player:target,cards:[a,b]},owner));
assert(!grouped[0].filter({player:{},cards:[a]},owner));
assert(!grouped[0].filter({player:target,cards:[c]},owner));
assert(grouped[1].filter({player:target},owner));
target.getCards=()=>[c];assert(!grouped[1].filter({player:target},owner));
ui.selected.cards=[a];assert(skills.fan_yinling.filterCard(b,owner));assert(!skills.fan_yinling.filterCard(c,owner));
ui.selected.cards=[a,b];ui.selected.targets=[target];assert(skills.fan_yinling.filterOk());
ui.selected.cards=[];assert(!skills.fan_yinling.filterOk());
for(const color of ['black','red']) {
 let cancelled=false;
 const player={discardPlayerCard:()=>({set(){return this},async forResult(){return {bool:true,cards:[{color}]}}}),logSkill(){}};
 await skills.fan_zhenxie.content({}, {player:target,cancel(){cancelled=true}},player);
 assert.equal(cancelled,color==='black');
}
console.log('lanyan simulated checks passed');

// Exercise the actual choice callback, including engine attitude weighting of target results.
get.attitude=(p,t)=>t.enemy?-5:5;
const ally={},enemy={enemy:true};
assert(skills.fan_yinling.ai.result.target(owner,ally)*get.attitude(owner,ally)>0);
assert(skills.fan_yinling.ai.result.target(owner,enemy)*get.attitude(owner,enemy)<=0);
assert(skills.fan_yinling.filterTarget(null,owner,enemy), 'AI preference must not forbid player targets');
let score;
get.position=c=>c.position||'h';
get.buttonValue=b=>b.link.value;
get.damageEffect=(t,s,p)=>t.enemy?6:-6;
const chooser={
 discardPlayerCard(){return {set(key,value){if(key==='ai')score=value;return this},async forResult(){return {bool:false}}}},
};
async function rating(t,color,value,hidden=false){
 await skills.fan_zhenxie.content({}, {player:t,nature:'fire'},chooser);
 return score({link:{color,value},classList:{contains:()=>hidden}});
}
assert(await rating(chooser,'red',4)<0,'own red card is a cost without prevention');
assert(await rating(chooser,'black',2)>0,'cheap own black card can prevent damage');
assert(await rating(chooser,'black',9)<0,'expensive black card can cost more than prevention');
assert(await rating(ally,'red',4)<0,'do not discard useful allied red card');
assert(await rating(ally,'black',2)>0,'protect ally when worth the cost');
assert(await rating(enemy,'red',4)>0,'enemy red discard can help without preventing damage');
assert(await rating(enemy,'black',2)<0,'do not cheaply prevent harmful damage to enemy');
assert(await rating(ally,'red',-2)>0,'removing a harmful allied card remains reasonable');
assert.equal(await rating(enemy,'red',4,true),await rating(enemy,'black',4,true),'hidden color must not leak');
enemy.enemy=false;
assert(await rating(enemy,'red',4)<0,'re-evaluate changed allegiance');
console.log('lanyan AI regression checks passed');
