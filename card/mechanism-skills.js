import { game, get, lib, ui } from "../../../noname.js";
import { nativeTaipingSkill } from "./xianyun.js";

const urns = player => player.getVCards("e", card => card.name === "fan_chengehu");
const guizhongSha = { name: "sha", isCard: true, storage: { fan_guizhongji: true } };
// 经典模式的属性杀仅为火杀、雷杀，不从引擎全量属性表引入特殊模式牌。
const guizhongChoices = () => [undefined, "fire", "thunder"].map(nature => ["", "", "sha", nature]);
const guizhongNatureAllowed = nature => [undefined, "fire", "thunder"].includes(nature);
const guizhongCard = nature => ({ ...guizhongSha, nature });
export default {
  fan_pengrenshenji_skill: {
    equipSkill: true, locked: true, forced: true,
    trigger: { player: ["phaseJieshuBegin", "damageEnd"] },
    async content(event, trigger, player) {
      if (trigger.name === "damage") {
        const cards = player.getCards("e", card => card.name === "fan_pengrenshenji");
        if (cards.length) await player.discard(cards);
      } else {
        await player.draw(2);
        if (player.isIn()) await player.recover();
      }
    },
    ai: { threaten: 1.4 },
  },
  fan_guizhongji_skill: {
    equipSkill: true, locked: false, direct: true,
    trigger: { player: "phaseJieshuBegin" },
    group: "fan_guizhongji_boost",
    filter(event, player) { return guizhongChoices().some(link => player.hasUseTarget(guizhongCard(link[3]))); },
    async content(event, trigger, player) {
      const choice = await player.chooseButton(["归终机：选择【杀】的属性", [guizhongChoices(), "vcard"]])
        .set("prompt2", false).set("selectButton", [0, 1]).set("fanPairedConfirm", true)
        .set("filterButton", button => guizhongNatureAllowed(button.link[3]) && player.hasUseTarget(guizhongCard(button.link[3])))
        .set("filterOk", () => ui.selected.buttons.length === 1 && guizhongNatureAllowed(ui.selected.buttons[0].link[3]) && player.hasUseTarget(guizhongCard(ui.selected.buttons[0].link[3])))
        .set("ai", button => Math.max(0, ...game.filterPlayer(target => player.canUse(guizhongCard(button.link[3]), target)).map(target => get.effect(target, guizhongCard(button.link[3]), player, player)))).forResult();
      if (!choice.bool || choice.links?.length !== 1 || !guizhongNatureAllowed(choice.links[0][3])) return;
      const sha = guizhongCard(choice.links[0][3]);
      if (!player.isIn() || !player.hasUseTarget(sha)) return;
      const next = player.chooseToUse({
        prompt: "归终机：你可以视为使用一张【杀】", prompt2: false,
        filterCard: (card, owner) => card.name === "sha" && card.storage?.fan_guizhongji
          && (get.nature(card) || "") === (sha.nature || "") && lib.filter.cardEnabled(card, owner),
        norestore: true, _backupevent: "fan_guizhongji_backup",
        custom: { add: {}, replace: { window() {} } },
        manualConfirm: true, fanPairedConfirm: true,
        fan_guizhongji_card: sha,
      });
      next.backup("fan_guizhongji_backup");
      await next;
    },
    mod: { targetInRange(card) { if (card.storage?.fan_guizhongji) return true; } },
  },
  fan_guizhongji_backup: {
    equipSkill: true, locked: false,
    filterCard: () => false, selectCard: -1,
    viewAs() { return get.event().fan_guizhongji_card || guizhongSha; },
    manualConfirm: true, fanPairedConfirm: true,
    ai: { result: { target: (player, target) => get.effect(target, get.event().fan_guizhongji_card || guizhongSha, player, target) } },
  },
  fan_guizhongji_boost: {
    equipSkill: true, locked: false, direct: true,
    trigger: { player: "useCardToPlayered" },
    filter(event, player) {
      return event.isFirstTarget && event.card.storage?.fan_guizhongji && player.countCards("he", card =>
        get.color(card, player) === "black" && lib.filter.cardDiscardable(card, player, "fan_guizhongji_boost")) > 0;
    },
    async content(event, trigger, player) {
      const use = trigger.getParent();
      const result = await player.chooseCard("he", "归终机：你可以弃置一张黑色牌，令此杀不可被闪响应", card =>
        get.color(card, player) === "black" && lib.filter.cardDiscardable(card, player, "fan_guizhongji_boost"))
        .set("prompt2", false).set("selectCard", [0, 1]).set("fanPairedConfirm", true)
        .set("filterOk", () => ui.selected.cards.length === 1).set("ai", card => {
          const value = use.targets.reduce((sum, target) => {
            if (!target.isIn() || use.excluded?.has(target)) return sum;
            const effect = get.effect(target, use.card, player, player);
            if (use.directHit.includes(target)) return sum;
            return sum + effect * Math.min(1, target.countCards("h") / 3);
          }, 0);
          return value - get.value(card, player);
        }).forResult();
      if (!result.bool || result.cards?.length !== 1) return;
      const cost = result.cards[0];
      if (!player.getCards("he").includes(cost) || get.color(cost, player) !== "black"
        || !lib.filter.cardDiscardable(cost, player, "fan_guizhongji_boost")) return;
      const payment = player.discard(cost); await payment;
      if (!payment.cards?.includes(cost) || player.getCards("he").includes(cost)) return;
      use.directHit.addArray(game.players);
    },
  },
  fan_chengehu_skill: {
    equipSkill: true, locked: false, enable: "phaseUse", usable: 1,
    group: "fan_chengehu_record",
    position: "h", selectCard: 1, discard: false, lose: false, delay: false,
    manualConfirm: true, fanPairedConfirm: true,
    filter: (event, player) => player.countCards("h") > 0 && urns(player).length > 0,
    filterCard: true,
    check(card) { return 7 - get.value(card); },
    async content(event, trigger, player) {
      const urn = urns(player)[0], card = event.cards[0];
      if (!urn || !player.getCards("h").includes(card)) return;
      await player.loseToSpecial([card], "fan_chengehu");
      if (!player.getCards("s").includes(card)) return;
      // 失牌触发中壶已离场时不遗留可使用的孤立存牌。
      if (!urns(player).includes(urn)) { await player.gain(card, "gain2"); return; }
      urn.storages = [...new Set([...(urn.storages || []).filter(stored => player.getCards("s").includes(stored)), card])];
      game.broadcastAll((equipment, cards) => { equipment.storages = cards; }, urn, urn.storages);
      await player.draw();
    },
    mod: {
      cardEnabled2(card, player) {
        for (const urn of urns(player)) {
          if (!urn.storages?.includes(card)) continue;
          if (ui.selected.cards.some(selected => urn.cards?.includes(selected))) return false;
        }
        if (urns(player).some(urn => urn.cards?.includes(card) && ui.selected.cards.some(selected => urn.storages?.includes(selected)))) return false;
      },
    },
    mark: true,
    intro: {
      markcount(storage, player) { return urns(player).flatMap(urn => (urn.storages || []).filter(card => player.getCards("s").includes(card))).length; },
      content(storage, player) {
        const cards = urns(player).flatMap(urn => (urn.storages || []).filter(card => player.getCards("s").includes(card)));
        return player.isUnderControl(true) ? get.translation(cards) : `共有${get.cnNumber(cards.length)}张牌`;
      },
    },
    ai: { order: 1, result: { player: 1 } },
  },
  fan_chengehu_record: {
    equipSkill: true, charlotte: true, locked: false, forced: true, silent: true, popup: false,
    trigger: { player: "loseEnd" },
    filter(event, player) {
      return event.ss?.length > 0 && urns(player).some(urn => urn.storages?.some(card => event.ss.includes(card)));
    },
    async content(event, trigger, player) {
      for (const urn of urns(player)) {
        urn.storages = (urn.storages || []).filter(card => !trigger.ss.includes(card));
        game.broadcastAll((equipment, cards) => { equipment.storages = cards; }, urn, urn.storages);
      }
      player.updateMarks();
    },
  },
  fan_taipingyaoshu_skill: { ...nativeTaipingSkill, subSkill: undefined, audio: false, locked: true },
};
