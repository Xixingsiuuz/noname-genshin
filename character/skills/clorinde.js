import { game, get } from "../../../../noname.js";

function previousColor(player, current) {
  const history = player.getAllHistory("useCard", evt => evt !== current && evt.card.name === "sha");
  const last = history[history.length - 1];
  return last ? last.fan_canguang_color ?? get.color(last.card, player) : undefined;
}
function different(card, player, current) {
  const before = previousColor(player, current), color = get.color(card, player);
  return card.name === "sha" && before !== undefined && color !== "unsure" && color !== before;
}
function handMaterials(card, player) {
  const cards = card.cards?.length ? card.cards : [card];
  return cards.length > 0 && cards.every(item => player.getCards("h").includes(item));
}
function usedFromHand(use, player) {
  const cards = use.cards || [];
  if (!cards.length) return false;
  const losses = player.getHistory("lose", loss => loss.getParent() === use);
  return cards.every(card => losses.some(loss => loss.hs?.includes(card)));
}

export default {
  fan_zhuying: {
    audio: "ext:原神/audio/clorinde/skill:2",
    logAudio: () => false,
    locked: true, forced: true,
    trigger: { player: "useCardToPlayered" },
    filter(event) { return event.card.name === "sha" && event.isFirstTarget; },
    async content(event, trigger, player) {
      const use = trigger.getParent();
      if (use.fan_zhuying_processed) return;
      use.fan_zhuying_processed = true;
      if (player.countMark("fan_zhuying") >= 2) {
        player.removeMark("fan_zhuying", 2, false);
        use.effectCount++;
        use.fan_zhuying_draw = true;
        game.trySkillAudio("fan_zhuying", player, true);
      } else {
        player.addMark("fan_zhuying", 1, false);
        game.trySkillAudio("fan_zhuying_gain_voice", player, true);
      }
    },
    marktext: "影",
    intro: { content: "mark" },
    group: "fan_zhuying_draw",
    subSkill: {
      gain_voice: { audio: "ext:原神/audio/clorinde/skill:2" },
      draw: {
        audio: false, locked: true, forced: true, popup: false,
        trigger: { player: "useCardAfter" },
        filter(event) { return event.fan_zhuying_draw === true && !event.fan_zhuying_drawn; },
        async content(event, trigger, player) {
          trigger.fan_zhuying_drawn = true;
          if (player.isIn()) await player.draw(2);
        },
      },
    },
    ai: {
      effect: { player(card, player) {
        if (card.name !== "sha" || player.countMark("fan_zhuying") < 2) return;
        // 额外结算保留原生敌友伤害评价；摸牌收益按整牌分摊。
        const targets = Math.max(1, game.countPlayer(target => player.canUse(card, target)));
        return [2, 0.8 / targets];
      } },
    },
  },
  fan_canguang: {
    audio: "ext:原神/audio/clorinde/skill:2",
    logAudio: () => false,
    locked: true, forced: true, priority: 1,
    trigger: { player: "useCard1" },
    filter(event) { return event.card.name === "sha"; },
    async content(event, trigger, player) {
      const eligible = different(trigger.card, player, trigger) && usedFromHand(trigger, player);
      trigger.fan_canguang_color = get.color(trigger.card, player);
      if (!eligible) return;
      game.trySkillAudio("fan_canguang", player, true);
      if (trigger.addCount !== false) {
        trigger.addCount = false;
        const stat = player.getStat("card");
        if (stat.sha > 0) stat.sha--;
      }
    },
    mod: {
      cardUsable(card, player) {
        if (handMaterials(card, player) && different(card, player)) return Infinity;
      },
      aiOrder(player, card, num) {
        // 先使用不消耗正常额度的杀，后续选牌按最新历史重新判断。
        if (num > 0 && handMaterials(card, player) && different(card, player)) return num + 0.5;
      },
    },
  },
};
