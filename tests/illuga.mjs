import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const game={players:[],dead:[],roundNumber:1};
const get={attitude:(p,t)=>t.friend?5:-5,translation:t=>t.name,position:c=>c.position,value:c=>c.value ?? 2,name:c=>c.name,effect:()=>-3};
const ui={selected:{cards:[]}};
const lib={skill:{},filter:{cardEnabled:c=>!c.disabled}};
const source=readFileSync(new URL('../character/skills/illuga.js',import.meta.url),'utf8');
const skills=new Function('lib','game','get','ui','_status',source.replace(/^import .*;\r?\n/gm,'').replace('export function','function').replace('export default','return'))(lib,game,get,ui,{});
lib.skill=skills;
Array.prototype.sortBySeat=function(){return this.sort((a,b)=>a.seat-b.seat)};
Array.prototype.remove=function(x){const i=this.indexOf(x);if(i>=0)this.splice(i,1);return this};
const choice=result=>({set(){return this},async forResult(){return result}});
const log=[];
function actor(name,seat){return {name,seat,storage:{},alive:true,history:[],isIn(){return this.alive},getAllHistory(type,filter){return this.history.filter(filter)},hasSkillTag(){return false},getCards(){return this.cards||[]},inRange(){return true},chooseToDiscard(){return choice(this.discardResult||{bool:false})},chooseBool(){return choice({bool:true})},logSkill(){},async gain(cards){log.push(['gain',name,cards.length])},async draw(n=1){log.push(['draw',name,n])},countDiscardableCards(){return 2},async discardPlayerCard(t,pos,n){log.push(['discard',t.name,n])}}}
const owner=actor('叶洛亚',0),a=actor('小乔',2),b=actor('另一目标',1),sourcePlayer=actor('使用者',3),dead=actor('阵亡伤者',4);
game.players=[owner,a,b,sourcePlayer];game.dead=[dead];
const use={card:{name:'sha'},player:sourcePlayer,targets:[a,b]};
const targetEvent=t=>({card:use.card,target:t,getParent:()=>use});
assert(skills.fan_xunye.group==='fan_xunye_settle');
owner.discardResult={bool:true,cards:[{position:'d'},{position:'d'}]};
await skills.fan_xunye.content({},targetEvent(a),owner);
owner.discardResult={bool:false};
await skills.fan_xunye.content({},targetEvent(b),owner);
await skills.fan_xunye.content({},targetEvent(a),owner);
assert.equal(use.fan_xunye_records.length,2);
// Original target takes no damage; transferred damage remains associated with this use.
dead.history=[{num:1,card:use.card,getParent:()=>use}];
assert(skills.fan_xunye.subSkill.settle.filter(use,owner));
await skills.fan_xunye.subSkill.settle.content({},use,owner);
assert.deepEqual(log,[['gain','小乔',2],['draw','另一目标',1],['draw','小乔',1]]);
assert(!skills.fan_xunye.subSkill.settle.filter(use,owner));
log.length=0;dead.history=[];
use.fan_xunye_records=[{owner,target:a,count:2},{owner,target:b,count:1}];
// Nested use, another card and zero damage must not satisfy this sha.
b.history=[{num:1,card:use.card,getParent:()=>({})},{num:1,card:{name:'sha'},getParent:()=>use},{num:0,card:use.card,getParent:()=>use}];
await skills.fan_xunye.subSkill.settle.content({},use,owner);
assert.deepEqual(log,[['draw','叶洛亚',1],['discard','使用者',1],['draw','叶洛亚',2],['discard','使用者',2]]);
log.length=0;use.targets=[owner,a];const e={card:use.card,getParent:()=>use};
assert(skills.fan_tuoshen.filter(e,owner));
await skills.fan_tuoshen.content({},e,owner);
assert.deepEqual(use.targets,[a]);assert(!skills.fan_tuoshen.filter(e,owner));
use.targets=[owner,a];game.roundNumber=2;assert(skills.fan_tuoshen.filter(e,owner));
owner.chooseBool=()=>choice({bool:false});await skills.fan_tuoshen.content({},e,owner);assert.equal(owner.storage.fan_tuoshen_round,1);
use.targets=[owner];assert(!skills.fan_tuoshen.filter(e,owner));
const chars=new Function('smoothPortraits',readFileSync(new URL('../character/character.js',import.meta.url),'utf8').replace(/^import .*;\r?\n/gm,'').replace('export const','const').replace('export default characters;','return characters;'))({});
const titles=new Function(readFileSync(new URL('../character/title.js',import.meta.url),'utf8').replace('export default','return'))();
const intros=new Function(readFileSync(new URL('../character/intro.js',import.meta.url),'utf8').replace('export default','return'))();
for(const id of Object.keys(chars)){assert(titles[id]?.trim(),id+' title');assert(intros[id]?.trim(),id+' intro')}
console.log('illuga: transfer, independent zero-discard reward, per-target counts, seat order, nested use, round limit, cancellation, all character profiles passed');


