import { lib, game, get, ui, _status } from "../../../../noname.js";

const shown = card => get.is.shownCard(card) || card.hasGaintag("faceup_tag");
// “角色的明置牌”包含装备区的牌和明置手牌，不包含判定区。
// 与本地麹义伏骑一致的语音及选牌提示范围；不改变陌客实际响应限制。
const responseCard = card => !!card && (get.type(card) === "trick"
  || get.type(card) === "basic" && !["shan", "tao", "jiu", "du"].includes(card.name));
const hasShownCards = player => player.getCards("e").length > 0 || player.hasCard(shown, "h");

export default {
  fan_zhangdeng: {
    audio: "ext:原神/audio/flins/skill:3",
    enable: "phaseUse",
    usable: 1,
    selectTarget: 1,
    filterTarget: true,
    async content(event, trigger, player) {
      const target = event.target;
      // 仅在本次结算时取双方手牌快照，不监听后续手牌变化。
      const names = new Set(player.getCards("h").map(card => get.name(card, player)));
      const cards = target.getCards("h", card => names.has(get.name(card, target)));
      if (cards.length) await target.addShownCards(cards, "visible_fan_zhangdeng");
      if (!player.isIn() || !target.isIn()) return;
      const snatch = { name: "shunshou", storage: { fan_zhangdeng: true } };
      if (!player.canUse(snatch, target, false) || !player.hasCard(card =>
        game.checkMod(card, player, "unchanged", "cardEnabled2", player) !== false, "hes")) return;
      const next = player.chooseToUse({
        prompt: "掌灯：将一张牌当【顺手牵羊】对该角色使用",
        prompt2: false,
        filterCard: (card, player) => card.name === "shunshou" && lib.filter.cardEnabled(card, player),
        fan_zhangdeng_target: target,
        targetRequired: true,
        norestore: true,
        _backupevent: "fan_zhangdeng_backup",
        custom: { add: {}, replace: { window() {} } },
      });
      next.backup("fan_zhangdeng_backup");
      next.set("manualConfirm", true);
      await next;
    },
    mod: {
      targetInRange(card) {
        if (card.storage?.fan_zhangdeng) return true;
      },
    },
    ai: {
      order: 8,
      result: { target: (player, target) => target === player ? 0 : -1 },
    },
    subSkill: {
      backup: {
        audio: false,
        precontent(event, trigger, player) {
          game.trySkillAudio("fan_zhangdeng_use_voice", player, true, true);
        },
        sourceSkill: "fan_zhangdeng",
        position: "hes",
        selectCard: [0, 1],
        // 原目标是唯一合法目标，由原生检查流程自动选中。
        selectTarget: -1,
        manualConfirm: true,
        viewAs: { name: "shunshou", storage: { fan_zhangdeng: true } },
        filterCard(card, player) {
          // 八卦阵等技能会用虚拟牌探测此过滤器；只接受实际持有的转化素材。
          return player.getCards("hes").includes(card)
            && game.checkMod(card, player, "unchanged", "cardEnabled2", player) !== false;
        },
        filterTarget(card, player, target) {
          return target === _status.event.fan_zhangdeng_target
            && lib.filter.filterTarget(card, player, target);
        },
        filterOk() {
          return ui.selected.cards.length === 1 && ui.selected.targets.length === 1;
        },
        check: card => 7 - get.value(card),
        popname: true,
      },
    },
  },
  fan_moke: {
    audio: false,
    targetprompt2(target) {
      if (responseCard(get.card()) && target !== get.player() && hasShownCards(target)) return "不可响应";
    },
    onChooseToUse(event) { event.targetprompt2.add(lib.skill.fan_moke.targetprompt2); },
    onChooseTarget(event) { event.targetprompt2.add(lib.skill.fan_moke.targetprompt2); },
    locked: true,
    mod: {
      globalTo(from, to, distance) {
        if (from !== to) return distance + 1;
      },
    },
    trigger: { player: "useCard" },
    forced: true,
    filter(event, player) {
      return game.hasPlayer(target => target !== player && hasShownCards(target));
    },
    async content(event, trigger, player) {
      if (responseCard(trigger.card)) game.trySkillAudio("fan_moke_voice", player, true, true);
      // 覆盖全场响应者，包括并非此牌目标的无懈可击使用者。
      trigger.directHit.addArray(game.filterPlayer(target => target !== player && hasShownCards(target)));
    },
  },
  fan_moke_voice: {
    audio: [1, 2, 3, 4].map(i => `ext:原神/audio/flins/skill/fan_moke${i}.mp3`),
    charlotte: true,
  },
  fan_zhangdeng_use_voice: { audio: "ext:原神/audio/flins/skill:2", charlotte: true },
};
