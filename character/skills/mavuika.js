import { lib, game, get, ui, _status } from "../../../../noname.js";

const canConvert = player => player.countMark("fan_chihun") > 0
  && player.storage.fan_chihun_round !== game.roundNumber;
const ordinaryBasic = (name, nature) => get.type(name) === "basic"
  && (name !== "sha" || !nature || nature === "fire" || nature === "thunder");
const basicOptions = (event, player) => get.inpileVCardList(([, , name]) => get.type(name) === "basic")
  .filter(([, , name, nature]) => ordinaryBasic(name, nature)
    && (event._backup?.filterCard || event.filterCard)({ name, nature, isCard: true }, player, event));

// 原生 chooseTo* 检查后还会 pause；等本轮检查结束再提交，避免提前 resume 后卡住。
const pendingChihun = new WeakSet();
function confirmChihun(valid) {
  const event = _status.event;
  if (!valid(event?.player)) return false;
  if (!["chooseToUse", "chooseToRespond"].includes(event?.name)
    || event.skill !== "fan_chihun_use_backup" || !event.isMine() || pendingChihun.has(event)) return true;
  pendingChihun.add(event);
  queueMicrotask(() => {
    try {
      if (_status.event === event && event.skill === "fan_chihun_use_backup"
        && valid(event.player) && game.check()) {
        // 与原生 checkEnd.autoConfirm 一致：ok() 无按钮参数时不会关闭确认控件。
        // 最后一次 check 会重建控件，必须在其后关闭，避免用牌已结算仍残留空确认。
        ui.confirm?.close();
        if (event.skillDialog === true) event.skillDialog = false;
        ui.click.ok();
      }
    } finally {
      pendingChihun.delete(event);
    }
  });
  return true;
}
const phaseSha = (player, phase) => player.getHistory("useCard", evt =>
  evt.card.name === "sha" && evt.getParent("phaseUse") === phase).length;

// 只影响 AI 选项：估计本阶段可实际打出的杀，保留换牌与防御所需战意。
function chargeChoice(player, choices) {
  const attacks = player.getCards("hs", card => get.name(card, player) === "sha")
    .filter(card => game.hasPlayer(target => target !== player && player.canUse(card, target, true, false)
      && get.effect(target, card, player, player) > 0)).length;
  const quota = player.getCardUsable("sha", true);
  if (!Number.isFinite(quota)) return "cancel2";
  const virtual = canConvert(player) ? 1 : 0;
  let best = "cancel2", bestValue = 0;
  for (const value of choices) {
    const count = Number(value);
    if (count > player.countMark("fan_chihun")) continue;
    const available = attacks + (player.countMark("fan_chihun") > count ? virtual : 0);
    const extra = Math.max(0, Math.min(available, quota + count) - Math.min(attacks + virtual, quota));
    const defenseCost = player.hp <= 2 && player.countCards("h", { name: "shan" }) === 0 ? 1 : 0.3;
    const score = extra * 2 - count * defenseCost - (available < quota + count ? 2 : 0);
    if (score > bestValue) { best = value; bestValue = score; }
  }
  return best;
}

function fireValue(player, target, count) {
  return get.damageEffect(target, player, player, "fire") * Math.min(count, Math.max(1, target.hp + (target.hujia || 0)));
}

