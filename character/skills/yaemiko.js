import { lib, game, get, ui, _status } from "../../../../noname.js";

export default {
  fan_tianhu_yang_voice: { audio: "ext:原神/audio/yaemiko/skill:2" },
  fan_tianhu_yin_voice: { audio: "ext:原神/audio/yaemiko/skill:2" },
  fan_yingxiang_voice: { audio: "ext:原神/audio/yaemiko/skill:3" },
  fan_mingshen_voice: { audio: "ext:原神/audio/yaemiko/skill:2" },
  fan_mingshen_easter_voice: { audio: "ext:原神/audio/yaemiko/skill:true" },

  fan_tianhu: {
    audio: false,
    persevereSkill: true, locked: false, zhuanhuanji: true,
    mark: true, marktext: "☯",
    intro: { content: storage => `当前状态：${storage ? "阴" : "阳"}` },
    trigger: { player: "useCardToPlayer", target: "useCardToTarget" },
    direct: true,
    group: "fan_tianhu_start",
    filter(event, player) {
      return event.player !== event.target && event.getParent().targets.includes(event.target)
        && (player.storage.fan_tianhu ? event.target === player : event.player === player);
    },
    async content(event, trigger, player) {
      const yin = !!player.storage.fan_tianhu;
      const result = await player.chooseBool(`天狐：取消${get.translation(trigger.card)}对${get.translation(trigger.target)}的目标？`)
        .set("prompt2", false)
        .set("ai", () => get.effect(trigger.target, trigger.card, trigger.player, player) < 0).forResult();
      if (!result.bool || !player.isIn() || !!player.storage.fan_tianhu !== yin
        || !trigger.getParent().targets.includes(trigger.target)) return;
      player.logSkill("fan_tianhu", trigger.target);
      game.trySkillAudio(yin ? "fan_tianhu_yin_voice" : "fan_tianhu_yang_voice", player, true);
      trigger.getParent().targets.remove(trigger.target);
      player.changeZhuanhuanji("fan_tianhu");
      await player.gain(game.createCard(yin ? "fan_xiaolicangdao" : "fan_meirenji", yin ? "spade" : "heart", 6), "gain2");
    },
  },
  fan_tianhu_start: {
    persevereSkill: true, locked: false, direct: true,
    trigger: { global: "phaseBefore" },
    filter: (event, player) => game.phaseNumber === 0 && !player.storage.fan_tianhu_started,
    async content(event, trigger, player) {
      player.storage.fan_tianhu_started = true;
      const result = await player.chooseBool("天狐：将初始状态变为阴？").set("prompt2", false)
        .set("ai", () => true).forResult();
      if (result.bool && !player.storage.fan_tianhu) player.changeZhuanhuanji("fan_tianhu");
    },
  },
  fan_yingxiang: {
    audio: false,
    persevereSkill: true, locked: false, chargeSkill: 4,
    init(player) {
      if (player.storage.fan_yingxiang_initialized) return;
      player.storage.fan_yingxiang_initialized = true;
      player.addCharge(1, false);
    },
    enable: "phaseUse", usable: 1,
    filter: (event, player) => player.countCharge() > 0 && game.hasPlayer(target => target !== player),
    manualConfirm: true,
    onChooseToUse: event => event.set("fanPairedConfirm", true).set("manualConfirm", true),
    prompt: "影向：选择其他角色，每名消耗1个蓄力点", prompt2: false,
    selectTarget: () => [1, Math.min(_status.event.player.countCharge(), game.countPlayer() - 1)],
    filterTarget: (card, player, target) => target !== player,
    multitarget: true, multiline: true,
    async content(event, trigger, player) {
      const targets = event.targets.slice().sortBySeat(_status.currentPhase || player);
      if (player.countCharge() < targets.length) return;
      player.removeCharge(targets.length);
      game.trySkillAudio("fan_yingxiang_voice", player, true);
      for (const target of targets) {
        if (!target.isIn()) continue;
        const result = await target.chooseCard("he", "影向：交给其一张黑色牌，否则受到1点雷电伤害")
          .set("filterCard", card => get.color(card) === "black")
          .set("prompt2", false).set("fanPairedConfirm", true).set("manualConfirm", true)
          .set("ai", card => 7 - get.value(card)).forResult();
        if (!target.isIn()) continue;
        const card = result.cards?.[0];
        if (result.bool && card && target.getCards("he").includes(card) && get.color(card, target) === "black" && player.isIn()) {
          await target.give(card, player);
        } else {
          await target.damage(1, "thunder", player);
        }
      }
    },
    ai: { order: 6, result: { target: -1 } },
  },
  fan_mingshen: {
    audio: false,
    persevereSkill: true, locked: false, enable: "phaseUse", usable: 1,
    filter: (event, player) => player.countDiscardableCards(player, "he") >= 2,
    filterCard: (card, player) => lib.filter.cardDiscardable(card, player, "fan_mingshen"),
    check: card => 6 - get.value(card),
    discard: false, lose: false,
    prompt: "鸣神：弃置2张牌，选择一名角色", prompt2: false,
    position: "he", selectCard: [0, 2], selectTarget: 1,
    filterTarget: true,
    filterOk: () => ui.selected.cards.length === 2 && ui.selected.targets.length === 1,
    manualConfirm: true,
    onChooseToUse: event => event.set("fanPairedConfirm", true).set("manualConfirm", true),
    async content(event, trigger, player) {
      if (event.cards.length !== 2 || !event.cards.every(card => player.getCards("he").includes(card)
        && lib.filter.cardDiscardable(card, player, "fan_mingshen"))) return;
      const black = event.cards.every(card => get.color(card, player) === "black");
      await player.discard(event.cards);
      const target = event.target;
      if (!target.isIn()) return;
      await target.draw(2);
      let easter = false;
      if (target.isIn() && black) {
        if (target.hasSkill("fan_wuxiang") && lib.skill.fan_wuxiang?.resolveCharge) {
          const hadYushen = target.hasSkill("fan_yushen");
          await lib.skill.fan_wuxiang.resolveCharge(target, 3, null, true);
          easter = !hadYushen && target.hasSkill("fan_yushen") && !target.hasSkill("fan_wuxiang");
        } else target.addCharge(3);
      }
      game.trySkillAudio(easter ? "fan_mingshen_easter_voice" : "fan_mingshen_voice", player, true);
    },
    ai: {
      order: 5,
      result: { target: 1 },
    },
  },
};
