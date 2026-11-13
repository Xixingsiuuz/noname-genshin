import { gainCynoPackCards, createCynoReward } from "../ui/cyno-rarity.js";
import { playCynoSound } from "./cyno-sound.js";
import{game,get,lib,ui,_status}from"../../../noname.js";
import{redEyesFaces,sampleRedEyes}from"./red-eyes-data.js";
const dragons=["fan_heilong","fan_heiganglong"];
const self={type:"trick",enable:true,selectTarget:-1,toself:true,filterTarget:(c,p,t)=>p===t};
export async function gainRedEyes(player,plan,source){
 const cards=[];for(const item of plan.filter(i=>i.source==="pile")){const card=get.cardPile2(c=>c.name===item.name);if(card){card.remove();card.original="c";cards.push(card)}else cards.push(...get.cards(1));}
 game.updateRoundNumber();if(cards.length)await gainCynoPackCards(player, cards,"draw", source);if(!player.isIn())return;
 const derived=plan.filter(i=>i.source==="derived").map(i=>createCynoReward(game, source, i.name, ...redEyesFaces[i.name]));if(derived.length)await gainCynoPackCards(player, derived,"draw");
}
export function flamePayment(card,player,usedCard){return card!==usedCard&&get.number(card,player)===7&&lib.filter.cardDiscardable(card,player);}
export const redEyesCards={
 fan_zhenhongzhijuexing:{...self,async content(event,trigger,player){await gainRedEyes(player,sampleRedEyes(),event.cards?.length === 1 ? event.cards[0] : event.card);},ai:{order:10,value:10,result:{target:5}}},
 fan_heilong:{type:"trick",ai:{value:6,useful:5}},fan_heiganglong:{type:"trick",ai:{value:8,useful:7}},
 fan_chuanshuoheishi:{type:"equip",subtype:"equip5",skills:["fan_chuanshuoheishi_move"],enable:true,selectTarget:-1,toself:true,modTarget:true,
  filterTarget:(c,p,t)=>p===t&&t.canEquip(c,true),async content(event){await event.target.equip(event.cards[0]);},ai:{order:9,value:8,basic:{equipValue:8},result:{target:1}}},
 fan_heiyandan:{type:"trick",enable:true,
  filter(card,p){return p.getCards("he").some(c=>flamePayment(c,p,card));},filterTarget:(c,p,t)=>p!==t,
  async content(event,trigger,player){
   if(!player.getCards("he").some(c=>flamePayment(c,player)))return;
   const result=await player.chooseToDiscard("he",1,true,"黑炎弹：弃置一张点数为7的牌").set("filterCard",(c,p)=>flamePayment(c,p)).set("ai",c=>8-get.value(c)).forResult();
   if(result.bool&&event.target.isIn())await event.target.damage(2,player);
  },ai:{order:7,value:7,result:{target:-2},tag:{damage:2}}},
};
for(const[name,card]of Object.entries(redEyesCards))Object.assign(card,{derivation:"fan_cyno",destroy:"discardPile",fullskin:true,image:`ext:原神/image/card/${name}-framed.png`,global:["fan_heilong_convert","fan_heiganglong_record","fan_heiganglong_retaliation"]});
function movableBlackStone(player, target) {
 if (target === player || !target.isIn() || target.isMin()) return;
 return player.getVCards("e").find(card => {
  if (card.name !== "fan_chuanshuoheishi" && !lib.card[card.name]?.source?.includes("fan_chuanshuoheishi")) return false;
  return get.subtypes(card).every(slot => target.countEquipableSlot(slot) > target.getVEquips(slot).length)
   && target.canEquip(card, false)
   && card.cards?.every(material => lib.filter.canBeGained(material, target, player));
 });
}
export const redEyesSkills={
 fan_heilong_convert:{locked:false,enable:["chooseToUse","chooseToRespond"],position:"h",selectCard:1,
  prompt:"选择一张黑龙或黑钢龙当【杀】使用或打出",prompt2:false,filterCard:c=>dragons.includes(c.name),viewAs:{name:"sha"},viewAsFilter:p=>p.countCards("h",c=>dragons.includes(c.name))>0,
  check:c=>8-get.value(c),ai:{respondSha:true,skillTagFilter:p=>p.countCards("h",c=>dragons.includes(c.name))>0},
  mod:{ignoredHandcard:c=>dragons.includes(c.name)?true:undefined,cardDiscardable(c,p,name){if(name==="phaseDiscard"&&dragons.includes(c.name))return false;}}},
 fan_chuanshuoheishi_move:{
  equipSkill:true, locked:false, enable:"phaseUse", usable:1,
  filter(event,player){return game.hasPlayer(target => !!movableBlackStone(player,target));},
  prompt:"把【传说黑石】置入其他角色的装备区然后摸牌", prompt2:false,
  filterTarget(card,player,target){return !!movableBlackStone(player,target);},
  async content(event,trigger,player){
   const target = event.target;
   const card = movableBlackStone(player,target);
   if (!card) return;
   playCynoSound("activate");
   await target.equip(card);
   if (player.isIn() && target.getVCards("e").includes(card)) await player.draw();
  },
  ai:{order:8,result:{player:1,target:(player,target)=>target.isTurnedOver()?0.3:0.6}},
 },
 fan_heiganglong_record:{trigger:{global:"useCardToPlayer"},forced:true,popup:false,locked:false,
  filter:event=>event.card.name==="sha"&&(event.cards||[]).some(c=>c.name==="fan_heiganglong"),
  async content(event,trigger){
   const use=trigger.getParent(),seen=use.fanHeigangRecorded||(use.fanHeigangRecorded=[]);if(seen.includes(trigger.target))return;seen.push(trigger.target);
   const target=trigger.target,source=trigger.player;target.addSkill("fan_heiganglong_mark");
   const stored=target.storage.fan_heiganglong_mark||(target.storage.fan_heiganglong_mark={});stored[source.playerid]=(stored[source.playerid]||0)+1;target.markSkill("fan_heiganglong_mark");
  }},
 fan_heiganglong_mark:{charlotte:true,mark:true,marktext:"钢",intro:{markcount:storage=>Object.values(storage||{}).reduce((a,b)=>a+b,0),content(storage){return Object.entries(storage||{}).map(([id,n])=>{const p=game.players.concat(game.dead).find(p=>p.playerid===id);return `对${p?get.translation(p):"原使用者"}使用的后${n}张以其为目标的牌对其无效，且使用时失去1点体力。`;}).join("<br>");}}},
 fan_heiganglong_retaliation:{trigger:{global:"useCardToTarget"},forced:true,popup:false,locked:false,
  ai:{effect:{target(card,source,target){if(source.storage.fan_heiganglong_mark?.[target.playerid])return[0,0,1,-2];}}},
  filter:event=>!!event.player.storage.fan_heiganglong_mark?.[event.target.playerid]&&!event.getParent().fanHeigangConsumed?.includes(event.target.playerid),
  async content(event,trigger){
   const p=trigger.player,id=trigger.target.playerid,use=trigger.getParent(),seen=use.fanHeigangConsumed||(use.fanHeigangConsumed=[]);if(seen.includes(id))return;seen.push(id);
   const marks=p.storage.fan_heiganglong_mark;if(!marks?.[id])return;
   if(--marks[id]===0)delete marks[id];use.excluded.add(trigger.target);playCynoSound("destroyed");
   if(!Object.keys(marks).length){delete p.storage.fan_heiganglong_mark;p.removeSkill("fan_heiganglong_mark");}else p.markSkill("fan_heiganglong_mark");
   await p.loseHp();
  }},
};
export const redEyesTranslate={
 fan_zhenhongzhijuexing:"真红之觉醒",fan_zhenhongzhijuexing_info:"出牌阶段，对你使用。你随机获得五张【真红眼】卡组相关的牌。",
 fan_heilong:"黑龙",fan_heilong_info:"此牌不计入手牌上限，可以当【杀】使用或打出。",
 fan_heiganglong:"黑钢龙",fan_heiganglong_info:"此牌不计入手牌上限，可以当【杀】使用或打出，目标角色使用下一张以你为目标的牌时失去1点体力，且该牌对你无效。",
 fan_chuanshuoheishi:"传说黑石",fan_chuanshuoheishi_info:"出牌阶段限一次，你可以将此牌移动到一名其他角色的装备区（不可替换原装备），然后摸一张牌。",
 fan_heiyandan:"黑炎弹",fan_heiyandan_info:"出牌阶段，对一名其他角色使用。弃置一张点数为7的牌，对其造成2点伤害。",
 fan_heilong_convert:"黑龙",fan_chuanshuoheishi_move:"传说黑石",fan_heiganglong_mark:"黑钢龙",
};
