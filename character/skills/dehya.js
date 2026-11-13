import { game, get, _status } from "../../../../noname.js";
const voicePath = "ext:原神/audio/dehya/skill:3";
export default {
 fan_shixue_self: { audio: voicePath },
 fan_shixue_ally: { audio: voicePath },
 fan_chizong: { audio:voicePath, locked:false, global:"fan_chizong_give" },
 fan_chizong_give: {
  audio:false, locked:false, enable:"phaseUse", position:"he", discard:false, lose:false, delay:false,
  filter(event,player) { return player.countCards("he",c=>get.type(c)==="equip")>0 && game.hasPlayer(t=>t!==player&&t.hasSkill("fan_chizong")&&!(event.getParent("phaseUse")?.fan_chizong_used||[]).includes(t)); },
  filterCard:card=>get.type(card)==="equip",
  filterTarget(card,player,target) { return target!==player&&target.hasSkill("fan_chizong")&&!(_status.event.getParent("phaseUse")?.fan_chizong_used||[]).includes(target); },
  prompt:"炽鬃：交给迪希雅一张装备牌", prompt2:false,
  async content(event,trigger,player) {
   const target=event.target, phase=event.getParent("phaseUse");
   if(!phase||!target.isIn()||!target.hasSkill("fan_chizong")||!player.getCards("he").includes(event.cards[0])||(phase.fan_chizong_used||[]).includes(target))return;
   (phase.fan_chizong_used||=[]).push(target);
   game.trySkillAudio("fan_chizong", target);
   await target.gain(event.cards,player,"giveAuto");
   if(target.isIn())await target.chooseUseTarget({name:"sha",isCard:true},true);
  },
  ai:{order:6,result:{player(player,target){return Math.max(0,...game.filterPlayer(t=>target.canUse({name:"sha"},t)).map(t=>get.effect(t,{name:"sha"},target,player)))/3-1;}}},
 },
 fan_shixue:{
  audio:false,locked:false,trigger:{global:"damageEnd"},direct:true,group:"fan_shixue_reset",
  filter:(event,player)=>event.player.isIn()&&get.distance(player,event.player)<=1&&!player.storage.fan_shixue_used,
  async content(event,trigger,player){
   if(player.storage.fan_shixue_used)return;
   const target=trigger.player;
   if(player.hp>=player.maxHp/2){
    const result=await player.chooseBool("狮血：失去1点体力，令"+get.translation(target)+"回复1点体力？").set("prompt2",false).set("ai",()=>player.hp>1&&target.isDamaged()&&get.recoverEffect(target,player,player)>(player.hp<=2?3:0)).forResult();
    if(!result.bool||!target.isIn())return;
    player.storage.fan_shixue_used=true;player.logSkill("fan_shixue",target);
    await player.loseHp();
    if (target.isIn()) {
      if (target.isDamaged()) game.trySkillAudio(target === player ? "fan_shixue_self" : "fan_shixue_ally", player);
      await target.recover();
    }
   }else{player.storage.fan_shixue_used=true;player.logSkill("fan_shixue");game.trySkillAudio("fan_shixue_self", player);await player.recover();}
  },
  subSkill:{reset:{audio:false,locked:false,trigger:{global:"phaseBefore"},forced:true,popup:false,firstDo:true,content(event,trigger,player){delete player.storage.fan_shixue_used;}}},
 },
};
