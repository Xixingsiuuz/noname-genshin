import assert from'node:assert/strict';
import{readFileSync,existsSync}from'node:fs';
const read=p=>readFileSync(new URL(p,import.meta.url),'utf8');
const strip=s=>s.replace(/^import.*;\r?\n/gm,'').replace(/export /g,'');
const data=new Function(strip(read('../card/monarch-data.js'))+';return{monarchFaces,sampleMonarch,sampleHeavenlyMonarch};')();
const{monarchFaces:faces,sampleMonarch:sample,sampleHeavenlyMonarch:watch}=data;
assert.equal(sample(()=>0).filter(c=>c.source==='pile').length,2);assert(sample(()=>0).slice(0,2).every(c=>c.name==='sha'));
assert(sample(()=>.99).slice(0,3).every(c=>c.name==='guohe'));
let rolls=[0,0,0,.4,0,.4,.9,.9];assert.deepEqual(sample(()=>rolls.shift()).slice(2).map(c=>c.name),['fan_yuanxiedi','fan_xiedi','fan_diwanglingyu']);
assert.throws(()=>sample(()=>-1),RangeError);
const pile=[...Array.from({length:50},()=>({name:'sha'})),{name:'shan'},{name:'tao'},{name:'guohe'}],original=pile.slice();
let seed=1;const random=()=>((seed=(1664525*seed+1013904223)>>>0)/2**32);let sha=0;
for(let i=0;i<10000;i++){const seen=watch(pile,random);assert.equal(new Set(seen.map(c=>c.name)).size,3);sha+=seen.some(c=>c.name==='sha');}
assert(Math.abs(sha/10000-.75)<.02,'按牌名抽取，不因杀实体多而偏重');assert.deepEqual(pile,original,'抽样不移动或重排牌堆');
assert.equal(watch([{name:'sha'},{name:'sha'}],()=>0).length,1);assert.deepEqual(watch([],()=>0),[]);
Object.defineProperty(Array.prototype,'sortBySeat',{configurable:true,value(){return this;}});
const sounds=[];const get={name:card=>card.name,color:c=>c.color,translation:id=>id};const lib={filter:{cardDiscardable:c=>!c.protected}};const ui={};const game={};
const{monarchCards:cards,monarchSkills:skills,outsideDraw}=new Function('playCynoSound','game','get','lib','ui','_status','monarchFaces','sampleMonarch','sampleHeavenlyMonarch',strip(read('../card/monarch.js'))+';return{monarchCards,monarchSkills,outsideDraw};')(sound=>sounds.push(sound),game,get,lib,ui,{},faces,sample,watch);
for(const[name,c]of Object.entries(cards)){assert.equal(c.derivation,'fan_cyno');assert.equal(c.destroy,'discardPile');assert(faces[name]);assert(existsSync(new URL('../'+c.image.replace('ext:原神/',''),import.meta.url)));}
let hp=0,discardCount=0;
const target={isIn:()=>true,countDiscardableCards:()=>1,async loseHp(){hp++;}};
const actor={discardPlayerCard(t,zone,n){discardCount=n;return{async forResult(){return{bool:true,cards:[{color:'black'}]};},then(resolve){resolve();}};}};
await cards.fan_xiedi.content({target},null,actor);assert.equal(hp,1);assert.equal(discardCount,1);
actor.discardPlayerCard=()=>({async forResult(){return{bool:true,cards:[{color:'red'}]};}});
await cards.fan_xiedi.content({target},null,actor);assert.equal(hp,1);
actor.discardPlayerCard=(t,z,n)=>{discardCount=n;return Promise.resolve();};
await cards.fan_yuanxiedi.content({target},null,actor);assert.equal(discardCount,1);assert.equal(hp,2,'不足两张仍失血');
const p={storage:{},held:[],isIn:()=>true,addSkill(){},markSkill(){},removeSkill(id){delete this.storage[id];},getCards(){return this.held;},async discard(c){this.discarded=c;}};
const effect=skills.fan_diwanglingyu_effect;
assert.deepEqual(effect.trigger.player,["drawBefore","gainBefore"]);
assert.equal(effect.content.constructor, (async () => {}).constructor,
 "使用异步内容保留引擎执行时所需的模块作用域");
for(const name of ["draw","gain"]){
 const event={name,player:p,cancel(){this.cancelled=true;}};
 assert(effect.filter(event,p));
 let popup;
 p.popup=(...args)=>{popup=args;};
 await effect.content({},event,p);
 assert.deepEqual(popup,["fan_diwanglingyu","metal"]);
 assert.equal(sounds.pop(),"addcounter");
 assert(event.cancelled);
 const inDraw={name,player:p,parent:{name:"skill",parent:{name:"phaseDraw",player:{}}}};
 assert(!outsideDraw(inDraw));
 assert(!effect.filter(inDraw,p));
}
assert(effect.filter({name:"gain",parent:{name:"loseAsync"}},p));
const source={},secondSource={};await cards.fan_diwanglingyu.content({target:p},null,source);await cards.fan_diwanglingyu.content({target:p},null,secondSource);
assert.deepEqual(p.storage.fan_diwanglingyu_effect,[source,secondSource]);
game.hasPlayer=fn=>fn(p);game.filterPlayer=fn=>[p].filter(fn);
const expiry=skills.fan_diwanglingyu_expire;assert(expiry.filter({player:source}));await expiry.content({}, {player:source});assert.deepEqual(p.storage.fan_diwanglingyu_effect,[secondSource]);await expiry.content({}, {player:secondSource});assert(!p.storage.fan_diwanglingyu_effect);
// 天帝只动所选牌，既不先入手，也不改变未选牌顺序。
ui.cardPile={};const viewed=[{name:'sha'},{name:'shan'},{name:'tao'}];for(const c of viewed)c.parentNode=ui.cardPile;
ui.cardPile.childNodes=viewed;let step=0,discardedCard;
const choice=links=>({set(){return this;},async forResult(){return{bool:true,links};}});
const heaven={isIn:()=>true,hasUseTarget:()=>false,chooseButton(){return choice(step++===0?[viewed[1]]:['discard']);}};
game.cardsDiscard=async list=>{discardedCard=list[0];};game.updateRoundNumber=()=>{};
await cards.fan_tiandi.content({},null,heaven);assert.equal(discardedCard,viewed[1]);assert.deepEqual(ui.cardPile.childNodes,viewed);
step=0;let usedCard;heaven.hasUseTarget=(card,distance,includecard)=>card.name==="sha"&&distance===true&&includecard===false;heaven.chooseButton=()=>choice(step++===0?[viewed[0]]:['use']);heaven.chooseUseTarget=async options=>{usedCard=options.card;assert.equal(options.forced,true);assert.equal(options.addCount,false);};
await cards.fan_tiandi.content({},null,heaven);assert.equal(usedCard,viewed[0]);
assert(read('../card/index.js').includes('...monarchCards'));assert(read('../character/skill.js').includes('...monarchSkills'));assert(read('../card/cyno-faces.js').includes('monarchFaces') && read('../character/skills/tester.js').includes('faces[link[2]]'));
delete Array.prototype.sortBySeat;
console.log("PASS 真帝王：抽样、天帝、弃牌失血、领域获得前拦截及到期（模拟）");
