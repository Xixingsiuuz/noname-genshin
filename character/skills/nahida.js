import { lib, game, get, ui, _status } from "../../../../noname.js";

// 等原生 chooseToUse 完成检查和暂停后再提交，避免 direct 在 checkEnd 中提前提交。
const pendingHuanjing = new WeakSet();
function confirmHuanjing() {
  const event = _status.event;
  if (event?.name !== "chooseToUse" || event.skill !== "fan_huanjing_backup"
    || !event.isMine() || pendingHuanjing.has(event)) return true;
  pendingHuanjing.add(event);
  queueMicrotask(() => {
    try {
      if (_status.event === event && event.skill === "fan_huanjing_backup"
        && game.check()) ui.click.ok();
    } finally {
      pendingHuanjing.delete(event);
    }
  });
  return true;
}

const memories = player => player.storage.fan_wenshou_names || [];
// 提示中保留“界”“SP”等武将身份前缀，仅省略“手杀”版本标识。
const promptName = player => get.translation(player).replace(/^手杀/, "");
const records = player => player.storage.fan_wenshou_cards || [];
const departures = record => record.target.getAllHistory("lose").slice(record.lossIndex)
  .filter(loss => loss.cards?.includes(record.card));
const matchesUse = (record, event) => !record.used && event.player === record.target
  && event.cards?.length === 1 && event.cards[0] === record.card && !event.skill
  && (event.card === record.card || (event.card?.isCard && event.card.cardid === record.card.cardid))
  && departures(record).every(loss => (loss.relatedEvent || loss.getParent()) === event);
const options = (event, player) => memories(player)
  .filter(name => get.type(name) === "trick" && player.hasUseTarget({ name, isCard: true })
    && (typeof event.filterCard !== "function" || event.filterCard({ name, isCard: true }, player, event)))
  .map(name => ["锦囊", "", name]);
function canReplace(event, player, target) {
  return target !== player && target.group === "wu" && target.isIn()
    && lib.filter.targetEnabled2(event.card, event.player, target)
    && lib.filter.targetInRange(event.card, event.player, target);
}