// Exercise the actual choice AI, rather than duplicating its scoring formula.
let discardAI;
owner.chooseToDiscard=()=>({set(key,value){if(key==='ai')discardAI=value;return this},async forResult(){return {bool:false}}});
const scoreUse={card:{name:'sha'},player:owner,targets:[a]};
const scoreEvent={card:scoreUse.card,target:a,getParent:()=>scoreUse};
a.mayHaveShan=()=>true; a.friend=false;
await skills.fan_xunye.content({},scoreEvent,owner);
assert(discardAI({value:2})<0,'own sha must not feed enemy');
assert(discardAI({value:-2})<0,'negative-value material must not bypass enemy protection');
scoreUse.player=sourcePlayer;
assert(discardAI({value:2})<0,'another attacker must not make feeding an enemy attractive');
a.friend=true;
assert(discardAI({value:2})>0,'support ally with low-value cards');
assert(discardAI({value:12})<0,'preserve expensive material');
a.friend=false;
assert(discardAI({value:2})<0,'re-evaluate changed relation');
a.friend=true;
owner.inRange=()=>false;
assert(discardAI({value:2})>0,'allow miss-and-punish support outside gift range');
scoreUse.player=owner;a.friend=false;
assert(discardAI({value:2})<0,'own attack on enemy must not speculate on self-discard reward');
console.log('illuga AI: enemy gift, own attack, ally support, card cost, relation changes and outside-range support passed');

scoreUse.player=sourcePlayer;scoreUse.targets=[owner];scoreEvent.target=owner;
owner.friend=true;owner.cards=[{name:'shan',value:6},{name:'tao',value:7}];
scoreUse.fan_xunye_records=[];
await skills.fan_xunye.content({},scoreEvent,owner);
assert(discardAI({name:'sha',value:6})>0,'self defense should actively cycle medium-value cards');
assert(discardAI(owner.cards[0])<0,'preserve the only Shan');
ui.selected.cards=[owner.cards[0]];assert(discardAI({value:2})<0);ui.selected.cards=[];
scoreUse.directHit=[owner];assert(discardAI({value:2})<0);scoreUse.directHit=[];
sourcePlayer.hasSkillTag=()=>true;assert(discardAI({value:2})<0);sourcePlayer.hasSkillTag=()=>false;
owner.cards[0].disabled=true;assert(discardAI({value:2})<0);owner.cards[0].disabled=false;
scoreUse.customArgs={default:{shanRequired:2}};assert(discardAI({value:2})<0);
owner.cards.push({name:'shan'});assert(discardAI({value:2})>0);
scoreUse.targets.push(a);scoreUse.directHit=[a];assert(discardAI({value:2})<0);
console.log('illuga self defense AI: usable Shan, preserved materials, direct hit, required count and multiple targets passed');
