import { selectConversionMaterial } from "../../ui/conversion-material.js";
import { lib, game, get, ui, _status } from "../../../../noname.js";

const targetable = (player, target) => target !== player && target.countCards("h") > 0;
const category = card => get.type(card, "trick");
const available = player => !player.hasSkill("fan_xunlin_used");
const diamond = (card, player) => get.suit(card, player) === "diamond";
const materials = player => player.getCards("hes").filter(card => diamond(card, player));
const options = (event, player) => get.inpileVCardList(([, , name, nature]) =>
  get.type(name) === "basic" && (!nature || ["fire", "thunder"].includes(nature)))
  .filter(([, , name, nature]) => (event._backup?.filterCard || event.filterCard)({ name, nature, isCard: true }, player, event));

export default {
  fan_bowu: {
    audio: ["ext:原神/audio/tighnari/skill/fan_bowu_knowledge.mp3", "ext:原神/audio/tighnari/skill/fan_bowu_mistakes.ogg"], direct: true, locked: false, group: "fan_bowu_draw",
    trigger: { player: "phaseUseBegin" },
    filter: (event, player) => game.hasPlayer(target => targetable(player, target)),
    async content(event, trigger, player) {
      const result = await player.chooseTarget("博物：选择一名其他角色", (card, player, target) => targetable(player, target))
        .set("prompt2", false).set("ai", target => {
          const usable = player.getCards("h").filter(card => player.getUseValue(card) > 0);
          return usable.length ? 1 - get.attitude(player, target) / 20 : 0;
        }).forResult();
      const target = result.targets?.[0];
      if (!result.bool || !target?.isIn() || !targetable(player, target)) return;
      const choice = await player.choosePlayerCard(target, "h", true, "博物：选择一张手牌").forResult();
      const card = choice.cards?.[0];
      if (!target.isIn() || !player.isIn() || !target.getCards("h").includes(card)) return;
      player.logSkill("fan_bowu", target);
      const type = category(card);
      await target.showCards(card, get.translation(target) + "因【博物】展示");
      const categories = player.storage.fan_bowu_draw ||= [];
      if (!categories.includes(type)) categories.push(type);
      player.syncStorage("fan_bowu_draw");
      player.markSkill("fan_bowu_draw");
    },
    subSkill: {
      draw: {
        audio: "ext:原神/audio/tighnari/skill:2", logAudio: () => false,
        locked: false, forced: true, popup: false,
        trigger: { player: "useCard" },
        intro: { content: types => (types || []).map(type => get.translation(type)).join("、") },
        filter: (event, player) => _status.currentPhase === player
          && player.storage.fan_bowu_draw?.includes(category(event.card)),
        async content(event, trigger, player) {
          game.trySkillAudio("fan_bowu_draw", player);
          await player.draw("nodelay");
        },
      },
    },
  },
  fan_xunlin_skill: { audio: "ext:原神/audio/tighnari/skill:3" },
  fan_xunlin_burst: { audio: "ext:原神/audio/tighnari/skill:3" },
  fan_xunlin: {
    audio: false, locked: false, direct: true,
    enable: ["chooseToUse", "chooseToRespond"],
    filter: (event, player) => available(player) && materials(player).length > 0 && options(event, player).length > 0,
    onChooseToRespond(event) {
      if (event.skill !== "fan_xunlin_backup" || !event.isMine() || event.fanXunlinPending) return;
      event.fanXunlinPending = true;
      setTimeout(() => {
        delete event.fanXunlinPending;
        const active = () => _status.event === event && event.skill === "fan_xunlin_backup" && !event.result?.card;
        if (!active()) return;
        const backup = lib.skill.fan_xunlin_backup;
        if (!backup?.viewAsFilter(event.player) || !event._backup?.filterCard?.(backup.viewAs, event.player, event)) return;
        if (!game.check() || !active() || !backup.filterOk()) return;
        ui.confirm?.close();
        if (event.skillDialog === true) event.skillDialog = false;
        ui.click.ok();
      }, 0);
    },
    hiddenCard: (player, name) => available(player) && get.type(name) === "basic" && materials(player).length > 0,
    chooseButton: {
      dialog: (event, player) => ui.create.dialog("巡林：选择方块牌和基本牌", [options(event, player), "vcard"]),
      select: [0, 1],
      filter() {
        const event = _status.event;
        selectConversionMaterial(event, game, ui, _status, "hes", (card, player) =>
          available(player) && materials(player).includes(card)
          && game.checkMod(card, player, "unchanged", "cardEnabled2", player) !== false,
          (button, card, player) => (event.getParent().type === 'phase' ? player.getUseValue({name: button.link[2], nature: button.link[3]}) : 8) + 3 - get.value(card, player));
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
      check(button) {
        const player = _status.event.player;
        if (!Array.isArray(button.link)) return 9 - get.value(button.link, player);
        const origin = _status.event.getParent();
        if (origin.type !== "phase") return 5;
        const [, , name, nature] = button.link;
        return player.getUseValue({ name, nature }) - 1;
      },
      backup(links) {
        const [link] = links;
        const material = _status.event.fanConversionCard;
        delete _status.event.fanConversionCard;
        const viewAs = { name: link[2], nature: link[3] };
        const valid = player => available(player) && materials(player).includes(material);
        return {
          audio: false, position: "hes", selectCard: -1, viewAs,
          manualConfirm: true,
          fan_cyno_fixed_target: true,
          fanPairedConfirm: true,
          viewAsFilter: valid,
          filterCard: (card, player) => card === material && valid(player),
          filterOk: () => ui.selected.cards.length === 1 && ui.selected.cards[0] === material && valid(_status.event.player),
          async precontent(event, trigger, player) {
            if (!valid(player)) { event.result.bool = false; return; }
            player.addTempSkill("fan_xunlin_used", { global: "phaseAfter" });
            player.logSkill("fan_xunlin");
            game.trySkillAudio(viewAs.name === "sha" ? "fan_xunlin_burst" : "fan_xunlin_skill", player);
          },
        };
      },
      prompt: links => "巡林：使用" + get.translation({ name: links[0][2], nature: links[0][3] }),
    },
    ai: {
      order: 3, respondSha: true, respondShan: true, save: true,
      skillTagFilter: player => available(player) && materials(player).length > 0,
      result: { player: 1 },
    },
    subSkill: { used: { charlotte: true } },
  },
};