export default {
  fan_huaqiu_start_voice: { audio: "ext:原神/audio/nahida/skill:2" },
  fan_huaqiu_guard_voice: { audio: "ext:原神/audio/nahida/skill:2" },
  fan_huaqiu_end_voice: { audio: "ext:原神/audio/nahida/skill:1" },
  fan_wenshou_select_voice: { audio: "ext:原神/audio/nahida/skill:2" },
  fan_wenshou_bless_voice: { audio: "ext:原神/audio/nahida/skill:2" },
  fan_wenshou_punish_voice: { audio: "ext:原神/audio/nahida/skill:2" },
  fan_wenshou_gain_voice: { audio: "ext:原神/audio/nahida/skill:2" },
  fan_huanjing_voice: { audio: "ext:原神/audio/nahida/skill:3" },
  fan_huaqiu: {
    audio: false,
    locked: true,
    forced: true,
    trigger: { global: "phaseBefore", player: "enterGame" },
    filter: (event, player) => game.roundNumber <= 2 && !player.isTurnedOver(),
    async content(event, trigger, player) {
      game.trySkillAudio("fan_huaqiu_start_voice", player);
      await player.turnOver(true);
    },
    group: ["fan_huaqiu_hold", "fan_huaqiu_damage", "fan_huaqiu_end"],
    subSkill: {
      hold: {
        trigger: { player: "turnOverBefore" },
        forced: true,
        silent: true,
        firstDo: true,
        filter: (event, player) => game.roundNumber <= 2 && player.isTurnedOver(),
        async content(event, trigger) { trigger.cancel(); },
      },
      damage: {
        audio: false,
        trigger: { player: "damageBegin4" },
        forced: true,
        filter: () => game.roundNumber <= 2,
        async content(event, trigger, player) {
          trigger.cancel();
          game.trySkillAudio("fan_huaqiu_guard_voice", player);
        },
        ai: { nofire: true, nothunder: true, nodamage: true },
      },
      end: {
        audio: false,
        trigger: { global: "roundEnd" },
        forced: true,
        filter: () => game.roundNumber >= 2,
        async content(event, trigger, player) {
          game.trySkillAudio("fan_huaqiu_end_voice", player);
          player.removeSkill("fan_huaqiu");
          await player.turnOver(false);
        },
      },
    },
  },
  fan_wenshou: {
    audio: false,
    locked: true,
    forced: true,
    trigger: { global: "phaseZhunbeiBegin" },
    filter: (event, player) => event.player !== player && event.player.countCards("h") > 0,
    async content(event, trigger, player) {
      // visible 只向选择者展示手牌；不调用 showCards，不公开选牌结果。
      const result = await player.choosePlayerCard(trigger.player, "h", "visible", `闻授：你可以秘密选择${promptName(trigger.player)}的一张手牌`)
        .set("ai", button => {
          const suit = get.suit(button.link, trigger.player);
          const attitude = get.attitude(player, trigger.player);
          if (suit === "heart") return attitude > 0 && trigger.player.isDamaged() ? 8 : 1;
          if (suit === "diamond") return attitude > 0 ? 9 : 1;
          if (suit === "club" || suit === "spade") return attitude < 0 ? 8 : 0;
          return get.value(button.link);
        })
        .forResult();
      if (!result.bool || !result.cards?.length) return;
      game.trySkillAudio("fan_wenshou_select_voice", player);
      const card = result.cards[0];
      ((player.storage.fan_wenshou_cards || (player.storage.fan_wenshou_cards = []))).push({ card, target: trigger.player,
        suit: get.suit(card, trigger.player), lossIndex: trigger.player.getAllHistory("lose").length });
      const name = get.name(card, trigger.player);
      if (get.type(name) === "trick") {
        const names = (player.storage.fan_wenshou_names || (player.storage.fan_wenshou_names = []));
        if (!names.includes(name)) names.push(name);
      }
    },
    group: ["fan_wenshou_use", "fan_wenshou_gain", "fan_wenshou_clear"],
    subSkill: {
      use: {
        audio: false,
        trigger: { global: "useCard1" },
        forced: true,
        popup: false,
        filter: (event, player) => records(player).some(record => matchesUse(record, event)),
        async content(event, trigger, player) {
          const selected = records(player).filter(record => matchesUse(record, trigger));
          for (const record of selected) record.used = trigger;
          for (const { suit } of selected) {
            const user = trigger.player;
            if (!user.isIn()) break;
            player.logSkill("fan_wenshou", user);
            if (["heart", "diamond"].includes(suit)) game.trySkillAudio("fan_wenshou_bless_voice", player);
            else if (["club", "spade"].includes(suit)) game.trySkillAudio("fan_wenshou_punish_voice", player);
            if (suit === "heart") await user.recover();
            else if (suit === "diamond") await user.draw(3);
            else if (suit === "club") {
              await user.chooseToDiscard("he", 1, true, "闻授：弃置一张牌");
              if (user.isIn()) await user.loseHp();
            } else if (suit === "spade") await user.turnOver();
          }
        },
      },
      gain: {
        audio: false,
        trigger: { global: "phaseJieshuBegin" },
        forced: true,
        popup: false,
        filter: (event, player) => records(player).some(record => record.target === event.player && !record.collected),
        async content(event, trigger, player) {
          const selected = records(player).filter(record => record.target === trigger.player && !record.collected);
          for (const record of selected) {
            record.collected = true;
            const { card, target } = record;
            // 转交、暂存后拿回均失效；直接使用装备牌后仍可在装备区收取。
            const intact = departures(record).every(loss => record.used && (loss.relatedEvent || loss.getParent()) === record.used);
            if (intact && player.isIn() && target.isIn() && target.getCards("hej").includes(card)) {
              game.trySkillAudio("fan_wenshou_gain_voice", player);
              await player.gain(card, target, "giveAuto");
            }
          }
        },
      },
      clear: {
        trigger: { global: "phaseAfter" },
        forced: true,
        silent: true,
        filter: (event, player) => records(player).some(record => record.target === event.player),
        async content(event, trigger, player) {
          player.storage.fan_wenshou_cards = records(player).filter(record => record.target !== trigger.player);
          if (!records(player).length) delete player.storage.fan_wenshou_cards;
        },
      },
    },
  },
  fan_huanjing: {
    audio: false,
    enable: "phaseUse",
    // 原生 checkEnd 通过 direct 立即打开 chooseButton，省去发动确认。
    direct: true,
    usable: 1,
    filter: (event, player) => options(event, player).length > 0,
    chooseButton: {
      dialog: (event, player) => ui.create.dialog("幻景：选择锦囊牌", [options(event, player), "vcard"]),
      check: button => get.player().getUseValue({ name: button.link[2], isCard: true }),
      backup(links, player) {
        const card = { name: links[0][2], isCard: true };
        const info = get.info(card);
        const range = lib.filter.selectTarget(card, player);
        const automatic = !info.complexTarget && !info.complexSelect
          && (info.notarget || range?.[1] === -1 || (range?.[0] === 0 && range?.[1] === 0));
        return {
          audio: false,
          precontent(event, trigger, player) {
            game.trySkillAudio("fan_huanjing_voice", player);
          },
          // 固定目标牌在原生流程暂停后提交；手选目标牌保留确认。
          direct: false,
          manualConfirm: true,
          filterOk: automatic ? confirmHuanjing : undefined,
          filterCard: () => false,
          selectCard: -1,
          viewAs: card,
          popname: true,
        };
      },
      prompt: links => `幻景：使用${get.translation(links[0][2])}`,
    },
    ai: { order: 8, result: { player: 1 } },
  },
  fan_lanyin: {
    audio: false,
    zhuSkill: true,
    direct: true,
    trigger: { target: "useCardToTarget" },
    filter(event, player) {
      return player.hasZhuSkill("fan_lanyin") && event.player !== player
        && event.targets.length === 1 && event.targets[0] === player
        && game.hasPlayer(target => canReplace(event, player, target));
    },
    async content(event, trigger, player) {
      const candidates = game.filterPlayer(target => canReplace(trigger, player, target)).sortBySeat(player);
      for (const target of candidates) {
        if (!canReplace(trigger, player, target)) continue;
        const result = await target.chooseBool(`兰荫：是否替${promptName(player)}成为${get.translation(trigger.card)}的目标？`)
          .set("ai", () => get.attitude(target, player) > 0
            && get.effect(target, trigger.card, trigger.player, target) >= get.effect(player, trigger.card, trigger.player, target))
          .forResult();
        if (!result.bool) continue;
        if (!canReplace(trigger, player, target) || !player.isIn()) continue;
        player.logSkill("fan_lanyin", target);
        const use = trigger.getParent();
        use.triggeredTargets2.remove(player);
        use.targets.remove(player);
        use.targets.push(target);
        break;
      }
    },
  },
};
