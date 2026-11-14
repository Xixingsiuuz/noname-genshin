import { gainCynoPackCards, createCynoReward } from "../ui/cyno-rarity.js";
import { playCynoSound } from "./cyno-sound.js";
import{game,get,lib,ui}from"../../../noname.js";
export const trainFaces={fan_chaonujilieche:["spade",13],fan_huizhuandiaoche:["spade",1],fan_paotalieche:["spade",10],fan_potianjuai:["spade",11],fan_zhunwuweijian:["spade",4]};
export function sampleTrains(random=Math.random){
 const roll=()=>{const n=random();if(!Number.isFinite(n)||n<0||n>=1)throw new RangeError("随机数须在[0,1)内");return n},count=roll()<.5?2:3,result=[];
 for(let i=0;i<count;i++)result.push({source:"pile",name:roll()<2/3?"sha":"tiesuo"});
 for(let i=count;i<5;i++){let name=["fan_huizhuandiaoche","fan_paotalieche","fan_zhunwuweijian"][Math.floor(roll()*3)];if(name==="fan_paotalieche"&&roll()<1/3)name="fan_potianjuai";result.push({source:"derived",name});}return result;
}
const self={type:"trick",enable:true,selectTarget:-1,toself:true,filterTarget:(c,p,t)=>p===t};
function equipment(subtype,skill,value){return{type:"equip",subtype,skills:[skill],enable:true,selectTarget:-1,toself:true,modTarget:true,filterTarget:(c,p,t)=>p===t&&t.canEquip(c,true),async content(event){await event.target.equip(event.cards[0]);},ai:{order:9,value,basic:{equipValue:value},result:{target:1}}};}
export const trainCards={
 fan_chaonujilieche:{...self,ai:{order:10,value:10,result:{target:5}},async content(event,trigger,player){
  const plan=sampleTrains(),cards=[];for(const item of plan.filter(i=>i.source==="pile")){const card=get.cardPile2(c=>c.name===item.name);if(card){card.remove();card.original="c";cards.push(card)}else cards.push(...get.cards(1));}
  game.updateRoundNumber();if(cards.length)await gainCynoPackCards(player, cards,"draw", (event.cards?.length === 1 ? event.cards[0] : event.card));if(player.isIn())await gainCynoPackCards(player, plan.filter(i=>i.source==="derived").map(i=>createCynoReward(game, event.cards?.length === 1 ? event.cards[0] : event.card, i.name, ...trainFaces[i.name])),"draw");
 }},
 fan_huizhuandiaoche:{...self,filter:(c,p)=>p.getCards("he").some(card=>card!==c&&lib.filter.cardDiscardable(card,p)),
  async content(event,trigger,player){
   if(!player.getCards("he").some(c=>lib.filter.cardDiscardable(c,player)))return;
   const result=await player.chooseToDiscard("he",1,true,"回转调车：弃置一张牌").set("ai",c=>6-get.value(c)).forResult();
   if(!result.bool)return;
   await player.draw(2);if(player.isIn()){player.addSkill("fan_huizhuandiaoche_limit");player.addMark("fan_huizhuandiaoche_limit",2,false);}
  },ai:{order:7,value:7,result:{target:2}}},
 fan_paotalieche:{...equipment("equip1","fan_paotalieche_shoot",8),distance:{attackFrom:-4},
  async onEquip(event){for(const card of event.cards||event.card.cards||[event.card])if(card.name==="fan_paotalieche")delete card.fanPaotaUsedTurn;}},
 fan_potianjuai:{...equipment("equip1","fan_potianjuai_shoot",10),skills:["fan_potianjuai_shoot","fan_potianjuai_targets"],distance:{attackFrom:-4}},
 fan_zhunwuweijian:equipment("equip2","fan_zhunwuweijian_guard",8),
};
for(const[name,c]of Object.entries(trainCards))Object.assign(c,{derivation:"fan_cyno",destroy:"discardPile",fullskin:true,image:`ext:原神/image/card/${name}-framed.png`});
export function shotCard(card,player){return get.name(card,player)==="sha"&&lib.filter.cardDiscardable(card,player);}
function shooting(damage){return{equipSkill:true,locked:false,enable:"phaseUse",usable:1,position:"he",selectCard:[0,1],selectTarget:1,
 manualConfirm:true,fanPairedConfirm:true,prompt:"弃置一张【杀】，选择伤害目标",prompt2:false,
 filter(event,player){return player.getCards("he").some(c=>shotCard(c,player))&&game.hasPlayer(t=>t!==player&&player.inRange(t));},
 filterCard:shotCard,filterTarget:(c,p,t)=>t!==p&&p.inRange(t),
 filterOk(){return ui.selected.cards.length===1&&ui.selected.targets.length===1;},
 check:card=>7-get.value(card),
 async content(event,trigger,player){const target=event.targets[0];if(!target.isIn()||!player.isIn()||!player.inRange(target))return;
  playCynoSound("attack");
  setTimeout(() => playCynoSound("explode"), 2000 / 3);
  await target.damage(damage,player);},
 ai:{order:6,result:{target:(p,t)=>get.damageEffect(t,p,t)*damage}}};}
