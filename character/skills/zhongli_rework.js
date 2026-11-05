import { game, get, ui } from "../../../../noname.js";

const prepareChoice = event => event.set("fanPairedConfirm", true).set("manualConfirm", true);
const canUseDixin = player => {
  const used = player.getStat("skill");
  return (used.fan_re_dixin_give || 0) + (used.fan_re_dixin_remove || 0) < 2;
};
// 只依赖自己当前持有且可用于自救的实体桃/酒，不猜测队友会救援。
const dixinSafe = player => player.hp > 1 || (player.hp === 1 && player.getCards("hs")
  .some(card => ["tao", "jiu"].includes(get.name(card, player)) && player.canSaveCard(card, player)));

const inherited = {
  fan_re_dixin: { audio: false, group: ["fan_re_dixin_give", "fan_re_dixin_remove"], locked: false },
  fan_re_dixin_give: {
    audio: "ext:原神/audio/zhongli_rework/skill:3", logAudio: (...args) => args.length ? false : "ext:原神/audio/zhongli_rework/skill:3",
    enable: "phaseUse", usable: 2, locked: false,
    filter: (event, player) => canUseDixin(player),
    prompt: "地心：失去1点体力，选择一名角色获得护甲", prompt2: false,
    filterTarget: true,
    onChooseToUse: prepareChoice,
    async content(event, trigger, player) {
      const target = event.target;
      await player.loseHp(1);
      const before = player.hujia + (target === player ? 0 : target.hujia);
      if (player.isIn()) await player.changeHujia(1, "gain", 5);
      if (target.isIn()) await target.changeHujia(1, "gain", 5);
      if (player.hujia + (target === player ? 0 : target.hujia) > before) game.trySkillAudio("fan_re_dixin_give", player, true, false, undefined, []);
    },
    ai: {
      // 濒死救援先于授甲；有合法自救牌时允许把富余桃酒换成护甲。
      // 每次发动都重查资源，不能把同一张救援牌用于预算两次发动。
      order: (item, player) => dixinSafe(player) ? 6 : 0,
      result: {
        player(player) {
          if (!dixinSafe(player)) return -100;
          if (player.hp === 1) return -1;
          return player.hujia < 5 ? -0.4 : -1.2;
        },
        target(player, target) {
          if (!dixinSafe(player) || target.hujia >= 5) return 0;
          // 自选可获得两点，但仍需把失去体力的成本计入总收益。
          if (target === player) return Math.min(2, 5 - player.hujia)
            * (0.8);
          return target.hujia === 0 ? 1.2 : 0.8;
        },
      },
    },
  },
  fan_re_dixin_remove: {
    audio: "ext:原神/audio/zhongli_rework/skill:3", logAudio: (...args) => args.length ? false : "ext:原神/audio/zhongli_rework/skill:3",
    enable: "phaseUse", usable: 2, locked: false,
    prompt: "地心：移除一名其他角色的护甲", prompt2: false,
    filter: (event, player) => canUseDixin(player)
      && game.hasPlayer(target => target !== player && target.hujia > 0),
    filterTarget: (card, player, target) => target !== player && target.hujia > 0,
    onChooseToUse: prepareChoice,
    async content(event, trigger, player) {
      const target = event.target;
      if (target.isIn() && target.hujia > 0) {
        await target.changeHujia(-target.hujia);
        game.trySkillAudio("fan_re_dixin_remove", player, true, false, undefined, []);
      }
    },
    ai: { order: 7, result: { target: -1 } },
  },
  fan_re_xianyou: {
    audio: "ext:原神/audio/zhongli_rework/skill:3",
    logAudio: (...args) => args.length ? false : "ext:原神/audio/zhongli_rework/skill:3",
    zhuSkill: true, locked: false, enable: "phaseUse", usable: 1,
    prompt: "闲游：弃置其他蜀势力角色区域内的一张牌", prompt2: false,
    filter: (event, player) => player.hasZhuSkill("fan_re_xianyou") && game.hasPlayer(target =>
      target !== player && target.group === "shu" && target.countDiscardableCards(player, "hej") > 0),
    filterTarget: (card, player, target) => target !== player && target.group === "shu"
      && target.countDiscardableCards(player, "hej") > 0,
    onChooseToUse: prepareChoice,
    async content(event, trigger, player) {
      const target = event.target;
      if (!target.isIn() || target.group !== "shu" || !target.countDiscardableCards(player, "hej")) return;
      const result = await player.discardPlayerCard(target, "hej", true).forResult();
      if (result.bool && player.isIn()) {
        game.trySkillAudio("fan_re_xianyou", player, true, false, undefined, []);
        await player.draw(2);
      }
    },
    ai: { order: 8, result: { player: 1, target: -1 } },
  },
};

