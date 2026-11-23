import { lib, game, get, ui, _status } from "../../../../noname.js";
// Object references retain provenance even when native gain tags are cleared on movement.
export function lingRecords(player) { return player.storage.fan_yinling_records || []; }
export function usesLing(event, player) {
  return lingRecords(player).some(r => r.target === event.player && event.cards?.some(c => r.cards.includes(c)));
}
export default {
  fan_yinling: {
    audio: false, locked: false, enable: "phaseUse", usable: 1,
    position: "he", discard: false, lose: false, delay: false,
    selectCard: [0, 2], complexCard: true, manualConfirm: true,
    filter(event, player) { const cards = player.getCards("he"); return cards.some((c,i) => cards.slice(i+1).some(d => get.suit(c,player) === get.suit(d,player))); },
    filterCard(card, player) { return !ui.selected.cards.length || get.suit(card,player) === get.suit(ui.selected.cards[0],player); },
    filterTarget: (card, player, target) => target !== player,
    filterOk: () => ui.selected.cards.length === 2 && ui.selected.targets.length === 1,
    prompt: "银翎：展示两张同花色牌并交给其他角色", prompt2: false,
    check: card => 7-get.value(card),
    async content(event, trigger, player) {
      const {cards, target} = event;
      if (!target.isIn() || cards.length !== 2 || cards.some(c => !player.getCards("he").includes(c)) || get.suit(cards[0],player) !== get.suit(cards[1],player)) return;
      await player.showCards(cards, "银翎");
      if (!target.isIn() || cards.some(c => !player.getCards("he").includes(c))) return;
      (player.storage.fan_yinling_records ||= []).push({target,cards:cards.slice()});
      await player.give(cards,target);
      target.addGaintag(cards.filter(c=>target.getCards("he").includes(c)),"fan_yinling");
    },
    ai: {order: 6, result: {target: (player,target) => get.attitude(player,target)>0 ? 2 : 0}},
    group: ["fan_yinling_draw", "fan_yinling_return", "fan_yinling_mark"],
    subSkill: {
      mark: {
        audio:false, forced:true, locked:false, popup:false,
        trigger:{global:["gainAfter","loseAfter","loseAsyncAfter","equipAfter","addJudgeAfter"]},
        filter:(event,player)=>lingRecords(player).length>0,
        async content(event,trigger,player) {
          const marked=new Set(lingRecords(player).flatMap(r=>r.cards));
          for(const target of game.players) {
            const cards=target.getCards("he").filter(c=>marked.has(c));
            if(cards.length) target.addGaintag(cards,"fan_yinling");
          }
        }
      },
      draw: {
        audio:false, forced:true, locked:false, popup:false,
        trigger:{global:["useCard","respond"]}, filter:usesLing,
        async content(event,trigger,player) {
          for (const target of [player,trigger.player].sortBySeat(_status.currentPhase || player)) if(target.isIn()) await target.draw();
        }
      },
      return: {
        audio:false, forced:true, locked:false, popup:false,
        trigger:{global:"phaseAfter"},
        filter:(event,player)=>lingRecords(player).some(r=>r.target===event.player && r.cards.some(c=>event.player.getCards("hej").includes(c))),
        async content(event,trigger,player) {
          const cards=[...new Set(lingRecords(player).filter(r=>r.target===trigger.player).flatMap(r=>r.cards))].filter(c=>trigger.player.getCards("hej").includes(c));
          if(player.isIn() && trigger.player.isIn() && cards.length) await player.gain(cards,trigger.player,"give");
        }
      }
    }
  },
  fan_zhenxie: {
    audio:false, locked:false, direct:true, trigger:{global:"damageBegin4"},
    filter:(event,player)=>event.num>0 && !!event.nature && event.player.isIn() && event.player.countDiscardableCards(player,"hej")>0,
    async content(event,trigger,player) {
      const target=trigger.player;
      const result=await player.discardPlayerCard(target,"hej","镇邪：你可以弃置其区域内的一张牌")
        .set("prompt2",false).set("ai",button=>{
          const card=button.link, known=target===player || get.position(card)!=="h" || !button.classList?.contains("blank");
          const prevent=known ? get.color(card,target)==="black" : 0.5;
          const damage=get.damageEffect(target,trigger.source,player,trigger.nature);
          // buttonValue describes the owner's card value, not our benefit from removing it.
          // Keep the sign for harmful judgement/equipment cards as well.
          const attitude=target===player ? 1 : Math.sign(get.attitude(player,target));
          const discard=-attitude*get.buttonValue(button);
          return discard - damage*prevent;
        }).forResult();
      if(!result.bool) return;
      player.logSkill("fan_zhenxie",target);
      if(result.cards?.some(c=>get.color(c,target)==="black")) trigger.cancel();
    }
  }
};
