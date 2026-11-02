import { game, get, ui } from "../../../../noname.js";

const tag = "fan_yuxiu";
const sleeves = player => player.getCards("s", card => card.hasGaintag(tag));
const attacks = () => [undefined, "thunder", "fire"].map(nature => ({
  name: "sha", nature, storage: { fan_feiren: true },
}));
const validSleeve = (card, player) => sleeves(player).includes(card)
  && game.checkMod(card, player, "unchanged", "cardEnabled2", player) !== false;
const legalAttack = (player, target, nature, material) => target.isIn()
  && (!material || validSleeve(material, player))
  && player.canUse({ name: "sha", nature, cards: material ? [material] : [],
    storage: { fan_feiren: true } }, target, false);
const lostSleeves = (event, player) => {
  const loss = event.getl?.(player);
  return (loss?.ss || []).filter(card => loss.gaintag_map?.[card.cardid]?.includes(tag));
};

export default {
  fan_yuxiu: {
    trigger: { player: "phaseDiscardBegin" },
    popup: false,
    locked: false,
    filter(event, player) {
      const suits = sleeves(player).map(card => get.suit(card, false));
      return player.countCards("h", card => !suits.includes(get.suit(card, player))) > 0;
    },
    // 选牌本身就是发动选择，取消时不进入技能结算。
    async cost(event, trigger, player) {
      event.result = await player.chooseCard("h", [1, 4], "羽袖：选择要置为“袖”的手牌",
        "将花色各不相同的任意张手牌置于武将牌上，称为“袖”",
        (card, player) => !sleeves(player).some(other => get.suit(other, false) === get.suit(card, player))
          && !ui.selected.cards.some(other => get.suit(other, player) === get.suit(card, player))
      ).set("complexCard", true).set("ai", card => 7 - get.value(card)).forResult();
    },
    async content(event, trigger, player) {
      player.logSkill("fan_yuxiu");
      const next = player.loseToSpecial(event.cards, tag);
      next.visible = true;
      await next;
      player.markSkill(tag);
    },
    marktext: "袖",
    intro: {
      mark(dialog, storage, player) { dialog.addAuto(sleeves(player)); },
      markcount(storage, player) { return sleeves(player).length; },
    },
    onremove(player) {
      const cards = sleeves(player);
      if (cards.length) player.loseToDiscardpile(cards);
    },
    // 袖位于特殊牌区（s），原版丈八蛇矛的 hs 选牌范围已包含袖。
    group: "fan_yuxiu_gain",
    subSkill: {
      gain: {
        trigger: {
          player: "loseAfter",
          global: ["equipAfter", "addJudgeAfter", "gainAfter", "loseAsyncAfter", "addToExpansionAfter"],
        },
        forced: true,
        charlotte: true,
        filter(event, player) {
          return event.getlx !== false && lostSleeves(event, player).length > 0;
        },
        async content(event, trigger, player) {
          const lost = lostSleeves(trigger, player);
          // 一次失去多张袖：每张分别补一张；失去最后的袖仅获得1点护甲。
          const emptied = sleeves(player).length === 0;
          const cards = [];
          for (const sleeve of lost) {
            const suit = get.suit(sleeve, false);
            const card = get.cardPile2(card => !cards.includes(card) && get.suit(card, false) === suit);
            if (card) cards.push(card);
          }
          if (sleeves(player).length) player.markSkill(tag);
          else player.unmarkSkill(tag);
          if (cards.length) await player.gain(cards, "gain2");
          game.updateRoundNumber();
          if (emptied && player.isIn()) await player.changeHujia(1, "gain", 5);
        },
      },
    },
  },
  fan_feiren: {
    trigger: { global: "phaseZhunbeiBegin" },
    round: 1,
    popup: false,
    locked: false,
    filter(event, player) {
      return event.player !== player && event.player.isIn() && sleeves(player).length > 0
        && attacks().some(card => player.canUse(card, event.player, false));
    },
    async cost(event, trigger, player) {
      event.result = { bool: false };
      const options = attacks().filter(card => player.canUse(card, trigger.player, false))
        .map(card => ["基本", "", "sha", card.nature]);
      if (!options.length) return;
      // 牌名在对话框选择，素材直接从底部特殊牌区选择，共用一次确认。
      const choice = await player.chooseButton([
        `是否将一张“袖”当杀对${get.translation(trigger.player)}使用`,
        [options, "vcard"],
      ]).set("selectButton", [0, 1])
        .set("position", "s")
        .set("selectCard", [0, 1])
        .set("complexCard", true)
        .set("filterCard", card => {
          if (!validSleeve(card, player)) return false;
          const attack = ui.selected.buttons[0]?.link;
          return attack ? legalAttack(player, trigger.player, attack[3], card)
            : options.some(option => legalAttack(player, trigger.player, option[3], card));
        })
        .set("ai1", card => 7 - get.value(card))
        .set("complexSelect", true)
        .set("manualConfirm", true)
        .set("fanPairedConfirm", true)
        .set("filterButton", button => {
          return legalAttack(player, trigger.player, button.link[3], ui.selected.cards[0]);
        })
        .set("filterOk", () => {
          return ui.selected.buttons.length === 1 && ui.selected.cards.length === 1
            && legalAttack(player, trigger.player, ui.selected.buttons[0].link[3], ui.selected.cards[0]);
        })
        .set("ai", button => Array.isArray(button.link)
          ? get.effect(trigger.player, { name: "sha", nature: button.link[3],
            storage: { fan_feiren: true } }, player, player)
          : 7 - get.value(button.link))
        .set("processAI", () => {
          let best, score = 0;
          for (const material of sleeves(player)) {
            for (const option of options) {
              if (!legalAttack(player, trigger.player, option[3], material)) continue;
              const value = get.effect(trigger.player, { name: "sha", nature: option[3],
                cards: [material], storage: { fan_feiren: true } }, player, player);
              const current = value > 0 ? value + (7 - get.value(material)) / 100 : 0;
              if (current > score) { score = current; best = { bool: true, links: [option], cards: [material] }; }
            }
          }
          return best || { bool: false };
        })
        .forResult();
      if (!choice.bool) return;
      const names = choice.links || [], materials = choice.cards || [];
      if (names.length !== 1 || materials.length !== 1
        || !legalAttack(player, trigger.player, names[0][3], materials[0])) return;
      event.result = { bool: true, cards: materials, cost_data: names[0][3] };
    },
    async content(event, trigger, player) {
      const card = { name: "sha", nature: event.cost_data, storage: { fan_feiren: true } };
      if (event.cards?.length !== 1
        || !legalAttack(player, trigger.player, event.cost_data, event.cards[0])) return;
      player.logSkill("fan_feiren", trigger.player);
      // 属性保存在虚拟牌上，避免给同一时段的其他杀附加无视防具。
      await player.useCard(card, event.cards, trigger.player, false);
    },
    ai: {
      unequip: true,
      skillTagFilter(player, tag, arg) {
        return arg?.card?.name === "sha" && arg.card.storage?.fan_feiren === true;
      },
    },
  },
};
