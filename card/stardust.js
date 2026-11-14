import { gainCynoPackCards, createCynoReward } from "../ui/cyno-rarity.js";
import { playCynoSound } from "./cyno-sound.js";
import { game, get, lib, ui, _status } from "../../../noname.js";
import { stardustFaces, sampleStardust } from "./stardust-data.js";
import { exchangeStardust } from "./stardust-sync.js";
import { cosmicMovementSkill } from "./cosmic-movement.js";
const dragons=["fan_xingchenlong","fan_liuxinglong","fan_yuzhouyaobian"];
function context(event) {
 for(let e=event;e;e=e.parent){
  if(e.fanStardustUse)return e.fanStardustOpen?e.fanStardustUse:undefined;
  // 新的响应/用牌选择不可继承外层星尘选择的发动资格。
  if(e.name==="chooseToUse"||e.name==="chooseToRespond")return;
 }
}
function legalDragon(name, use, player) {
 if(!use || use.all_excluded)return false;
 if(name==="fan_yuzhouyaobian")return use.player!==player&&get.type(use.card)!=="equip";
 return !dragons.includes(use.card.name)&&get.tag(use.card,"damage");
}
function counterValue(use, owner) {
 if(!use)return 0;
 const prior=dragons.includes(use.card.name)&&context(use);
 if(!prior)return (use.targets||[]).reduce((sum,target)=>sum+get.effect(target,use.card,use.player,owner),0);
 const discard=use.card.name!=="fan_xingchenlong"&&prior.player.countDiscardableCards(use.player,"hej")
  ? -Math.sign(get.attitude(owner,prior.player)) : 0;
 return discard-counterValue(prior,owner);
}
const self={type:"trick",enable:true,selectTarget:-1,toself:true,filterTarget:(card,player,target)=>player===target};
const valuable={order:9,value:8,useful:6,result:{target:2}};
export const stardustCards={
 fan_xingchendehuiguang:{...self,ai:valuable,
  async content(event,trigger,player){
   const plan=sampleStardust(),cards=[];
   for(const item of plan.filter(i=>i.source==="pile")){
    const list=Array.from(ui.cardPile.childNodes).filter(c=>item.kind==="shan"?c.name==="shan":get.number(c)>0&&get.number(c)<=3);
    const card=list.randomGet();if(card){card.remove();card.original="c";cards.push(card)}else cards.push(...get.cards(1));
   }
   game.updateRoundNumber();if(cards.length)await gainCynoPackCards(player, cards,"draw", (event.cards?.length === 1 ? event.cards[0] : event.card));if(!player.isIn())return;
   await gainCynoPackCards(player, plan.filter(i=>i.source==="derived").map(i=>createCynoReward(game, event.cards?.length === 1 ? event.cards[0] : event.card, i.name, ...stardustFaces[i.name])),"draw");
  }},
 fan_tiaolv:{...self,ai:valuable,async content(event,trigger,player){
  const numbers=Array.from({length:13},(_,i)=>String(i+1));
  const result=await player.chooseControl(numbers).set("prompt","调律：选择点数").set("prompt2",false).set("ai",()=>"1").forResult();
  const n=Number(result.control);if(!Number.isInteger(n)||n<1||n>13)return;
  const cards=Array.from(ui.cardPile.childNodes).filter(c=>get.number(c)===n);
  if(cards.length)await player.gain(cards.randomGet(),"draw");
 }},
 fan_feipinhuishou:{...self,ai:valuable,async content(event,trigger,player){
  const cards=Array.from(ui.discardPile.childNodes).filter(c=>get.number(c)===2);if(!cards.length)return;
  const result=await player.chooseButton(["废品回收：获得一张牌",cards],true).set("ai",b=>get.value(b.link,player)).forResult();
  const card=result.links?.[0];if(result.bool&&cards.includes(card)&&card.parentNode===ui.discardPile)await player.gain(card,"gain2");
 }},
};
for(const name of dragons)stardustCards[name]={type:"trick",notarget:true,enable:(event,player)=>!!legalDragon(name,context(_status.event),player),
 ai:{order:0,value:name==="fan_yuzhouyaobian"?10:8,useful:8,result:{player:1}},
 async content(event,trigger,player){
  const use=context(event);if(!legalDragon(name,use,player))return;
  use.all_excluded=true;
  if(use.player!==player&&player.hasSkill?.("fan_zhaohuan"))game.trySkillAudio("fan_zhaohuan_negate",player,true);
  playCynoSound("destroyed");
  if(name!=="fan_xingchenlong"&&use.player.isIn()&&use.player.countDiscardableCards(player,"hej"))await player.discardPlayerCard(use.player,"hej",true);
 }};
// 同一实体牌：反制窗口没有角色目标，主动使用时则自动以自己为目标。
Object.defineProperty(stardustCards.fan_xingchenlong,"notarget",{enumerable:true,configurable:true,get(){return !!context(_status.event);}});
Object.assign(stardustCards.fan_xingchenlong,{toself:true,selectTarget:-1,filterTarget:(c,p,t)=>p===t,
 enable:()=>{const use=context(_status.event);return use?!!legalDragon("fan_xingchenlong",use):_status.event?.type==="phase";},
 ai:{...valuable,order:7},
 async content(event,trigger,player){
  const use=context(event);
  if(use){
   if(legalDragon("fan_xingchenlong",use,player)){
    use.all_excluded=true;
    if(use.player!==player&&player.hasSkill?.("fan_zhaohuan"))game.trySkillAudio("fan_zhaohuan_negate",player,true);
    playCynoSound("destroyed");
   }
   return;
  }
  if(event.target===player)await exchangeStardust(event,player);
 }});
