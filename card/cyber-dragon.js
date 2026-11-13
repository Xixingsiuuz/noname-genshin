import { gainCynoPackCards, createCynoReward } from "../ui/cyno-rarity.js";
import{game,get,lib,ui,_status}from"../../../noname.js";
export const cyberDragonFaces={fan_jiguanglongxilei:["spade",13],fan_jinjihujiao:["spade",1],fan_xinxing:["spade",5],fan_wuxian:["spade",6],fan_wuxianpaoying:["spade",2]};
export function sampleCyberDragon(random=Math.random){
 const roll=()=>{const n=random();if(!Number.isFinite(n)||n<0||n>=1)throw new RangeError("随机数须在[0,1)内");return n},count=roll()<.5?2:3,result=[];
 for(let i=0;i<count;i++)result.push({source:"pile",kind:roll()<2/3?"tiesuo":"armor"});
 for(let i=count;i<5;i++){let name=["fan_jinjihujiao","fan_xinxing","fan_wuxianpaoying"][Math.floor(roll()*3)];if(name==="fan_xinxing"&&roll()<1/3)name="fan_wuxian";result.push({source:"derived",name});}return result;
}
function turnTarget(event){for(let e=event;e;e=e.parent){if(e.fanImpermanenceTarget)return e.fanImpermanenceTarget;if(e.name==="chooseToUse"||e.name==="chooseToRespond")return;}}
let characterSkillCache;
export function characterSkillIds(){
 if(characterSkillCache)return characterSkillCache;
 const found=new Set();for(const c of Object.values(lib.character))for(const id of c.skills||c[3]||[])found.add(id);
 const list=[...found];for(let i=0;i<list.length;i++){const d=lib.skill[list[i]]?.derivation;for(const id of typeof d==="string"?[d]:d||[])if(!found.has(id)){found.add(id);list.push(id);}}
 game.expandSkills(list);characterSkillCache=new Set(list);return characterSkillCache;
}
function seal(target){target.addTempSkill("fan_dianzilong_seal",{player:"phaseAfter"});}
const self={type:"trick",enable:true,selectTarget:-1,toself:true,filterTarget:(c,p,t)=>p===t};
const nova={...self,async content(event,trigger,player){player.addSkill("fan_dianzilong_growth");player.addMark("fan_dianzilong_growth",1,false);},ai:{order:9,value:9,result:{target:3}}};
export const cyberDragonCards={
 fan_jiguanglongxilei:{...self,ai:{order:10,value:10,result:{target:5}},async content(event,trigger,player){
  const plan=sampleCyberDragon(),cards=[];for(const item of plan.filter(i=>i.source==="pile")){const list=Array.from(ui.cardPile.childNodes).filter(c=>item.kind==="tiesuo"?c.name==="tiesuo":get.subtype(c)==="equip2");const c=list.randomGet();if(c){c.remove();c.original="c";cards.push(c)}else cards.push(...get.cards(1));}
  game.updateRoundNumber();if(cards.length)await gainCynoPackCards(player, cards,"draw", (event.cards?.length === 1 ? event.cards[0] : event.card));if(player.isIn())await gainCynoPackCards(player, plan.filter(i=>i.source==="derived").map(i=>createCynoReward(game, event.cards?.length === 1 ? event.cards[0] : event.card, i.name, ...cyberDragonFaces[i.name])),"draw");
 }},
 fan_xinxing:{...nova},fan_wuxian:{...nova},
 fan_jinjihujiao:{...self,ai:{order:8,value:8,result:{target:p=>p.isDamaged()?2:1}},async content(event,trigger,player){
  const result=await player.chooseControl("摸两张牌","回复体力").set("prompt","紧急呼救：选择一项").set("prompt2",false).set("ai",()=>player.isDamaged()&&player.hp<=2?"回复体力":"摸两张牌").forResult();
  if(result.control==="回复体力")await player.recover();else if(result.control==="摸两张牌")await player.draw(2);
 }},
 fan_wuxianpaoying:{type:"trick",enable:()=>!!turnTarget(_status.event),filterTarget:(c,p,t)=>t!==p&&t===turnTarget(_status.event),
  async content(event){if(event.target.isIn())seal(event.target);},ai:{order:0,value:8,useful:7,result:{target:-2}}},
};
for(const[name,c]of Object.entries(cyberDragonCards))Object.assign(c,{derivation:"fan_cyno",destroy:"discardPile",fullskin:true,image:`ext:原神/image/card/${name}-framed.png`,global:["fan_dianzilong_hand","fan_wuxian_after","fan_wuxianpaoying_window"]});
export const cyberDragonSkills={
 fan_dianzilong_hand:{mod:{ignoredHandcard:c=>["fan_jinjihujiao","fan_wuxianpaoying"].includes(c.name)?true:undefined,cardDiscardable(c,p,n){if(n==="phaseDiscard"&&["fan_jinjihujiao","fan_wuxianpaoying"].includes(c.name))return false;}}},
 fan_dianzilong_growth:{charlotte:true,mark:true,marktext:"星",intro:{content:"手牌上限+#，摸牌阶段多摸#张牌"},mod:{maxHandcard:(p,n)=>n+p.countMark("fan_dianzilong_growth")},trigger:{player:"phaseDrawBegin2"},forced:true,popup:false,
  filter:(e,p)=>!e.numFixed&&p.countMark("fan_dianzilong_growth")>0,async content(event,trigger,player){trigger.num+=player.countMark("fan_dianzilong_growth");}},
 fan_dianzilong_seal:{charlotte:true,mark:true,marktext:"封",intro:{content:"技能失效，直到其回合结束。"},
  init(p,id){p.addSkillBlocker(id)},onremove(p,id){p.removeSkillBlocker(id)},
  skillBlocker(id,p){const info=lib.skill[id];return !!info&&!info.charlotte&&!info.equipSkill&&characterSkillIds().has(id);}},
 fan_wuxian_after:{trigger:{global:"useCardAfter"},forced:true,popup:false,locked:false,
  filter:e=>e.card.name==="fan_wuxian"&&e.player.isIn()&&game.hasPlayer(p=>p!==e.player),
  async content(event,trigger){if(trigger.fanInfinityHandled)return;trigger.fanInfinityHandled=true;const player=trigger.player;const result=await player.chooseTarget("无限：选择技能失效的角色",true,(c,p,t)=>p!==t).set("prompt2",false).set("ai",t=>-get.attitude(player,t)*get.threaten(t)).forResult();const target=result.targets?.[0];if(result.bool&&target.isIn())seal(target);}},
 fan_wuxianpaoying_window:{trigger:{global:"phaseBefore"},forced:true,popup:false,locked:false,
  async content(event,trigger,player){if(trigger.fanImpermanenceHandled)return;trigger.fanImpermanenceHandled=true;const target=trigger.player;const owners=game.filterPlayer(p=>p!==target&&p.countCards("h",{name:"fan_wuxianpaoying"})>0).sortBySeat(_status.currentPhase||player);
   for(const owner of owners){if(!owner.isIn()||!target.isIn())continue;await owner.chooseToUse({prompt:"你可以使用【无限泡影】",prompt2:false,fanImpermanenceTarget:target,filterCard:c=>c.name==="fan_wuxianpaoying",selectTarget:-1,filterTarget:(c,p,t)=>t===target,ai1:()=>get.attitude(owner,target)<0?1:0});}
  }},
};
export const cyberDragonTranslate={
 fan_jiguanglongxilei:"机光龙袭雷",fan_jiguanglongxilei_info:"出牌阶段，对你使用。你随机获得五张【电子龙】卡组相关的牌。",
 fan_jinjihujiao:"紧急呼救",fan_jinjihujiao_info:"此牌不计入手牌上限。出牌阶段，对你使用。你摸两张牌或者回复1点体力。",
 fan_xinxing:"新星",fan_xinxing_info:"出牌阶段，对你使用。你手牌上限+1，在摸牌阶段多摸一张牌。",
 fan_wuxian:"无限",fan_wuxian_info:"出牌阶段，对你使用。你手牌上限+1，在摸牌阶段多摸一张牌。<br>此牌使用后，选择一名其他角色，该角色技能失效直到其回合结束。",
 fan_wuxianpaoying:"无限泡影",fan_wuxianpaoying_info:"此牌不计入手牌上限。其他角色的回合开始时，对该角色使用。其技能失效直到本回合结束。",
 fan_dianzilong_growth:"电子龙",fan_dianzilong_seal:"技能失效",
};
