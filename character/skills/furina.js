import { game, get, _status } from "../../../../noname.js";
import { setHuanyanEffect } from "../../ui/huanyan-effect.js";

function clearHuanyanEffects(player) {
  for (const target of player.storage.fan_huanyan_targets || []) {
    game.broadcastAll(setHuanyanEffect, target, player, false);
  }
}

export default {
  fan_shanyao: {
    audio: "ext:原神/audio/furina/skill:2",
    locked: true,
    forced: true,
    init(player) {
      game.broadcastAll(setHuanyanEffect, player, player, true);
    },
    onremove(player) {
      game.broadcastAll(setHuanyanEffect, player, player, false);
    },
    group: ["fan_shanyao_effect"],
    subSkill: {
      effect: {
        trigger: { global: "phaseBefore", player: "enterGame" },
        locked: true,
        silent: true,
        popup: false,
        filter(event) {
          return event.name !== "phase" || game.phaseNumber === 0;
        },
        async content(event, trigger, player) {
          game.broadcastAll(setHuanyanEffect, player, player, true);
        },
      },
    },
    trigger: { player: ["loseHpEnd", "damageEnd", "recoverEnd"] },
    filter(event, player) {
      return event.num > 0;
    },
    async content(event, trigger, player) {
      let count = trigger.name === "recover" ? 2 : 1;
      if (player.storage.fan_zhongyu_state === "success") count++;
      await player.draw(count);
      const linked = (player.storage.fan_huanyan_targets || [])
        .filter(p => p.isIn())
        .sortBySeat(_status.currentPhase || player);
      for (const target of linked) {
        if (target.isIn()) await target.draw(count);
      }
    },
  },
  fan_huanyan: {
    audio: "ext:原神/audio/furina/skill:2",
    trigger: { player: "phaseUseBegin" },
    direct: true,
    filter(event, player) {
      return game.hasPlayer(p => p !== player && p.isIn());
    },
    async content(event, trigger, player) {
      const result = await player.chooseTarget(
        get.prompt("fan_huanyan"),
        "选择任意名其他角色，增加等量体力上限；直到你的下个准备阶段，这些角色共享【闪耀】摸牌，且其使用牌指定目标后，若你体力大于上限一半，你失去1点体力",
        [1, Infinity],
        (card, player, target) => target !== player
      ).set("ai", target => get.attitude(player, target)).forResult();
      if (!result.bool) return;
      const selected = result.targets;
      player.logSkill("fan_huanyan", selected);
      if (!Array.isArray(player.storage.fan_huanyan_targets)) {
        player.storage.fan_huanyan_targets = [];
      }
      for (const target of selected) {
        if (!player.storage.fan_huanyan_targets.includes(target)) {
          player.storage.fan_huanyan_targets.push(target);
        }
        game.broadcastAll(setHuanyanEffect, target, player, true);
      }
      player.markSkill("fan_huanyan");
      await player.gainMaxHp(selected.length);
      if (player.storage.fan_zhongyu_state === "success") {
        await player.recover(selected.length);
      }
    },
    intro: {
      content(storage, player) {
        const targets = player.storage.fan_huanyan_targets || [];
        return "共享【闪耀】的角色：" + (targets.length ? get.translation(targets) : "无");
      },
    },
    group: ["fan_huanyan_cost", "fan_huanyan_expire"],
    onremove(player) {
      clearHuanyanEffects(player);
      delete player.storage.fan_huanyan_targets;
    },
    subSkill: {
      cost: {
        trigger: { global: "useCard2" },
        forced: true,
        silent: true,
        filter(event, player) {
          const targets = player.storage.fan_huanyan_targets || [];
          return targets.includes(event.player) && event.targets && event.targets.length > 0
            && player.hp * 2 > player.maxHp;
        },
        async content(event, trigger, player) {
          // 结算时再次检查，避免其他技能先结算后体力已不大于一半。
          if (player.hp * 2 > player.maxHp) {
            await player.loseHp();
          }
        },
      },
      expire: {
        trigger: { player: ["phaseZhunbeiBegin", "dieBegin"] },
        forced: true,
        silent: true,
        popup: false,
        firstDo: true,
        filter(event, player) {
          return (player.storage.fan_huanyan_targets || []).length > 0;
        },
        async content(event, trigger, player) {
          clearHuanyanEffects(player);
          delete player.storage.fan_huanyan_targets;
          player.unmarkSkill("fan_huanyan");
        },
      },
    },
  },
  fan_zhongyu: {
    dutySkill: true,
    derivation: ["fan_duqi"],
    mark: true,
    marktext: "谕",
    intro: {
      content(storage, player) {
        const missionState = player.storage.fan_zhongyu_state;
        return missionState === "success" ? "使命成功" : missionState === "failure" ? "使命失败" : "使命进行中";
      },
    },
    group: ["fan_zhongyu_success", "fan_zhongyu_failure"],
    subSkill: {
      success: {
        audio: "ext:原神/audio/furina/skill:2",
        trigger: { player: "phaseZhunbeiBegin" },
        forced: true,
        skillAnimation: true,
        filter(event, player) {
          return !player.storage.fan_zhongyu_state && player.maxHp >= 10;
        },
        async content(event, trigger, player) {
          player.storage.fan_zhongyu_state = "success";
          player.popup("使命成功");
          player.markSkill("fan_zhongyu");
        },
      },
      failure: {
        audio: "ext:原神/audio/furina/skill:2",
        trigger: { player: "dying" },
        forced: true,
        filter(event, player) {
          return !player.storage.fan_zhongyu_state;
        },
        async content(event, trigger, player) {
          player.storage.fan_zhongyu_state = "failure";
          player.popup("使命失败");
          player.markSkill("fan_zhongyu");
          player.removeSkill("fan_shanyao");
          player.removeSkill("fan_huanyan");
          player.addSkill("fan_duqi");
        },
      },
    },
  },
  fan_duqi: {
    audio: "ext:原神/audio/furina/skill:2",
    forced: true,
    locked: true,
    trigger: { player: "damageBegin4" },
    filter(event, player) {
      const elemental = typeof event.hasNature === "function" ? event.hasNature() : Boolean(event.nature);
      return elemental;
    },
    async content(event, trigger, player) {
      trigger.cancel();
    },
    ai: { nofire: true, nothunder: true },
  },
};
