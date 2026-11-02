import { game, get, _status } from "../../../../noname.js";

const voices = {};
for (const [name, count] of [["fan_due_gain", 2], ["fan_due_give", 2], ["fan_huihai_voice", 3]]) {
  for (let i = 1; i <= count; i++) voices[name + i] = { audio: `ext:原神/audio/qiqi/skill/${name}${i}.mp3` };
}
export function talismanValue(player, target) {
  if (!target.isIn() || target.hasSkill("fan_due_zhenfu")) return 0;
  const injury = Math.max(0, target.maxHp - target.hp);
  const attack = target.countCards("h") > 0 ? 1 : .4;
  return get.attitude(player, target) * (injury ? Math.min(2, injury) * attack : .15);
}
export default {
  ...voices,
  fan_due: {
    audio: false, direct: true, locked: false,
    trigger: { player: "phaseDrawBegin1" },
    filter(event) { return !event.numFixed; },
    async content(event, trigger, player) {
      const answer = await player.chooseBool("你可以发动【度厄】")
        .set("prompt2", false).set("ai", () => trigger.num <= 2 || game.hasPlayer(t => talismanValue(player, t) > 2)).forResult();
      if (!answer.bool || !player.isIn()) return;
      trigger.changeToZero();
      player.logSkill("fan_due", null, null, null, []);
      const cards = get.cards(5);
      await game.cardsGotoOrdering(cards);
      try {
        await player.showCards(cards, "度厄");
        const black = cards.filter(c => get.color(c) === "black");
        const count = black.length;
        const available = black.filter(c => get.position(c, true) === "o");
        if (player.isIn() && available.length) {
          game.trySkillAudio(`fan_due_gain${[1, 2].randomGet()}`, player);
          await player.gain(available, "gain2");
        }
        if (!count || !player.isIn() || !game.hasPlayer(t => !t.hasSkill("fan_due_zhenfu"))) return;
        const result = await player.chooseTarget([1, count], "度厄：你可以选择获得真符的角色", (card, owner, target) => !target.hasSkill("fan_due_zhenfu"))
          .set("prompt2", false).set("fanPairedConfirm", true).set("manualConfirm", true)
          .set("ai", target => talismanValue(player, target)).forResult();
        if (!result.bool || !player.isIn()) return;
        const targets = result.targets.filter(t => t.isIn() && !t.hasSkill("fan_due_zhenfu")).slice(0, count).sortBySeat(_status.currentPhase || player);
        if (!targets.length) return;
        game.trySkillAudio(`fan_due_give${[1, 2].randomGet()}`, player);
        player.line(targets, "green");
        for (const target of targets) if (target.isIn() && !target.hasSkill("fan_due_zhenfu")) target.addSkill("fan_due_zhenfu");
      } finally {
        const remaining = cards.filter(c => get.position(c, true) === "o");
        if (remaining.length) await game.cardsDiscard(remaining);
      }
    },
    ai: { threaten: 1.3 },
  },
  fan_due_zhenfu: {
    charlotte: true, forced: true, popup: false, audio: false,
    mark: true, marktext: "符",
    intro: { content: "下次造成伤害后移除此真符，然后回复1点体力" },
    trigger: { source: "damageSource" },
    filter(event) { return event.num > 0; },
    async content(event, trigger, player) {
      if (!player.hasSkill("fan_due_zhenfu")) return;
      player.removeSkill("fan_due_zhenfu");
      if (player.isIn()) await player.recover();
    },
    ai: { effect: { player(card, player) {
      if (get.tag(card, "damage") && player.isDamaged()) return [1, .8];
    } } },
  },
  fan_huihai: {
    audio: false, direct: true, locked: false, limited: true,
    skillAnimation: true, animationColor: "water", forceDie: true,
    // Like mbmowang: reserve the death before mode callbacks can end the game;
    // actually enter rest only after the native death and card cleanup finish.
    trigger: { global: "dieBefore" },
    priority: 14,
    filter(event, player) {
      return !player.storage.fan_huihai_used && (player.isIn() || event.player === player)
        && event.player.maxHp > 0 && !event.reserveOut && !event.player.isRest()
        && event.getParent().name !== "giveup";
    },
    async content(event, trigger, player) {
      const target = trigger.player;
      const answer = await player.chooseBool(`你可以发动【回骸】，令${get.translation(target)}休整一轮`)
        .set("prompt2", false).set("forceDie", true)
        .set("ai", () => target === player || get.attitude(player, target) > 0).forResult();
      if (!answer.bool || player.storage.fan_huihai_used || trigger.reserveOut
        || target.maxHp <= 0 || target.isRest() || (!player.isIn() && target !== player)) return;
      player.storage.fan_huihai_used = true;
      player.awakenSkill("fan_huihai");
      player.logSkill("fan_huihai", target, null, null, []);
      // Native death cleanup removes mark nodes separately from permanent skills.
      if (target.hasSkill("fan_due_zhenfu")) trigger.excludeMark.add("fan_due_zhenfu");
      target.storage.fan_huihai_rest = { owner: player, pending: true };
      target.addSkill("fan_huihai_rest");
      trigger.fan_huihai_rest = true;
      trigger.reserveOut = true;
      trigger.noDieAudio = true;
    },
    ai: { threaten: 1.5, save: true, skillTagFilter(player) { return !player.storage.fan_huihai_used; } },
  },
  fan_huihai_rest: {
    charlotte: true, forced: true, silent: true, popup: false, audio: false,
    forceDie: true, forceOut: true,
    trigger: { player: ["dieBefore", "dieAfter", "restEnd"] },
    filter(event, player, name) {
      const state = player.storage.fan_huihai_rest;
      if (!state) return false;
      if (name === "dieBefore") return !!player.isRest();
      if (name === "dieAfter") return state.pending && event.fan_huihai_rest && event.reserveOut;
      return !!state.waiting;
    },
    async content(event, trigger, player) {
      const state = player.storage.fan_huihai_rest;
      if (!state) return;
      if (event.triggername === "dieBefore") {
        trigger.cancel();
      } else if (event.triggername === "dieAfter") {
        if (state.waiting || !state.pending || !trigger.fan_huihai_rest || !trigger.reserveOut) return;
        state.waiting = true;
        delete state.pending;
        game.trySkillAudio(`fan_huihai_voice${[1, 2, 3].randomGet()}`, state.owner);
        await player.rest({ type: "round", count: 1 });
      } else {
        if (!state.waiting || !player.isIn()) return;
        // Remove before changing HP/drawing: nested events cannot resolve twice.
        delete player.storage.fan_huihai_rest;
        player.removeSkill("fan_huihai_rest");
        const hp = Math.min(2, player.maxHp);
        if (player.hp !== hp) await player.changeHp(hp - player.hp);
        if (player.isIn()) await player.draw(2);
      }
    },
  },
};
