import { playCynoSound } from "./cyno-sound.js";
import {game,get,lib,ui,_status} from "../../../noname.js";
import {utopiaFaces,sampleUtopia} from "./utopia-data.js";
const self={type:"trick",enable:true,selectTarget:-1,toself:true,filterTarget:(c,p,t)=>p===t};
const armor={type:"equip",subtype:"equip2",enable:true,selectTarget:-1,toself:true,modTarget:true,
 filterTarget:(c,p,t)=>p===t&&t.canEquip(c,true),async content(event){await event.target.equip(event.cards[0]);},
 ai:{order:9,value:8,basic:{equipValue:8},result:{target:1}}};
function missedUse(event){for(let e=event;e;e=e.parent)if(e.fanUtopiaMiss)return e.fanUtopiaMiss;}
function noDamage(use,player){return !player.getHistory("sourceDamage",e=>e.getParent("useCard")===use).length;}
export function cancelUtopiaTarget(trigger){
 const use=trigger.getParent(), index=use.targets.indexOf(trigger.target);
 if(index<0)return false;
 use.targets.splice(index,1);
 use.excluded.add(trigger.target);
 return true;
}
export const utopiaCards={
 fan_xiwangdechaoyue:{...self,ai:{order:10,value:10,result:{target:5}},async content(event,trigger,player){
  const plan=sampleUtopia(),cards=[];
  for(const item of plan.filter(i=>i.source==="pile")){const c=get.cardPile2(c=>c.name===item.name);if(c){c.remove();c.original="c";cards.push(c)}else cards.push(...get.cards(1));}
  game.updateRoundNumber();if(cards.length)await player.gain(cards,"draw");
  if(player.isIn())await player.gain(plan.filter(i=>i.source==="derived").map(i=>game.createCard(i.name,...utopiaFaces[i.name])),"draw");
 }},
 fan_xiwanghuang:{...armor,skills:["fan_xiwang_break","fan_xiwang_cancel"]},
 fan_weilaihuang:{...armor,skills:["fan_weilai_protect","fan_weilai_cancel"]},
 fan_xingguangliqiu:{type:"trick",global:"fan_utopia_rules",ai:{value:8,useful:7}},
 fan_fanbeijihui:{...self,enable:()=>!!missedUse(_status.event),ai:{order:0,value:7,useful:5,result:{target:2}},
  async content(event,trigger,player){const use=missedUse(event);if(!use||!noDamage(use,player))return;
   player.addTempSkill("fan_fanbei_buff");player.addMark("fan_fanbei_buff",1,false);
   player.storage.fan_fanbei_pending=(player.storage.fan_fanbei_pending||0)+1;
  }},
};
for(const[name,card]of Object.entries(utopiaCards))Object.assign(card,{derivation:"fan_cyno",destroy:"discardPile",fullskin:true,image:`ext:原神/image/card/${name}-framed.png`});
export const utopiaSkills={
 fan_xiwang_used:{charlotte:true},
 fan_xiwang_break:{equipSkill:true,locked:true,forced:true,trigger:{target:"useCardToTargeted"},
  filter(event,player){return event.card.name==="sha"&&!!player.getEquip("fan_xiwanghuang");},
  async content(event,trigger,player){const card=player.getEquip("fan_xiwanghuang");if(card&&player.getCards("e").includes(card)){playCynoSound("addcounter");await player.discard(card);}}},
 fan_xiwang_cancel:{
  equipSkill:true,locked:false,direct:true,trigger:{global:"useCardToTarget"},
  filter(event,player){
   return event.card.name==="sha" && !player.hasSkill("fan_xiwang_used")
    && event.getParent().targets.includes(event.target)
    && player.countCards("h",card=>lib.filter.cardDiscardable(card,player,"fan_xiwang_cancel"))>0;
  },
  async content(event,trigger,player){
   const payment=player.chooseToDiscard("h",1,"希望皇：弃置一张手牌，取消此【杀】的目标");
   payment.set("ai",card=>-get.effect(trigger.target,trigger.card,trigger.player,player)*2
    + 0 - get.value(card,player));
   const result=await payment.forResult();
   if(!result.bool || !payment.done?.done?.cards2?.length || !player.isIn()) return;
   player.addTempSkill("fan_xiwang_used");
   if(!cancelUtopiaTarget(trigger)) return;
   playCynoSound("activate");
   playCynoSound("destroyed");
  },
 },
 fan_xingguangliqiu_tao:{locked:false,enable:"chooseToUse",position:"h",selectCard:1,
  prompt:"选择一张星光栗球当【桃】使用",prompt2:false,
  filterCard:card=>card.name==="fan_xingguangliqiu",viewAs:{name:"tao"},
  viewAsFilter:player=>player.countCards("h",{name:"fan_xingguangliqiu"})>0,
  check:card=>8-get.value(card),
  ai:{save:true,skillTagFilter:player=>player.countCards("h",{name:"fan_xingguangliqiu"})>0}},
 fan_utopia_rules:{group:["fan_utopia_hand","fan_xingguangliqiu_tao","fan_fanbei_after"],charlotte:true},
 fan_utopia_hand:{mod:{ignoredHandcard:c=>c.name==="fan_xingguangliqiu"?true:undefined,cardDiscardable(c,p,name){if(name==="phaseDiscard"&&c.name==="fan_xingguangliqiu")return false;}}},
 fan_weilai_protect:{equipSkill:true,locked:true,mod:{canBeDiscarded(c,p,t){if(c.name==="fan_weilaihuang"&&get.position(c)==="e")return false;},cardDiscardable(c){if(c.name==="fan_weilaihuang"&&get.position(c)==="e")return false;}}},
 fan_weilai_used:{charlotte:true},
 fan_weilai_cancel:{
  equipSkill:true,locked:false,direct:true,trigger:{global:"useCardToTarget"},
  filter(event,player){
   return event.card.name==="sha" && !player.hasSkill("fan_weilai_used")
    && event.getParent().targets.includes(event.target)
    && player.countCards("h",card=>lib.filter.cardDiscardable(card,player,"fan_weilai_cancel"))>0;
  },
  async content(event,trigger,player){
   const payment=player.chooseToDiscard("h",1,"未来皇：弃置一张手牌，取消此【杀】的目标");
   payment.set("ai",card=>-get.effect(trigger.target,trigger.card,trigger.player,player)*2
    + 2 - get.value(card,player));
   const result=await payment.forResult();
   if(!result.bool || !payment.done?.done?.cards2?.length || !player.isIn()) return;
   player.addTempSkill("fan_weilai_used");
   if(!cancelUtopiaTarget(trigger)) return;
   playCynoSound("activate");
   playCynoSound("destroyed");
   const cards=(trigger.cards||[]).filter(c=>get.position(c,true)==="o");
   if(cards.length && player.isIn()) await player.gain(cards,"gain2");
  },
 },
 fan_fanbei_after:{trigger:{global:"useCardAfter"},direct:true,filter(event){return event.card.name==="sha"&&event.player.isIn()&&noDamage(event,event.player)&&event.player.countCards("h",{name:"fan_fanbeijihui"})>0;},
  async content(event,trigger){await trigger.player.chooseToUse({prompt:"你可以使用【翻倍机会】",prompt2:false,fanUtopiaMiss:trigger,filterCard:card=>card.name==="fan_fanbeijihui",ai1:()=>trigger.player.getCards("h").some(card=>get.tag(card,"damage")&&trigger.player.getUseValue(card)>0)?1:0});}},
 fan_fanbei_buff:{charlotte:true,onremove(player){delete player.storage.fan_fanbei_pending;delete player.storage.fan_fanbei_buff;},mod:{cardUsable(card,player,num){if(card.name==="sha")return num+player.countMark("fan_fanbei_buff");}},
  trigger:{source:"damageBegin1"},forced:true,popup:false,filter:(event,player)=>!!player.storage.fan_fanbei_pending,
  async content(event,trigger,player){trigger.num*=2**player.storage.fan_fanbei_pending;delete player.storage.fan_fanbei_pending;}},
};
// addGlobalSkill只注册自身触发器，不递归挂载group。
for(const card of Object.values(utopiaCards))card.global=["fan_utopia_hand","fan_xingguangliqiu_tao","fan_fanbei_after"];
export const utopiaTranslate={
 fan_xingguangliqiu_tao:"星光栗球",fan_xingguangliqiu_tao_info:"将一张星光栗球当【桃】使用。",
 fan_xiwangdechaoyue:"希望的超越",fan_xiwangdechaoyue_info:"出牌阶段，对你使用。你随机获得五张【希望皇霍普】卡组相关的牌。",
 fan_xiwanghuang:"希望皇",fan_xiwanghuang_info:"锁定技，当你成为【杀】的目标后，将装备区的此牌弃置。<br>每回合限一次，一名角色成为【杀】的目标时，你可以弃置一张手牌，取消之。",
 fan_weilaihuang:"未来皇",fan_weilaihuang_info:"锁定技，装备区的此牌不能被弃置。<br>每回合限一次，一名角色成为【杀】的目标时，你可以弃置一张手牌，取消之，然后获得此【杀】。",
 fan_xingguangliqiu:"星光栗球",fan_xingguangliqiu_info:"此牌不计入手牌上限，可以当【桃】使用。",
 fan_fanbeijihui:"翻倍机会",fan_fanbeijihui_info:"当你使用【杀】后，若此【杀】未造成伤害，对你使用。本回合你下次造成的伤害翻倍，可以多使用一张【杀】。",
 fan_xiwang_break:"希望皇",fan_xiwang_cancel:"希望皇",fan_weilai_cancel:"未来皇",fan_weilai_protect:"未来皇",fan_fanbei_buff:"翻倍机会",
};




