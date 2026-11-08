import { game, get, ui } from "../../../../noname.js";

const uses = player => player.storage.fan_linji_round === game.roundNumber ? player.storage.fan_linji_count || 0 : 0;
function discarded(phase) {
  const cards = new Set();
  game.getGlobalHistory("cardMove", evt => {
    if (evt.name === "lose" && evt.type === "discard" && evt.getParent("phaseDiscard") === phase) {
      for (const card of evt.cards2 || []) if (get.position(card, true) === "d") cards.add(card);
    }
  });
  return [...cards];
}
function eligible(phase, player) {
  return phase.player !== player && player.isIn() && !player.getHistory("damage", evt => evt.source === phase.player && evt.num > 0).length;
}
function attackValue(player) {
  return Math.max(0, ...player.getCards("hs").filter(card => get.name(card, player) === "sha" && player.getCardUsable(card) > 0)
    .map(card => Math.max(0, ...game.filterPlayer(target => player.canUse(card, target, false)).map(target => get.effect(target, card, player, player)))));
}

export default {
  fan_liutian: {
    audio: "ext:原神/audio/ganyu/skill:4", logAudio: () => false,
    locked: false, chargeSkill: 2, group: "fan_liutian_sha",
    init(player) {
      if (!player.storage.fan_liutian_initialized) {
        player.storage.fan_liutian_initialized = true;
        player.addCharge(1, false);
      }
    },
    enable: "phaseUse", usable: 1,
    filter(event, player) { return player.countCharge() >= 1; },
    async content(event, trigger, player) {
      if (player.countCharge() < 1 || !player.isIn()) return;
      player.removeCharge(1);
      player.addTempSkill("fan_liutian_ready", "phaseAfter");
      game.trySkillAudio("fan_liutian", player, true);
    },
    ai: { order: 8, result: { player: player => attackValue(player) > 0 ? 1 : 0 } },
  },
  fan_liutian_sha: {
    audio: "ext:原神/audio/ganyu/skill:3", locked: false,
    trigger: { player: "useCardToPlayered" }, forced: true, silent: true, popup: false,
    filter(event) { return event.isFirstTarget && event.getParent().fan_liutian_enhanced && !event.getParent().fan_liutian_voiced; },
    async content(event, trigger, player) {
      trigger.getParent().fan_liutian_voiced = true;
      game.trySkillAudio("fan_liutian_sha", player, true);
    },
  },
  fan_liutian_ready: {
    charlotte: true, locked: false, mark: true, marktext: "霜",
    intro: { content: "本回合下一张杀无距离限制且伤害+1" },
    mod: { targetInRange(card) { if (card.name === "sha") return true; } },
    trigger: { player: "useCard" }, forced: true, silent: true, popup: false,
    filter(event) { return event.card.name === "sha"; },
    async content(event, trigger, player) {
      // 只修改本次useCard，不影响嵌套的另一张杀；取消目标也不返还。
      trigger.baseDamage++;
      trigger.fan_liutian_enhanced = true;
      player.removeSkill("fan_liutian_ready");
    },
    ai: { effect: { player(card, player, target) {
      if (card.name === "sha") return [1, get.damageEffect(target, player, player) / 2];
    } } },
  },
  fan_linji: {
    audio: "ext:原神/audio/ganyu/skill:3", logAudio: () => false,
    locked: false, direct: true, trigger: { global: "phaseZhunbeiBegin" },
    filter(event, player) { return event.player !== player && event.player.isIn() && uses(player) < 1; },
    async content(event, trigger, player) {
      const target = trigger.player;
      if (!player.isIn() || !target.isIn() || target === player || uses(player) >= 1) return;
      const result = await player.chooseButton(["你可以发动【麟迹】，选择一项", [[["draw", "摸牌"], ["charge", "获得蓄力点"]], "textbutton"]])
        .set("prompt2", false).set("manualConfirm", true).set("fanPairedConfirm", true)
        .set("selectButton", [0, 1]).set("filterOk", () => ui.selected.buttons.length === 1)
        .set("filterButton", button => button.link !== "charge" || player.countCharge(true) > 0)
        .set("ai", button => {
          if (button.link === "charge") {
            if (player.countCharge(true) <= 0) return -Infinity;
            if (player.hp <= 1 && player.countCards("h") <= 1) return 0.5;
            return player.countCards("hs", card => get.name(card, player) === "sha") ? (player.countCharge() === 0 ? 3 : 1.5) : 0.5;
          }
          return 2;
        }).forResult();
      const choice = result.links?.[0];
      if (!result.bool || !["draw", "charge"].includes(choice) || !player.isIn() || !target.isIn() || uses(player) >= 1 || (choice === "charge" && player.countCharge(true) <= 0)) return;
      player.storage.fan_linji_count = uses(player) + 1;
      player.storage.fan_linji_round = game.roundNumber;
      // 原生Audio仅在args存在时调用logAudio；显式传空数组抑制日志播音。
      player.logSkill("fan_linji", target, null, null, []);
      if (choice === "charge") {
        const before = player.countCharge();
        player.addCharge(1);
        if (player.countCharge() > before) game.trySkillAudio("fan_linji", player, true);
      } else {
        game.trySkillAudio("fan_linji", player, true);
        await player.draw();
      }
      if (!player.isIn() || !target.isIn()) return;
      player.addTempSkill("fan_linji_distance", "phaseAfter");
      player.markAuto("fan_linji_distance", [target]);
    },
  },
  fan_linji_distance: {
    charlotte: true, locked: false, onremove: true,
    mod: {
      globalTo(from, to, distance) { if (to.getStorage("fan_linji_distance").includes(from)) return distance + 1; },
      targetEnabled(card, player, target) {
        if (card.name === "shunshou" && target.getStorage("fan_linji_distance").includes(player)) return false;
      },
    },
  },
  fan_xingzuo: {
    audio: "ext:原神/audio/ganyu/skill:4", logAudio: () => false,
    locked: false, direct: true, trigger: { global: "phaseDiscardEnd" },
    filter(event, player) { return eligible(event, player) && discarded(event).length > 0; },
    async content(event, trigger, player) {
      const cards = discarded(trigger);
      if (!eligible(trigger, player) || !cards.length) return;
      const result = await player.chooseButton(["你可以发动【星佐】，获得一张牌", cards])
        .set("prompt2", false).set("manualConfirm", true).set("fanPairedConfirm", true)
        .set("selectButton", [0, 1]).set("filterOk", () => ui.selected.buttons.length === 1)
        .set("filterButton", button => get.position(button.link, true) === "d")
        .set("ai", button => get.value(button.link, player)).forResult();
      const card = result.links?.[0];
      if (!result.bool || !cards.includes(card) || get.position(card, true) !== "d" || !eligible(trigger, player)) return;
      player.logSkill("fan_xingzuo", null, null, null, []);
      game.trySkillAudio("fan_xingzuo", player, true);
      await player.gain(card, "gain2");
    },
  },
};
