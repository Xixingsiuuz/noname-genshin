import { selectConversionMaterial } from "../../ui/conversion-material.js";
import { lib, game, get, ui, _status } from "../../../../noname.js";

const available = player => player.countCharge() > 0 && !player.hasSkill("fan_miyuan_used");
const options = (event, player) => get.zhinangs().filter(name =>
  (event._backup?.filterCard || event.filterCard)({ name }, player, event));
export default {
  fan_wentai: {
    audio: "ext:原神/audio/ineffa/skill:2",
    trigger: { player: "phaseJieshuBegin" },
    direct: true,
    async content(event, trigger, player) {
      const score = (target, effect) => {
        const armor = Math.max(0, Math.min(1, 5 - target.hujia));
        const equips = Math.min(2, Array.from(ui.discardPile.childNodes).filter(card =>
          get.type(card, false) === "equip" && target.canEquip(card, false) && target.canUse(card, target)).length);
        return get.attitude(player, target) * (effect === "armor" ? armor : equips * 1.5);
      };
      const result = await player.chooseButtonTarget({
        createDialog: ["稳态：选择角色和效果", [[["armor", "获得护甲"], ["equip", "使用装备"]], "tdnodes"]],
        selectButton: [0, 1], selectTarget: 1,
        // 本地操作先选目标；AI原生流程先评估按钮，再评估目标。
        filterButton: () => !_status.event.isMine() || ui.selected.targets.length === 1,
        complexSelect: true,
        manualConfirm: true, fanPairedConfirm: true,
        filterTarget: () => true,
        filterOk: () => ui.selected.buttons.length === 1 && ui.selected.targets.length === 1,
        ai1: button => Math.max(...game.filterPlayer(() => true).map(target => score(target, button.link)
          + (target !== player ? score(player, button.link === "armor" ? "equip" : "armor") : 0))),
        ai2: target => {
          const effect = ui.selected.buttons[0]?.link;
          if (!effect) return Math.max(score(target, "armor"), score(target, "equip"));
          return score(target, effect) + (target !== player ? score(player, effect === "armor" ? "equip" : "armor") : 0);
        },
      }).forResult();
      if (!result.bool) return;
      const target = result.targets?.[0], effect = result.links?.[0];
      if (!target?.isIn() || !["armor", "equip"].includes(effect)) return;
      player.logSkill("fan_wentai", target);
      const execute = async (recipient, choice) => {
        if (!recipient.isIn()) return;
        if (choice === "armor") {
          await recipient.changeHujia(1, "gain", 5);
          return;
        }
        const attempted = new Set();
        for (let count = 0; count < 2 && recipient.isIn(); count++) {
          const cards = Array.from(ui.discardPile.childNodes).filter(card => !attempted.has(card)
            && get.type(card, false) === "equip" && recipient.canEquip(card, false) && recipient.canUse(card, recipient));
          if (!cards.length) break;
          const card = cards.randomGet();
          attempted.add(card);
          await recipient.chooseUseTarget({ card, forced: true, nopopup: true });
        }
      };
      await execute(target, effect);
      if (target !== player) await execute(player, effect === "armor" ? "equip" : "armor");
    },
  },
  fan_miyuan: {
    chargeSkill: 4,
    locked: false,
    init(player) { player.addCharge(1, false); },
    enable: "chooseToUse",
    direct: true,
    filter: (event, player) => available(player) && player.countCards("e") > 0 && options(event, player).length > 0,
    hiddenCard: (player, name) => available(player) && player.countCards("e") > 0 && get.zhinangs().includes(name),
    mod: {
      maxHandcard(player, num) {
        return num + player.countCards("e");
      },
    },
    chooseButton: {
      dialog: (event, player) => ui.create.dialog("秘源：选择一张装备和智囊牌名", [options(event, player), "vcard"]),
      select: [0, 1],
      filter() {
        const event = _status.event;
        selectConversionMaterial(event, game, ui, _status, "e", (card, player) =>
          available(player) && player.getCards("e").includes(card)
          && game.checkMod(card, player, "unchanged", "cardEnabled2", player) !== false,
          (button, card, player) => player.getUseValue({name: button.link[2]}) + 3 - get.value(card, player));
        return true;
      },
      filterOk() {
        const event = _status.event;
        const card = ui.selected.cards[0];
        const valid = ui.selected.buttons.length === 1 && ui.selected.cards.length === 1
          && event.filterCard(card, event.player);
        event.getParent().fanConversionCard = valid ? card : undefined;
        return valid;
      },
      backup(links, player) {
        const material = _status.event.fanConversionCard;
        delete _status.event.fanConversionCard;
        const card = { name: links.find(Array.isArray)[2], cards: [material] };
        return {
          position: "e",
          filterCard: card => card === material,
          selectCard: -1,
          viewAs: card,
          popname: true,
          direct: false,
          manualConfirm: true,
          fan_cyno_fixed_target: true,
          filterOk() {
            if (!available(player) || !player.getCards("e").includes(material)
              || ui.selected.cards.length !== 1 || ui.selected.cards[0] !== material) return false;
            return true;
          },
          onuse(result, player) {
            player.removeCharge(1);
            player.addTempSkill("fan_miyuan_used", { global: "phaseAfter" });
            game.trySkillAudio(result.card.name === "guohe" ? "fan_miyuan_guohe_audio" : "fan_miyuan_use_audio", player, true, true);
          },
        };
      },
      prompt: links => `秘源：为【${get.translation(links.find(Array.isArray)[2])}】选择目标`,
    },
    group: "fan_miyuan_charge",
    subSkill: {
      charge: {
        audio: "ext:原神/audio/ineffa/skill:3",
        trigger: { player: "phaseZhunbeiBegin" },
        forced: true,
        locked: false,
        filter: (event, player) => player.countCharge(true) > 0,
        async content(event, trigger, player) { player.addCharge(1); },
      },
    },
    ai: { order: 8, result: { player: 1 } },
  },
  fan_miyuan_used: { charlotte: true },
  fan_miyuan_use_audio: {
    audio: ["ext:原神/audio/ineffa/skill/fan_miyuan_use1.mp3", "ext:原神/audio/ineffa/skill/fan_miyuan_use2.mp3"],
  },
  fan_miyuan_guohe_audio: {
    audio: ["ext:原神/audio/ineffa/skill/fan_miyuan_use1.mp3", "ext:原神/audio/ineffa/skill/fan_miyuan_use2.mp3", "ext:原神/audio/ineffa/skill/fan_miyuan_guohe.mp3"],
  },
};
