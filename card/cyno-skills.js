import { playCynoSound } from "./cyno-sound.js";
import { game, lib, get, ui, _status } from "../../../noname.js";

const soulAvailable = player => !player.hasSkill("fan_yongyuanzhihun_used");
const soulChoices = (event, player) => get.inpileVCardList(info => ["trick", "delay"].includes(info[0])
  && event.filterCard(get.autoViewAs({name:info[2]}, "unsure"), player, event));

async function useSoul(event, trigger, player) {
  playCynoSound("activate");
  player.addTempSkill("fan_yongyuanzhihun_used");
  player.when({ player: "useCardAfter" }).filter(evt => evt.getParent() === event.getParent())
    .step(async (event, trigger, player) => { await player.draw(); });
}

const magicianCards = ["fan_heimoshushi", "fan_modaoqishi"];
const wuxie = {
  locked: false, enable: "chooseToUse", position: "h", selectCard: 1,
  viewAs: { name: "wuxie" }, check: card => 8 - get.value(card),
  ai: { respondWuxie: true },
};
export default {
  fan_heimoshushi_rule: {
    prompt: "选择黑魔术师或魔导骑士当【无懈可击】使用", prompt2: false,
    ...wuxie, filterCard: card => magicianCards.includes(card.name),
    viewAsFilter: player => player.countCards("h", card => magicianCards.includes(card.name)) > 0,
    mod: {
      ignoredHandcard(card) { if (magicianCards.includes(card.name)) return true; },
      cardDiscardable(card, player, name) { if (name === "phaseDiscard" && magicianCards.includes(card.name)) return false; },
    },
  },
  fan_modaoqishi_reward: {
    cardSkill: true, forced: true, popup: false, trigger: { player: "useCardAfter" },
    filter(event, player) {
      return player.isIn() && !player.hasSkill("fan_hongmo", null, false, false)
        && (event.card.name === "fan_modaoqishi" || event.cards?.some(card => card.name === "fan_modaoqishi"));
    },
    content(event, trigger, player) { player.addSkill("fan_hongmo"); },
  },
  fan_hongmo: {
    ...wuxie, filterCard: true,
    viewAsFilter: player => !player.hasSkill("fan_hongmo_used") && player.countCards("h") > 0,
    check(card) {
      const player = _status.event.player;
      const attack = player.getCards("h").some(other => other !== card && get.name(other, player) === "sha");
      return 8 - get.value(card, player) + (attack && !player.hasSkill("fan_hongmo_damage") ? 0.5 : 0);
    },
    async precontent(event, trigger, player) {
      player.addTempSkill("fan_hongmo_used", { global: "phaseAfter" });
      player.addSkill("fan_hongmo_damage");
    },
  },
  fan_hongmo_used: { charlotte: true },
  fan_hongmo_damage: {
    charlotte: true, forced: true, popup: false, mark: true,
    intro: { content: "你使用的下一张【杀】造成的伤害+1" },
    trigger: { player: "useCard1" },
    filter: event => event.card.name === "sha",
    content(event, trigger, player) {
      player.removeSkill("fan_hongmo_damage");
      trigger.baseDamage = (trigger.baseDamage ?? 1) + 1;
    },
  },
  fan_yongyuanzhihun_used: { charlotte: true },
  fan_yongyuanzhihun_wuxie: {
    ...wuxie, equipSkill: true, position: "hes", filterCard: true,
    manualConfirm: true, prompt: "将一张牌当【无懈可击】使用", prompt2: false,
    filter: event => event.type === "wuxie",
    viewAsFilter: player => soulAvailable(player) && player.countCards("hes") > 0,
    hiddenCard: (player, name) => name === "wuxie" && soulAvailable(player) && player.countCards("hes") > 0,
    precontent: useSoul,
  },
  fan_yongyuanzhihun_skill: {
    equipSkill: true, locked: false, direct: true, enable: "chooseToUse",
    fan_cyno_open_choice: true,
    filter(event, player) {
      return event.type !== "wuxie" && !player.hasSkill("fan_yongyuanzhihun_used") && player.countCards("hes") > 0 &&
        get.inpileVCardList(info => ["trick", "delay"].includes(info[0]) && event.filterCard(get.autoViewAs({ name: info[2] }, "unsure"), player, event)).length > 0;
    },
    chooseButton: {
      dialog(event, player) {
        const options = soulChoices(event, player);
        return ui.create.dialog("永远之魂：选择一张素材和一种锦囊", [options, "vcard"]);
      },
      select: [0, 1],
      filterOk() {
        const event = _status.event;
        const valid = ui.selected.buttons.length === 1 && ui.selected.cards.length === 1
          && soulAvailable(event.player) && event.player.getCards("hes").includes(ui.selected.cards[0])
          && game.checkMod(ui.selected.cards[0], event.player, "unchanged", "cardEnabled2", event.player) !== false;
        event.getParent().fanSoulMaterial = valid ? ui.selected.cards[0] : null;
        return valid;
      },
      filter(button, player) {
        const event = _status.event;
        if (!event.fanSoulMaterialSelection) {
          event.fanSoulMaterialSelection = true;
          event.position = "hes";
          event.selectCard = [0, 1];
          event.filterCard = (card, owner) => soulAvailable(owner) && owner.getCards("hes").includes(card)
            && game.checkMod(card, owner, "unchanged", "cardEnabled2", owner) !== false;
          event.fanPairedConfirm = true;
          event.manualConfirm = true;
          event.processAI = () => {
            let best, score = -Infinity;
            for (const link of soulChoices(event.getParent(), player)) {
              for (const card of player.getCards("hes").filter(card => event.filterCard(card, player))) {
                const value = player.getUseValue({ name: link[2], nature: link[3] }) - get.value(card, player);
                if (value > score) { score = value; best = { bool: true, cards: [card], links: [link] }; }
              }
            }
            event.getParent().fanSoulMaterial = best?.cards[0] || null;
            return best || { bool: false };
          };
          // Card checking precedes button checking in the native engine.
          // Recheck once after attaching the live material selection fields.
          queueMicrotask(() => { if (_status.event === event) game.check(); });
        }
        return soulChoices(_status.event.getParent(), player).some(link => link[2] === button.link[2] && link[3] === button.link[3]);
      },
      check: button => get.player().getUseValue({ name: button.link[2], nature: button.link[3] }),
      backup(links) {
        const option = links[0];
        const material = _status.event.fanSoulMaterial;
        delete _status.event.fanSoulMaterial;
        return {
        equipSkill: true, locked: false, position: "hes", selectCard: -1, complexCard: true,
        filterOk: () => ui.selected.cards.length === 1 && ui.selected.cards[0] === material,
        manualConfirm: true, fanPairedConfirm: true, fan_cyno_fixed_target: true,
        filterCard: (card, player) => card === material && !player.hasSkill("fan_yongyuanzhihun_used")
          && player.getCards("hes").includes(card)
          && game.checkMod(card, player, "unchanged", "cardEnabled2", player) !== false,
        viewAs: { name: option[2] },
        precontent: useSoul,
      }; },
      prompt: links => `将一张牌当${get.translation(links.find(Array.isArray)[2])}使用`,
    },
    hiddenCard: (player, name) => lib.inpile.includes(name) && ["trick", "delay"].includes(get.type(name)) && !player.hasSkill("fan_yongyuanzhihun_used") && player.countCards("hes") > 0,
    ai: { order: 8, result: { player: 1 } },
  },
  fan_heimodaozhen_skill: {
    equipSkill: true, locked: false, enable: "phaseUse", usable: 1,
    prompt: "观看牌堆顶三张牌，获得一张并排列其余牌至牌堆顶或底", prompt2: false,
    async content(event, trigger, player) {
      playCynoSound("activate");
      const cards = get.cards(3);
      const result = await player.chooseToMove("黑魔导阵：获得一张，其余排列于牌堆顶或底", true)
        .set("list", [["牌堆顶（左侧在上）", cards], ["获得", []], ["牌堆底（右侧在底）", []]])
        .set("filterMove", (from, to, moved) => typeof to !== "number" || to !== 1 || moved[1].length < 1)
        .set("filterOk", moved => moved[1].length === 1)
        .set("processAI", () => { const sorted = cards.slice().sort((a, b) => get.value(b, player) - get.value(a, player)); return [sorted.slice(1), sorted.slice(0, 1), []]; }).forResult();
      const moved = result.moved;
      const valid = result.bool && moved?.length === 3 && moved.every(Array.isArray) && moved[1].length === 1 && moved.flat().length === cards.length && new Set(moved.flat()).size === cards.length && moved.flat().every(card => cards.includes(card));
      const top = valid ? moved[0] : cards;
      for (const card of top.slice().reverse()) ui.cardPile.insertBefore(card, ui.cardPile.firstChild);
      if (valid) {
        for (const card of moved[2]) ui.cardPile.appendChild(card);
      }
      if (valid) await player.gain(moved[1], "draw");

    },
    ai: { order: 10, result: { player: 1 } },
  },
};
