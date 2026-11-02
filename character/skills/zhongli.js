import { game, get } from "../../../../noname.js";

const armorCount = () => game.countPlayer(target => target.hujia > 0);
export const qianyanActive = (player, level) => player.isIn() && player.hujia > 0
  && player.hasSkill("fan_qianyan") && armorCount() >= level;

// 用独立来源授予原版卫境；撤去千岩时不移除其他来源，也不刷新本轮次数。
export function refreshQianyan(excluded) {
  const enabled = game.hasPlayer(owner => owner !== excluded && qianyanActive(owner, 2));
  for (const target of game.players) {
    if (enabled && target.hujia > 0) {
      if (!target.additionalSkills.fan_qianyan?.includes("weijing")) {
        target.addAdditionalSkill("fan_qianyan", ["weijing"], true);
      }
    } else if (target.additionalSkills.fan_qianyan) target.removeAdditionalSkill("fan_qianyan");
  }
}

const prepareChoice = event => event.set("fanPairedConfirm", true).set("manualConfirm", true);
const canUseDixin = player => {
  const used = player.getStat("skill");
  return (used.fan_dixin_give || 0) + (used.fan_dixin_remove || 0) < 2;
};
// 只依赖自己当前持有且可用于自救的实体桃/酒，不猜测队友会救援。
const dixinSafe = player => player.hp > 1 || (player.hp === 1 && player.getCards("hs")
  .some(card => ["tao", "jiu"].includes(get.name(card, player)) && player.canSaveCard(card, player)));

export default {
  fan_dixin: { audio: false, group: ["fan_dixin_give", "fan_dixin_remove"], locked: false },
  fan_dixin_give: {
    audio: "ext:原神/audio/zhongli/skill:2",
    enable: "phaseUse", usable: 2, locked: false,
    filter: (event, player) => canUseDixin(player),
    prompt: "地心：失去1点体力，选择一名角色获得护甲", prompt2: false,
    filterTarget: true,
    onChooseToUse: prepareChoice,
    async content(event, trigger, player) {
      const target = event.target;
      await player.loseHp(1);
      if (player.isIn()) await player.changeHujia(1, "gain", 5);
      if (target.isIn()) await target.changeHujia(1, "gain", 5);
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
            * (player.hasSkill("fan_qianyan") ? 1 : 0.8);
          return target.hujia === 0 ? 1.2 : 0.8;
        },
      },
    },
  },
  fan_dixin_remove: {
    audio: "ext:原神/audio/zhongli/skill:true",
    enable: "phaseUse", usable: 2, locked: false,
    prompt: "地心：移除一名其他角色的护甲", prompt2: false,
    filter: (event, player) => canUseDixin(player)
      && game.hasPlayer(target => target !== player && target.hujia > 0),
    filterTarget: (card, player, target) => target !== player && target.hujia > 0,
    onChooseToUse: prepareChoice,
    async content(event) {
      const target = event.target;
      if (target.isIn() && target.hujia > 0) await target.changeHujia(-target.hujia);
    },
    ai: { order: 7, result: { target: -1 } },
  },
  fan_qianyan: {
    audio: false,
    locked: true, forced: true, silent: true, popup: false, forceDie: true,
    derivation: ["weijing"],
    global: "fan_qianyan_handlimit",
    group: "fan_qianyan_armor",
    trigger: { global: ["phaseBefore", "gameDrawAfter", "enterGame", "changeSkillsAfter", "changeHujiaAfter", "dieAfter", "reviveAfter",
      "gainAfter", "loseAfter", "loseAsyncAfter", "equipAfter", "addJudgeAfter", "addToExpansionAfter", "cardsGotoSpecialAfter"] },
    init() { refreshQianyan(); },
    onremove(player) { refreshQianyan(player); },
    async content(event, trigger, player) {
      refreshQianyan();
      if (!qianyanActive(player, 4) || player.countCards("h") === 4) return;
      // 调整产生的失牌/摸牌事件会再次经过此处；不重入同一次调整。
      if (player.storage.fan_qianyan_adjusting) return;
      player.storage.fan_qianyan_adjusting = true;
      try {
        const num = 4 - player.countCards("h");
        if (num > 0) await player.draw(num);
        else await player.chooseToDiscard("h", -num, true, "千岩：将手牌数调整至4");
      } finally { delete player.storage.fan_qianyan_adjusting; }
    },
  },
  fan_qianyan_handlimit: {
    locked: true,
    mod: {
      maxHandcard(player, num) {
        if (player.hujia > 0 && game.hasPlayer(owner => qianyanActive(owner, 1))) return num + player.hujia;
      },
    },
  },
  fan_qianyan_armor: {
    audio: "ext:原神/audio/zhongli/skill:true",
    logAudio: () => false,
    locked: true, forced: true,
    trigger: { player: "damageAfter" },
    filter: (event, player) => qianyanActive(player, 3),
    async content(event, trigger, player) {
      if (player.hujia < 5) game.trySkillAudio("fan_qianyan_armor", player, true);
      await player.changeHujia(1, "gain", 5);
    },
  },
  fan_xianyou: {
    audio: "ext:原神/audio/zhongli/skill:true",
    logAudio: () => false,
    zhuSkill: true, locked: false, enable: "phaseUse", usable: 1,
    prompt: "闲游：弃置其他蜀势力角色区域内的一张牌", prompt2: false,
    filter: (event, player) => player.hasZhuSkill("fan_xianyou") && game.hasPlayer(target =>
      target !== player && target.group === "shu" && target.countDiscardableCards(player, "hej") > 0),
    filterTarget: (card, player, target) => target !== player && target.group === "shu"
      && target.countDiscardableCards(player, "hej") > 0,
    onChooseToUse: prepareChoice,
    async content(event, trigger, player) {
      const target = event.target;
      if (!target.isIn() || target.group !== "shu" || !target.countDiscardableCards(player, "hej")) return;
      const result = await player.discardPlayerCard(target, "hej", true).forResult();
      if (result.bool && player.isIn()) {
        game.trySkillAudio("fan_xianyou", player, true);
        await player.draw(2);
      }
    },
    ai: { order: 8, result: { player: 1, target: -1 } },
  },
};
