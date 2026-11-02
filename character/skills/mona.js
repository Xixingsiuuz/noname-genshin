import { game, get, _status } from "../../../../noname.js";

// All five cards must return to the top; native guanxing also allows bottoming.
export function mirrorOrder(cards, player, ending) {
  const pool = cards.slice(), top = [];
  const target = ending ? player.next : player;
  const attitude = Math.sign(get.attitude(player, target));
  for (const judgeCard of target.getCards("j")) {
    if (!pool.length) break;
    const judge = get.judge(judgeCard);
    pool.sort((a, b) => attitude * (judge(b) - judge(a)));
    top.push(pool.shift());
  }
  pool.sort((a, b) => attitude * (get.value(b, target) - get.value(a, target)));
  return top.concat(pool);
}
async function resolveMirror(player, choice, ending) {
  if (!player.isIn()) return;
  game.trySkillAudio("fan_shuijing", player);
  if (choice === "摸牌") { await player.draw(); return; }
  const cards = get.cards(5);
  await game.cardsGotoOrdering(cards);
  try {
    const result = await player.chooseToMove(true)
      .set("prompt", "水镜：排列牌堆顶的牌（左侧为第一张）")
      .set("list", [["牌堆顶", cards]])
      .set("filterOk", moved => moved.length === 1 && moved[0].length === cards.length && new Set(moved[0]).size === cards.length && cards.every(c => moved[0].includes(c)))
      .set("processAI", list => [mirrorOrder(list[0][1], player, ending)]).forResult();
    const ordered = result?.moved?.[0];
    const valid = ordered?.length === cards.length && new Set(ordered).size === cards.length && cards.every(c => ordered.includes(c));
    const top = (valid ? ordered : cards).filter(c => get.position(c, true) === "o");
    if (top.length) {
      await game.cardsGotoPile(top.slice().reverse(), "insert");
      game.addCardKnower(top, player);
    }
  } finally {
    const remaining = cards.filter(c => get.position(c, true) === "o");
    if (remaining.length) await game.cardsGotoPile(remaining.slice().reverse(), "insert");
    game.updateRoundNumber();
  }
}
export default {
  fan_jiliu: {
    audio: "ext:原神/audio/mona/skill:3", forced: true, locked: false,
    trigger: { target: "useCardToTargeted" },
    filter(event, player) { return event.player !== player; },
    async content(event, trigger, player) {
      player.addTempSkill("fan_jiliu_distance", { player: "phaseAfter" });
      player.addMark("fan_jiliu_distance", 1, false);
    },
    ai: { threaten: .8, effect: { target(card, source, target) {
      // Small future protection benefit; do not nullify this card's real effect.
      if (source !== target && get.attitude(source, target) < 0) return [1, .15];
    } } },
  },
  fan_jiliu_distance: {
    charlotte: true, locked: false, onremove: true, mark: true, marktext: "流",
    intro: { content: "其他角色计算与你的距离+#，直到你的回合结束" },
    // Persistent consequence; suppressing Jiliu prevents new stacks, not old ones.
    mod: { globalTo(from, to, distance) { if (from !== to) return distance + to.countMark("fan_jiliu_distance"); } },
  },
  fan_shuijing: {
    audio: "ext:原神/audio/mona/skill:3", direct: true, locked: false,
    trigger: { player: "phaseZhunbeiBegin" },
    async content(event, trigger, player) {
      const result = await player.chooseControl("观看牌堆顶", "摸牌", "取消")
        .set("prompt", "你可以发动【水镜】，选择一项").set("prompt2", false)
        .set("ai", () => {
          // Setup judgments/draws first unless immediate survival needs a card.
          if (player.hp <= 1 && !player.countCards("h", c => ["tao", "jiu"].includes(get.name(c)))) return 1;
          return 0;
        }).forResult();
      if (!["观看牌堆顶", "摸牌"].includes(result.control) || !player.isIn()) return;
      player.logSkill("fan_shuijing", null, null, null, []);
      player.addTempSkill("fan_shuijing_end", { player: "phaseAfter" });
      (player.storage.fan_shuijing_end ||= []).push(result.control === "摸牌" ? "观看牌堆顶" : "摸牌");
      await resolveMirror(player, result.control, false);
    },
    logAudio() { return []; },
    ai: { guanxing: true, threaten: 1.2 },
  },
  fan_shuijing_end: {
    charlotte: true, locked: false, forced: true, popup: false, audio: false, onremove: true,
    trigger: { player: "phaseJieshuBegin" },
    filter(event, player) { return !!player.storage.fan_shuijing_end?.length; },
    async content(event, trigger, player) {
      const pending = player.storage.fan_shuijing_end?.slice() || [];
      delete player.storage.fan_shuijing_end;
      for (const choice of pending) {
        if (!player.isIn()) break;
        await resolveMirror(player, choice, true);
      }
    },
  },
};
