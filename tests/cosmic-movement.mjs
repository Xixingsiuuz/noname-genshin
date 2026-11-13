import assert from'node:assert/strict';
import{readFileSync}from'node:fs';
const source=readFileSync(new URL('../card/cosmic-movement.js',import.meta.url),'utf8').replace(/^import.*;\r?\n/gm,'').replace(/export /g,'');
const useSounds=[];
const{cosmicMovementSkill:skill,protectedCosmic}=new Function('game','get','_status','playCynoUseSound',source+';return{cosmicMovementSkill,protectedCosmic};')({}, {owner:c=>c.owner}, {}, use=>useSounds.push(use));
Object.defineProperty(Array.prototype,'sortBySeat',{configurable:true,value(){return this}});
function setup(){
 const card={name:'fan_yuzhouyaobian'},normal={name:'sha'};
 const owner={hand:[card,normal],exp:[],dead:false,moves:0,isDead(){return this.dead},getCards(){return this.hand},getExpansions(){return this.exp},addSkill(){},markSkill(){},addToExpansion(cards){
  const gaintag=[];
  // 原生 add 返回数组；实际失牌发生在等待 GameEvent 时，不能在 add 中提前移牌。
  gaintag.add=function(tag){this.push(tag);return this;};
  return{gaintag,async then(resolve,reject){try{
   await Promise.resolve();
   assert(!skill.filter({name:'lose',cards:[...cards],player:owner}),'嵌套 loseBefore 必须仍有重入保护');
   assert(gaintag.includes('fan_yuzhou_return'));
   owner.moves++;
   for(const c of cards){owner.hand.splice(owner.hand.indexOf(c),1);owner.exp.push(c);}
   resolve();
  }catch(error){reject(error);}}};
 }};
 card.owner=owner;return{card,normal,owner};
}
for(const name of ['lose','gain','loseAsync']){
 const{card,normal,owner}=setup();const event={name,player:{},cards:[card,normal]};if(name==='loseAsync'){event.lose_list=[[owner,[card,normal]]];event.gain_list=[[{},[card,normal]]];}
 assert(skill.filter(event));await skill.content({},event);
 assert.deepEqual(event.cards,[normal]);assert.deepEqual(owner.exp,[card]);assert(!owner.hand.includes(card));
 assert.equal(owner.moves,1,'暂存移牌恰好执行一次');
 if(name==='loseAsync'){assert.deepEqual(event.lose_list[0][1],[normal]);assert.deepEqual(event.gain_list[0][1],[normal]);}
 const theft={name:'gain',cards:[card]};assert(skill.filter(theft));await skill.content({},theft);assert.deepEqual(theft.cards,[]);
 assert(!skill.filter({name:'gain',cards:[card],fanCosmicReturn:true}));
 assert(!skill.filter({name:'lose',cards:[card],parent:{fanCosmicReturn:true}}));
 owner.dead=true;assert(!protectedCosmic(card),'死亡清理允许进入弃牌堆销毁');
}
const {card,owner}=setup();
const use={card,cards:[card]};
const pending=skill.content({}, {type:'use',cards:[card],player:owner,getParent:name=>name==='useCard'?use:null});
assert.deepEqual(useSounds,[use]);
assert.equal(owner.moves,0,'音效应先于暂存动画完成');
await pending;
delete Array.prototype.sortBySeat;
console.log('PASS 宇宙耀变：使用/失牌、获得、交换混合批次、暂存防盗、返还及死亡放行（移动层模拟，非对局实测）');
