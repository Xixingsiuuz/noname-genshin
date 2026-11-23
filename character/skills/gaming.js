import { lib, game, get, ui, _status } from "../../../../noname.js";
const tag = "fan_baobiao_tag";
// Read only this movement's loss snapshot; never retain eligibility on the card object.
export function escortCards(event) {
 const ordering=event.getParent?.();
 const related=ordering?.name==="orderingDiscard" ? ordering.relatedEvent||ordering.getParent?.() : null;
 const losses=[];
 for(const actor of game.players.concat(game.dead)) actor.getAllHistory("lose",loss=>{
  if(loss===event || loss.getParent?.()===event || related && loss.getParent?.()===related) losses.push(loss);
 });
 return (event.cards||[]).filter(card=>get.position(card,true)==="d" &&
  (card.hasGaintag(tag)||losses.some(loss=>loss.cards?.includes(card)&&loss.gaintag_map?.[card.cardid]?.includes(tag))));
}
export const danceAttacks = [
 {name:"sha"}, {name:"sha",nature:"fire"}, {name:"sha",nature:"thunder"}
];
export function danceLegal(actor,material,index){
 return actor.isIn() && actor.getCards("h").includes(material)
  && danceAttacks[index] && actor.hasUseTarget(get.autoViewAs(danceAttacks[index],[material]));
}
const danceMaterial=(card,player)=>card===_status.event.fan_wushou_card&&player.getCards("h").includes(card);
export default {
 fan_wushou: {
  audio:false, locked:false, enable:"phaseUse", usable:1, multitarget:true,
  selectTarget:[1,Infinity], filterTarget:(card,player,target)=>target.countCards("h")>0,
  async content(event,trigger,player){
   const targets=event.targets.slice().sortBySeat(_status.currentPhase||player), entries=[];
   for(const target of targets){
    if(!target.isIn()||!target.countCards("h")) continue;
    const result=await player.choosePlayerCard(target,"h",true,"舞兽：展示一张手牌").forResult();
    const card=result.cards?.[0];
    if(card&&target.getCards("h").includes(card)) entries.push({target,card,color:get.color(card,target)});
   }
   for(const {target,card} of entries) if(target.isIn()&&target.getCards("h").includes(card)) await target.showCards([card]);
   if(!entries.length) return;
   if(entries.every(item=>item.color===entries[0].color)){
    for(const {target,card} of entries){
     if(!target.isIn()||!target.getCards("h").includes(card)) continue;
     if(!danceAttacks.some((_,i)=>danceLegal(target,card,i))) continue;
     const result=await target.chooseButton(["舞兽：选择要使用的杀",[danceAttacks.map(item=>["基本","",item.name,item.nature]),"vcard"]],true)
      .set("filterButton",button=>danceLegal(target,card,danceAttacks.findIndex(item=>item.nature===button.link[3])))
      .set("ai",button=>{
       const attack=get.autoViewAs({name:"sha",nature:button.link[3]},[card]);
       return Math.max(...game.filterPlayer(other=>target.canUse(attack,other)).map(other=>get.effect(other,attack,target,target)),0);
      }).forResult();
     if(!result.bool) continue;
     const index=danceAttacks.findIndex(item=>item.nature===result.links[0][3]);
     if(!danceLegal(target,card,index)) continue;
     const skill=["fan_wushou_use","fan_wushou_use_fire","fan_wushou_use_thunder"][index];
     const next=target.chooseToUse({prompt:"舞兽：将展示的牌当所选的杀使用",prompt2:false,forced:true,
      position:"h",selectCard:-1,filterCard:item=>item===card,
      _backupevent:skill,fan_wushou_card:card,filterOk:()=>danceLegal(target,card,index)&&ui.selected.cards.length===1&&ui.selected.cards[0]===card});
     next.backup(skill);
     await next;
    }
   }else for(const {target} of entries) if(target.isIn()) await target.draw();
  },
  ai:{order:7,result:{target:(player,target)=>get.attitude(player,target)>0?1:0.1}},
 },
 fan_wushou_use:{audio:false,sourceSkill:"fan_wushou",position:"h",selectCard:-1,viewAs:{name:"sha"},
  filterCard:danceMaterial},
 fan_wushou_use_fire:{audio:false,sourceSkill:"fan_wushou",position:"h",selectCard:-1,viewAs:{name:"sha",nature:"fire"},filterCard:danceMaterial},
 fan_wushou_use_thunder:{audio:false,sourceSkill:"fan_wushou",position:"h",selectCard:-1,viewAs:{name:"sha",nature:"thunder"},filterCard:danceMaterial},
 fan_baobiao:{
  audio:false,locked:false,direct:true,trigger:{global:["cardsDiscardAfter","loseAfter","loseAsyncAfter","equipAfter"]},
  filter(event,player){return escortCards(event).length>0;},
  async content(event,trigger,player){
   for(const card of escortCards(trigger)){
    card.removeGaintag(tag);
    if(!player.isIn()) break;
    const result=await player.chooseBool("保镖：是否获得"+get.translation(card)+"？").set("prompt2",false).set("ai",()=>get.value(card,player)>0).forResult();
    if(result.bool&&get.position(card,true)==="d"){player.logSkill("fan_baobiao");await player.gain(card,"gain2");}
   }
  },
  group:"fan_baobiao_record",
  subSkill:{record:{audio:false,locked:false,forced:true,popup:false,trigger:{global:["showCardsAfter"]},
   // Native showCards serves both operations; isFlash is the engine's semantic flag.
   filter(event){return event.isFlash!==true;},
   content(event,trigger,player){
    if(trigger.isFlash===true) return;
    for(const card of trigger.cards||[]) card.addGaintag(tag);
   }
  }}
 }
};
