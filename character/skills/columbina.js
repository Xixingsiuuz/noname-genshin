import { lib, game, get, ui, _status } from "../../../../noname.js";
import { setSulvEffect } from "../../ui/sulv-effect.js";
import { showSulvQueue } from "../../ui/sulv-queue.js";

const shown = card => get.is.shownCard(card) || card.hasGaintag("faceup_tag");
const visibleTag = tag => tag.startsWith("visible_") || tag.startsWith("eternal_visible_") || tag === "faceup_tag";
const shownCount = () => game.filterPlayer().reduce((sum, target) =>
  // “场上的明置牌”包含判定区；区别于“角色的明置牌”。
  sum + target.countCards("ej") + target.getCards("h", shown).length, 0);
const threshold = player => game.countPlayer() * (player.hasZhuSkill("fan_zhenyue") ? 3 : 4);
const sulvUsed = player => !!(player.storage.fan_sulv_used || player.storage.fan_sulv);
function refreshSulv(player) {
  if (!player.isIn() || !sulvUsed(player)) return;
  player.storage.fan_sulv_used = true;
  const enough = shownCount() >= threshold(player);
  if (enough && player.storage.fan_sulv) player.restoreSkill("fan_sulv");
  else if (!enough && !player.storage.fan_sulv) player.awakenSkill("fan_sulv", true);
}
const flipUses = player => player.storage.fan_xiayin_round === game.roundNumber
  ? (player.storage.fan_xiayin_flips || 0) : 0;

// 原生 useCard1 已清除素材标签，必须读取此次失牌事件的快照。
function recordable(event, player) {
  if (event.cards?.length !== 1 || !event.card.isCard) return false;
  const physical = event.cards[0];
  if (event.card.cardid !== physical.cardid) return false;
  if (!["basic", "trick"].includes(get.type(event.card))) return false;
  if (!event.targets?.length) return false;
  return player.getHistory("lose", loss => loss.getParent() === event && (
    loss.es?.includes(physical) || loss.hs?.includes(physical)
      && (loss.gaintag_map?.[physical.cardid] || []).some(visibleTag)
  )).length > 0;
}

