import { lib, get, game } from "../../../../noname.js";

// 拼点牌先移入处理区，直到 orderingDiscard 才真正进入弃牌堆。
function crystalCards(event, player) {
  let cards = [];
  if (event.name === "cardsDiscard") {
    const ordering = event.getParent();
    if (ordering?.name !== "orderingDiscard") return [];
    const compare = ordering.relatedEvent || ordering.getParent();
    if (!compare?.name?.startsWith("chooseToCompare")) return [];
    cards = compare.lose_list?.find(entry => entry[0] === player)?.[1] || [];
    cards = cards.filter(card => event.cards.includes(card));
  } else {
    // 批量弃置只在 loseAsyncAfter 处理，跳过其内部单人失牌事件。
    if (event.getlx === false) return [];
    if (event.type !== "discard") return [];
    cards = event.getl?.(player)?.cards2 || (event.player === player ? event.cards : []) || [];
  }
  return cards.filter(card => get.position(card, true) === "d");
}

export default {
  fan_cijue_start: { audio: "ext:原神/audio/navia/skill:5" },
  fan_cijue_win: { audio: "ext:原神/audio/navia/skill:2" },
  fan_xianjing_damage: { audio: "ext:原神/audio/navia/skill:3" },
  fan_xianjing_other: { audio: "ext:原神/audio/navia/skill:3" },
  fan_cijue: {
    audio: false,
    trigger: { global: "damageBegin4" },
    usable: 1,
    filter(event, player) {
      return !!(event.num > 0 && event.source?.isIn() && player.canCompare(event.source));
    },
    prompt: "辞绝：与伤害来源拼点？",
    prompt2: false,
    check(event, player) {
      return get.damageEffect(event.player, event.source, player, event.nature) < 0;
    },
    async content(event, trigger, player) {
      if (!trigger.source?.isIn() || !player.canCompare(trigger.source)) return;
      game.trySkillAudio("fan_cijue_start", player, true);
      const compare = player.chooseToCompare(trigger.source);
      let winVoiced = false;
      // 原生编译器每步结束调用 handler；获胜结果确定即播，不等拼点弃牌的霰晶结算。
      compare.pushHandler("onChooseToCompare", (current, { state }) => {
        const result = current.result;
        if (state !== "end" || winVoiced || !result?.bool || result.cancelled
          || typeof result.num1 !== "number" || typeof result.num2 !== "number") return;
        winVoiced = true;
        game.trySkillAudio("fan_cijue_win", player, true);
      });
      const result = await compare.forResult();
      if (!result.bool || result.cancelled) return;
      trigger.cancel();
      const target = trigger.player;
      if (target !== player && target.isIn() && target.group === "qun" && player.hasZhuSkill("fan_cimei")) {
        player.logSkill("fan_cimei", target);
        await target.changeHujia(1, "gain", 5);
      }
    },
    group: "fan_cijue_number",
    subSkill: {
      number: {
        trigger: { player: "compare", target: "compare" },
        silent: true,
        filter(event, player) {
          return event.player === player
            ? !event.iwhile && get.suit(event.card1, player) === "heart"
            : get.suit(event.card2, player) === "heart";
        },
        async content(event, trigger, player) {
          if (trigger.player === player) trigger.num1 = 13;
          else trigger.num2 = 13;
        },
      },
    },
  },
  fan_xianjing: {
    audio: false,
    trigger: { player: "loseAfter", global: ["loseAsyncAfter", "cardsDiscardAfter"] },
    direct: true,
    filter(event, player) {
      return crystalCards(event, player).some(card => player.hasUseTarget(card));
    },
    async content(event, trigger, player) {
      const cards = crystalCards(trigger, player);
      // 与闻授一致：触发后直接展示牌，不经过技能按钮或发动确认。
      const result = await player.chooseCardButton("霰晶：你可以使用其中的一张牌", cards)
        .set("prompt2", false)
        .set("filterButton", button => get.position(button.link, true) === "d"
          && player.hasUseTarget(button.link))
        .set("ai", button => player.getUseValue(button.link))
        .forResult();
      if (!result.bool || !result.links?.length) return;
      const card = result.links[0];
      if (!cards.includes(card) || get.position(card, true) !== "d" || !player.hasUseTarget(card)) return;
      const info = get.info(card);
      const range = lib.filter.selectTarget(card, player);
      // 无须手选目标的牌选中后直接使用，避免再次询问“是否使用”。
      const automatic = !info.complexTarget && !info.complexSelect
        && (info.notarget || range?.[1] === -1 || (range?.[0] === 0 && range?.[1] === 0));
      let voiced = false;
      await player.chooseUseTarget({
        card,
        cards: [card],
        forced: automatic,
        addCount: true,
        logSkill: ["fan_xianjing"],
        // 原生签名 oncard(card, player)：仅在实际用牌时播放，选目标取消不播。
        oncard(usedCard, user) {
          if (voiced) return;
          voiced = true;
          game.trySkillAudio(get.tag(usedCard, "damage") ? "fan_xianjing_damage" : "fan_xianjing_other", user, true);
        },
        prompt: "霰晶：选择" + get.translation(card) + "的目标",
        prompt2: false,
      });
    },
  },
  fan_cimei: { audio: false, zhuSkill: true, forced: true },
};