const tag = "fan_dingqi";
export default {
  fan_re_dixin: inherited.fan_re_dixin,
  fan_re_dixin_give: inherited.fan_re_dixin_give,
  fan_re_dixin_remove: inherited.fan_re_dixin_remove,
  fan_re_xianyou: { ...inherited.fan_re_xianyou, audio: "ext:原神/audio/zhongli_rework/skill:2", logAudio: (...args) => args.length ? false : "ext:原神/audio/zhongli_rework/skill:2" },
  fan_dingqi: {
    audio: false, locked: false, direct: true,
    trigger: { player: "phaseZhunbeiBegin" },
    filter: (event, player) => player.countCards("he") > 0,
    async content(event, trigger, player) {
      const result = await player.chooseCardTarget({
        prompt: "定契：将一张牌置于一名角色的武将牌上", prompt2: false,
        position: "he", selectCard: [0, 1], filterCard: true,
        selectTarget: 1, filterTarget: true, manualConfirm: true, fanPairedConfirm: true,
        filterOk: () => ui.selected.cards.length === 1 && ui.selected.targets.length === 1,
        ai1: card => 6 - get.value(card),
        ai2: target => get.attitude(player, target) > 0
          ? (target.getExpansions(tag).length ? 0 : 3 + Math.min(5, target.hp)) : -10,
      }).forResult();
      if (!result.bool) return;
      const target = result.targets[0], card = result.cards[0];
      if (!target.isIn() || !player.getCards("he").includes(card)) return;
      player.logSkill("fan_dingqi", target);
      await target.addToExpansion({cards: [card], source: player, animate: "give", gaintag: [tag]});
      if (target.getExpansions(tag).includes(card)) {
        target.storage.fan_dingqi_speaker = player;
        target.addSkill("fan_dingqi_contract");
        game.trySkillAudio("fan_dingqi_start", player, true, false, undefined, []);
      }
    },
  },
  fan_dingqi_contract: {
    charlotte: true, locked: false, forced: true, audio: false,
    mark: true, marktext: "契", intro: {
      content(storage, player) {
        return get.translation(player.getExpansions(tag)) || "没有卡牌";
      },
      mark(dialog, storage, player) {
        const cards = player.getExpansions(tag);
        if (!cards.length) return "没有卡牌";
        dialog.addAuto(cards);
      },
      markcount: (storage, player) => player.getExpansions(tag).length,
    },
    // 契随目标保留，不依赖钟离仍在场或仍持有定契。
    trigger: {player: ["damageBegin4", "phaseAfter"]},
    filter: (event, player) => player.getExpansions(tag).length > 0 && (event.name !== "damage" || event.num > 0),
    async content(event, trigger, player) {
      const cards = player.getExpansions(tag).slice();
      if (!cards.length) return;
      const speaker = player.storage.fan_dingqi_speaker || player;
      if (trigger.name === "damage") {
        trigger.cancel();
        game.trySkillAudio("fan_dingqi_prevent", speaker, true, false, undefined, []);
      }
      await player.loseToDiscardpile(cards);
      if (!player.getExpansions(tag).length) {
        delete player.storage.fan_dingqi_speaker;
        player.removeSkill("fan_dingqi_contract");
      }
      if (trigger.name !== "damage" && player.isIn()) {
        const num = Math.max(0, Math.min(5, player.hp));
        if (num) {
          game.trySkillAudio("fan_dingqi_draw", speaker, true, false, undefined, []);
          await player.draw(num);
        }
      }
    },
    ai: { effect: { target(card, player, target) {
      if (get.tag(card, "damage") && target.getExpansions(tag).length) return [0, 0];
    } } },
  },
  fan_dingqi_start: {audio: "ext:原神/audio/zhongli_rework/skill:3"},
  fan_dingqi_draw: {audio: "ext:原神/audio/zhongli_rework/skill:3"},
  fan_dingqi_prevent: {audio: "ext:原神/audio/zhongli_rework/skill:3"},
};
