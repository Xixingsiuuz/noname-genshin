import { game, get, ui } from "../../../../noname.js";
export default {
  fan_miaosuan_select_voice: { audio: "ext:原神/audio/kokomi/skill:3" },
  fan_miaosuan_gain_voice: { audio: "ext:原神/audio/kokomi/skill:2" },
  fan_miaosuan_draw_voice: { audio: "ext:原神/audio/kokomi/skill:3" },
  fan_miaosuan: {
    locked: false,
    trigger: { global: "roundStart" },
    direct: true,
    audio: false,
    group: ["fan_miaosuan_record", "fan_miaosuan_end", "fan_miaosuan_cleanup"],
    onremove: true,
    async content(event, trigger, player) {
      delete player.storage.fan_miaosuan;
      const result = await player.chooseTarget("妙算：你可以秘密选择一名角色")
        .set("prompt2", false).set("ai", target => {
          if (target.hp >= target.maxHp) return 4;
          return 1 + Math.max(0, get.attitude(player, target)) / 10 + (target.hp === 1 ? 0.5 : 0);
        }).forResult();
      if (result.bool && result.targets[0].isIn()) {
        player.storage.fan_miaosuan = { target: result.targets[0] };
        game.trySkillAudio("fan_miaosuan_select_voice", player, true, true);
      }
    },
    subSkill: {
      record: {
        charlotte: true, forced: true, popup: false,
        trigger: { global: "recoverEnd" },
        filter(event, player) {
          return event.num > 0 && event.player === player.storage.fan_miaosuan?.target &&
            event.getParent("phase").name === "phase";
        },
        async content(event, trigger, player) {
          const state = player.storage.fan_miaosuan;
          if (state?.target === trigger.player) state.recoveredTurn = trigger.getParent("phase");
        },
      },
      cleanup: {
        charlotte: true, forced: true, popup: false, forceDie: true,
        trigger: { global: "roundEnd" },
        async content(event, trigger, player) {
          delete player.storage.fan_miaosuan;
        },
      },
      end: {
        locked: false, forced: true, popup: false,
        trigger: { global: "phaseAfter" },
        filter(event, player) {
          const state = player.storage.fan_miaosuan;
          return state?.target.isIn() &&
            (state.recoveredTurn === event || state.target.hp >= state.target.maxHp);
        },
        async content(event, trigger, player) {
          const state = player.storage.fan_miaosuan;
          if (!state?.target.isIn()) return;
          const recovered = state.recoveredTurn === trigger;
          const full = state.target.hp >= state.target.maxHp;
          if (!recovered && !full) return;
          game.trySkillAudio("fan_miaosuan_draw_voice", player, true, true);
          await player.draw();
          if (!recovered || !full || !player.isIn()) return;

          const names = new Set(get.zhinangs());
          const card = Array.from(ui.cardPile.childNodes)
            .filter(card => names.has(card.name)).randomGet();
          if (!card) return;
          game.trySkillAudio("fan_miaosuan_gain_voice", player, true, true);
          await player.gain(card, "gain2");
          if (!player.isIn() || !player.getCards("h").includes(card)) return;
          const result = await player.chooseTarget("乘势：你可以将此牌交给一名其他角色",
            (card, player, target) => target !== player)
            .set("prompt2", false).set("ai", target => {
              if (get.tag(card, "damage") && player.hasSkill("fan_haiji")) {
                return get.attitude(player, target) - 1;
              }
              return get.attitude(player, target) * get.value(card, target) -
                5 * get.value(card, player);
            }).forResult();
          if (result.bool && player.isIn() && result.targets[0].isIn() &&
              result.targets[0] !== player && player.getCards("h").includes(card)) {
            await player.give(card, result.targets[0]);
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
