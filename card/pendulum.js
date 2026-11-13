import { gainCynoPackCards, createCynoReward } from "../ui/cyno-rarity.js";
import { playCynoSound } from "./cyno-sound.js";
import {game,get,lib,ui,_status} from "../../../noname.js";
import { gainCardMatchingText } from "./pile-text-search.js";

export const pendulumFaces={fan_lingbaizhiqiji:["diamond",13],fan_yiyanhulong:["diamond",8],fan_yiyannilong:["diamond",4],fan_yiyanbawang:["diamond",4],fan_tiankonghongcai:["diamond",1]};
export function samplePendulum(random=Math.random){
 const roll=()=>{const n=random();if(!Number.isFinite(n)||n<0||n>=1)throw new RangeError("随机数须在[0,1)内");return n};
 const count=roll()<.5?2:3,result=[];
 for(let i=0;i<count;i++)result.push({source:"pile",name:roll()<2/3?"sha":"jiu"});
 for(let i=count;i<5;i++){let name=["fan_yiyanhulong","fan_yiyannilong","fan_tiankonghongcai"][Math.floor(roll()*3)];if(name==="fan_yiyannilong"&&roll()<1/3)name="fan_yiyanbawang";result.push({source:"derived",name});}
 return result;
}
const dragons=["fan_yiyanhulong","fan_yiyannilong","fan_yiyanbawang"];
const handledPendulumUses = new WeakSet();
const globals=["fan_lingbai_install"];
const labels={1:"武器栏",2:"防具栏",3:"防御坐骑栏",4:"进攻坐骑栏",5:"宝物栏"};
const self={type:"trick",enable:true,selectTarget:-1,toself:true,filterTarget:(c,p,t)=>p===t};
export async function installPendulum(player,card){
 if(!player.isIn()||get.position(card,true)!=="o")return;
 const slots=[1,2,3,4,5].filter(n=>player.hasEmptySlot(n));if(!slots.length)return;
 const controls=slots.map(n=>labels[n]);
 const result=await player.chooseControl(...controls,"cancel2").set("prompt","灵摆：选择空置装备栏").set("prompt2",false).set("ai",()=>controls[0]).forResult();
 const slot=slots[controls.indexOf(result.control)];if(!slot||!player.hasEmptySlot(slot)||get.position(card,true)!=="o")return;
 const id=card.name+"_equip"+slot,base=card.name;
 game.broadcastAll((id,base,slot)=>{
  lib.card[id]={...lib.card[base],type:"equip",subtype:"equip"+slot,source:[base],enable:false,
   skills:[]};
  lib.translate[id]=lib.translate[base];lib.translate[id+"_info"]=lib.translate[base+"_info"];
 },id,base,slot);
 await player.equip(get.autoViewAs({name:id},[card]));
}
const direct = "fan_yiyanbawang_direct";
const reverse={type:"trick",enable:true,filterTarget:(c,p,t)=>p!==t,
 async content(event,trigger,player){
  const target=event.target,cards=target.getCards("hej",c=>get.number(c,target)>0&&get.number(c,target)<=7&&lib.filter.canBeDiscarded(c,player,target));
  if(cards.length)await target.discard(cards).set("discarder",player);
 },
 ai:{order:8,value:8,result:{target:(p,t)=>-t.countCards("hej",c=>get.number(c,t)>0&&get.number(c,t)<=7)}}};
