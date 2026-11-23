import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const game={log(){},filterPlayer(f){return f?this.players.filter(f):this.players.slice()}};
const get={};const status={};
const src=readFileSync(new URL('../character/skills/lynette.js',import.meta.url),'utf8').replace(/^import .*;\r?\n/gm,'').replaceAll('export function','function').replace('export default','return');
const skills=new Function('game','get','ui','_status',src)(game,get,{selected:{targets:[]}},status);
let responses=[];const owner={hasHistory:(type,f)=>responses.filter(x=>x.name===type).some(f)};
const source={};const phase={player:source};const use={name:"useCard",card:{name:'sha'},player:source,getParent:()=>phase};
const recorder=skills.fan_daiji.subSkill.record;
assert.equal(skills.fan_daiji.group,'fan_daiji_record');
const targeted={target:owner,getParent:()=>use};
assert(recorder.filter(targeted,owner));await recorder.content({},targeted,owner);
assert(skills.fan_daiji.filter(use,owner));
for(const name of ['respond','useCard']){
 responses=[{name,respondTo:[source,use.card]}];assert(!skills.fan_daiji.filter(use,owner));
}
responses=[{name:'respond',respondTo:[source,{}]}];assert(skills.fan_daiji.filter(use,owner));
responses=[];await skills.fan_daiji.content({},use,owner);assert(phase.skipped);
assert(!skills.fan_daiji.filter(use,owner));phase.skipped=false;
use.card={name:'lebu'};assert(skills.fan_daiji.filter(use,owner));
use.getParent=()=>({player:{}});assert(!skills.fan_daiji.filter(use,owner));
let order=[];Array.prototype.sortBySeat=function(start){assert.equal(start,owner);return this.sort((a,b)=>a.seat-b.seat)};
const entity=(seat,n)=>({seat,cards:Array.from({length:n},()=>({})),isIn:()=>true,countCards(){return this.cards.length},getCards(){return this.cards.slice()},async loseToDiscardpile(cards){order.push(seat);this.cards=[]}});
const destination=entity(0,2),a=entity(2,2),b=entity(1,2),c=entity(3,1);
game.players=[destination,a,b,c];let drawn=0;
owner.draw=async n=>{drawn=n};owner.moveCard=()=>({pushHandler(){return this},forResult:async()=>({bool:true,card:{},position:'e',targets:[c,destination]})});
await skills.fan_qiaoshi.content({},null,owner);assert.equal(drawn,2);assert.deepEqual(order,[0,1,2]);assert.equal(destination.cards.length,0);assert.equal(c.cards.length,1);
// Run the actual native continuation to prove skipped retains End/After, without a new action.
const native=readFileSync(new URL('../../../noname/library/element/content.js',import.meta.url),'utf8');
const start=native.indexOf('  phaseUse: [');const end=native.indexOf('  phaseDiscard:',start);
const body=native.slice(start,end);assert(body.includes('result.bool && !event.skipped'));assert(body.includes('event.trigger("phaseUseEnd")'));assert(body.includes('event.trigger("phaseUseAfter")'));
console.log('lynette: response identity, mounted recorder, delayed tricks, phase ownership, movement/draw/seat-order disposal passed; native phase continuation inspected');
// Execute the native phase tail with its real skipped branch, End and After steps.
const phaseSteps=new Function('game','ui',`return ({${body}}).phaseUse` )({broadcastAll:f=>f()},{ });
const trace=[];const ended={skipped:true,goto(){throw Error('re-entered play phase')},trigger:async name=>trace.push(name)};
await phaseSteps[4](ended,null,{}, {bool:true});await phaseSteps[5](ended);await phaseSteps[6](ended);
assert.deepEqual(trace,['phaseUseEnd','phaseUseAfter']);
// Every enabled character must retain a nonempty title and introduction.
const loadObject=(file,marker)=>new Function(readFileSync(new URL(file,import.meta.url),'utf8').replace('export default','return'))();
const titles=loadObject('../character/title.js'),intros=loadObject('../character/intro.js');
const charSrc=readFileSync(new URL('../character/character.js',import.meta.url),'utf8').replace(/^import .*;\r?\n/gm,'').replace('export const originalPortraits','const originalPortraits').replace('export default characters;','return characters;');
const characters=new Function('smoothPortraits',charSrc)({});
for(const [id,def] of Object.entries(characters)){if(def[4]?.includes('unseen'))continue;assert(titles[id]?.trim(),`title ${id}`);assert(intros[id]?.trim(),`intro ${id}`)}
console.log('native phase End/After execution and enabled-character profile coverage passed');
// Counter-nullification, unrelated nesting, source self-use, and cancellation.
use.getParent=()=>phase;use.card={name:'nanman'};
responses=[{name:'useCard',card:{name:'wuxie'},respondTo:[{},{}],getParent:()=>use}];
assert(!skills.fan_daiji.filter(use,owner));
responses=[{name:'useCard',card:{name:'wuxie'},respondTo:[{},{}],getParent:()=>({})}];
assert(skills.fan_daiji.filter(use,owner));responses=[];
const previous=use.player;use.player=owner;assert(!skills.fan_daiji.filter(use,owner));use.player=previous;
let stat={skill:{fan_qiaoshi:1}};owner.getStat=()=>stat;owner.moveCard=()=>({pushHandler(){return this},forResult:async()=>({bool:false})});
await skills.fan_qiaoshi.content({},null,owner);assert.equal(stat.skill.fan_qiaoshi,0);
get.value=()=>4;get.attitude=(p,t)=>t.friendly?3:-3;
for(const p of game.players){p.canEquip=()=>true;p.friendly=false}
destination.friendly=true;
assert(Number.isFinite(skills.fan_qiaoshi.ai.result.player(owner)));
assert.equal(skills.fan_daiji.ai.effect.target({name:'sha'},{isPhaseUsing:()=>false},owner),undefined);
console.log('counter-nullification, unrelated response, cancellation and AI evaluation passed');

// A unique equipment count must not clear the destination.
destination.cards=[{},{}];a.cards=[];b.cards=[];c.cards=[{}];order=[];
owner.moveCard=()=>({pushHandler(){return this},forResult:async()=>({bool:true,card:{},position:'e',targets:[c,destination]})});
await skills.fan_qiaoshi.content({},null,owner);assert.equal(destination.cards.length,2);assert.deepEqual(order,[]);
const translationSource=readFileSync(new URL('../character/translate.js',import.meta.url),'utf8').replace(/^import .*;\r?\n/gm,'').replaceAll('export const','const').replaceAll('export function','function');
const translations=new Function('nativeGet','lib',translationSource+';return {characters:characterTranslate,skills:createSkillTranslate()};')({}, {translate:{}});
assert.equal(translations.characters.fan_lynette,'琳妮特');assert.equal(translations.characters.fan_daiji,undefined);
assert.equal(translations.skills.fan_daiji,'待机');assert(translations.skills.fan_qiaoshi_info.includes('出牌阶段限一次'));
console.log('destination included on matching counts, unique destination retained, translation package separation passed');
