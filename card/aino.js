import { lib, get, ui, game, _status } from "../../../noname.js";

export const duck = "fan_zhongquanchujiya";
export const duckOf = player => player.getCards("e").find(card => card.name === duck);
export const isAino = player => [player.name, player.name1, player.name2].includes("fan_aino");
export const canReceiveDuck = (player, card, replace = true) =>
  player.isIn() && !player.isMin() && (replace ? player.canEquip(card, true) : player.hasEmptySlot("equip1") && player.canEquip(card));

const discardable = (player, zone) =>
  player.getCards(zone, card => lib.filter.cardDiscardable(card, player, duck));

export const ainoCards = {
  [duck]: {
    derivation: "fan_aino",
    type: "equip",
    subtype: "equip1",
    distance: { attackFrom: -4 },
    fullskin: true,
    image: "ext:原神/image/card/fan_zhongquanchujiya-framed.png",
    destroy(card, position, player, event) {
      // 原生 equip 先将旧持有者的实体素材转入 special，再直接装备。
      return position !== "equip" && !(position === "special"
        && event?.type === "equip" && event.getParent().name === "equip");
    },
    async onEquip(event, trigger, player) {
      if (isAino(player)) return;
      const card = event.card.cards[0];
      const stillEquipped = () => player.isIn() && duckOf(player) === card;
      if (!stillEquipped()) return;
      const count = (card.fan_duck_previousDiscard || 0) + 1;
      delete card.fan_duck_previousDiscard;
      const equips = discardable(player, "e").filter(equip => equip !== card);
      let discarded = 0;
      if (equips.length) {
        const loss = player.discard(equips);
        await loss;
        discarded += loss.done?.es?.filter(item => equips.includes(item)).length || 0;
      }
      if (!stillEquipped()) return;
      const discard = "弃置" + count + "张手牌";
      const damage = "受到2点伤害并判定";
      const selection = player.chooseCard({
        position: "h",
        selectCard: [0, count],
        forced: true,
        prompt: "重拳出击鸭：弃置手牌，或受到2点伤害并判定，有可能弃置重拳出击鸭",
        prompt2: false,
        filterCard: item => discardable(player, "h").includes(item),
        filterOk: () => false,
        autochoose: () => false,
        custom: {
          add: {
            card() {
              const current = _status.event;
              if (current !== selection || !current.isMine()) return;
              if (!current.fanDuckControl) {
                current.fanDuckControl = ui.create.control(discard, damage, function (link) {
                  if (_status.event !== current || !stillEquipped()) return;
                  const cards = ui.selected.cards.slice();
                  if (link === discard && (cards.length !== count
                    || cards.some(item => !discardable(player, "h").includes(item)))) return;
                  current.result = { bool: true, cards: link === discard ? cards : [], control: link };
                  current.fanDuckControl.close();
                  game.uncheck();
                  if (ui.confirm) ui.confirm.close();
                  game.resume();
                });
              }
              current.fanDuckControl.classList.add("fan-skill-buttons");
              ui.updatec();
              const unavailable = ui.selected.cards.length !== count
                || ui.selected.cards.some(item => !discardable(player, "h").includes(item));
              const button = current.fanDuckControl.childNodes[0];
              button.classList.toggle("disabled", unavailable);
              button.style.opacity = unavailable ? "0.4" : "";
              button.style.pointerEvents = unavailable ? "none" : "";
              button.setAttribute("aria-disabled", String(unavailable));
            },
          },
          replace: {},
        },
        processAI() {
          const cards = discardable(player, "h").sort((a, b) => get.value(a, player) - get.value(b, player)).slice(0, count);
          const cost = cards.reduce((sum, item) => sum + get.value(item, player), 0);
          const preferDiscard = cards.length === count
            && 2 - get.damageEffect(player, null, player)
              * (player.hp + (player.hujia || 0) <= 2 ? 3 : 1) - cost > 1;
          return { bool: true, cards: preferDiscard ? cards : [], control: preferDiscard ? discard : damage };
        },
      });
      let choice;
      try {
        choice = await selection.forResult();
      } finally {
        selection.fanDuckControl?.close();
      }
      if (!stillEquipped()) return;
      if (choice.control === discard) {
        const cards = choice.cards || [];
        if (cards.length !== count || cards.some(item => !discardable(player, "h").includes(item))) return;
        await player.discard(cards);
        discarded += count;
      } else {
        await player.damage(2, "nosource");
        if (!stillEquipped()) return;
        const judged = await player.judge(duck, card => get.color(card) === "black"
          ? (get.attitude(player, player.getNext()) > 0 ? 1 : -1) : 0).forResult();
        if (judged.color === "black" && stillEquipped()) await player.discard(card, ui.discardPile);
      }
      if (!stillEquipped()) return;
      const next = player.getNext();
      if (next === player || !canReceiveDuck(next, card)) return;
      card.fan_duck_previousDiscard = discarded;
      try {
        await next.equip(card);
      } finally {
        delete card.fan_duck_previousDiscard;
      }
    },
    ai: { basic: { equipValue: 5 } },
  },
};

export const ainoCardTranslate = {
  [duck]: "重拳出击鸭",
  [duck + "_info"]: "锁定技，此牌进入你的装备区时，若你不是爱诺，你弃置装备区的其他牌，然后选择一项：弃置X张手牌（X为你的上家因此弃置的牌数+1）；或受到2点伤害并进行判定，若结果为黑色则将此牌弃置。选项结束后，你将此牌移动至下家的装备区（将对应栏位的原有装备置入弃牌堆）。",
};
