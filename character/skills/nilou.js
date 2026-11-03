import { game, get } from "../../../../noname.js";

// 原生每个回合为所有角色建立新的 actionHistory；额外阶段沿用本回合记录。
const firstUse = (user, use, predicate) => user.getHistory("useCard", predicate)[0] === use;

// 只提高确有合法正收益目标、且适合重复结算的牌；保留原生目标收益判断。
function openingValue(player, card) {
  const name = get.name(card, player);
  if (name === "tao") {
    return player.getDamagedHp() >= 2 ? player.getUseValue(card, undefined, true) : 0;
  }
  if (name !== "sha" && get.type(card, null, player) !== "trick") return 0;
  if (get.tag(card, "norepeat")) return 0;
  return player.getUseValue(card, undefined, true);
}

// 出尘代价很高：通常放弃；失拍时用低价值牌修正，或保留攻击牌尝试补刀。
function chuchenDiscard(player, discard) {
  const correctRhythm = player.hasSkill("fan_pianzhuan")
    && player.hasSkill("fan_pianzhuan_yang") && !!player.storage.fan_pianzhuan;
  let score = correctRhythm ? 4 - get.value(discard, player) : -1;
  // 弃装备可能改变距离、伤害或响应限制，补刀估计只考虑弃手牌的稳定情况。
  if (get.position(discard) !== "h") return score;
  const finisher = player.hasCard(card => card !== discard
    && (get.name(card, player) === "sha" || get.type(card, null, player) === "trick")
    && get.tag(card, "damage") > 0
    && game.hasPlayer(target => target !== player && get.attitude(player, target) < 0
      && target.hp <= 1 && !(target.hujia > 0)
      // 额外出牌阶段会重置杀的阶段次数，但距离及目标合法性仍须满足。
      && player.canUse(card, target, undefined, false)
      && get.effect(target, card, player, player) > 0), "h");
  if (finisher) score = Math.max(score, 8 - get.value(discard, player));
  return score;
}

const targetedUse = evt => evt.fan_pianzhuan_targeted ?? !!evt.targets?.length;

