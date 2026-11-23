import { game, ui, get } from "../../../../noname.js";
export default {
 fan_shenqian: {
  audio: false, locked: false, forced: true,
  trigger: { player: "useCardToPlayered", target: "useCardToTargeted" },
  filter(event, player, name) { return name === "useCardToTargeted" || event.isFirstTarget; },
  async content(event, trigger, player) {
   if (event.triggername === "useCardToTargeted") { await player.draw(); return; }
   const cards = get.bottomCards(3, true);
   if (!cards.length || !player.isIn()) return;
   const result = await player.chooseButton(["深潜：选择一张牌置于牌堆顶", cards], true)
    .set("ai", button => {
     const receiver = trigger.targets?.includes(player) ? player : player.next;
     const judge = receiver.getCards("j")[0];
     return get.attitude(player, receiver) * (judge ? get.judge(judge)(button.link) * 3 : get.value(button.link, receiver));
    }).forResult();
   const card = result.links?.[0];
   if (!card || !cards.includes(card) || card.parentNode !== ui.cardPile || !player.isIn()) return;
   ui.cardPile.insertBefore(card, ui.cardPile.firstChild);
   game.updateRoundNumber();
   game.log(player, "将一张牌置于牌堆顶");
  },
  ai: { effect: { target(card) { if (get.type(card) !== "equip") return [1, 0.8]; } } },
 },
};
