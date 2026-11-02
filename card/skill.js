import { game, get, ui, _status } from "../../../noname.js";
import mechanismSkills from "./mechanism-skills.js";

function conversion(suit, name, nature, tag) {
  return {
    equipSkill: true,
    locked: false, manualConfirm: true, fanPairedConfirm: true,
    enable: ["chooseToUse", "chooseToRespond"],
    position: "hes",
    selectCard: 1,
    filterCard(card, player) {
      return get.suit(card, player) === suit;
    },
    viewAs: nature ? { name, nature } : { name },
    viewAsFilter(player) {
      return player.countCards("hes", card => get.suit(card, player) === suit) > 0;
    },
    prompt: `将一张${{ diamond: "方块", heart: "红桃", club: "梅花", spade: "黑桃" }[suit]}牌当${nature ? "火杀" : { tao: "桃", shan: "闪", wuxie: "无懈可击" }[name]}使用或打出`,
    check(card) { return 7 - get.value(card); },
    ai: {
      [tag]: true,
      skillTagFilter(player) {
        return player.countCards("hes", card => get.suit(card, player) === suit) > 0;
      },
    },
  };
}

function fireConversion() {
  const base = conversion("diamond", "sha", "fire", "respondSha");
  const valid = (card, player) => player.getCards("hes").includes(card) && get.suit(card, player) === "diamond"
    && game.checkMod(card, player, "unchanged", "cardEnabled2", player) !== false;
  const allowed = (event, player, card) => valid(card, player)
    && event.filterCard(get.autoViewAs({ name: "sha", nature: "fire" }, [card]), player, event);
  return {
    equipSkill: true, locked: false, direct: true, enable: base.enable,
    filter: (event, player) => player.getCards("hes").some(card => allowed(event, player, card)),
    chooseButton: {
      dialog(event, player) {
        // 火属性由规则唯一确定；只要求选择尚未确定的实体素材。
        return ui.create.dialog("竹星：选择一张牌当【火杀】", [player.getCards("hes").filter(card => allowed(event, player, card)), "card"]);
      },
      select: [0, 1],
      filter(button, player) {
        _status.event.fanPairedConfirm = true;
        return allowed(_status.event.getParent(), player, button.link);
      },
      filterOk() {
        return ui.selected.buttons.length === 1 && allowed(_status.event.getParent(), _status.event.player, ui.selected.buttons[0].link);
      },
      check: button => 7 - get.value(button.link),
      backup(links) {
        const card = links[0];
        return {
          ...base, enable: undefined, direct: false, selectCard: -1,
          manualConfirm: _status.event.name !== "chooseToRespond",
          filterCard: (selected, player) => selected === card && valid(card, player),
          viewAsFilter: player => valid(card, player),
          filterOk: () => ui.selected.cards.length === 1 && ui.selected.cards[0] === card && valid(card, _status.event.player),
        };
      },
      prompt: () => "竹星：选择用牌目标",
    },
    ai: base.ai,
  };
}

export default {
  ...mechanismSkills,
  fan_zhuxing_skill: {
    equipSkill: true,
    group: ["fan_zhuxing_diamond", "fan_zhuxing_heart", "fan_zhuxing_club", "fan_zhuxing_spade"],
  },
  fan_zhuxing_diamond: fireConversion(),
  fan_zhuxing_heart: conversion("heart", "tao", null, "save"),
  fan_zhuxing_club: conversion("club", "shan", null, "respondShan"),
  fan_zhuxing_spade: conversion("spade", "wuxie", null, "respondWuxie"),
};