export default {
  fan_pianzhuan: {
    audio: false,
    trigger: { player: ["phaseUseBegin", "phaseJieshuBegin"] },
    forced: true,
    locked: true,
    zhuanhuanji: true,
    group: "fan_pianzhuan_record",
    mark: true,
    marktext: "☯",
    intro: { content: storage => `下次执行：${storage ? "阴" : "阳"}` },
    async content(event, trigger, player) {
      const yin = !!player.storage.fan_pianzhuan;
      // 旧效果在本次发动时到期，新效果在摸牌后生效。
      player.removeSkill("fan_pianzhuan_yang");
      player.removeSkill("fan_pianzhuan_yin");
      await player.draw();
      if (!player.isIn()) return;
      player.addSkill(yin ? "fan_pianzhuan_yin" : "fan_pianzhuan_yang");
      player.changeZhuanhuanji("fan_pianzhuan");
      game.trySkillAudio("fan_pianzhuan_convert_voice", player, true);
    },
    subSkill: {
      record: {
        trigger: { global: "useCard" },
        firstDo: true,
        forced: true,
        silent: true,
        popup: false,
        locked: true,
        async content(event, trigger) {
          // 在取消目标前保存使用时是否指定目标，阴期间同样记录，不退还首牌资格。
          trigger.fan_pianzhuan_targeted = !!trigger.targets?.length;
        },
      },
      yang: {
        charlotte: true,
        locked: true,
        mark: true,
        marktext: "阳",
        intro: { content: "与其他角色的距离-1；每回合使用指定目标的第一张牌多结算一次，直到你下次发动【翩转】。" },
        mod: {
          globalFrom(from, to, distance) { if (from !== to) return distance - 1; },
          aiOrder(player, card, num) {
            // 按实际生效的阳效果挂载，不读取代表“下次分支”的转换状态。
            if (num <= 0 || !player.isPhaseUsing()
              || player.getHistory("useCard", targetedUse).length) return;
            const value = openingValue(player, card);
            if (value > 0) {
              if (get.name(card, player) === "tao") return Math.max(num, 18);
              return Math.max(num, 12 + Math.min(value / 5, 4));
            }
            // 有当前即可使用的优质首牌时才延后装备；无目标、超次数的杀不算。
            if (get.type(card, null, player) === "equip"
              && player.hasCard(candidate => openingValue(player, candidate) > 0, "h")) {
              return Math.min(num, 0.5);
            }
          },
        },
        trigger: { player: "useCard" },
        forced: true,
        popup: false,
        filter(event, player) {
          return !event.fan_pianzhuan_repeated && targetedUse(event)
            && firstUse(player, event, targetedUse);
        },
        audio: false,
        async content(event, trigger, player) {
          const use = trigger;
          // 多目标牌只增加一次整牌结算；嵌套使用有各自独立的 useCard。
          use.fan_pianzhuan_repeated = true;
          use.effectCount++;
          if (get.type(use.card, null, player) !== "equip") game.trySkillAudio("fan_pianzhuan_repeat_voice", player, true);
        },
      },
      yin: {
        charlotte: true,
        locked: true,
        mark: true,
        marktext: "阴",
        intro: { content: "其他角色与你的距离+1；其他角色每回合使用有目标的第一张牌对你无效，直到你下次发动【翩转】。" },
        mod: { globalTo(from, to, distance) { if (from !== to) return distance + 1; } },
        ai: {
          effect: {
            target(card, source, target) {
              if (source === target || !source) return;
              if (!source.getHistory("useCard", targetedUse).length) return "zerotarget";
            },
          },
        },
        trigger: { target: "useCardToTargeted" },
        forced: true,
        popup: false,
        filter(event, player) {
          return event.player !== player
            && firstUse(event.player, event.getParent(), targetedUse);
        },
        async content(event, trigger, player) {
          // excluded 属于 useCard，共享给每一次效果结算，不取消其他目标。
          const use = trigger.getParent();
          if (!use.targets?.includes(player) || use.excluded.includes(player)) return;
          use.excluded.add(player);
          game.trySkillAudio("fan_pianzhuan_guard_voice", player, true);
        },
      },
    },
  },
  fan_pianzhuan_convert_voice: { charlotte: true, audio: ["ext:原神/audio/nilou/skill/fan_pianzhuan_yang_voice.mp3", "ext:原神/audio/nilou/skill/fan_pianzhuan_yin_voice.mp3", "ext:原神/audio/nilou/skill/fan_pianzhuan_repeat_voice.mp3", "ext:原神/audio/nilou/skill/fan_pianzhuan_guard_voice.mp3"] },
  fan_pianzhuan_yang_voice: { charlotte: true, audio: "ext:原神/audio/nilou/skill:true" },
  fan_pianzhuan_yin_voice: { charlotte: true, audio: "ext:原神/audio/nilou/skill:true" },
  fan_pianzhuan_repeat_voice: { charlotte: true, audio: "ext:原神/audio/nilou/skill:3:ogg" },
  fan_pianzhuan_guard_voice: { charlotte: true, audio: "ext:原神/audio/nilou/skill:3:ogg" },
  fan_chuchen: {
    audio: ["ext:原神/audio/nilou/skill/fan_chuchen.mp3", "ext:原神/audio/nilou/skill/fan_chuchen_extra.mp3"],
    trigger: { player: "phaseEnd" },
    direct: true,
    locked: false,
    filter(event, player) { return player.countDiscardableCards(player, "he") > 0; },
    async content(event, trigger, player) {
      const result = await player.chooseToDiscard("he", 1)
        .set("prompt", "你可以弃置一张牌，发动【出尘】")
        .set("prompt2", false)
        .set("manualConfirm", true)
        .set("fanPairedConfirm", true)
        .set("ai", card => chuchenDiscard(player, card))
        .forResult();
      if (!result.bool) return;
      if (!player.isIn()) return;
      player.logSkill("fan_chuchen");
      // 发动后先翻面，翻面及其触发效果结算完毕后再进入额外阶段。
      await player.turnOver();
      if (player.isIn()) await player.phaseUse();
    },
  },
};
