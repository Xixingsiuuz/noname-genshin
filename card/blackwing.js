import { playCynoSound } from "./cyno-sound.js";
import{game,get,lib,ui,_status}from"../../../noname.js";
import{blackwingFaces,sampleBlackwing}from"./blackwing-data.js";
const self={type:"trick",enable:true,selectTarget:-1,toself:true,filterTarget:(c,p,t)=>p===t};
const black=(c,p)=>get.color(c,p)==="black";
function heavyArmor(c,p){const name=get.name(c,p);return get.position(c)==="e"&&(name==="fan_chongzhuangkaiyi"||lib.card[name]?.source?.includes("fan_chongzhuangkaiyi"));}
const armor=(skills)=>({type:"equip",subtype:"equip2",skills,enable:true,selectTarget:-1,toself:true,modTarget:true,
 filterTarget:(c,p,t)=>p===t&&t.canEquip(c,true),async content(event){await event.target.equip(event.cards[0]);},ai:{order:9,value:8,basic:{equipValue:8},result:{target:1}}});
export const blackwingCards={
 fan_qiheizhixuanfeng:{...self,ai:{order:10,value:10,result:{target:5}},async content(event,trigger,player){
  const plan=sampleBlackwing(),cards=[];
  for(const item of plan.filter(i=>i.source==="pile")){
   const candidates=Array.from(ui.cardPile.childNodes).filter(c=>black(c)&&((c.name==="sha")===(item.kind==="blackSha")));
   const card=candidates.length?candidates[Math.floor(Math.random()*candidates.length)]:null;
   if(card){card.remove();card.original="c";cards.push(card);}else cards.push(...get.cards(1));
  }
  game.updateRoundNumber();if(cards.length)await player.gain(cards,"draw");
  if(player.isIn())await player.gain(plan.filter(i=>i.source==="derived").map(i=>game.createCard(i.name,...blackwingFaces[i.name])),"draw");
 }},
 fan_kaiyiya:armor(["fan_kaiyiya_sha","fan_kaiyiya_shan"]),
 fan_chongzhuangkaiyi:{...armor(["fan_chongzhuangkaiyi_sha","fan_chongzhuangkaiyi_shan","fan_chongzhuangkaiyi_protect"]),ai:{order:9,value:10,basic:{equipValue:10},result:{target:1}}},
 fan_heixuanfeng:{...armor(["fan_heixuanfeng_draw"]),subtype:"equip5"},
 fan_zhouyuleiqie:{type:"trick",enable:true,filter:(c,p)=>p.getCards("he").some(card=>card!==c&&black(card,p)&&lib.filter.cardDiscardable(card,p)),
  filterTarget:(c,p,t)=>p!==t&&t.countDiscardableCards(p,"hej")>0,
  async content(event,trigger,player){
   const choice=await player.chooseToDiscard("he",[1,Infinity],"骤雨雷切：弃置黑色牌",true)
    .set("filterCard",(c,p)=>black(c,p)&&lib.filter.cardDiscardable(c,p))
    .set("ai",c=>ui.selected.cards.length>=event.target.countDiscardableCards(player,"hej")?0:get.effect(event.target,{name:"guohe"},player,player)>0?5-get.value(c):0).forResult();
   if(!choice.bool||!choice.cards?.length||!event.target.isIn())return;
   const n=Math.min(choice.cards.length,event.target.countDiscardableCards(player,"hej"));
   if(n)await player.discardPlayerCard(event.target,"hej",n,true);
  },ai:{order:7,value:7,result:{target:-1}}},
};
for(const[name,card]of Object.entries(blackwingCards))Object.assign(card,{derivation:"fan_cyno",destroy:"discardPile",fullskin:true,image:`ext:原神/image/card/${name}-framed.png`,global:"fan_chongzhuangkaiyi_record"});
function conversion(name){return{equipSkill:true,locked:false,enable:["chooseToUse","chooseToRespond"],position:"he",selectCard:1,
 viewAs:{name},filterCard:black,viewAsFilter:p=>p.countCards("he",c=>black(c,p))>0,
 prompt:`将一张黑色牌当【${name==="sha"?"杀":"闪"}】使用或打出`,prompt2:false,check:c=>7-get.value(c),
 ai:{[name==="sha"?"respondSha":"respondShan"]:true,order:()=>get.order({name})+.1,skillTagFilter:p=>p.countCards("he",c=>black(c,p))>0}};}
