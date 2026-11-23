import { game, get, lib } from "../../../../noname.js";

const unfinished = "fan_hundun_weijing";
const audio = "ext:原神/audio/durin/skill:3";
const silent = ["tao", "wuzhong", "taoyuan", "wugu"];
const ordering = card => get.position(card, true) === "o";

const colorMark = color => ["red", "black"].includes(color) ? `${unfinished}_${color}` : null;
const matching = use => colorMark(get.color(use.card));
const markIntro = name => ({ charlotte: true, marktext: name, intro: { name: `未竟（${name}）`, content: "mark" } });

async function discardForMark(player, cards) {
  const marks = cards.map(card => colorMark(get.color(card, false)));
  const move = game.cardsDiscard(cards);
  await move;
  if (!player.isIn()) return;
  // 以本次弃牌移动为准；之后取走弃牌不会改变已经获得的标记。
  for (const mark of marks) if (mark) player.addMark(mark, 1, false);
}

function extraTarget(use, player, target) {
  const { card, targets } = use;
  const info = get.info(card);
  if (!target.isIn() || targets.includes(target) || info.allowMultiple === false) return false;
  if (!lib.filter.targetEnabled(card, player, target) || !lib.filter.targetInRange(card, player, target)) return false;
  // The native use-card pipeline supplies the corresponding target after the primary target is added.
  return !info.singleCard || !info.filterAddedTarget ||
    game.hasPlayer(other => other.isIn() && info.filterAddedTarget(card, player, other, target));
}

export default {
  fan_hundun: {
    trigger: { player: "damageEnd", source: "damageSource" },
    audio,
    direct: true,
    group: [`${unfinished}_red`, `${unfinished}_black`],
    async content(event, trigger, player) {
      const confirm = await player.chooseBool("混沌：亮出牌堆顶两张牌，获得一张，弃置另一张并获得同色“未竟”")
        .set("prompt2", false).set("choice", true).forResult();
      if (!confirm.bool || !player.isIn()) return;
      player.logSkill("fan_hundun");
      const cards = get.cards(2);
      await game.cardsGotoOrdering(cards);
      const reveal = player.showCards(cards, "混沌").set("closeDialog", false);
      let available, chosen;
      try {
        await reveal;
        available = cards.filter(ordering);
        if (!available.length || !player.isIn()) return;
        const dialog = get.idDialog(reveal.videoId);
        const prompt = "混沌：选择获得的牌";
        const caption = dialog?.querySelector(".caption");
        if (caption) {
          dialog.setCaption(prompt);
          if (!globalThis.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
            caption.animate?.([{ opacity: 0.25 }, { opacity: 1 }], {
              duration: 200,
              easing: "ease-out",
            });
          }
        }
        const next = player.chooseButton([prompt, available], true)
          .set("manualConfirm", true)
          .set("filterButton", button => get.position(button.link, true) === "o")
          .set("ai", button => get.value(button.link, player) + available.reduce((value, card) => {
            const mark = card !== button.link && colorMark(get.color(card, false));
            return value + (mark ? 2 / (1 + player.countMark(mark)) : 0);
          }, 0));
        if (dialog) {
          next.set("createDialog", null).set("dialog", reveal.videoId);
        }
        const result = await next.forResult();
        chosen = result.links?.[0];
      } finally {
        if (reveal.videoId != null) game.broadcastAll("closeDialog", reveal.videoId);
      }
      if (!player.isIn() || !available.includes(chosen) || !ordering(chosen)) return;
      await player.gain(chosen, "gain2");
      const rest = available.filter(card => card !== chosen && ordering(card));
      if (rest.length && player.isIn()) {
        await discardForMark(player, rest);
      }
    },
  },
  fan_hundun_weijing_red: markIntro("红"),
  fan_hundun_weijing_black: markIntro("黑"),
  fan_suxing: {
    locked: true,
    forced: true,
    audio: false,
    trigger: { player: "useCard2" },
    filter(use, player) {
      return use.targets?.length > 0 && ["basic", "trick"].includes(get.type(use.card))
        && !!matching(use) && player.countMark(matching(use)) > 0;
    },
    async content(event, trigger, player) {
      const mark = matching(trigger);
      if (!mark || !player.countMark(mark)) return;
      player.removeMark(mark, 1, false);
      if (!silent.includes(trigger.card.name)) game.trySkillAudio("fan_suxing_voice", player, true);
      if (!player.isIn()) return;
      if (!game.hasPlayer(target => extraTarget(trigger, player, target))) {
        trigger.effectCount++;
        return;
      }
      const result = await player.chooseTarget("苏醒：选择额外目标", true,
        (card, owner, target) => extraTarget(trigger, owner, target))
        .set("manualConfirm", true)
        .set("ai", target => get.effect(target, trigger.card, player, player)).forResult();
      const target = result.targets?.[0];
      if (target && extraTarget(trigger, player, target)) trigger.targets.push(target);
    },
  },
  fan_suxing_voice: { audio },
  fan_zixu: {
    audio,
    direct: true,
    trigger: { player: "phaseJieshuBegin" },
    filter(event, player) {
      return !player.getHistory("sourceDamage").length && player.countCards("he") > 0;
    },
    async content(event, trigger, player) {
      const result = await player.chooseCard("he", "自叙：将一张牌置入弃牌堆，获得同色“未竟”")
        .set("prompt2", false).set("ai", card => {
          const mark = colorMark(get.color(card, false));
          return mark ? 5 - get.value(card, player) - Math.min(3, player.countMark(mark)) : -1;
        }).forResult();
      const card = result.cards?.[0];
      if (!result.bool || !player.isIn() || !player.getCards("he").includes(card)) return;
      const mark = colorMark(get.color(card, false));
      player.logSkill("fan_zixu");
      await player.loseToDiscardpile(card);
      if (mark && player.isIn()) player.addMark(mark, 1, false);
    },
  },
};
