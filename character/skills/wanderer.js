import { lib, game, get } from "../../../../noname.js";
const quota = p => p.storage.fan_genchu_result === "failure" ? 4 : 2;
const marked = (p,t) => p.getStorage("fan_shixin").includes(t);
const ownDiscard = p => p.countCards("hej", c => lib.filter.cardDiscardable(c,p,"fan_genchu")) > 0;
export async function adjustWandererHand(player, minimum = false) {
  if (!player.isIn()) return;
  const n = minimum ? 2 : quota(player), count = player.countCards("h");
  if (count < n) await player.draw(n-count);
  else if (!minimum && count > n) await player.chooseToDiscard("h",count-n,true);
}

export function wandererFailureVoice() {
 const isRaiden=p=>[p.name,p.name1,p.name2].includes("fan_raiden");
 if(game.players.some(p=>isRaiden(p)&&p.isAlive())) return "fan_genchu_raiden_alive";
 if(game.dead.some(isRaiden)) return "fan_genchu_raiden_dead";
 return "fan_genchu_failure_voice";
}
function wandererSpeak(player, skill) {
 game.trySkillAudio(skill,player,true,false,undefined,[]);
}

export default {

 fan_shixin_voice:{audio:false,forced:true,popup:false,locked:true,
  trigger:{player:"useCard"},
  filter(e,p){return e.targets?.some(t=>marked(p,t)) && (!!p.storage.fan_genchu_result || !p.storage.fan_shixin_voiced);},
  async content(e,t,p){const state=p.storage.fan_genchu_result;if(!state)p.storage.fan_shixin_voiced=true;wandererSpeak(p,state==="failure"?"fan_shixin_failure_voice":state==="success"?"fan_shixin_success_voice":"fan_shixin_pending");},
 },
 fan_shixin_voice_reset:{audio:false,forced:true,popup:false,locked:true,trigger:{global:"phaseBefore"},async content(e,t,p){delete p.storage.fan_shixin_voiced;}},
 fan_xunshen_draw_voice:{audio:false,forced:true,popup:false,locked:true,trigger:{player:"drawBegin"},
  filter(e,p){return e.num>0 && p.storage.fan_genchu_result!=="success";},
  async content(e,t,p){wandererSpeak(p,p.storage.fan_genchu_result==="failure"?"fan_xunshen_draw_failure":"fan_xunshen_draw_pending");},
 },
 fan_xunshen_loss_voice:{audio:false,forced:true,popup:false,locked:true,trigger:{player:"loseHpBegin"},
  filter(e,p){return e.num>0 && !p.storage.fan_genchu_result;},async content(e,t,p){wandererSpeak(p,"fan_xunshen_loss");},
 },
 fan_shixin_pending:{audio:"ext:原神/audio/wanderer/skill:2"},
 fan_shixin_success_voice:{audio:"ext:原神/audio/wanderer/skill:2"},
 fan_shixin_failure_voice:{audio:"ext:原神/audio/wanderer/skill:5"},
 fan_xunshen_draw_pending:{audio:"ext:原神/audio/wanderer/skill:2"},
 fan_xunshen_draw_failure:{audio:"ext:原神/audio/wanderer/skill:7"},
 fan_xunshen_loss:{audio:"ext:原神/audio/wanderer/skill:2"},
 fan_genchu_discard:{audio:"ext:原神/audio/wanderer/skill:2"},
 fan_genchu_success_voice:{audio:"ext:原神/audio/wanderer/skill:2"},
 fan_genchu_failure_voice:{audio:"ext:原神/audio/wanderer/skill:3"},
 fan_genchu_raiden_alive:{audio:"ext:原神/audio/wanderer/skill:1"},
 fan_genchu_raiden_dead:{audio:"ext:原神/audio/wanderer/skill:1"},
 fan_wendao_voice:{audio:"ext:原神/audio/wanderer/skill:2"},

 fan_shixin: {
  audio:false, locked:true, forced:true, popup:false,
  trigger:{player:"damageEnd"},
  filter(e,p){return e.num>0 && e.source && e.source!==p && !marked(p,e.source);},
  async content(e,t,p){p.markAuto("fan_shixin",[t.source]);},
  intro:{content:"对$使用牌无距离和次数限制"},
  mod:{targetInRange(c,p,t){if(marked(p,t)) return true;},cardUsableTarget(c,p,t){if(marked(p,t)) return true;}},
  group:["fan_shixin_count","fan_shixin_voice","fan_shixin_voice_reset"],
  ai:{effect:{player(c,p,t){if(t && marked(p,t) && get.tag(c,"damage")) return [1,.15];}}},
 },
 fan_shixin_count:{
  audio:false, locked:true, forced:true, popup:false, firstDo:true, priority:100,
  trigger:{player:"useCard1"},
  filter(e,p){return e.addCount!==false && e.targets?.length>0 && e.targets.every(t=>marked(p,t));},
  async content(e,t,p){t.addCount=false;const stat=p.getStat().card;if(stat[t.card.name]>0) stat[t.card.name]--;},
 },
 fan_xunshen:{
  audio:false,locked:true,forced:true,
  trigger:{player:"phaseDrawBegin2"},
  async content(e,t,p){await p.loseHp(); if(p.isIn()) t.num-=2;},
  group:["fan_xunshen_hand","fan_xunshen_draw_voice","fan_xunshen_loss_voice"],
  ai:{noh:true,skillTagFilter(p,tag){if(tag==="noh") return p.hasSkill("fan_xunshen");}},
 },
 fan_xunshen_hand:{
  audio:false,locked:true,forced:true,popup:false,
  trigger:{player:["loseAfter","gainAfter","loseAsyncAfter","equipAfter","addJudgeAfter","expansionAfter"],global:["gainAfter","loseAsyncAfter","phaseBefore","phaseAfter" ]},
  filter(e,p){return p.isIn() && p.countCards("h")!==quota(p);},
  async content(e,t,p){await adjustWandererHand(p);},
 },
 fan_genchu:{
  audio:false,locked:false,direct:true,mission:true,derivation:["fan_wendao"],
  trigger:{source:"damageSource"},
  filter(e,p){return e.player!==p && e.num>0 && !p.storage.fan_genchu_used && ownDiscard(p);},
  async content(e,t,p){
   const target=t.player;
   const result=await p.chooseToDiscard("根除：你可以弃置一张牌","hej",1,c=>lib.filter.cardDiscardable(c,p,"fan_genchu"))
    .set("prompt2",false).set("ai",c=>{
     const value=target.isIn()?get.effect(target,{name:"guohe"},p,p):0;
     return value>0 ? 8-get.value(c,p) : 0;
    }).forResult();
   if(!result.bool || !result.cards?.length) return;
   p.storage.fan_genchu_used=true;wandererSpeak(p,"fan_genchu_discard");p.logSkill("fan_genchu",target);
   if(target.isIn() && target.countDiscardableCards(p,"hej")) await p.discardPlayerCard(target,"hej",true);
  },
  group:["fan_genchu_reset","fan_genchu_success","fan_genchu_failure"],
 },
 fan_genchu_reset:{audio:false,locked:false,forced:true,popup:false,trigger:{global:"phaseBefore"},async content(e,t,p){delete p.storage.fan_genchu_used;}},
 fan_genchu_failure:{
  audio:false,locked:false,forced:true,trigger:{source:"dieAfter"},
  filter(e,p){return !p.storage.fan_genchu_result;},
  async content(e,t,p){p.storage.fan_genchu_result="failure";wandererSpeak(p,wandererFailureVoice());p.awakenSkill("fan_genchu");if(p.hasSkill("fan_xunshen")) await adjustWandererHand(p);},
 },
 fan_genchu_success:{
  audio:false,locked:false,forced:true,priority:20,trigger:{player:"dying"},
  filter(e,p){return !p.storage.fan_genchu_result;},
  async content(e,t,p){
   p.storage.fan_genchu_result="success";wandererSpeak(p,"fan_genchu_success_voice");p.awakenSkill("fan_genchu");
   await p.recoverTo(1);await p.removeSkill("fan_xunshen");await p.addSkill("fan_wendao");
   await adjustWandererHand(p,true);
  },
 },
 fan_wendao:{
  audio:false,locked:true,forced:true,trigger:{player:"phaseDrawBegin2"},
  async content(e,t,p){wandererSpeak(p,"fan_wendao_voice");await p.recover();t.num+=2;},group:"fan_wendao_hand",
 },
 fan_wendao_hand:{
  audio:false,locked:true,forced:true,popup:false,
  trigger:{player:["loseAfter","gainAfter","equipAfter","addJudgeAfter"],global:["gainAfter","loseAsyncAfter","phaseBefore","phaseAfter"]},
  filter(e,p){return p.isIn() && p.countCards("h")<2;},
  async content(e,t,p){wandererSpeak(p,"fan_wendao_voice");await adjustWandererHand(p,true);},
 },
};
