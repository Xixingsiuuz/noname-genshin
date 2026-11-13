import { game, get, ui } from "../../../../noname.js";
const play = (branch, player) => game.trySkillAudio(branch, player, true, true);
const pool = (name, count) => ({
  charlotte: true,
  audio: Array.from({ length: count }, (_, i) => `ext:原神/audio/alhaitham/skill/${name}${i + 1}.ogg`),
});
export default {
  fan_zhengyan_voice: pool("fan_zhengyan_voice", 5),
  fan_jipin_draw: pool("fan_jipin_draw", 2),
  fan_jipin_give: pool("fan_jipin_give", 2),
  fan_zhengyan: {
    audio: false, locked: true, forced: true,
    trigger: { player: "useCard" },
    filter: (event, player) => get.color(event.card, player) === "black",
    async content(event, trigger, player) {
      const type = get.type(trigger.card);
      if ((type === "trick" || type === "basic" && !["shan", "tao", "jiu", "du"].includes(trigger.card.name))
          && game.hasPlayer(current => current !== player && !trigger.directHit.includes(current))) {
        play("fan_zhengyan_voice", player);
      }
      trigger.directHit.addArray(game.players);
    },
    group: "fan_zhengyan_damage",
    ai: { directHit_ai: true, skillTagFilter(player, tag, arg) { return get.color(arg.card, player) === "black"; } },
    subSkill: {
      damage: {
        audio: false, locked: true, forced: true,
        trigger: { source: "damageBegin1" },
        filter: (event, player) => event.card && get.color(event.card, player) === "red",
        async content(event, trigger, player) { trigger.num++; play("fan_zhengyan_voice", player); },
        ai: { damageBonus: true },
      },
    },
  },
  fan_jipin: {
    audio: false, locked: false, enable: "phaseUse", usable: 1,
    selectCard: [0, 1], position: "h", discard: false, lose: false, delay: false,
    filterCard: card => get.name(card) === "tao",
    selectTarget: [0, 1],
    filterTarget: (card, player, target) => target !== player && target.isDamaged(),
    filterOk: () => ui.selected.cards.length === ui.selected.targets.length,
    manualConfirm: true, fanPairedConfirm: true,
    prompt: "济贫：摸一张牌；或把桃交给受伤的其他角色",
    async content(event, trigger, player) {
      const card = event.cards?.[0], target = event.targets?.[0];
      if (!card && !target) { play("fan_jipin_draw", player); await player.draw(); return; }
      if (!card || !target?.isIn() || !target.isDamaged() || !player.getCards("h").includes(card) || get.name(card, player) !== "tao") return;
      play("fan_jipin_give", player);
      await player.give(card, target);
      if (player.isIn()) await player.draw(3);
    },
    check(card) { return 8 - get.value(card); },
    ai: {
      order: 8,
      result: {
        player(player) { return ui.selected.cards.length ? 3 - get.value(ui.selected.cards[0], player) / 3 : 1; },
        target: 2,
      },
    },
  },
};

