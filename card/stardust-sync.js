import { createCynoReward } from "../ui/cyno-rarity.js";
import {get,game,lib,ui} from "../../../noname.js";

// 只统计本次实际弃置的两张牌，保留弃置前点数，避免销毁/失去标签改变判定。
export function qualifiesForCosmic(cards,starNumber,number=card=>card.number){
 return cards.length===2&&Number.isFinite(starNumber)&&cards.reduce((sum,c)=>sum+number(c),starNumber)===12;
}
export async function exchangeStardust(event,player){
 const star=event.cards?.find(c=>c.name==="fan_xingchenlong");
 const starNumber=get.number(star||event.card,player);
 const available=player.getCards("he",c=>lib.filter.cardDiscardable(c,player));
 if(!available.length)return;
 const numbers=new Map(available.map(c=>[c,get.number(c,player)]));
 const next=player.chooseToDiscard("he",Math.min(2,available.length),true,"星尘龙：弃置两张牌")
  .set("ai",c=>{
   const selected=ui.selected.cards;
   const canComplete=available.some(other=>other!==c&&numbers.get(other)+numbers.get(c)+starNumber===12);
   return 6-get.value(c,player)+(canComplete&&(!selected.length||numbers.get(selected[0])+numbers.get(c)+starNumber===12)?5:0);
  });
 const result=await next.forResult();if(!result.bool)return;
 // chooseToDiscard.done为discard，discard.done为实际lose事件。
 const paid=(next.done?.done?.cards2||[]).filter(c=>result.cards?.includes(c)&&numbers.has(c));
 if(paid.length&&player.isIn())await player.draw(paid.length);
 if(player.isIn()&&qualifiesForCosmic(paid,starNumber,c=>numbers.get(c)))await player.gain(createCynoReward(game, star ?? event.card, "fan_yuzhouyaobian", "heart", 12),"draw");
}