export function wedgeTargets(event){
 if(event.name==="respond")return event.source?[event.source]:[];
 if(event.card.name==="sha")return (event.targets||[]).slice();
 return event.respondTo?.[0]?[event.respondTo[0]]:[];
}
export const blackwingSkills={
 fan_kaiyiya_sha:conversion("sha"),fan_kaiyiya_shan:conversion("shan"),
 fan_chongzhuangkaiyi_sha:conversion("sha"),fan_chongzhuangkaiyi_shan:conversion("shan"),
 fan_chongzhuangkaiyi_protect:{equipSkill:true,locked:true,mod:{
  canBeDiscarded(c,p,t){if(heavyArmor(c,t))return false;},
  cardDiscardable(c,p){if(heavyArmor(c,p))return false;}}},
 fan_heixuanfeng_draw:{equipSkill:true,locked:true,forced:true,trigger:{player:"useCard"},
  filter:e=>get.color(e.card)==="black",async content(event,trigger,player){playCynoSound("addcounter");await player.draw();}},
 // 全局记录器同时覆盖以装备自身作素材、以及融合复制后的转化技能。
 fan_chongzhuangkaiyi_record:{trigger:{global:["useCard","respond"]},forced:true,popup:false,locked:false,
  filter:e=>["sha","shan"].includes(e.card.name)&&typeof e.skill==="string"&&/fan_chongzhuangkaiyi_(sha|shan)$/.test(e.skill),
  async content(event,trigger){
   if(trigger.fanChongzhuangRecorded)return;trigger.fanChongzhuangRecorded=true;
   const owner=trigger.player;if(!owner.isIn())return;
   const targets=[...new Set(wedgeTargets(trigger))].sortBySeat(_status.currentPhase||owner);
   for(const target of targets){if(target===owner||!target.isIn())continue;
    target.addSkill("fan_chongzhuangkaiyi_xie");
    const sources=target.storage.fan_chongzhuangkaiyi_xie||(target.storage.fan_chongzhuangkaiyi_xie=[]);
    if(!sources.includes(owner))sources.push(owner);
    target.markSkill("fan_chongzhuangkaiyi_xie");
   }
  }},
 fan_chongzhuangkaiyi_xie:{charlotte:true,mark:true,marktext:"楔",group:"fan_chongzhuangkaiyi_xie_ready",intro:{content(storage,player){
   const ready=player.storage.fan_chongzhuangkaiyi_xie_ready||[];
   return (storage||[]).map(source=>`${ready.includes(source)?"本回合":"你的下个回合"}结束时，${get.translation(source)}获得你的所有手牌。`).join("<br>");
  }},
  trigger:{player:"phaseEnd"},forced:true,popup:false,
  filter:(event,player)=>(player.storage.fan_chongzhuangkaiyi_xie_ready||[]).length>0,
  async content(event,trigger,player){
   const sources=(player.storage.fan_chongzhuangkaiyi_xie_ready||[]).slice().sortBySeat(_status.currentPhase||player);
   delete player.storage.fan_chongzhuangkaiyi_xie_ready;
   player.storage.fan_chongzhuangkaiyi_xie=(player.storage.fan_chongzhuangkaiyi_xie||[]).filter(source=>!sources.includes(source));
   if(!player.storage.fan_chongzhuangkaiyi_xie.length)player.removeSkill("fan_chongzhuangkaiyi_xie");else player.markSkill("fan_chongzhuangkaiyi_xie");
   for(const owner of sources){if(!player.isIn()||!owner.isIn())continue;const cards=player.getCards("h");if(cards.length)await player.give(cards,owner);}
  },onremove(player){delete player.storage.fan_chongzhuangkaiyi_xie;delete player.storage.fan_chongzhuangkaiyi_xie_ready;}},
 // 只在被标记者下一回合开始时锁定本次到期来源；回合内新增来源留待其再下一回合。
 fan_chongzhuangkaiyi_xie_ready:{charlotte:true,trigger:{player:"phaseBegin"},forced:true,popup:false,
  async content(event,trigger,player){player.storage.fan_chongzhuangkaiyi_xie_ready=(player.storage.fan_chongzhuangkaiyi_xie||[]).slice();player.markSkill("fan_chongzhuangkaiyi_xie");}},
};
export const blackwingTranslate={
 fan_qiheizhixuanfeng:"漆黑之旋风",fan_qiheizhixuanfeng_info:"出牌阶段，对你使用。你随机获得五张【黑羽】卡组相关的牌。",
 fan_kaiyiya:"铠翼鸦",fan_kaiyiya_info:"你可以将一张黑色牌当【杀】或【闪】使用或打出。",
 fan_chongzhuangkaiyi:"重装铠翼",fan_chongzhuangkaiyi_info:"锁定技，装备区的此牌不能被弃置。<br>你可以将一张黑色牌当【杀】或【闪】使用或打出，目标角色的下个回合结束时，你获得其所有手牌。",
 fan_zhouyuleiqie:"骤雨雷切",fan_zhouyuleiqie_info:"出牌阶段，对一名其他角色使用。弃置任意张黑色牌，然后弃置该角色区域内等量张牌。",
 fan_heixuanfeng:"黑旋风",fan_heixuanfeng_info:"锁定技，你使用黑色牌时，摸一张牌。",
 fan_kaiyiya_sha:"铠翼鸦·杀",fan_kaiyiya_shan:"铠翼鸦·闪",fan_chongzhuangkaiyi_sha:"重装铠翼·杀",fan_chongzhuangkaiyi_shan:"重装铠翼·闪",
 fan_chongzhuangkaiyi_protect:"重装铠翼",fan_chongzhuangkaiyi_xie:"楔",fan_heixuanfeng_draw:"黑旋风",
};
