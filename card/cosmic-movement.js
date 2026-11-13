import{game,get,_status}from"../../../noname.js";
import { playCynoUseSound } from "./cyno-sound.js";
const moving=new WeakSet();
const owners=new WeakMap();
export function cosmicOwner(card){return owners.get(card)||get.owner(card);}
export function protectedCosmic(card){
 if(card.name!=="fan_yuzhouyaobian"||moving.has(card))return false;
 const owner=cosmicOwner(card);
 return !!owner&&!owner.isDead?.()&&(owner.getCards("h").includes(card)||owner.getExpansions("fan_yuzhou_return").includes(card));
}
export async function stashCosmic(owner,cards){
 const selected=cards.filter(c=>c.name==="fan_yuzhouyaobian"&&owner.getCards("h").includes(c)&&!moving.has(c));
 if(!selected.length)return;
 for(const c of selected){moving.add(c);owners.set(c,owner);}
 try{
  // gaintag.add 返回标签数组，并非移牌事件；必须等待事件完成再解除重入保护。
  const next=owner.addToExpansion(selected,"give");
  next.gaintag.add("fan_yuzhou_return");
  await next;
  owner.addSkill("fan_yuzhou_return");owner.markSkill("fan_yuzhou_return");
 }
 finally{for(const c of selected)moving.delete(c);}
}
export const cosmicMovementSkill={
 trigger:{global:["loseBefore","gainBefore","loseAsyncBefore"]},forced:true,popup:false,locked:false,forceDie:true,
 filter(event){for(let e=event;e;e=e.parent)if(e.fanCosmicReturn||e.fanCosmicCleanup)return false;return(event.cards||[]).concat((event.lose_list||[]).flatMap(pair=>pair[1]),(event.gain_list||[]).flatMap(pair=>pair[1])).some(protectedCosmic);},
 async content(event,trigger){
  if(trigger.fanCosmicMovementHandled)return;trigger.fanCosmicMovementHandled=true;
  const cards=[...new Set((trigger.cards||[]).concat((trigger.lose_list||[]).flatMap(pair=>pair[1]),(trigger.gain_list||[]).flatMap(pair=>pair[1])))].filter(protectedCosmic);
  const protectedSet=new Set(cards),groups=new Map();
  for(const card of cards){const owner=cosmicOwner(card);if(!groups.has(owner))groups.set(owner,[]);groups.get(owner).push(card);}
  // 只替换宇宙耀变的去向，其余牌继续原移动；实体用牌记录不改名或换素材。
  if(trigger.cards)trigger.cards=trigger.cards.filter(c=>!protectedSet.has(c));
  for(const key of ["lose_list","gain_list"])if(trigger[key])trigger[key]=trigger[key].map(([p,list])=>[p,list.filter(c=>!protectedSet.has(c))]);
  // The expansion animation runs before useCard1. Start the use sound before waiting for it.
  const use = trigger.type === "use" && trigger.getParent("useCard");
  if (use?.card?.name === "fan_yuzhouyaobian" && cards.some(card => use.cards?.includes(card))) {
   playCynoUseSound(use);
  }
  const players=[...groups.keys()].sortBySeat(_status.currentPhase||trigger.player||groups.keys().next().value);
  for(const owner of players)await stashCosmic(owner,groups.get(owner));
 },
};