export default {
  fan_xiangchou: {
    audio: "ext:原神/audio/columbina/skill:3",
    enable: "phaseUse",
    usable: 1,
    locked: true,
    zhuanhuanji: true,
    mark: true,
    marktext: "☯",
    intro: { content: storage => `当前状态：${storage ? "阴" : "阳"}` },
    async content(event, trigger, player) {
      const yin = !!player.storage.fan_xiangchou;
      await player.draw(yin ? 2 : 1);
      const available = player.getCards("h", card => !shown(card));
      const count = Math.min(yin ? 1 : 2, available.length);
      if (player.isIn() && count) {
        const result = await player.chooseCard("h", count, true, `乡愁：明置${count}张手牌`)
          .set("filterCard", card => !shown(card)).set("ai", card => 6 - get.value(card)).forResult();
        if (result.bool) await player.addShownCards(result.cards, "visible_fan_xiangchou");
      }
      player.changeZhuanhuanji("fan_xiangchou");
    },
    mod: {
      ignoredHandcard(card, player) {
        if (player.getCards("h").includes(card) && shown(card)) return true;
      },
      cardDiscardable(card, player) {
        if (player.getCards("h").includes(card) && shown(card)) return false;
      },
      canBeDiscarded(card, player, target) {
        if (target.getCards("h").includes(card) && shown(card)) return false;
      },
    },
    ai: { order: 9, result: { player: 1 } },
  },
  fan_xiayin: {
    audio: false,
    trigger: { global: "phaseJieshuBegin" },
    direct: true,
    filter(event, player) {
      const target = event.player;
      return target.isIn() && target.countCards("h") > 0 && (flipUses(player) < 2
        || target.hasCard(card => shown(card) && target.hasUseTarget(card, null, true), "h"));
    },
    async content(event, trigger, player) {
      const target = trigger.player;
      const cards = target.getCards("h", card => shown(card) && target.hasUseTarget(card, null, true));
      const dialog = [`遐音：选择一张牌令${get.translation(target)}使用，<br>或反转其手牌明暗`];
      if (cards.length) dialog.push([cards, "card"]);
      dialog.push([["反转明暗"], "textbutton"]);
      const result = await player.chooseButton(dialog)
        .set("prompt2", `本轮反转剩余：${Math.max(0, 2 - flipUses(player))}次`)
        .set("filterButton", button => button.link !== "反转明暗" || flipUses(player) < 2)
        .set("fanPairedConfirm", true)
        // 允许中间的空选状态，最终须选一项；原生 auto=false 保留手动确认。
        .set("selectButton", [0, 1])
        .set("filterOk", () => {
          if (!target.isIn() || ui.selected.buttons.length !== 1) return false;
          const link = ui.selected.buttons[0].link;
          return link === "反转明暗" ? target.countCards("h") > 0 && flipUses(player) < 2
            : target.getCards("h").includes(link) && shown(link) && target.hasUseTarget(link, null, true);
        })
        .set("ai", button => typeof button.link === "string" ? 1 :
          get.effect(target, button.link, target, player)).forResult();
      if (!result.bool || !target.isIn()) return;
      const selected = result.links[0];
      if (selected === "反转明暗" && (flipUses(player) >= 2 || !target.countCards("h"))) return;
      player.logSkill("fan_xiayin", target);
      if (selected !== "反转明暗") {
        if (target.getCards("h").includes(selected) && shown(selected) && target.hasUseTarget(selected, null, true)) {
          game.trySkillAudio("fan_xiayin_use", player, true);
          // 原生 chooseUseTarget 只选目标，方天画戟却读取 ui.selected.cards。
          // 绑定实体牌并由原生检查自动选中，保留装备目标修正和正常 AI 选目标。
          await target.chooseToUse({
            prompt: "遐音：选择使用目标", prompt2: false, forced: true,
            position: "h", selectCard: -1,
            fan_xiayin_card: selected,
            filterCard(card, player) {
              return card === _status.event.fan_xiayin_card && player.getCards("h").includes(card)
                && shown(card) && lib.filter.cardEnabled(card, player)
                && lib.filter.cardUsable(card, player);
            },
            filterOk() {
              const card = _status.event.fan_xiayin_card;
              return ui.selected.cards.length === 1 && ui.selected.cards[0] === card
                && _status.event.player.getCards("h").includes(card) && shown(card)
                && lib.filter.cardEnabled(card, _status.event.player)
                && lib.filter.cardUsable(card, _status.event.player);
            },
          });
        }
        return;
      }
      game.trySkillAudio("fan_xiayin_flip", player, true);
      // 仅实际发动第二项时计数；按原生轮数隔离，取消和第一项不消耗。
      const count = flipUses(player);
      player.storage.fan_xiayin_round = game.roundNumber;
      player.storage.fan_xiayin_flips = count + 1;
      // 同时取快照，先暗置原明置牌，再明置原暗置牌。
      const light = target.getCards("h", shown);
      const dark = target.getCards("h", card => !shown(card));
      if (light.length) {
        await target.hideShownCards(light);
        target.removeGaintag("faceup_tag", light);
      }
      if (target.isIn() && dark.length) await target.addShownCards(dark, "visible_fan_xiayin");
    },
    subSkill: {
      use: { audio: "ext:原神/audio/columbina/skill:2", charlotte: true },
      flip: { audio: "ext:原神/audio/columbina/skill:2", charlotte: true },
    },
  },
  fan_sulv: {
    audio: "ext:原神/audio/columbina/skill:2",
    // 限定技发动后原生 awakenSkill 会禁用其 group；记录须独立常驻。
    init(player) { player.addSkill(["fan_sulv_record", "fan_sulv_refresh"]); },
    onremove(player) {
      player.removeSkill("fan_sulv_record");
      player.removeSkill("fan_sulv_refresh");
      player.unmarkSkill("fan_sulv");
    },
    trigger: { player: "dying" },
    limited: true,
    skillAnimation: true,
    animationColor: "water",
    mark: true,
    intro: {
      // 已消耗的限定技被禁用后，原生 checkMarks 也应保留状态提示。
      fixed: true,
      nocount: true,
      content(storage, player) {
        const state = player.storage.fan_sulv_running ? "正在结算"
          : (sulvUsed(player) || storage) && shownCount() < threshold(player)
            ? "已发动，当前数量不足，不能再次发动" : "可于进入濒死时发动";
        return `${state}<br>场上明置牌：${shownCount()}<br>再次发动所需：${threshold(player)}<br>`;
      },
    },
    prompt: "是否发动【溯旅】，重新使用你使用过的所有明置牌？",
    prompt2: false,
    filter(event, player) {
      return !player.storage.fan_sulv_running && !player.storage.fan_sulv
        && (!sulvUsed(player) || shownCount() >= threshold(player));
    },
    check: () => true,
    async content(event, trigger, player) {
      player.storage.fan_sulv_used = true;
      player.awakenSkill("fan_sulv", true);
      player.storage.fan_sulv_running = true;
      refreshSulv(player);
      const records = (player.storage.fan_sulv_records || []).slice().reverse();
      try {
        game.broadcastAll(setSulvEffect, true, player.playerid);
        game.broadcastAll(showSulvQueue, "start", records, 0, player.playerid);
        if (records.length) await game.delay(1.15);
        for (let index = 0; index < records.length; index++) {
          const record = records[index];
          if (!player.isIn()) break;
          // 不附带实体素材、花色或点数；保留牌名及杀的属性。
          const card = { name: record.name, nature: record.nature, storage: { fan_sulv: true } };
          const next = player.chooseUseTarget({ card, cards: [], forced: true, addCount: false, throw: false,
            filterTarget: (card, player, target) => player.canUse(card, target, null, false)
              && lib.filter.targetEnabledx(card, player, target),
            prompt: `溯旅：选择${get.translation(card)}的目标`, prompt2: false });
          const result = await next.forResult();
          if (!result?.bool) {
            // 无合法目标也由牌列展示，不额外创建实体牌或用牌事件。
            await game.delayx();
            game.log(player, "因无合法使用方式，跳过了", card);
          }
          game.broadcastAll(showSulvQueue, "settle", [], index, player.playerid);
          await game.delay(0.9);
          game.broadcastAll(showSulvQueue, "advance", [], index + 1, player.playerid);
          if (index + 1 < records.length) await game.delay(1.15);
        }
        refreshSulv(player);
      } finally {
        delete player.storage.fan_sulv_running;
        game.broadcastAll(showSulvQueue, "stop", [], 0, player.playerid);
        game.broadcastAll(setSulvEffect, false, player.playerid);
      }
    },
    subSkill: {
      refresh: {
        audio: false,
        // 与限定技独立，发动后仍监听明置、区域变化及存活人数变化。
        charlotte: true,
        trigger: {
          global: ["addShownCardsAfter", "hideShownCardsAfter", "gainAfter", "loseAfter",
            "loseAsyncAfter", "equipAfter", "addJudgeAfter", "expansionAfter", "addToExpansionAfter",
            "dieAfter", "reviveAfter", "phaseBefore", "phaseAfter", "useCardAfter",
            "dyingBefore", "changeSkillsAfter"],
        },
        forced: true,
        silent: true,
        popup: false,
        firstDo: true,
        filter(event, player) {
          return player.isIn() && sulvUsed(player)
            && !!player.storage.fan_sulv !== (shownCount() < threshold(player));
        },
        async content(event, trigger, player) { refreshSulv(player); },
      },
      record: {
        audio: false,
        charlotte: true,
        trigger: { player: "useCard1" },
        forced: true,
        popup: false,
        firstDo: true,
        filter: recordable,
        async content(event, trigger, player) {
          (player.storage.fan_sulv_records ||= []).push({ name: trigger.card.name, nature: trigger.card.nature });
        },
      },
    },
  },
  fan_zhenyue: {
    zhuSkill: true,
    global: "fan_zhenyue_reveal",
    subSkill: {
      reveal: {
        audio: false,
        enable: "phaseUse",
        usable: 1,
        filter(event, player) {
          return player.group === "wei" && player.hasCard(card => !shown(card), "h")
            && game.hasPlayer(lord => lord !== player && lord.hasZhuSkill("fan_zhenyue", player));
        },
        filterCard: card => !shown(card),
        selectCard: 1,
        position: "h",
        discard: false,
        lose: false,
        check: card => 6 - get.value(card),
        async content(event, trigger, player) {
          if (player.group !== "wei" || !game.hasPlayer(lord => lord !== player && lord.hasZhuSkill("fan_zhenyue", player))) return;
          const cards = event.cards.filter(card => player.getCards("h").includes(card) && !shown(card));
          if (cards.length) await player.addShownCards(cards, "visible_fan_zhenyue");
        },
        ai: { order: 2, result: { player: 0.2 } },
      },
    },
  },
};