export default {
  fan_chihun_gain: { audio: "ext:原神/audio/mavuika/skill:3" },
  fan_chihun_overflow: { audio: "ext:原神/audio/mavuika/skill:2" },
  fan_chihun_convert: { audio: "ext:原神/audio/mavuika/skill:2" },
  fan_fentian_charge: { audio: "ext:原神/audio/mavuika/skill:2" },
  fan_fentian_fire: { audio: "ext:原神/audio/mavuika/skill:3" },
  fan_chihun: {
    audio: false,
    locked: false,
    marktext: "战",
    intro: { name: "战意", content: "共有#个“战意”标记（至多4个）" },
    onremove: true,
    trigger: { global: ["loseAfter", "loseAsyncAfter", "cardsDiscardAfter"] },
    forced: true,
    filter(event) {
      // getd() 仅返回此次真正进入弃牌堆的实体牌；一批多张杀也只触发一次。
      return event.getd()?.some(card => card.name === "sha" && get.position(card, true) === "d");
    },
    async content(event, trigger, player) {
      if (!player.isIn()) return;
      if (player.countMark("fan_chihun") >= 4) {
        game.trySkillAudio("fan_chihun_overflow", player, true);
        await player.draw();
      } else {
        const before = player.countMark("fan_chihun");
        player.addMark("fan_chihun", 1);
        if (player.countMark("fan_chihun") > before) game.trySkillAudio("fan_chihun_gain", player, true);
      }
    },
    group: "fan_chihun_use",
    subSkill: {
      use: {
        audio: false,
        locked: false,
        direct: true,
        filterCard: () => false,
        selectCard: -1,
        prompt: "炽魂：选择基本牌",
        prompt2: false,
        enable: ["chooseToUse", "chooseToRespond"],
        filter: (event, player) => canConvert(player) && basicOptions(event, player).length > 0,
        hiddenCard: (player, name) => canConvert(player) && get.type(name) === "basic",
        chooseButton: {
          dialog: (event, player) => ui.create.dialog("炽魂：选择基本牌", [basicOptions(event, player), "vcard"]),
          // 可取消且手动确认；尚未选择时保留置灰的确定按钮。
          select: [0, 1],
          filter(button, player) {
            const event = _status.event;
            event.fanPairedConfirm = true;
            return canConvert(player) && basicOptions(event.getParent(), player)
              .some(link => link[2] === button.link[2] && link[3] === button.link[3]);
          },
          filterOk() {
            const event = _status.event;
            event.fanPairedConfirm = true;
            const selected = ui.selected.buttons;
            return selected.length === 1 && canConvert(event.player)
              && basicOptions(event.getParent(), event.player)
                .some(link => link[2] === selected[0].link[2] && link[3] === selected[0].link[3]);
          },
          check(button) {
            const origin = _status.event.getParent();
            // 打出/救援按原生响应需求选牌，不用主动出牌估值否定闪或救援桃酒。
            if (origin.name === "chooseToRespond" || origin.type !== "phase") return 1;
            return get.player().getUseValue({ name: button.link[2], nature: button.link[3] });
          },
          backup(links, player) {
            const card = { name: links[0][2], nature: links[0][3], isCard: true };
            const origin = _status.event;
            const originalFilter = origin && (origin._backup?.filterCard || origin.filterCard);
            const valid = current => !!current && current.isIn() && canConvert(current)
              && ordinaryBasic(card.name, card.nature)
              && (!originalFilter || originalFilter(card, current, origin));
            const info = get.info(card);
            const range = lib.filter.selectTarget(card, player);
            const automatic = origin?.name === "chooseToRespond" || (card.name !== "sha"
              && !info.complexTarget && !info.complexSelect
              && (info.notarget || range[1] === -1 || (range[0] === 0 && range[1] === 0)));
            return {
              audio: false,
              direct: false,
              manualConfirm: true,
              fanPairedConfirm: true,
              filterCard: () => false,
              // 零素材且禁止原生提前自动确认，兼容关闭自动确认的响应场景。
              selectCard: [0, -1],
              viewAs: card,
              viewAsFilter: valid,
              filterOk: automatic ? () => confirmChihun(valid) : () => valid(_status.event.player),
              popname: true,
              async precontent(event, trigger, player) {
                if (!valid(player)) {
                  event.result.bool = false;
                  return;
                }
                player.removeMark("fan_chihun", 1);
                player.storage.fan_chihun_round = game.roundNumber;
                player.addTempSkill("fan_chihun_used", { global: "roundStart" });
                player.logSkill("fan_chihun");
                game.trySkillAudio("fan_chihun_convert", player, true);
              },
            };
          },
          prompt: links => links[0][2] === "sha" ? "炽魂：选择杀的目标" : "炽魂：使用所选基本牌",
        },
        ai: {
          order() { return get.order({ name: "sha" }) - 0.1; },
          respondSha: true, respondShan: true, save: true,
          skillTagFilter: canConvert,
          result: { player: player => canConvert(player) ? 1 : 0 },
        },
      },
      used: { charlotte: true },
    },
  },
  fan_fentian: {
    audio: false,
    locked: false,
    trigger: { player: "phaseUseBegin" },
    direct: true,
    filter: (event, player) => player.countMark("fan_chihun") > 0,
    async content(event, trigger, player) {
      const choices = Array.from({ length: player.countMark("fan_chihun") }, (_, i) => String(i + 1));
      const result = await player.chooseControl(...choices, "cancel2")
        .set("prompt", "焚天：选择移除的战意数")
        .set("prompt2", false)
        .set("ai", () => chargeChoice(player, choices)).forResult();
      if (result.control === "cancel2") return;
      const count = Number(result.control);
      if (!player.isIn() || !Number.isInteger(count) || count < 1 || count > player.countMark("fan_chihun")) return;
      player.logSkill("fan_fentian");
      player.removeMark("fan_chihun", count);
      player.addTempSkill("fan_fentian_buff", { player: "phaseUseAfter" });
      player.addMark("fan_fentian_buff", count, false);
      game.trySkillAudio("fan_fentian_charge", player, true);
    },
    group: "fan_fentian_end",
    subSkill: {
      buff: {
        audio: false,
        locked: false,
        charlotte: true, onremove: true, marktext: "焚",
        intro: { content: "本出牌阶段【杀】的使用次数+#" },
        mod: {
          cardUsable(card, player, num) {
            if (card.name === "sha") return num + player.countMark("fan_fentian_buff");
          },
        },
      },
      end: {
        audio: false,
        locked: false,
        trigger: { player: "phaseUseEnd" },
        direct: true,
        // 阶段结束效果独立检查；未移除标记也可在耗尽原有次数后发动。
        filter: (event, player) => phaseSha(player, event) > 0 && player.getCardUsable("sha") <= 0,
        async content(event, trigger, player) {
          const count = phaseSha(player, trigger);
          const result = await player.chooseTarget(get.prompt("fan_fentian"),
            `对一名角色造成${count}点火焰伤害`, () => true)
            .set("ai", target => fireValue(player, target, count)).forResult();
          if (!result.bool) return;
          const target = result.targets[0];
          if (!player.isIn() || !target.isIn()) return;
          player.logSkill("fan_fentian", target);
          game.trySkillAudio("fan_fentian_fire", player, true);
          await target.damage(count, "fire", player);
        },
      },
    },
  },
  fan_zailin: {
    audio: "ext:原神/audio/mavuika/skill:3",
    logAudio: () => false,
    locked: false,
    prompt: "你可以发动【再临】",
    prompt2: false,
    zhuSkill: true,
    limited: true,
    skillAnimation: true,
    animationColor: "fire",
    trigger: { player: "dying" },
    filter: (event, player) => !player.storage.fan_zailin && player.hasZhuSkill("fan_zailin"),
    check: (event, player) => game.countPlayer(target => target.group === "shu") > 0,
    async content(event, trigger, player) {
      if (player.storage.fan_zailin || !player.isIn() || !player.hasZhuSkill("fan_zailin")) return;
      const count = game.countPlayer(target => target.group === "shu");
      player.awakenSkill("fan_zailin");
      // X 在发动时取快照，先完整结算回复，再选择并逐个结算伤害。
      if (count > 0) {
        game.trySkillAudio("fan_zailin", player, true);
        await player.recover(count);
      }
      if (!count || !player.isIn()) return;
      const result = await player.chooseTarget("再临：你可以对至多" + count + "名角色各造成1点火焰伤害",
        [1, Math.min(count, game.countPlayer())], () => true)
        .set("ai", target => get.damageEffect(target, player, player, "fire")).forResult();
      if (!result.bool) return;
      const targets = result.targets.sortBySeat(_status.currentPhase || player);
      player.line(targets, "fire");
      for (const target of targets) {
        if (target.isIn()) await target.damage(1, "fire", player);
      }
    },
  },
};
