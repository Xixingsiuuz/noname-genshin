import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const source=read('character/skills/kaeya.js').replaceAll('\r\n','\n').replace(/^import .*;\r?\n/gm,'').replaceAll('export function','function').replace('export default','return');
const lib={inpile:['sha'],inpile_nature:['fire','thunder','ice']};
let pool,secret,taken,used,discards,log,moved,leave,confirm=true;
const choice=result=>({set(){return this},async forResult(){return result}});
const get={position:c=>c.pos,value:c=>c.value||3,attitude:(a,b)=>a===b?5:-5,effect:()=>-2,cards:()=>pool};
const game={async cardsGotoOrdering(cards){cards.forEach(c=>c.pos='o')},async cardsDiscard(cards){cards.forEach(c=>c.pos='d')}};
const skills=new Function('game','get','lib',source)(game,get,lib);
const helpers=new Function('game','get','lib',source.replace('return {\n  fan_lengren:', 'const skillMap = {\n  fan_lengren:')+'; return {cangfengAttacks,cangfengTakeScore};')(game,get,lib);
function reset(){
 pool=Array.from({length:4},(_,i)=>({id:i,pos:'c',value:i+2}));secret=pool[0];taken=[pool[1]];used=[];discards=[];log=[];moved=false;leave=false;
}
const target={isIn:()=>!leave,hand:[],countCards:()=>target.hand.length,countDiscardableCards(actor,pos){assert.equal(actor,player);assert.equal(pos,'he');return target.hand.length},getCards:()=>target.hand,
 chooseButton(){return choice({bool:true,links:taken})},
 gain(cards){cards.forEach(c=>c.pos='h');this.hand=cards.slice();if(moved){this.hand=this.hand.filter(c=>c!==secret);secret.pos='d'}return {getg:p=>p===target?cards:[],then(resolve){resolve()}}},
 async discard(cards){discards.push(cards.slice());cards.forEach(c=>c.pos='d');this.hand=this.hand.filter(c=>!cards.includes(c))}};
const player={isIn:()=>true,chooseBool:()=>choice({bool:confirm}),logSkill:(...args)=>log.push(args),
 async showCards(){},chooseButton(args){return choice(args[0].includes('秘密')?{bool:true,links:[secret]}:{bool:true,links:[['基本','','sha','fire']]})},
 async gain(cards){cards.forEach(c=>c.pos='p')},
 canUse(card,t,distance,count){assert.equal(t,target);assert.equal(distance,false);assert.equal(count,false);return true},
 async useCard(card,t,count){assert.equal(t,target);assert.equal(count,false);used.push(card)},
 discardPlayerCard(t,pos,forced){assert.equal(t,target);assert.equal(pos,'he');assert(forced);const result={set(){return this},then(resolve){target.hand.shift();discards.push(1);resolve()}};return result}};
for (const count of [1,2,3,4]){
 reset();taken=pool.slice(0,count);
 await skills.fan_cangfeng.content({targets:[target]},null,player);
 assert.equal(used.length,1);assert.equal(used[0].nature,'fire');assert.equal(discards[0].length,count);
 assert.equal(pool.filter(c=>c.pos==='p').length,4-count);
 assert.equal(log.length,0,'secret must never enter public skill logs');
}
reset();await skills.fan_cangfeng.content({targets:[target]},null,player);assert.equal(used.length,0);assert.equal(discards.length,0);assert.equal(pool.filter(c=>c.pos==='p').length,3);
reset();taken=[secret,pool[1]];moved=true;await skills.fan_cangfeng.content({targets:[target]},null,player);assert.equal(discards[0].length,1);assert.equal(used.length,1,'gain snapshot survives later movement');
reset();target.chooseButton=()=>{leave=true;return choice({bool:true,links:taken})};await skills.fan_cangfeng.content({targets:[target]},null,player);assert(pool.every(c=>c.pos==='d'));target.chooseButton=()=>choice({bool:true,links:taken});
reset();target.hand=pool.slice(0,2);assert(skills.fan_lengren.filter({num:1,card:{name:'sha'},player:target},player));assert(!skills.fan_lengren.filter({num:1,card:{name:'juedou'},player:target},player));
await skills.fan_lengren.content({}, {player:target},player);assert.equal(discards.length,2);assert.equal(target.hand.length,0);
reset();target.hand=[pool[0]];await skills.fan_lengren.content({}, {player:target},player);assert.equal(discards.length,1);
reset();target.hand=pool.slice();confirm=false;await skills.fan_lengren.content({}, {player:target},player);assert.equal(discards.length,0);confirm=true;
assert.equal(skills.fan_cangfeng.usable,1);assert.equal(skills.fan_lengren.locked,false);
// Execute the local engine's actual canUse body: exhausted quota must be bypassed,
// range ignored, while target and card prohibitions remain effective.
const native=readFileSync(new URL('../../../noname/library/element/player.js',import.meta.url),'utf8');
const body=native.split('  canUse(card, target, distance, includecard) {')[1].split('\n  /**')[0].replace(/\n  }\s*$/,'');
let enabled=true,targetEnabled=true,rangeCalls=0,quotaCalls=0;
const nativeLib={filter:{cardEnabled:()=>enabled,cardUsable:()=>{quotaCalls++;return false},targetInRange:()=>{rangeCalls++;return false},targetEnabled:()=>targetEnabled}};
const nativeGet={info:()=>({}),itemtype:()=>null};
const canUse=new Function('lib','get','_status','card','target','distance','includecard',body).bind(player,nativeLib,nativeGet,{});
assert(canUse({name:'sha'},target,false,false));assert.equal(rangeCalls,0);assert.equal(quotaCalls,0);enabled=false;assert(!canUse({name:'sha'},target,false,false));enabled=true;targetEnabled=false;assert(!canUse({name:'sha'},target,false,false));
const chars=new Function('smoothPortraits',read('character/character.js').replace(/^import .*;\r?\n/gm,'').replace('export const originalPortraits','const originalPortraits').replace('export default characters;','return characters;'))({});
const titles=new Function(read('character/title.js').replace('export default','return'))();
const intros=new Function(read('character/intro.js').replace('export default','return'))();
for(const id of Object.keys(chars)){assert(titles[id]?.trim(),id+' title');assert(intros[id]?.trim(),id+' intro')}
assert.deepEqual(chars.fan_kaeya.slice(0,4),['male','wei',4,['fan_lengren','fan_cangfeng']]);
reset();
assert.deepEqual(helpers.cangfengAttacks().map(c=>c.nature),[undefined,'fire','thunder']);
for(const attitude of [-5,5]){get.attitude=()=>attitude;for(const effect of [-3,2]){get.effect=()=>effect;const plan=helpers.cangfengTakeScore(pool,target,player);assert(Number.isFinite(plan.score));assert(plan.cards.length>=1&&plan.cards.length<=4)}}
lib.inpile_nature=[];assert.equal(helpers.cangfengAttacks().length,1);lib.inpile=[];assert.equal(helpers.cangfengAttacks().length,0);
console.log('Kaeya: simulated distribution, trap, sequential discard, departure, actual native canUse and all-character profile checks passed.');
