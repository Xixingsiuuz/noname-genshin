import { game, get } from "../../../../noname.js";
const evaluatingLanghua = new WeakSet();

const point = (card, player) => {
  const value = get.number(card, player);
  return typeof value === "number" && Number.isFinite(value) ? value : null;
};
const savedPoint = (use, player) => use.fan_langhua ? use.fan_langhua.number : point(use.card, player);

// 不在回合边界清零；首张和比较失败的牌均为0。历史只读到本次用牌。
function sequence(player, current) {
  const history = player.getAllHistory("useCard");
  const index = current ? history.indexOf(current) : history.length - 1;
  let count = 0;
  for (let i = index; i > 0; i--) {
    const a = savedPoint(history[i], player), b = savedPoint(history[i - 1], player);
    if (a === null || b === null || a < b) break;
    count++;
  }
  return count;
}
function nextCount(player, card) {
  const history = player.getAllHistory("useCard"), previous = history.at(-1);
  const a = point(card, player), b = previous ? savedPoint(previous, player) : null;
  return a !== null && b !== null && a >= b ? sequence(player) + 1 : 0;
}
const armorAvailable = player => !player.getHistory("useCard", use => use.fan_langhua?.armor).length;

export default {
  fan_langhua: {
    trigger: { player: "useCard" }, firstDo: true,
    forced: true, locked: false, popup: false, audio: false,
    group: ["fan_langhua_after", "fan_langhua_damage_voice"],
    mark: true, marktext: "浪",
    intro: { content(storage, player) {
      const previous = player.getAllHistory("useCard").at(-1);
      const number = previous ? savedPoint(previous, player) : null;
      return `连续使用的牌数：${sequence(player)}<br>上次使用的点数：${number ?? "无"}`;
    } },
    async content(event, trigger, player) {
      if (trigger.fan_langhua) return;
      // 先固定点数和档位，再摸牌；嵌套用牌不能改写外层牌的收益。
      trigger.fan_langhua = { number: point(trigger.card, player) };
      const count = sequence(player, trigger);
      const snapshot = trigger.fan_langhua;
      snapshot.count = count;
      if (!count) return;
      snapshot.armor = count >= 2 && armorAvailable(player);
      snapshot.draw = count >= 4;
      if (count >= 6) trigger.baseDamage += Math.max(1, snapshot.number - 10);
      player.logSkill("fan_langhua");
      if (count < 4) game.trySkillAudio("fan_langhua_" + (count >= 2 ? "low" : "start"), player, true);
      await player.draw();
    },
    mod: {
      aiOrder(player, card, order) {
        if (order <= 0) return;
        const number = point(card, player), count = nextCount(player, card);
        // 仅在原生判断可用且有正收益时偏好低点数起步、递增衔接。
        if (number === null || player.getUseValue(card) <= 0) return;
        let bonus = (14 - number) * 0.08;
        if (count) bonus += 1.2;
        if (count >= 2 && armorAvailable(player) && player.hujia < 5) bonus += 0.5;
        if (count >= 4) bonus += 0.7;
        return order + bonus;
      },
    },
    ai: {
      threaten: 1.6,
      effect: { player(card, player, target) {
        if (evaluatingLanghua.has(player)) return;
        evaluatingLanghua.add(player);
        try {
        const count = nextCount(player, card);
        if (!count) return;
        // 摸牌收益按每次用牌分摊，避免多目标重复高估；伤害保留原生敌友评估。
        const targets = Math.max(1, game.countPlayer(target => player.canUse(card, target)));
        let value = 0.7 + (count >= 4 ? 0.7 : 0);
        if (count >= 2 && armorAvailable(player) && player.hujia < 5) value += player.hp <= 2 ? 0.9 : 0.4;
        if (target && count >= 6 && get.tag(card, "damage")) {
          const extra = Math.max(1, point(card, player) - 10);
          const effect = get.damageEffect(target, player, player, get.nature(card));
          value += Math.sign(effect) * Math.min(Math.abs(effect), extra * 1.5) * targets;
        }
        return [1, value / targets];
        } finally { evaluatingLanghua.delete(player); }
      } },
    },
    subSkill: {
      after: {
        trigger: { player: "useCardAfter" }, forced: true, locked: false, popup: false, audio: false,
        filter: event => !!event.fan_langhua && !event.fan_langhua.done && !!(event.fan_langhua.armor || event.fan_langhua.draw),
        async content(event, trigger, player) {
          const snapshot = trigger.fan_langhua;
          if (snapshot.done) return;
          snapshot.done = true;
          if (!player.isIn()) return;
          if (snapshot.armor) await player.changeHujia(1, "gain", 5);
          if (snapshot.draw && player.isIn()) {
            game.trySkillAudio("fan_langhua_mid", player, true);
            await player.draw();
          }
        },
      },
      damage_voice: {
        trigger: { source: "damage" }, forced: true, locked: false, popup: false, audio: false,
        filter(event, player) {
          const use = event.getParent("useCard");
          return event.num > 0 && !event.unreal && event.source === player
            && use?.player === player && event.card === use.card
            && use.fan_langhua?.count >= 6 && !use.fan_langhua.damageVoiced;
        },
        async content(event, trigger, player) {
          const use = trigger.getParent("useCard");
          if (use.fan_langhua.damageVoiced) return;
          // 每张牌首次实际造成伤害时播音；多目标、重复结算不重播。
          use.fan_langhua.damageVoiced = true;
          game.trySkillAudio("fan_langhua_high", player, true);
        },
      },
      start: { audio: "ext:原神/audio/eula/skill:true" },
      low: { audio: "ext:原神/audio/eula/skill:2" },
      mid: { audio: "ext:原神/audio/eula/skill:2" },
      high: { audio: "ext:原神/audio/eula/skill:2" },
    },
  },
};
