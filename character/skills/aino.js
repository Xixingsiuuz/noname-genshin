import { game, get, lib, ui, _status } from "../../../../noname.js";
import { duck, duckOf, canReceiveDuck } from "../../card/aino.js";

const fieldDuck = () => game.findPlayer(player => duckOf(player));
const cost = (player, target) => Math.max(1, get.distance(player, target));
const canPay = (card, player) => lib.filter.cardDiscardable(card, player, "fan_chongya");

const inDiscardPile = card => !card._selfDestroyed && get.position(card, true) === "d";

const payableCards = player => player.getCards("he", card => card.name !== duck && canPay(card, player));

function moveValue(player, target) {
  const attitude = get.attitude(player, target);
  const next = target.getNext();
  const nextAttitude = next !== player && canReceiveDuck(next, { name: duck }) ? get.attitude(player, next) : 0;
  const harm = 2 + target.countCards("e") + (target.hp + (target.hujia || 0) <= 2 ? 1 : 0);
  return -attitude * harm / 3 - nextAttitude / 6;
}

function preferredCost(player) {
  const holder = fieldDuck();
  if (!holder) return 0;
  const cards = payableCards(player).map(card => Math.max(0.2, get.value(card, player) / 3)).sort((a, b) => a - b);
  let best = 0;
  let count = 0;
  for (const target of game.filterPlayer()) {
    if (target === player || target === holder || !canReceiveDuck(target, duckOf(holder))) continue;
    const distance = cost(player, target);
    if (distance > cards.length) continue;
    const gain = moveValue(player, target) - cards.slice(0, distance).reduce((sum, value) => sum + value, 0);
    if (gain > best) {
      best = gain;
      count = distance;
    }
  }
  return count;
}

function discardedEquips(event) {
  if (event.position === ui.discardPile && event.es) {
    return event.es.filter(inDiscardPile);
  }
  if (event.name === "loseAsync") {
    return game.filterPlayer().flatMap(player => {
      const loss = event.getl(player);
      return (loss?.es || []).filter(inDiscardPile);
    });
  }
  return [];
}

export default {
  fan_miaoxie: {
    trigger: { global: ["loseAfter", "loseAsyncAfter"] },
    forced: true,
    locked: false,
    filter: event => discardedEquips(event).length > 0,
    async content(event, trigger, player) {
      await player.draw(discardedEquips(trigger).length);
    },
  },
  fan_chongya: {
    locked: true,
    trigger: { player: "phaseZhunbeiBegin" },
    forced: true,
    filter: (event, player) => !fieldDuck() && canReceiveDuck(player, { name: duck }, false),
    async content(event, trigger, player) {
      if (!fieldDuck() && canReceiveDuck(player, { name: duck }, false)) {
        await player.equip(game.createCard(duck, "spade", 5));
      }
    },
    group: "fan_chongya_move",
    subSkill: {
      move: {
        locked: true,
        enable: "phaseUse",
        usable: 1,
        position: "he",
        discard: false,
        lose: false,
        delay: false,
        manualConfirm: true,
        fanPairedConfirm: true,
        complexSelect: true,
        selectCard: [0, Infinity],
        selectTarget: [0, 1],
        filter(event, player) {
          const holder = fieldDuck();
          return holder && game.hasPlayer(target => target !== player && target !== holder
            && canReceiveDuck(target, duckOf(holder)) && payableCards(player).length >= cost(player, target));
        },
        filterCard(card, player) {
          const target = ui.selected.targets[0];
          return card.name !== duck && canPay(card, player)
            && (!target || ui.selected.cards.length < cost(player, target));
        },
        filterTarget(card, player, target) {
          const holder = fieldDuck();
          return holder && target !== player && target !== holder && canReceiveDuck(target, duckOf(holder))
            && ui.selected.cards.length <= cost(player, target)
            && payableCards(player).length >= cost(player, target);
        },
        filterOk() {
          return ui.selected.targets.length === 1
            && ui.selected.cards.length === cost(_status.event.player, ui.selected.targets[0]);
        },
        prompt: "冲鸭：选择转移装备的目标角色并弃置等同于距离的牌",
        async content(event, trigger, player) {
          const { target, cards } = event;
          const holder = fieldDuck();
          const card = holder && duckOf(holder);
          if (!card || !canReceiveDuck(target, card) || cards.length !== cost(player, target)
            || cards.some(item => !player.getCards("he").includes(item) || !canPay(item, player))) return;
          const payment = player.discard(cards);
          await payment;
          if (payment.done?.cards2?.length === cards.length && duckOf(holder) === card && canReceiveDuck(target, card)) await target.equip(card);
        },
        check(card) {
          const player = _status.event.player;
          return ui.selected.cards.length < preferredCost(player) ? 100 - get.value(card, player) : 0;
        },
        ai: {
          order: 7,
          result: {
            player(player) { return preferredCost(player) ? 1 : 0; },
            target(player, target) {
              if (ui.selected.cards.length !== cost(player, target)) return 0;
              return moveValue(player, target) / (get.attitude(player, target) || 1);
            },
          },
        },
      },
    },
  },
};
