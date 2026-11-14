import { gainCynoPackCards, createCynoReward } from "../ui/cyno-rarity.js";
import { playCynoSound } from "./cyno-sound.js";
import{game,get,ui,_status}from"../../../noname.js";
import{monarchFaces,sampleMonarch,sampleHeavenlyMonarch}from"./monarch-data.js";
const self={type:"trick",enable:true,selectTarget:-1,toself:true,filterTarget:(c,p,t)=>p===t};
const removal={type:"trick",enable:true,filterTarget:(c,p,t)=>p!==t&&t.countCards("hej")>0};
export function outsideDraw(event){for(let e=event;e;e=e.parent)if(e.name==="phaseDraw")return false;return true;}
export const monarchCards={
 fan_fanshenzhidiwang:{...self,ai:{order:10,value:10,result:{target:5}},async content(event,trigger,player){
  const plan=sampleMonarch(),cards=[];
  for(const item of plan.filter(i=>i.source==="pile")){const c=get.cardPile2(c=>c.name===item.name);if(c){c.remove();c.original="c";cards.push(c);}else cards.push(...get.cards(1));}
  game.updateRoundNumber();if(cards.length)await gainCynoPackCards(player, cards,"draw", (event.cards?.length === 1 ? event.cards[0] : event.card));
  if(player.isIn())await gainCynoPackCards(player, plan.filter(i=>i.source==="derived").map(i=>createCynoReward(game, event.cards?.length === 1 ? event.cards[0] : event.card, i.name, ...monarchFaces[i.name])),"draw");
 }},
 fan_tiandi:{...self,ai:{order:8,value:8,result:{target:2}},async content(event,trigger,player){
  const countsUse=card=>get.name(card,player)!=="sha";
  const canUse=card=>player.hasUseTarget(card,true,countsUse(card));
  const useValue=card=>player.getUseValue(card,true,countsUse(card));
  const shown=sampleHeavenlyMonarch(Array.from(ui.cardPile.childNodes));if(!shown.length)return;
  const selection=player.chooseButton(["天帝：选择一张牌",shown],true)
   .set("filterButton",b=>b.link.parentNode===ui.cardPile)
   .set("ai",b=>canUse(b.link)?useValue(b.link):0);
  let control, operation;
  if(selection.isMine?.()){
   // The action buttons submit the selected card directly.
   selection.set("filterOk",()=>false);
   selection.custom.add.button=()=>{
    const card=ui.selected.buttons[0]?.link;
    if(!card){control?.close();control=null;return;}
    if(!control){
     control=ui.create.control("使用","置入弃牌堆",(label)=>{
      const chosen=ui.selected.buttons[0]?.link;
      if(_status.event!==selection||!player.isIn()||!shown.includes(chosen)||chosen.parentNode!==ui.cardPile)return;
      const use=label==="使用";
      if(use&&!canUse(chosen))return;
      operation=use?"use":"discard";
      ui.click.ok();
     });
    }
    const usable=canUse(card);
    control.firstChild.classList.toggle("disabled",!usable);
    control.firstChild.style.opacity=usable?"":"0.4";
    control.firstChild.setAttribute("aria-disabled",String(!usable));
   };
  }
  let choice;
  try { choice=await selection.forResult(); }
  finally { control?.close(); }
  const card=choice.links?.[0];
  if(!choice.bool||!shown.includes(card)||card.parentNode!==ui.cardPile||!player.isIn())return;
  if(!operation){
   const action=await player.chooseButton(["天帝：选择操作",[[["use","使用"],["discard","置入弃牌堆"]],"textbutton"]],true)
    .set("filterButton",b=>b.link==="discard"||(card.parentNode===ui.cardPile&&canUse(card)))
    .set("ai",b=>b.link==="use"&&useValue(card)>0?2:1).forResult();
   if(!action.bool||card.parentNode!==ui.cardPile||!player.isIn())return;
   operation=action.links[0];
  }
  if(operation==="use"&&canUse(card))await player.chooseUseTarget({card,addCount:countsUse(card),forced:true,prompt:"天帝：使用所选牌",prompt2:false});
  else if(operation==="discard")await game.cardsDiscard([card]);
  game.updateRoundNumber();
 }},
 fan_xiedi:{...removal,ai:{order:7,value:7,result:{target:-2}},async content(event,trigger,player){
  const target=event.target;if(!target.isIn()||!target.countDiscardableCards(player,"hej"))return;
  const result=await player.discardPlayerCard(target,"hej",1,true).forResult();
  if(result.bool&&result.cards?.some(c=>get.color(c)==="black")&&target.isIn())await target.loseHp();
 }},
 fan_yuanxiedi:{...removal,ai:{order:7,value:9,result:{target:-3}},async content(event,trigger,player){
  const target=event.target;if(!target.isIn())return;
  const count=Math.min(2,target.countDiscardableCards(player,"hej"));if(count)await player.discardPlayerCard(target,"hej",count,true);
  if(target.isIn())await target.loseHp();
 }},
 fan_diwanglingyu:{type:"trick",enable:true,selectTarget:-1,filterTarget:()=>true,ai:{order:3,value:7,result:{target:-1}},
  async content(event,trigger,player){const target=event.target;if(!target.isIn())return;target.addSkill("fan_diwanglingyu_effect");const sources=target.storage.fan_diwanglingyu_effect||(target.storage.fan_diwanglingyu_effect=[]);if(!sources.includes(player))sources.push(player);target.markSkill("fan_diwanglingyu_effect");}},
};
for(const[name,c]of Object.entries(monarchCards))Object.assign(c,{derivation:"fan_cyno",destroy:"discardPile",fullskin:true,image:`ext:原神/image/card/${name}-framed.png`,global:"fan_diwanglingyu_expire"});
export const monarchSkills={
 fan_diwanglingyu_effect:{charlotte:true,cardSkill:true,locked:false,forced:true,popup:false,mark:true,marktext:"域",onremove:true,
  intro:{content:storage=>`摸牌阶段外不能获得牌，持续至${(storage||[]).map(p=>get.translation(p)).join("、")}的下个回合开始。`},
  trigger:{player:["drawBefore","gainBefore"]},
  filter:outsideDraw,
  async content(event,trigger,player){
   trigger.cancel();
   player.popup(get.translation("fan_diwanglingyu"),"metal");
   playCynoSound("addcounter");
  },
  ai:{nogain:true,skillTagFilter:()=>outsideDraw(_status.event)}},
 fan_diwanglingyu_expire:{cardSkill:true,trigger:{global:"phaseBeginStart"},forced:true,popup:false,locked:false,
  filter:event=>game.hasPlayer(p=>p.storage.fan_diwanglingyu_effect?.includes(event.player)),
  async content(event,trigger){
   if(trigger.fanMonarchExpired)return;trigger.fanMonarchExpired=true;
   for(const p of game.filterPlayer(p=>p.storage.fan_diwanglingyu_effect?.includes(trigger.player)).sortBySeat(_status.currentPhase||trigger.player)){
    p.storage.fan_diwanglingyu_effect=p.storage.fan_diwanglingyu_effect.filter(source=>source!==trigger.player);
    if(!p.storage.fan_diwanglingyu_effect.length)p.removeSkill("fan_diwanglingyu_effect");else p.markSkill("fan_diwanglingyu_effect");
   }
  }},
};
export const monarchTranslate={
 fan_fanshenzhidiwang:"泛神的帝王",fan_fanshenzhidiwang_info:"出牌阶段，对你使用。你随机获得五张【真帝王】卡组相关的牌。",
 fan_tiandi:"天帝",fan_tiandi_info:"出牌阶段，对你使用。观看牌堆三张牌名不同的牌，选择其中一张牌使用或置入弃牌堆。",
 fan_xiedi:"邪帝",fan_xiedi_info:"出牌阶段，对区域内有牌的一名其他角色使用。弃置其区域内一张牌，弃置黑色牌时，该角色失去1点体力。",
 fan_yuanxiedi:"怨邪帝",fan_yuanxiedi_info:"出牌阶段，对区域内有牌的一名其他角色使用。弃置其区域内两张牌，该角色失去1点体力。",
 fan_diwanglingyu:"帝王领域",fan_diwanglingyu_info:"出牌阶段，对所有角色使用，直到你的下个回合开始，所有角色于摸牌阶段外获得牌时，防止之。",
 fan_diwanglingyu_effect:"帝王领域",
};