export const trainSkills={
 fan_huizhuandiaoche_limit:{charlotte:true,mark:true,marktext:"调",intro:{content:"手牌上限+#"},mod:{maxHandcard:(p,n)=>n+p.countMark("fan_huizhuandiaoche_limit")}},
 fan_potianjuai_shoot:shooting(1),
 fan_potianjuai_targets:{equipSkill:true,locked:false,mod:{selectTarget(card,player,range){if(card.name==="sha"&&range[1]!==-1)range[1]=Infinity;}}},
 fan_zhunwuweijian_guard:{equipSkill:true,locked:true,forced:true,trigger:{player:"damageBegin4"},
  filter:(event,p)=>!!p.getEquip("fan_zhunwuweijian"),
  async content(event,trigger,player){
   if(!player.getEquip("fan_zhunwuweijian"))return;
   playCynoSound("addcounter");
   trigger.cancel();
   const equipment=player.getCards("e");
   if(!equipment.length)return;
   let card=equipment[0];
   if(equipment.length>1){
    const result=await player.chooseCard("e",1,true,"准无畏舰：将一张装备牌置入弃牌堆")
     .set("ai",card=>-get.equipValue(card,player)).forResult();
    card=result.cards?.[0];
   }
   if(card&&player.getCards("e").includes(card)){
    await player.lose(card,ui.discardPile);
    player.$throw(card);
   }
  },
  ai:{filterDamage:true,skillTagFilter:(p,tag,arg)=>!arg?.unequip2&&!arg?.player?.hasSkillTag("unequip",false,{name:arg?.card?.name,target:p,card:arg?.card})}},
};
const turretBase=shooting(1);
// 融合继续使用其独立技能ID的原生限次，不继承实体炮塔的计次方式。
trainSkills.fan_paotalieche_shoot={...turretBase,usable:undefined,fanFusionBase:turretBase,
 filter(event,player){const card=player.getEquip("fan_paotalieche");return !!card&&card.name==="fan_paotalieche"&&card.fanPaotaUsedTurn!==game.phaseNumber&&turretBase.filter(event,player);},
 async content(event,trigger,player){
  const card=player.getEquip("fan_paotalieche");
  if(!card||card.name!=="fan_paotalieche"||card.fanPaotaUsedTurn===game.phaseNumber)return;
  card.fanPaotaUsedTurn=game.phaseNumber;
  await turretBase.content(event,trigger,player);
 },
};
export const trainTranslate={
 fan_chaonujilieche:"超弩级列车",fan_chaonujilieche_info:"出牌阶段，对你使用。你随机获得五张【列车】卡组相关的牌。",
 fan_huizhuandiaoche:"回转调车",fan_huizhuandiaoche_info:"出牌阶段，对你使用。弃置一张牌，然后摸两张牌，你的手牌上限+2。",
 fan_paotalieche:"炮塔列车",fan_paotalieche_info:"出牌阶段限一次，你可以弃置一张【杀】，对攻击范围内的一名其他角色造成1点伤害。",
 fan_potianjuai:"破天巨爱",fan_potianjuai_info:"出牌阶段限一次，你可以弃置一张【杀】，对攻击范围内的一名其他角色造成1点伤害。<br>你使用的【杀】可以多指定任意名目标。",
 fan_zhunwuweijian:"准无畏舰",fan_zhunwuweijian_info:"锁定技，当你受到伤害时，防止之，然后将装备区的一张牌置入弃牌堆。",
 fan_huizhuandiaoche_limit:"回转调车",fan_paotalieche_shoot:"炮塔列车",fan_potianjuai_shoot:"破天巨爱",fan_potianjuai_targets:"破天巨爱",fan_zhunwuweijian_guard:"准无畏舰",
};
