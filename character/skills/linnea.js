import { lib, game, get, ui, _status } from "../../../../noname.js";

const names = player => player.storage.fan_bowen || [];
const available = player => !player.hasSkill("fan_bowen_used");
const shown = card => get.is.shownCard(card) || card.hasGaintag("faceup_tag");
function choices(event, player) {
  return names(player).flatMap(name => (name === "sha" ? [undefined, "fire", "thunder"] : [undefined])
    .map(nature => [get.type(name), "", name, nature]))
    .filter(link => event.filterCard({ name: link[2], nature: link[3], isCard: true }, player, event));
}
function consume(event, player) { game.trySkillAudio("fan_bowen_convert_voice", player); player.addTempSkill("fan_bowen_used", { global: "phaseBefore" }); }
const pendingBowen = new WeakSet();
function confirmBowen(source) {
  if (!source.isMine?.() || pendingBowen.has(source)) return;
  pendingBowen.add(source);
  queueMicrotask(() => {
    try {
      if (_status.event !== source || source.skill !== "fan_bowen_convert_backup") return;
      if (!game.check() || _status.event !== source || source.skill !== "fan_bowen_convert_backup") return;
      ui.confirm?.close();
      if (source.skillDialog === true) source.skillDialog = false;
      ui.click.ok();
    } finally { pendingBowen.delete(source); }
  });
}
export default {
  fan_bowen_reveal_voice: { audio: "ext:原神/audio/linnea/skill:2" },
  fan_bowen_convert_voice: { audio: "ext:原神/audio/linnea/skill:5" },
  fan_shizhi_draw_voice: { audio: "ext:原神/audio/linnea/skill:2" },
  fan_shizhi_cancel_voice: { audio: "ext:原神/audio/linnea/skill:3" },
  fan_bowen: {
    audio: "fan_bowen_reveal_voice", logAudio: () => false,
    locked: false, direct: true, mark: true, marktext: "闻",
    intro: { content(storage) { return storage?.length ? "已记录：" + get.translation(storage) : "尚未记录牌名"; } },
    trigger: { global: "roundStart" },
    filter: () => game.hasPlayer(target => target.countCards("h") > 0),
    async content(event, trigger, player) {
      const result = await player.chooseTarget("博闻：选择一名角色", (card, player, target) => target.countCards("h") > 0)
        .set("prompt2", false).set("ai", target => target.getCards("h").some(c => shown(c) && !names(player).includes(get.name(c, target))) ? 3 : 1).forResult();
      const target = result.targets?.[0];
      if (!result.bool || !target?.isIn() || !player.isIn() || !target.countCards("h")) return;
      const selected = await player.choosePlayerCard(target, "h", "博闻：选择一张手牌")
        .set("ai", button => { const card = button.link; return shown(card) && ["basic", "trick"].includes(get.type(card)) && !names(player).includes(get.name(card, target)) ? 10 : 1; }).forResult();
      const card = selected.cards?.[0];
      if (!selected.bool || !target.isIn() || !player.isIn() || !target.getCards("h").includes(card)) return;
      player.logSkill("fan_bowen", target, null, null, []);
      game.trySkillAudio("fan_bowen_reveal_voice", player);
      if (!shown(card)) await target.addShownCards(card, "visible_fan_bowen");
      const name = get.name(card, target);
      if (["basic", "trick"].includes(get.type(card, null, target))) {
        (player.storage.fan_bowen ||= []).add(name);
        player.markSkill("fan_bowen"); player.syncStorage("fan_bowen");
      }
    },
    group: "fan_bowen_convert",
  },
  fan_bowen_convert: {
    locked: false, enable: ["chooseToUse", "chooseToRespond"], direct: true,
    filter: (event, player) => available(player) && player.countCards("hes") > 0 && choices(event, player).length > 0,
    hiddenCard: (player, name) => available(player) && names(player).includes(name) && player.countCards("hes") > 0,
    chooseButton: {
      dialog: (event, player) => ui.create.dialog("博闻：选择牌名", [choices(event, player), "vcard"]),
      select: [0, 1],
      filterOk() {
        const event = _status.event;
        const valid = ui.selected.buttons.length === 1 && ui.selected.cards.length === 1
          && available(event.player) && event.player.getCards("hes").includes(ui.selected.cards[0])
          && game.checkMod(ui.selected.cards[0], event.player, "unchanged", "cardEnabled2", event.player) !== false;
        event.getParent().fanBowenMaterial = valid ? ui.selected.cards[0] : null;
        return valid;
      },
      filter(button, player) {
        const event = _status.event;
        if (!event.fanBowenMaterialSelection) {
          event.fanBowenMaterialSelection = true;
          event.position = "hes";
          event.selectCard = [0, 1];
          event.filterCard = (card, owner) => available(owner) && owner.getCards("hes").includes(card)
            && game.checkMod(card, owner, "unchanged", "cardEnabled2", owner) !== false;
          event.fanPairedConfirm = true;
          event.manualConfirm = true;
          event.processAI = () => {
            let best, score = -Infinity;
            for (const link of choices(event.getParent(), player)) {
              for (const card of player.getCards("hes").filter(card => event.filterCard(card, player))) {
                const value = player.getUseValue({ name: link[2], nature: link[3] }) - get.value(card, player);
                if (value > score) { score = value; best = { bool: true, cards: [card], links: [link] }; }
              }
            }
            event.getParent().fanBowenMaterial = best?.cards[0] || null;
            return best || { bool: false };
          };
          // Card checking precedes button checking in the native engine.
          // Recheck once after attaching the live material selection fields.
          queueMicrotask(() => { if (_status.event === event) game.check(); });
        }
        return choices(_status.event.getParent(), player).some(link => link[2] === button.link[2] && link[3] === button.link[3]);
      },
      check: button => get.player().getUseValue({ name: button.link[2], nature: button.link[3] }),
      backup(links) {
        const named = links[0];
        const source = _status.event;
        // Async content receives child results as an argument; parent.result may
        // still contain the initial skill click, not the joint selection.
        const material = _status.event.fanBowenMaterial;
        delete _status.event.fanBowenMaterial;
        const info = lib.card[named[2]];
        const automatic = source.name === "chooseToRespond" || named[2] === "wuxie" || info?.notarget || info?.selectTarget === -1;
        return { locked: false, position: "hes", selectCard: -1,
          filterCard: (card, player) => card === material && available(player) && player.getCards("hes").includes(card)
            && game.checkMod(card, player, "unchanged", "cardEnabled2", player) !== false,
          filterOk() {
            if (ui.selected.cards.length !== 1 || ui.selected.cards[0] !== material) return false;
            if (automatic) confirmBowen(source);
            return true;
          },
          viewAsFilter: player => !!material && available(player) && player.getCards("hes").includes(material)
            && game.checkMod(material, player, "unchanged", "cardEnabled2", player) !== false,
          viewAs: { name: named[2], nature: named[3] }, check: card => 7 - get.value(card),
          onuse: consume, onrespond: consume, manualConfirm: true, direct: false, fanPairedConfirm: !automatic };
      },
      prompt: () => "博闻：选择目标",

    },
    ai: { order: 8, respondSha: true, respondShan: true,
      skillTagFilter(player, tag) { return available(player) && player.countCards("hes") > 0 && names(player).includes(tag === "respondSha" ? "sha" : "shan"); }, result: { player: 1 } },
  },
  fan_bowen_used: { charlotte: true },
  fan_shizhi: {
    audio: "fan_shizhi_draw_voice", logAudio: () => false,
    locked: false, direct: true, trigger: { global: "useCardToTarget" },
    filter(event, player) { return !player.hasSkill("fan_shizhi_disabled") && names(player).includes(event.card.name)
      && get.tag(event.card, "damage") && !event.getParent().all_excluded && event.getParent().targets.includes(event.target); },
    async content(event, trigger, player) {
      const use = trigger.getParent();
      const result = await player.chooseControl("摸牌", "取消该目标", "取消")
        .set("prompt", "你可以发动【识谶】，选择一项").set("prompt2", false)
        .set("ai", () => {
          const value = get.effect(trigger.target, use.card, use.player, player);
          return value < -3 ? 1 : 0;
        }).forResult();
      if (!player.isIn() || player.hasSkill("fan_shizhi_disabled") || use.all_excluded || !use.targets.includes(trigger.target)) return;
      if (result.control === "摸牌") { player.logSkill("fan_shizhi", trigger.target, null, null, []); game.trySkillAudio("fan_shizhi_draw_voice", player); await player.draw(); }
      else if (result.control === "取消该目标") {
        player.logSkill("fan_shizhi", trigger.target, null, null, []);
        game.trySkillAudio("fan_shizhi_cancel_voice", player);
        use.targets.remove(trigger.target);
        player.addTempSkill("fan_shizhi_disabled", { global: "roundStart" });
      }
    },
    ai: { threaten: 1.4 },
  },
  fan_shizhi_disabled: { charlotte: true, mark: true, intro: { content: "识谶失效至本轮结束" } },
};
