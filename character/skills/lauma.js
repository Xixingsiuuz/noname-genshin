import { game, get, _status } from "../../../../noname.js";

// 同时兼容原生明置手牌与移动版崔芙的明置标记。
const shown = card => get.is.shownCard(card) || card.hasGaintag("faceup_tag");
const visibleTag = tag => tag === "faceup_tag" || tag.startsWith("visible_") || tag.startsWith("eternal_visible_");
const faceupCards = player => player.getCards("he", card => get.position(card) === "e" || shown(card));

// 以菈乌玛当前的明置牌（含装备）为依据，持续同步全场手牌。
function pendingReveals(player) {
  const names = new Set(faceupCards(player).map(card => get.name(card, player)));
  return game.filterPlayer().sortBySeat(player).map(target => ({
    target,
    cards: target.getCards("h", card => !shown(card) && names.has(get.name(card, target))),
  })).filter(batch => batch.cards.length);
}

async function syncShengyong(player) {
  if (!player.isIn()) return;
  for (const { target, cards } of pendingReveals(player)) {
    if (target.isIn()) await target.addShownCards(cards, "visible_fan_shengyong");
  }
}

export async function revealShengyong(player, onChoose) {
  if (!player.isIn() || !player.hasCard(card => !shown(card), "h")) return;
  const result = await player.chooseCard("h", "你可以发动【圣咏】，明置一张手牌", card => !shown(card))
    .set("prompt2", false)
    .set("ai", card => 6 - get.value(card))
    .forResult();
  if (!result.bool || !player.getCards("h").includes(result.cards[0])) return;
  if (onChoose) onChoose();
  player.logSkill("fan_shengyong");
  await player.addShownCards(result.cards, "visible_fan_shengyong");
  await syncShengyong(player);
}

export default {
  fan_shengyong: {
    trigger: { player: "phaseUseBegin" },
    direct: true,
    filter: (event, player) => player.hasCard(card => !shown(card), "h"),
    async content(event, trigger, player) {
      await revealShengyong(player);
    },
    mod: {
      ignoredHandcard(card) {
        if (shown(card)) return true;
      },
      cardDiscardable(card, player, name) {
        if (name === "phaseDiscard" && shown(card)) return false;
      },
    },
    group: ["fan_shengyong_sync", "fan_shengyong_draw"],
    subSkill: {
      sync: {
        trigger: {
          global: ["gainAfter", "loseAsyncAfter", "equipAfter", "addShownCardsAfter", "phaseBefore"],
        },
        forced: true,
        silent: true,
        popup: false,
        firstDo: true,
        filter(event, player) {
          return player.isIn() && pendingReveals(player).length > 0;
        },
        async content(event, trigger, player) {
          await syncShengyong(player);
        },
      },
      draw: {
        trigger: { global: "useCard" },
        forced: true,
        filter(event, player) {
          return event.player !== player && faceupCards(player).some(card =>
            get.name(card, player) === get.name(event.card, event.player));
        },
        async content(event, trigger, player) {
          const result = await player.draw(1).forResult();
          const cards = (result.cards || []).filter(card => player.getCards("h").includes(card));
          if (!cards.length || !player.isIn()) return;
          const choice = await player.chooseTarget("圣咏：你可以将摸到的牌交给一名其他角色",
            (card, player, target) => target !== player)
            .set("prompt2", false)
            .set("ai", target => get.attitude(player, target) - 2)
            .forResult();
          if (choice.bool) {
            const remaining = cards.filter(card => player.getCards("h").includes(card));
            if (remaining.length && choice.targets[0].isIn()) await player.give(remaining, choice.targets[0]);
          }
        },
      },
    },
  },
  fan_daoge: {
    trigger: {
      player: "loseAfter",
      global: ["gainAfter", "equipAfter", "addJudgeAfter", "loseAsyncAfter", "addToExpansionAfter"],
    },
    direct: true,
    filter(event, player) {
      if (_status.currentPhase === player || player.hasSkill("fan_daoge_used")) return false;
      const loss = event.getl(player);
      return !!loss?.hs?.some(card => (loss.gaintag_map?.[card.cardid] || []).some(visibleTag));
    },
    async content(event, trigger, player) {
      const controls = [];
      if (player.hasSkill("fan_shengyong") && player.hasCard(card => !shown(card), "h")) controls.push("发动圣咏");
      if (game.hasPlayer(target => target.isDamaged())) controls.push("回复体力");
      if (!controls.length) return;
      const result = await player.chooseControl(...controls, "cancel2")
        .set("prompt", "你可以发动【祷歌】，选择一项")
        .set("prompt2", false)
        .set("ai", () => game.hasPlayer(target => target.isDamaged() && get.attitude(player, target) > 0)
          ? "回复体力" : controls[0])
        .forResult();
      if (result.control === "发动圣咏") {
        await revealShengyong(player, () => {
          player.addTempSkill("fan_daoge_used", { global: "phaseAfter" });
          player.logSkill("fan_daoge");
        });
      } else if (result.control === "回复体力") {
        const choice = await player.chooseTarget("祷歌：令一名角色回复1点体力", (card, player, target) => target.isDamaged())
          .set("prompt2", false)
          .set("ai", target => get.recoverEffect(target, player, player))
          .forResult();
        if (choice.bool) {
          player.addTempSkill("fan_daoge_used", { global: "phaseAfter" });
          player.logSkill("fan_daoge", choice.targets);
          await choice.targets[0].recover();
        }
      }
    },
  },
  fan_daoge_used: { charlotte: true },
};
