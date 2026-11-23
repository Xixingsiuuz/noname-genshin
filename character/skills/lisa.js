import { game, get, _status } from "../../../../noname.js";
export default {
  fan_guancang: {
    audio: false, locked: false, enable: "phaseUse", usable: 1,
    filter(event, player) { return game.hasPlayer(target => target !== player && target.countCards("h") <= player.countCards("h")); },
    async content(event, trigger, player) {
      const targets = game.filterPlayer(target => target !== player && target.countCards("h") <= player.countCards("h")).sortBySeat(_status.currentPhase || player);
      for (const target of targets) {
        if (!target.isIn()) continue;
        const result = await target.chooseCard("he", "交给" + get.translation(player) + "一张锦囊牌，或取消并受到1点雷电伤害", card => get.type2(card) === "trick")
          .set("prompt2", false).set("ai", card => {
            const harm = -get.damageEffect(target, player, target, "thunder");
            return harm > 0 ? harm / 2 + get.attitude(target, player) - get.value(card) : 0;
          }).forResult();
        const card = result.cards?.[0];
        if (result.bool && card && target.getCards("he").includes(card) && get.type2(card) === "trick" && player.isIn()) await target.give([card], player);
        else if (target.isIn()) await target.damage(1, "thunder", player);
      }
    },
    ai: { order: 7, result: { player(player) {
      return game.filterPlayer(target => target !== player && target.countCards("h") <= player.countCards("h")).reduce((sum, target) => {
        const damage = get.damageEffect(target, player, player, "thunder");
        return sum + (target.countCards("h") ? Math.min(damage, 2) : damage);
      }, 0);
    } } },
  },
  fan_wucha: {
    audio: false, locked: false, trigger: { player: "phaseUseEnd" }, forced: true,
    filter(event, player) {
      return player.isDamaged() && !player.getHistory("useCard", use => use.card.name === "sha" && use.getParent("phaseUse") === event).length;
    },
    async content(event, trigger, player) { await player.recover(); },
    ai: { recover: true },
  },
};
