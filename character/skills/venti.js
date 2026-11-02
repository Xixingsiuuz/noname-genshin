import { lib, game, get } from "../../../../noname.js";

export function getYinyouCount(target) {
  return Number(target.getHistory("sourceDamage").some(evt => evt.num > 0))
    + Number(!target.getHistory("lose").some(evt => evt.type === "discard" && evt.cards2?.length))
    + Number(!game.hasPlayer(current => current.countCards("h") < target.countCards("h")));
}

export default {
  fan_yinyou: {
    audio: "ext:原神/audio/venti/skill:3",
    locked: false, direct: true,
    trigger: { global: "phaseJieshuBegin" },
    filter(event, player) {
      return event.player.isIn() && player.countCards("h", card => lib.filter.cardDiscardable(card, player, "fan_yinyou")) > 0;
    },
    async content(event, trigger, player) {
      const target = trigger.player;
      const result = await player.chooseToDiscard("h", 1, "你可以发动【吟游】，弃置一张手牌")
        .set("fanPairedConfirm", true).set("manualConfirm", true)
        .set("prompt2", false).set("ai", card => 5 - get.value(card))
        .set("logSkill", ["fan_yinyou", target]).forResult();
      if (!result.bool || !target.isIn() || !player.isIn()) return;
      // 在支付弃牌代价及其相关触发结束后统计“此时”。
      const count = getYinyouCount(target);
      if (!count) return;
      const cards = get.cards(count);
      await game.cardsGotoOrdering(cards);
      let gifts = [];
      if (player === target) {
        await player.viewCards("吟游", cards);
      } else {
        const chosen = await player.chooseButton(["吟游：选择交给该角色的牌", cards], [0, cards.length], true)
          .set("fanPairedConfirm", true).set("manualConfirm", true)
          .set("ai", button => get.attitude(player, target) > 0 ? get.value(button.link) : 0).forResult();
        gifts = chosen.links || [];
      }
      const available = card => get.position(card, true) === "o";
      if (target.isIn() && gifts.some(available)) await target.gain(gifts.filter(available), "gain2");
      // 目标中途离场时，不将已经选定交给它的牌强行转交他人。
      const rest = cards.filter(card => !gifts.includes(card) && available(card));
      if (player.isIn() && rest.length) await player.gain(rest, "gain2");
    },
  },
  fan_qingzhan: {
    audio: "ext:原神/audio/venti/skill:2",
    locked: false, direct: true,
    trigger: { player: "phaseZhunbeiBegin" },
    derivation: ["reluoying", "fan_jiushi"],
    async content(event, trigger, player) {
      const result = await player.chooseTarget("你可以发动【倾盏】，选择协力角色", (card, player, target) => target !== player)
        .set("prompt2", false).set("fanPairedConfirm", true).set("manualConfirm", true)
        .set("ai", target => get.attitude(player, target)).forResult();
      if (!result.bool) return;
      const target = result.targets[0];
      player.logSkill("fan_qingzhan", target);
      await player.chooseCooperationFor(target, "fan_qingzhan");
      player.addSkill("fan_qingzhan_result");
    },
  },
  fan_qingzhan_result: {
    charlotte: true, forced: true, popup: false, locked: false,
    // 原生 cooperation 在 phaseAfter 的 lastDo 清理，先于其结算奖励。
    trigger: { global: "phaseAfter" },
    filter(event, player) { return player.checkCooperationStatus(event.player, "fan_qingzhan"); },
    async content(event, trigger, player) {
      const target = trigger.player;
      if (!target.isIn() || !player.isIn() || !player.hasSkill("fan_qingzhan")) return;
      game.trySkillAudio("fan_qingzhan_success", player, true);
      // 用独立来源保留角色原有技能；多次奖励可分别到期。
      const key = `fan_qingzhan_${player.playerid}_${player.storage.fan_qingzhan_serial = (player.storage.fan_qingzhan_serial || 0) + 1}`;
      target.addAdditionalSkill(key, "reluoying");
      player.addAdditionalSkill(key, "fan_jiushi");
      (player.storage.fan_qingzhan_rewards ||= []).push({ target, key });
      player.addSkill("fan_qingzhan_expire");
    },
  },
  fan_qingzhan_expire: {
    charlotte: true, forced: true, popup: false, firstDo: true,
    trigger: { global: ["phaseJieshuBegin", "dieAfter"] },
    forceDie: true,
    filter(event, player) {
      return (event.name === "die" && event.player === player)
        || (player.storage.fan_qingzhan_rewards || []).some(record => record.target === event.player);
    },
    onremove(player) {
      for (const { target, key } of player.storage.fan_qingzhan_rewards || []) {
        target.removeAdditionalSkill(key);
        player.removeAdditionalSkill(key);
      }
      delete player.storage.fan_qingzhan_rewards;
    },
    async content(event, trigger, player) {
      if (trigger.name === "die" && trigger.player === player) {
        player.removeSkill("fan_qingzhan_expire");
        return;
      }
      const records = player.storage.fan_qingzhan_rewards || [];
      for (const { target, key } of records.filter(record => record.target === trigger.player)) {
        target.removeAdditionalSkill(key);
        player.removeAdditionalSkill(key);
      }
      player.storage.fan_qingzhan_rewards = records.filter(record => record.target !== trigger.player);
      if (!player.storage.fan_qingzhan_rewards.length) player.removeSkill("fan_qingzhan_expire");
    },
  },
  fan_qingzhan_success: { audio: "ext:原神/audio/venti/skill:2" },
  // 独立实现觉醒后的酒诗，不写入曹植的 storage.chengzhang，避免污染其他技能来源。
  fan_jiushi: {
    audio: "ext:原神/audio/venti/skill:2", locked: false,
    group: ["fan_jiushi_use", "fan_jiushi_hurt", "fan_jiushi_gain"],
    subfrequent: [],
  },
  fan_jiushi_use: {
    audio: "fan_jiushi",
    inherit: "rejiushi1", sourceSkill: "fan_jiushi", locked: false,
  },
  fan_jiushi_hurt: {
    audio: "fan_jiushi", sourceSkill: "fan_jiushi", locked: false,
    trigger: { player: "damageEnd" },
    filter(event, player) {
      return player.isTurnedOver() && !player.getHistory("useCard").some(evt =>
        evt.card.name === "jiu" && evt.getParent().name === "fan_jiushi_use"
        && evt.getParent("damage", true) === event);
    },
    prompt: "你可以发动【酒诗】，将武将牌翻面", prompt2: false,
    check: (event, player) => player.isTurnedOver(),
    async content(event, trigger, player) { await player.turnOver(); },
  },
  fan_jiushi_gain: {
    audio: false, sourceSkill: "fan_jiushi", locked: false,
    trigger: { player: "turnOverAfter" }, forced: true,
    async content(event, trigger, player) {
      const card = get.cardPile2(card => get.type2(card) === "trick", "random");
      if (card) await player.gain(card, "gain2", "log");
    },
  },
  fan_songshi: {
    audio: false,
    zhuSkill: true, limited: true, locked: false,
    skillAnimation: true, animationColor: "wood",
    trigger: { global: "dying" },
    filter(event, player) {
      return !player.storage.fan_songshi_used && player.hasZhuSkill("fan_songshi")
        && event.player.isIn() && event.player.group === "wu" && event.player.hp < 1;
    },
    prompt: "你可以发动【颂时】，令该角色回复体力至1点", prompt2: false,
    check(event, player) { return get.attitude(player, event.player) > 0; },
    async content(event, trigger, player) {
      const target = trigger.player;
      if (player.storage.fan_songshi_used || !target.isIn() || target.hp >= 1) return;
      player.storage.fan_songshi_used = true;
      player.awakenSkill("fan_songshi");
      game.trySkillAudio("fan_songshi_voice", player, true);
      await target.recover(1 - target.hp);
      if (!target.isIn() || !player.isIn()) return;
      const result = await player.chooseTarget("颂时：你可以选择一名角色与其交换位置", (card, player, current) => current !== target)
        .set("prompt2", false).set("fanPairedConfirm", true).set("manualConfirm", true).forResult();
      if (result.bool && target.isIn() && result.targets[0].isIn()) game.swapSeat(target, result.targets[0]);
    },
  },
  fan_songshi_voice: { audio: "ext:原神/audio/venti/skill:3" },
};
