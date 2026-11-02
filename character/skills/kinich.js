import { lib, game, get, _status } from "../../../../noname.js";

export default {
  fan_xuanlie: {
    audio: false,
    locked: false,
    trigger: { player: "useCardToPlayered" },
    direct: true,
    filter(event, player) {
      return event.target !== player && event.target.isIn();
    },
    async content(event, trigger, player) {
      const target = trigger.target;
      if (get.tag(trigger.card, "damage") > 0) {
        if (!target.countGainableCards(player, "hej")) return;
        const result = await player.chooseBool(`悬猎：是否获得${get.translation(target)}区域内的一张牌？`)
          .set("prompt2", false)
          .set("ai", () => get.effect(target, { name: "shunshou" }, player, player) > 0).forResult();
        if (result.bool && target.isIn() && target.countGainableCards(player, "hej")) {
          player.logSkill("fan_xuanlie", target);
          game.trySkillAudio("fan_xuanlie_gain_voice", player, true);
          await player.gainPlayerCard(target, "hej", true);
        }
      } else {
        // 结算内追杀不受常规次数限制，也不占用正常额度。
        await player.chooseToUse(`悬猎：是否对${get.translation(target)}使用一张【杀】？`)
          .set("prompt2", false)
          .set("fanPairedConfirm", true)
          .set("manualConfirm", true)
          .set("addCount", false)
          .set("filterCard", (card, player, evt) => get.name(card) === "sha"
            && lib.filter.cardEnabled(card, player, evt))
          .set("filterTarget", (card, player, current) => current === _status.event.fan_xuanlie_target
            && current.isIn() && lib.filter.targetEnabled(card, player, current)
            && lib.filter.targetInRange(card, player, current))
          .set("fan_xuanlie_target", target)
          .set("selectTarget", -1)
          .set("targetRequired", true)
          .set("ai1", card => {
            const target = _status.event.fan_xuanlie_target;
            const player = _status.event.player;
            return get.effect(target, card, player, player) > 0 ? 8 - get.value(card, player) : 0;
          })
          .set("oncard", (card, player) => game.trySkillAudio("fan_xuanlie_sha_voice", player, true))
          .set("logSkill", "fan_xuanlie");
      }
    },
  },
  fan_shouxing: {
    audio: false,
    trigger: { player: "phaseZhunbeiBegin" },
    forced: true,
    locked: true,
    zhuanhuanji: true,
    mark: true,
    marktext: "☯",
    intro: {
      content(storage) { return `下次准备阶段发动：${storage ? "阴" : "阳"}`; },
    },
    async content(event, trigger, player) {
      const yin = !!player.storage.fan_shouxing;
      player.changeZhuanhuanji("fan_shouxing");
      player.addTempSkill(yin ? "fan_shouxing_yin" : "fan_shouxing_yang", "phaseAfter");
      game.trySkillAudio(yin ? "fan_shouxing_yin_voice" : "fan_shouxing_yang_voice", player, true);
    },
    subSkill: {
      yang: {
        audio: false,
        charlotte: true,
        locked: true,
        mod: {
          attackRange(player, num) { return num + 1; },
          cardUsable(card, player, num) { if (get.name(card) === "sha") return num + 1; },
        },
        trigger: { player: "useCard1" },
        forced: true,
        filter(event, player) {
          return player.getHistory("useCard")[0] === event;
        },
        async content(event, trigger) {
          trigger.directHit.addArray(game.players);
        },
      },
      yin: {
        audio: false,
        charlotte: true,
        locked: true,
        mod: { maxHandcard(player, num) { return num + 1; } },
        trigger: { player: "phaseDrawBegin2" },
        forced: true,
        filter(event) { return !event.numFixed; },
        async content(event, trigger) { trigger.num++; },
      },
    },
  },
  fan_xuanlie_sha_voice: { audio: "ext:原神/audio/kinich/skill:2" },
  fan_xuanlie_gain_voice: { audio: "ext:原神/audio/kinich/skill:2" },
  fan_shouxing_yang_voice: { audio: "ext:原神/audio/kinich/skill:2" },
  fan_shouxing_yin_voice: { audio: "ext:原神/audio/kinich/skill:2" },
};
