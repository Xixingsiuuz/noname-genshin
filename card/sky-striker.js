import { game, get, lib, _status } from "../../../noname.js";
import { skyStrikerFaces, sampleSkyStriker } from "./sky-striker-data.js";
import { gainCardMatchingText } from "./pile-text-search.js";

const zero = "fan_shandaojiling";
const upgraded = "fan_yihualingyi";
const tag = "fan_shandao_draw";
const resolvedDraws = new WeakSet();
const resolvedUpgradeGains = new WeakSet();
const self = {type:"trick", enable:true, selectTarget:-1, toself:true, filterTarget:(card,player,target)=>player===target};
const drawAi = {order:7, value:7, result:{target:1}};

const anchor = "fan_heiguafuqian";

function anchorSource(event) {
 for (let current = event; current; current = current.parent) {
  if (current.fanAnchorSource) return current.fanAnchorSource;
  if (current.name === "chooseToUse" || current.name === "chooseToRespond") break;
 }
}

function hasChainDraw(event) {
 const materials = event.cards || [];
 const hasTag = event.player.getHistory("lose", loss => loss.getParent() === event &&
  loss.hs?.some(card => materials.includes(card) && loss.gaintag_map?.[card.cardid]?.includes(tag))
 ).length > 0;
 return event.card.name === zero || materials.some(card => card.name === zero) || hasTag;
}

export const skyStrikerCards = {
 fan_shandaozhijilve: {
  ...self, ai:{order:10,value:10,result:{target:5}},
  async content(event, trigger, player) {
   const plan = sampleSkyStriker();
   const cards = [];
   for (const item of plan.filter(item => item.source === "pile")) {
    const card = get.cardPile2(card => card.name === item.name);
    if (card) {
     card.remove();
     card.original = "c";
     cards.push(card);
    } else {
     cards.push(...get.cards(1));
    }
   }
   game.updateRoundNumber();
   if (cards.length) await player.gain(cards,"draw");
   if (player.isIn()) {
    await player.gain(plan.filter(item => item.source === "derived")
     .map(item => game.createCard(item.name,...skyStrikerFaces[item.name])),"draw");
   }
  },
 },
 [zero]: {
  ...self,
  ai:{...drawAi,result:{target:player=>player.countCards("he")>0 ? 0.25 : 1}},
  async content(event,trigger,player) {
   await player.chooseToDiscard("he",1,true,"闪刀姬零：弃置一张牌");
  },
 },
 [upgraded]: {...self, ai:drawAi, async content(event,trigger,player) { await player.draw(); }},
 fan_shandaoqidong: {
  ...self, ai:{...drawAi, order:7},
  async content(event, trigger, player) {
   await gainCardMatchingText(player, "闪", "闪刀起动：选择要获得的牌");
   if (player.isIn()) await player.draw();
  },
 },
 [anchor]: {
  type:"trick", selectTarget:-1,
  enable:()=>!!anchorSource(_status.event),
  filterTarget:(card,player,target)=>target===anchorSource(_status.event) && target.countGainableCards(player,"hej")>0,
  ai:{order:0,value:7,result:{target:-1}},
  async content(event, trigger, player) {
   const target = event.target;
   if (target.isIn() && target.countGainableCards(player,"hej")) await player.gainPlayerCard(target,"hej",1,true);
  },
 },
};

for (const [name,card] of Object.entries(skyStrikerCards)) {
 Object.assign(card,{
  derivation:"fan_cyno", destroy:"discardPile", fullskin:true,
  image:`ext:原神/image/card/${name}-framed.png`, global:[tag,"fan_yihualingyi_gain","fan_heiguafuqian_window"],
 });
}

export const skyStrikerSkills = {
 fan_heiguafuqian_window: {
  cardSkill:true, direct:true, trigger:{global:"useCard"},
  mod:{
   ignoredHandcard(card) { if (card.name===anchor) return true; },
   cardDiscardable(card,player,reason) { if (reason==="phaseDiscard" && card.name===anchor) return false; },
  },
  filter(event,player) {
   const source = event.player;
   return player !== source && player.isIn() && source?.isIn()
    && (event.card?.name === "sha" || event.card?.name === "shan")
    && source.countGainableCards(player,"hej") > 0
    && player.hasCard(card => card.name === anchor &&
     lib.filter.cardEnabled(card,player,"forceEnable"),"h");
  },
  async content(event,trigger,player) {
   const source = trigger.player;
   if (!skyStrikerSkills.fan_heiguafuqian_window.filter(trigger,player)) return;
   await player.chooseToUse({
    prompt:"你可以对" + get.translation(source) + "使用【黑寡妇锚】",
    prompt2:false, fanAnchorSource:source, position:"h",
    filterCard:(card,owner)=>card.name===anchor && lib.filter.cardEnabled(card,owner,"forceEnable"),
    selectTarget:-1,
    filterTarget:(card,owner,target)=>target===source && source.isIn() &&
     source.countGainableCards(owner,"hej")>0 && lib.filter.targetEnabled(card,owner,target),
    ai1:()=>source.isIn() && source.countGainableCards(player,"hej")>0
     ? -get.attitude(player,source) : 0,
   });
  },
 },
 [tag]: {
  cardSkill:true, forced:true, locked:false, popup:false,
  trigger:{global:["useCardAfter","respondAfter"]},
  filter(event) {
   if (resolvedDraws.has(event) || !event.player.isIn()) return false;
   return hasChainDraw(event);
  },
  async content(event,trigger) {
   if (resolvedDraws.has(trigger) || !trigger.player.isIn()) return;
   const player = trigger.player;
   if (!hasChainDraw(trigger)) return;
   resolvedDraws.add(trigger);
   const draw = player.draw();
   draw.gaintag.add(tag);
   await draw;
  },
 },
 fan_yihualingyi_gain: {
  cardSkill:true, forced:true, locked:false, popup:false,
  trigger:{global:"useCardAfter"},
  filter(event) {
   return !resolvedUpgradeGains.has(event) && event.player.isIn() && event.card.name === upgraded;
  },
  async content(event,trigger) {
   if (!skyStrikerSkills.fan_yihualingyi_gain.filter(trigger)) return;
   resolvedUpgradeGains.add(trigger);
   const player = trigger.player;
   await player.gain(game.createCard(zero,...skyStrikerFaces[zero]),"draw");
  },
 },
};

export const skyStrikerTranslate = {
 fan_shandaozhijilve:"闪刀之机略",
 fan_shandaozhijilve_info:"出牌阶段，对你使用，你随机获得五张【闪刀】卡组相关的牌。",
 [zero]:"闪刀姬零",
 [zero+"_info"]:"①出牌阶段，对你使用。你弃置一张牌。<br>②你使用或打出此牌后，摸一张牌，且该牌也获得此效果。",
 [upgraded]:"异画零衣",
 [upgraded+"_info"]:"①出牌阶段，对你使用。你摸一张牌。<br>②此牌使用后，获得一张"+get.poptip(zero)+"。",
 fan_shandaoqidong:"闪刀起动",
 fan_shandaoqidong_info:"出牌阶段，对你使用。你选择并获得一张牌名或描述含有“闪”的牌，然后摸一张牌。",
 fan_heiguafuqian:"黑寡妇锚",
 fan_heiguafuqian_info:"此牌不计入手牌上限。<br>其他角色使用【杀】或【闪】时，对该角色使用。你获得其区域内的一张牌。",
 [tag]:"闪刀姬零",
 fan_yihualingyi_gain:"异画零衣",
};

