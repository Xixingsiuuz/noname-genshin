import{game,get,lib,ui,_status}from"../../../noname.js";
import{cyberseFaces,sampleCyberse}from"./cyberse-data.js";
const self={type:"trick",enable:true,selectTarget:-1,toself:true,filterTarget:(c,p,t)=>p===t};
const block = "fan_wangjichongtu_block";
const ranks = ["A","2","3","4","5","6","7","8","9","10","J","Q","K"];
const validRank = number => Number.isInteger(number) && number >= 1 && number <= 13;

function miningPairs(pile) {
 const byRank = new Map();
 for (const card of pile) {
  const rank = get.number(card);
  if (!validRank(rank)) continue;
  if (!byRank.has(rank)) byRank.set(rank, []);
  byRank.get(rank).push(card);
 }
 return [...byRank.values()].filter(cards => cards.length >= 2);
}

function prohibitRank(card,player) {
 const rank = get.number(card,player);
 if (Object.values(player.storage[block] || {}).some(numbers=>numbers.includes(rank))) return false;
}

function nibiruSource(event){for(let e=event;e;e=e.parent){if(e.fanNibiruSource)return e.fanNibiruSource;if(e.name==="chooseToUse"||e.name==="chooseToRespond")return;}}
export function matchingNumber(card,selected,player){return !selected.length||get.number(card,player)===get.number(selected[0],player);}
export const cyberseCards={
 fan_dianzijielianjie:{...self,ai:{order:10,value:10,result:{target:5}},async content(event,trigger,player){
  const plan=sampleCyberse(),cards=[];for(const item of plan.filter(i=>i.source==="pile")){const card=get.cardPile2(c=>c.name===item.name);if(card){card.remove();card.original="c";cards.push(card)}else cards.push(...get.cards(1));}
  game.updateRoundNumber();if(cards.length)await player.gain(cards,"draw");if(player.isIn())await player.gain(plan.filter(i=>i.source==="derived").map(i=>game.createCard(i.name,...cyberseFaces[i.name])),"draw");
 }},
 fan_lianmayuzhe:{...self,ai:{order:7,value:8,result:{target:p=>p.getCards("he").some(c=>lib.filter.cardDiscardable(c,p)&&get.value(c)<6)&&game.hasPlayer(t=>t!==p&&p.canUse({name:"sha"},t,false,false)&&get.effect(t,{name:"sha"},p,p)>0)?2:0}},async content(event,trigger,player){
  const choice=await player.chooseToDiscard("he",[1,Infinity],true,"连码语者：弃置同点数的牌").set("complexCard",true)
   .set("filterCard",(card,p)=>matchingNumber(card,ui.selected.cards,p)&&lib.filter.cardDiscardable(card,p))
   .set("ai",card=>6-get.value(card)).forResult();
  if(!choice.bool||!choice.cards?.length||!player.isIn())return;
  if(!game.hasPlayer(t=>t!==player&&player.canUse({name:"sha"},t,false,false)))return;
  const result=await player.chooseTarget("连码语者：选择出杀目标",true,(c,p,t)=>t!==p&&p.canUse({name:"sha"},t,false,false))
   .set("prompt2",false).set("ai",t=>get.effect(t,{name:"sha"},player,player)).forResult();
  const target=result.targets?.[0];if(!result.bool)return;
  for(let i=0;i<choice.cards.length;i++){
   if(!player.isIn()||!target.isIn()||!player.canUse({name:"sha"},target,false,false))break;
   await player.useCard({name:"sha",isCard:true},target,false);
  }
 }},
 fan_wangjichongtu:{type:"trick",enable:true,filterTarget:(c,p,t)=>p!==t,ai:{order:8,value:7,result:{target:-1}},
  async content(event,trigger,player){
   const target = event.target;
   if (!target.isIn()) return;
   target.addTempSkill(block,{player:"phaseAfter"});
   const sources = target.storage[block] ||= {};
   sources[player.playerid] ||= [];
   target.markSkill(block);
  }},
 fan_wangjiwakuang:{...self,ai:{order:9,value:8,result:{target(){
  const pile = ui.cardPile.childNodes;
  return pile.length ? (miningPairs(pile).length ? 2 : 1) : 0;
 }}},async content(event,trigger,player){
  const pile = Array.from(ui.cardPile.childNodes);
  if (!pile.length) return;
  const group = miningPairs(pile).randomGet();
  await player.gain(group ? group.randomGets(2) : [pile.randomGet()],"draw");
 }},
 fan_yuanshishengming:{type:"trick",enable:()=>!!nibiruSource(_status.event),filterTarget:(c,p,t)=>t===nibiruSource(_status.event)&&p!==t,
  ai:{order:0,value:9,useful:8,result:{target:-3}},async content(event,trigger,player){
   const target=event.target;const cards=target.getCards("hej",c=>lib.filter.canBeDiscarded(c,player,target));
   if(cards.length)await target.discard(cards).set("discarder",player);
   const players=[player,target].sortBySeat(_status.currentPhase||player);for(const p of players)if(p.isIn())await p.draw(2);
  }},
};
for(const[name,card]of Object.entries(cyberseCards))Object.assign(card,{derivation:"fan_cyno",destroy:"discardPile",fullskin:true,image:`ext:原神/image/card/${name}-framed.png`,global:["fan_yuanshishengming_window","fan_yuanshishengming_hand"]});
export const cyberseSkills={
 fan_yuanshishengming_hand:{mod:{ignoredHandcard:c=>c.name==="fan_yuanshishengming"?true:undefined,cardDiscardable(c,p,name){if(name==="phaseDiscard"&&c.name==="fan_yuanshishengming")return false;}}},
 fan_yuanshishengming_window:{trigger:{global:"useCardAfter"},forced:true,popup:false,locked:false,
  filter(event){return event.player===_status.currentPhase&&event.player.isIn()&&event.player.getHistory("useCard").length>=5;},
  async content(event,trigger,player){const source=trigger.player;const owners=game.filterPlayer(p=>p!==source&&p.countCards("h",{name:"fan_yuanshishengming"})).sortBySeat(_status.currentPhase||player);
   for(const owner of owners){if(!owner.isIn()||!source.isIn())continue;
    await owner.chooseToUse({prompt:"你可以使用【原始生命】",prompt2:false,fanNibiruSource:source,
     filterCard:c=>c.name==="fan_yuanshishengming",selectTarget:-1,filterTarget:(c,p,t)=>t===source,
     ai1:()=>-get.attitude(owner,source)*source.countCards("hej")>2?1:0});
   }
  }},
 [block]:{cardSkill:true,charlotte:true,mark:true,marktext:"禁",onremove:true,
  trigger:{global:"useCardAfter"},forced:true,popup:false,
  intro:{content(storage){
   const blocked = ranks.filter((label,index)=>Object.values(storage || {}).some(numbers=>numbers.includes(index+1)));
   return blocked.length ? "不能使用或打出以下点数的牌："+blocked.join("、") : "等待记录网际冲突使用者的用牌点数";
  }},
  filter(event,player){
   const numbers = player.storage[block]?.[event.player.playerid];
   const rank = get.number(event.card);
   return numbers && validRank(rank) && !numbers.includes(rank);
  },
  async content(event,trigger,player){
   if (!cyberseSkills[block].filter(trigger,player)) return;
   player.storage[block][trigger.player.playerid].push(get.number(trigger.card));
   player.markSkill(block);
  },
  mod:{cardEnabled:prohibitRank,cardRespondable:prohibitRank,cardSavable:prohibitRank},
 },
};
export const cyberseTranslate={
 fan_dianzijielianjie:"电子界连接",fan_dianzijielianjie_info:"出牌阶段，对你使用。你随机获得五张【码语者】卡组相关的牌。",
 fan_lianmayuzhe:"连码语者",fan_lianmayuzhe_info:"出牌阶段，对你使用。弃置任意张点数相同的牌，然后选择一名其他角色，视为对其使用等量张【杀】。",
 fan_wangjichongtu:"网际冲突",fan_wangjichongtu_info:"出牌阶段，对一名其他角色使用。直到其回合结束，你使用一张牌后，该角色不能使用或打出与此牌点数相同的牌。",
 fan_wangjiwakuang:"网际挖矿",fan_wangjiwakuang_info:"出牌阶段，对你使用。你从牌堆获得两张点数相同的牌。",
 fan_yuanshishengming:"原始生命",fan_yuanshishengming_info:"此牌不计入手牌上限。一名其他角色于其回合内使用至少五张牌后，对该角色使用。弃置其区域内所有牌，然后你与其各摸两张牌。",
 fan_wangjichongtu_block:"网际冲突",
};