export const pendulumCards={
 fan_lingbaizhiqiji:{...self,ai:{order:10,value:10,result:{target:5}},async content(event,trigger,player){
  const plan=samplePendulum(),cards=[];for(const item of plan.filter(i=>i.source==="pile")){const c=get.cardPile2(c=>c.name===item.name);if(c){c.remove();c.original="c";cards.push(c)}else cards.push(...get.cards(1));}
  game.updateRoundNumber();if(cards.length)await gainCynoPackCards(player, cards,"draw", (event.cards?.length === 1 ? event.cards[0] : event.card));if(player.isIn())await gainCynoPackCards(player, plan.filter(i=>i.source==="derived").map(i=>createCynoReward(game, event.cards?.length === 1 ? event.cards[0] : event.card, i.name, ...pendulumFaces[i.name])),"draw");
 }},
 fan_yiyanhulong:{...self,ai:{order:7,value:6,result:{target:1}},async content(event,trigger,player){
  await gainCardMatchingText(player,"杀","异眼弧龙：选择要获得的牌", event.cards?.length === 1 ? event.cards[0] : event.card);
 }},
 fan_yiyannilong:{...reverse},
 fan_yiyanbawang:{...reverse,async content(event,trigger,player){
  await reverse.content(event,trigger,player);
  if (!player.isIn() || !event.target.isIn()) return;
  player.addTempSkill(direct);
  player.markAuto(direct,[event.target]);
 }},

 fan_tiankonghongcai:{type:"equip",subtype:"equip5",skills:["fan_tiankonghongcai_protect","fan_tiankonghongcai_reclaim"],enable:true,selectTarget:-1,toself:true,modTarget:true,
  filterTarget:(c,p,t)=>p===t&&t.canEquip(c,true),async content(event){await event.target.equip(event.cards[0]);},
  ai:{order:9,value:9,basic:{equipValue:9},result:{target:1}}},
};
for(const[name,card]of Object.entries(pendulumCards))Object.assign(card,{derivation:"fan_cyno",destroy:"discardPile",fullskin:true,image:`ext:原神/image/card/${name}-framed.png`,global:globals.slice()});
export const pendulumSkills={
 fan_lingbai_install:{trigger:{global:"useCardAfter"},forced:true,popup:false,locked:false,
  filter:event=>!handledPendulumUses.has(event)&&event.player.isIn()&&(event.cards||[]).some(c=>dragons.includes(c.name)&&get.position(c,true)==="o"),
  async content(event,trigger){
   if(handledPendulumUses.has(trigger))return;
   handledPendulumUses.add(trigger);
   for(const card of new Set(trigger.cards||[]))if(dragons.includes(card.name))await installPendulum(trigger.player,card);
  }},
 [direct]:{charlotte:true,forced:true,popup:false,onremove:true,trigger:{player:"useCard"},
  filter:(event,player)=>player.getStorage(direct).some(target=>target.isIn()),
  async content(event,trigger,player){trigger.directHit.addArray(player.getStorage(direct).filter(target=>target.isIn()));},
 },
 fan_tiankonghongcai_protect:{equipSkill:true,locked:true,mod:{canBeDiscarded(c,p,t){if(t.getCards("e").includes(c))return false;},cardDiscardable(c,p){if(p.getCards("e").includes(c))return false;}}},
 fan_tiankonghongcai_reclaim:{equipSkill:true,locked:false,enable:"phaseUse",usable:1,
  position:"e",selectCard:1,discard:false,lose:false,delay:false,manualConfirm:true,
  prompt:"天空虹彩：选择另一张装备牌获得，然后摸一张牌",prompt2:false,
  filterCard:c=>c.name!=="fan_tiankonghongcai",
  check:c=>get.value(c,_status.event.player)+1,
  filter:(e,p)=>p.getCards("e").some(c=>c.name!=="fan_tiankonghongcai"),
  async content(event,trigger,player){const card=event.cards?.[0];if(card&&card.name!=="fan_tiankonghongcai"&&player.getCards("e").includes(card)){playCynoSound("activate");await player.gain(card,"gain2");if(player.isIn())await player.draw();}},
  ai:{order:2,result:{player:1}}},
};
export const pendulumTranslate={
 fan_lingbaizhiqiji:"灵摆之奇迹",fan_lingbaizhiqiji_info:"出牌阶段，对你使用。你随机获得五张【异色眼】卡组相关的牌。",
 fan_yiyanhulong:"异眼弧龙",fan_yiyanhulong_info:"出牌阶段，对你使用。你选择并获得一张牌名或描述含有“杀”的牌。<br>此牌使用后，你可以将此牌置于一个空置的装备栏。",
 fan_yiyannilong:"异眼叛龙",fan_yiyannilong_info:"出牌阶段，对一名其他角色使用。你弃置其区域内所有点数不大于7的牌。<br>此牌使用后，你可以将此牌置于一个空置的装备栏。",
 fan_yiyanbawang:"异眼霸王",fan_yiyanbawang_info:"出牌阶段，对一名其他角色使用。你弃置其区域内所有点数不大于7的牌，该角色本回合不能响应你使用的牌。<br>此牌使用后，你可以将此牌置于一个空置的装备栏。",
 fan_tiankonghongcai:"天空虹彩",fan_tiankonghongcai_info:"锁定技，你装备区的牌不能被弃置。<br>出牌阶段限一次，你可以获得你装备区的另一张牌，然后摸一张牌。",
 [direct]:"异眼霸王",fan_tiankonghongcai_protect:"天空虹彩",fan_tiankonghongcai_reclaim:"天空虹彩",
};