for(const[name,card]of Object.entries(stardustCards))Object.assign(card,{derivation:"fan_cyno",destroy:"discardPile",fullskin:true,image:`ext:原神/image/card/${name}-framed.png`,global:"fan_xingchen_window"});
export const stardustSkills={
 fan_yuzhou_movement:cosmicMovementSkill,
 // 使用牌时进入原生触发队列。
 fan_xingchen_window:{trigger:{global:"useCard"},forced:true,popup:false,locked:false,
  filter:event=>!event.all_excluded,
  async content(event,trigger,player){
   const players=game.filterPlayer(p=>p.countCards("h",c=>dragons.includes(c.name)&&legalDragon(c.name,trigger,p))).sortBySeat(_status.currentPhase||player);
   const asked=trigger.fanStardustAsked||(trigger.fanStardustAsked=[]);
   for(const owner of players){if(trigger.all_excluded)break;if(!owner.isIn()||asked.includes(owner))continue;
    asked.push(owner);
    const choice=owner.chooseToUse({prompt:"是否使用召唤王卡牌令此牌无效？",prompt2:false,fanStardustUse:trigger,fanStardustOpen:true,
     filterCard:(card,p)=>dragons.includes(card.name)&&legalDragon(card.name,trigger,p),
     ai1:card=>{
      const discard=card.name!=="fan_xingchenlong"&&trigger.player.countDiscardableCards(owner,"hej")
       ? -Math.sign(get.attitude(owner,trigger.player)) : 0;
      return discard-counterValue(trigger,owner)>0?11-get.value(card,owner):0;
     }});
    try{await choice;}finally{choice.fanStardustOpen=false;}
   }
  }},
 fan_liuxinglong_after:{cardSkill:true,trigger:{global:"useCardAfter"},forced:true,popup:false,locked:false,
  filter:e=>e.player.isIn()&&(e.card.name==="fan_liuxinglong"||(e.cards||[]).some(c=>c.name==="fan_liuxinglong")),
  async content(event,trigger){if(trigger.fanMeteorRewarded)return;trigger.fanMeteorRewarded=true;await trigger.player.gain(createCynoReward(game, trigger.cards?.length === 1 ? trigger.cards[0] : trigger.card, "fan_xingchenlong",...stardustFaces.fan_xingchenlong),"draw");}},
 fan_xingchen_hand:{mod:{ignoredHandcard:c=>dragons.includes(c.name)?true:undefined,cardDiscardable(c,p,name){if(name==="phaseDiscard"&&dragons.includes(c.name))return false;}}},
 fan_yuzhou_return:{charlotte:true,mark:true,marktext:"耀",intro:{
  name:"宇宙耀变",
  markcount:(storage,player)=>player.getExpansions("fan_yuzhou_return").length,
  mark(dialog,storage,player){dialog.addAuto(player.getExpansions("fan_yuzhou_return"));dialog.addText("本回合结束时返回手牌。");},
 },trigger:{global:"phaseAfter"},forced:true,popup:false,
  async content(event,trigger,player){
   const cards=player.getExpansions("fan_yuzhou_return");
   if(cards.length){
    playCynoSound("specialsummon2");
    await player.gain(cards,"draw").set("fanCosmicReturn",true);
   }
   player.removeSkill("fan_yuzhou_return");
  },
  onremove(player){const cards=player.getExpansions("fan_yuzhou_return");if(cards.length)player.loseToDiscardpile(cards).set("fanCosmicCleanup",true);}},
};
stardustSkills.fan_xingchen_window.group=["fan_xingchen_hand","fan_yuzhou_movement"];
for(const card of Object.values(stardustCards))card.global=["fan_xingchen_window","fan_xingchen_hand","fan_yuzhou_movement","fan_liuxinglong_after"];
export const stardustTranslate={
 fan_xingchendehuiguang:"星尘的辉光",fan_xingchendehuiguang_info:"出牌阶段，对你使用。你随机获得五张【星尘同步】卡组相关的牌。",
 fan_tiaolv:"调律",fan_tiaolv_info:"出牌阶段，对你使用。你从牌堆获得一张任意点数的牌。",
 fan_feipinhuishou:"废品回收",fan_feipinhuishou_info:"出牌阶段，对你使用。你从弃牌堆获得一张点数为2的牌。",
 fan_xingchenlong:"星尘龙",fan_xingchenlong_info:"此牌不计入手牌上限。一名角色使用伤害牌时，对该牌使用。那张牌无效。<br>出牌阶段，对你使用，弃置两张牌，然后摸等量的牌，可能有额外效果。",
 fan_liuxinglong:"流星龙",fan_liuxinglong_info:"此牌不计入手牌上限。一名角色使用伤害牌时，对该牌使用。那张牌无效，然后弃置该角色区域内一张牌。<br>此牌使用后，获得一张"+get.poptip("fan_xingchenlong")+"。",
 fan_yuzhouyaobian:"宇宙耀变",fan_yuzhouyaobian_info:"此牌不计入手牌上限。<br>其他角色使用非装备牌时，对该牌使用。那张牌无效，然后你弃置该角色区域内一张牌。<br>此牌离开你的手牌区时，将其置于你的武将牌上，本回合结束时，你获得之。",
 fan_liuxinglong_after:"流星龙",
 fan_yuzhou_return:"宇宙耀变",
};
