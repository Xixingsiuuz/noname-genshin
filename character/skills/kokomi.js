import { game, get, _status } from "../../../../noname.js";
export default {
  fan_miaosuan: {
    locked: false,
    trigger: { global: "roundStart" },
    direct: true,
    group: ["fan_miaosuan_direct", "fan_miaosuan_record", "fan_miaosuan_end"],
    mod: {
      targetInRange(card, player, target) { if (player.storage.fan_miaosuan?.target === target) return true; },
      cardUsableTarget(card, player, target) { if (player.storage.fan_miaosuan?.target === target) return true; },
    },
    onremove: true,
    async content(event, trigger, player) {
      delete player.storage.fan_miaosuan;
      const result = await player.chooseTarget("妙算：你可以秘密选择一名角色")
        .set("prompt2", false).set("ai", target => get.attitude(player, target)).forResult();
      if (result.bool) player.storage.fan_miaosuan = { target: result.targets[0], damaged: false };
    },
    subSkill: {
      direct: {
        locked: false, forced: true, popup: false,
        trigger: { player: "useCard" },
        filter: (event, player) => event.targets?.includes(player.storage.fan_miaosuan?.target),
        async content(event, trigger, player) {
          trigger.directHit.add(player.storage.fan_miaosuan.target);
        },
      },
      record: {
        charlotte: true, popup: false, forced: true,
        trigger: { player: "damageEnd" },
        filter: (event, player) => event.source === player.storage.fan_miaosuan?.target && event.num > 0,
        async content(event, trigger, player) { player.storage.fan_miaosuan.damaged = true; },
      },
      end: {
        locked: false, forced: true, popup: false,
        trigger: { global: "roundEnd" },
        filter: (event, player) => !!player.storage.fan_miaosuan,
        async content(event, trigger, player) {
          const state = player.storage.fan_miaosuan;
          delete player.storage.fan_miaosuan;
          if (state.damaged) return;
          const cards = [];
          for (const name of new Set(get.zhinangs())) {
            const card = get.cardPile(card => card.name === name && !cards.includes(card));
            if (card) cards.push(card);
          }
          if (!cards.length) return;
          await player.gain(cards, "gain2");
          if (state.target === player) return;
          if (!player.isIn() || !state.target.isIn()) return;
          const available = cards.filter(card => player.getCards("h").includes(card));
          if (!available.length) return;
          const result = await player.chooseCard("h", `妙算：你可以交给${get.translation(state.target)}一张牌`)
            .set("filterCard", card => _status.event.cards.includes(card)).set("cards", available)
            .set("prompt2", false).forResult();
          if (result.bool && state.target.isIn() && player.getCards("h").includes(result.cards[0])) await player.give(result.cards, state.target);
        },
      },
    },
  },
  fan_haiji: {
    ai: {
      effect: {
        player(card, player, target) {
          // 使用引擎收益评估影响响应决策，不强制跳过玩家或 AI 的响应流程。
          if (!target || !player.hasSkill("fan_haiji") || !get.tag(card, "damage")) return;
          const chosen = player.storage.fan_miaosuan?.target;
          const heal = chosen?.isIn() && chosen.isDamaged()
            ? get.recoverEffect(chosen, player, player) / 10 : 0;
          return [0, chosen === target ? 0 : heal, 0, chosen === target && heal ? 1 : 0];
        },
      },
    },
    locked: true, forced: true,
    trigger: { source: "damageBegin2" },
    filter: event => event.num > 0,
    async content(event, trigger, player) {
      const num = trigger.num;
      trigger.cancel();
      const target = player.storage.fan_miaosuan?.target;
      if (target?.isIn()) await target.recover(num);
    },
  },
};
