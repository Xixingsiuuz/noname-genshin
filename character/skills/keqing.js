import { game, get, ui } from "../../../../noname.js";

const available = player => !player.hasSkill("fan_leili_used");
const equipment = (card, player) => get.type(card, null, player) === "equip";
const candidates = () => Array.from(ui.discardPile.childNodes).filter(card => get.color(card, false) === "black");
function consume(result, player) {
  player.addTempSkill("fan_leili_used", { global: "phaseBefore" });
}

export default {
  fan_kejuan: {
    locked: false, direct: true,
    audio: "ext:原神/audio/keqing/skill:2",
    trigger: { player: "phaseJieshuBegin" },
    filter: () => candidates().length > 0,
    async content(event, trigger, player) {
      const answer = await player.chooseBool("你可以发动【苛捐】")
        .set("prompt2", false).set("choice", true).forResult();
      if (!answer.bool || !player.isIn()) return;
      const cards = candidates().randomGets(3);
      if (!cards.length) return;
      player.logSkill("fan_kejuan");
      // 仅展示弃牌堆快照，不移动未选牌，也不改变弃牌堆牌序。
      const result = await player.chooseButton(["苛捐：获得一张牌", cards], true)
        .set("filterButton", button => get.position(button.link, true) === "d")
        .set("ai", button => get.value(button.link, player)).forResult();
      const card = result.links?.[0];
      if (player.isIn() && cards.includes(card) && get.position(card, true) === "d") await player.gain(card, "gain2");
    },
    ai: { threaten: 1.2 },
  },
  fan_leili: {
    locked: false,
    audio: "ext:原神/audio/keqing/skill:2",
    enable: ["chooseToUse", "chooseToRespond"],
    position: "he", selectCard: 1,
    filterCard: (card, player) => available(player) && player.getCards("he").includes(card) && equipment(card, player),
    viewAs: { name: "sha", nature: "thunder", storage: { fan_leili: true } },
    viewAsFilter: player => available(player) && player.countCards("he", card => equipment(card, player)) > 0,
    prompt: "雷厉：将一张装备牌当雷杀使用或打出", prompt2: false,
    check(card) { return 6 - get.value(card, get.player()); },
    onuse: consume, onrespond: consume,
    group: "fan_leili_refund",
    mod: {
      cardUsable(card, player) {
        if (card.name !== "sha" || !card.storage?.fan_leili || !available(player)) return;
        const cards = card.cards || [];
        // 原生 filterEnable 用 unsure 虚拟牌检查按钮资格，此时尚未选择素材。
        if (!cards.length && card.suit === "unsure" && player.countCards("he", item => equipment(item, player))) return Infinity;
        if (cards.length === 1 && player.getCards("he").includes(cards[0]) && equipment(cards[0], player)) return Infinity;
      },
    },
    ai: {
      order: 5.5, respondSha: true,
      skillTagFilter(player) { return available(player) && player.countCards("he", card => equipment(card, player)) > 0; },
    },
    subSkill: {
      used: { charlotte: true },
      refund: {
        locked: false, forced: true, popup: false, audio: false,
        trigger: { player: "useCard1" },
        filter: event => event.skill === "fan_leili" && event.card.name === "sha" && event.card.storage?.fan_leili
          && event.addCount !== false,
        async content(event, trigger, player) {
          trigger.addCount = false;
          const stat = player.getStat("card");
          if (stat.sha > 0) stat.sha--;
        },
      },
    },
  },
  fan_yuheng: {
    locked: true, forced: true,
    audio: "ext:原神/audio/keqing/skill:2",
    trigger: { target: "useCardToTargeted" },
    filter: event => ["shunshou", "guohe"].includes(event.card.name),
    async content(event, trigger, player) { trigger.getParent().excluded.add(player); },
    ai: { effect: { target(card) { if (["shunshou", "guohe"].includes(card.name)) return "zerotarget"; } } },
  },
};
