import { game, get, lib, _status } from "../../../../noname.js";
export default {
  fan_miaosuan_select_voice: { audio: "ext:原神/audio/kokomi/skill:3" },
  fan_miaosuan_gain_voice: { audio: "ext:原神/audio/kokomi/skill:2" },
  fan_miaosuan_chengshi_voice: { audio: "ext:原神/audio/kokomi/skill:2" },
  fan_miaosuan: {
    locked: false,
    trigger: { global: "roundStart" },
    direct: true,
    audio: false,
    group: ["fan_miaosuan_record", "fan_miaosuan_end"],
    onremove: true,
    async content(event, trigger, player) {
      delete player.storage.fan_miaosuan;
      const result = await player.chooseTarget("妙算：你可以秘密选择一名角色")
        .set("prompt2", false).set("ai", target => get.attitude(player, target) + (target.hp >= target.maxHp ? 2 : 0)).forResult();
      if (result.bool) { player.storage.fan_miaosuan = { target: result.targets[0] }; game.trySkillAudio("fan_miaosuan_select_voice", player, true, true); }
    },
    subSkill: {
      record: {
        charlotte: true, forced: true, popup: false,
        trigger: { global: "recoverEnd" },
        filter: event => event.num > 0,
        async content(event, trigger, player) {
          if (player.storage.fan_miaosuan_round !== game.roundNumber) {
            player.storage.fan_miaosuan_round = game.roundNumber;
            player.storage.fan_miaosuan_recovered = [];
          }
          player.storage.fan_miaosuan_recovered.add(trigger.player);
        },
      },
      end: {
        locked: false, forced: true, popup: false,
        trigger: { global: "roundEnd" },
        filter: (event, player) => !!player.storage.fan_miaosuan,
        async content(event, trigger, player) {
          const state = player.storage.fan_miaosuan;
          delete player.storage.fan_miaosuan;
          if (!state.target.isIn()) return;
          const recovered = player.storage.fan_miaosuan_round === game.roundNumber && player.getStorage("fan_miaosuan_recovered").includes(state.target);
          const full = state.target.hp >= state.target.maxHp;
          if (!recovered && !full) return;
          const cards = [];
          for (const name of new Set(get.zhinangs())) {
            const card = get.cardPile(card => card.name === name && !cards.includes(card));
            if (card) cards.push(card);
          }
          if (cards.length) {
            game.trySkillAudio("fan_miaosuan_gain_voice", player, true, true);
            await player.gain(cards, "gain2");
            if (player.isIn() && state.target.isIn() && state.target !== player && player.countCards("h")) {
              const result = await player.chooseCard("h", [0, Math.min(cards.length, player.countCards("h"))], `妙算：交给${get.translation(state.target)}至多${cards.length}张手牌`)
                .set("prompt2", false).set("ai", card => get.attitude(player, state.target) > 0 ? 6 - get.value(card) : -1).forResult();
              if (result.bool && state.target.isIn()) {
                const give = result.cards.filter(card => player.getCards("h").includes(card));
                if (give.length) await player.give(give, state.target);
              }
            }
          }
          if (!recovered || !full || !player.isIn()) return;
          const known = get.zhinangs();
          const options = lib.inpile.filter(name => get.type(name) === "trick" && !known.includes(name));
          if (!options.length) return;
          const result = await player.chooseButton(["乘势：记录一种智囊牌", [options, "vcard"]], true)
            .set("ai", button => get.value({ name: button.link[2] }, player)).forResult();
          if (result.bool && options.includes(result.links[0][2]) && !get.zhinangs().includes(result.links[0][2])) {
            game.broadcastAll(function (name) {
              (_status.fan_miaosuan_names || (_status.fan_miaosuan_names = []));
              if (!_status.fan_miaosuan_names.includes(name)) _status.fan_miaosuan_names.push(name);
            }, result.links[0][2]);
            game.trySkillAudio("fan_miaosuan_chengshi_voice", player, true, true);
          }
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
          const heal = Math.max(0, ...game.filterPlayer(current => current.isDamaged()).map(current => get.recoverEffect(current, player, player) / 10));
          return [0, heal, 0, 0];
        },
      },
    },
    audio: "ext:原神/audio/kokomi/skill:3",
    locked: true, forced: true,
    trigger: { source: "damageBegin2" },
    filter: event => event.num > 0,
    async content(event, trigger, player) {
      trigger.cancel();
      if (!player.isIn()) return;
      const result = await player.chooseTarget(true, "海姬：令一名角色回复1点体力")
        .set("prompt2", false).set("ai", target => get.recoverEffect(target, player, player)).forResult();
      if (result.bool && result.targets[0].isIn()) await result.targets[0].recover(1, player);
    },
  },
};
