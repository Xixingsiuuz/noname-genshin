import { get, _status } from "../../../../noname.js";

// Card identities survive hand movement; gain tags are hints, never rule evidence.
export default {
  fan_yujie: {
    audio: false, locked: false, trigger: { player: "phaseUseBegin" }, direct: true,
    group: "fan_yujie_reward",
    async content(event, trigger, player) {
      const choice = await player.chooseTarget("你可以发动【羽结】，选择一名角色", (card, owner, target) => target.countCards("h") < owner.countCards("h"))
        .set("prompt2", false).set("ai", target => get.attitude(player, target)).forResult();
      if (!choice.bool) return;
      const target = choice.targets[0];
      if (!target.isIn() || target.countCards("h") >= player.countCards("h")) return;
      player.logSkill("fan_yujie", target);
      const result = await target.draw(2).forResult();
      const drawn = result.cards || [];
      const available = drawn.filter(card => target.getCards("h").includes(card));
      if (!player.isIn() || !target.isIn() || !available.length) return;
      target.addGaintag(available, "fan_yujie_tag");
      const give = await target.chooseCard("h", true, "羽结：交给伊法一张摸到的牌", card => available.includes(card))
        .set("ai", card => get.attitude(target, player) > 0 ? get.useful(card, player) - get.value(card, target) : -get.value(card, target)).forResult();
      const card = give.cards?.[0];
      if (!card || !target.getCards("h").includes(card) || !player.isIn()) return;
      const other = drawn.find(item => item !== card);
      await target.give(card, player);
      if (!player.getCards("h").includes(card)) return;
      player.addGaintag([card], "fan_yujie_tag");
      await player.showCards([card], "羽结");
      (player.storage.fan_yujie_pairs ||= []).push({ card, other, target });
    },
    onremove(player) { delete player.storage.fan_yujie_pairs; },
    subSkill: {
      reward: {
        audio: false, locked: false, forced: true, popup: false,
        trigger: { player: "useCardAfter" },
        filter(event, player) { return (player.storage.fan_yujie_pairs || []).some(pair => event.cards?.includes(pair.card)); },
        async content(event, trigger, player) {
          const pairs = player.storage.fan_yujie_pairs || [];
          const used = pairs.filter(pair => trigger.cards?.includes(pair.card));
          player.storage.fan_yujie_pairs = pairs.filter(pair => !used.includes(pair));
          for (const pair of used) {
            player.removeGaintag("fan_yujie_tag", [pair.card]);
            pair.target.removeGaintag("fan_yujie_tag", pair.other ? [pair.other] : []);
            if (pair.other && !pair.target.getCards("h").includes(pair.other) && player.isIn()) await player.draw(2);
          }
        },
      },
    },
  },
  fan_jijiu: {
    audio: false, locked: false, enable: "chooseToUse", position: "hes",
    viewAs: { name: "tao" },
    viewAsFilter(player) { return player !== _status.currentPhase && player.hasCards("hes", { color: "black" }); },
    filterCard(card, player) { return player !== _status.currentPhase && get.color(card, player) === "black"; },
    prompt: "将一张黑色牌当桃使用", prompt2: false,
    check(card) { return 15 - get.value(card); },
    ai: { threaten: 1.5, save: true, skillTagFilter(player) { return player !== _status.currentPhase && player.hasCards("hes", { color: "black" }); } },
  },
};
