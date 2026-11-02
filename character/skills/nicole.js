import { startNicoleStory, finishNicoleStory } from "../../ui/nicole-audio.js";
import { lib, game, get, ui, _status } from "../../../../noname.js";

const names = () => lib.inpile.filter(name => ["basic", "trick"].includes(get.type(name)));
const chosen = player => player.getStorage("fan_tianlin_names");
const memories = player => player.getExpansions("fan_tianlin");
const sources = () => game.filterPlayer(player => player.hasSkill("fan_tianlin")
  && !player.storage.fan_duanyu_failed && player.storage.fan_tianlin_current);
const colors = ["red", "black", "none"];
function materials(player, color) {
  return player.getCards("h", card => get.color(card, player) === color);
}
function unused(player, color) {
  return player.storage.fan_tianlin_round !== game.roundNumber
    || !player.getStorage("fan_tianlin_colors").includes(color);
}
function options(event, player) {
  return sources().flatMap(owner => colors.filter(color => {
    const cards = materials(player, color);
    const card = get.autoViewAs({ name: owner.storage.fan_tianlin_current }, cards);
    return cards.length && unused(player, color)
      && cards.every(item => game.checkMod(item, player, "unchanged", "cardEnabled2", player) !== false)
      && (event._backup?.filterCard || event.filterCard)(card, player, event);
  }).map(color => [owner, color]));
}
function orderingUse(event) {
  const ordering = event.getParent();
  if (ordering?.name !== "orderingDiscard") return;
  const use = ordering.relatedEvent || ordering.getParent();
  return use?.name === "useCard" ? use : undefined;
}
export default {
  fan_tianlin_before: { audio: "ext:原神/audio/nicole/skill:2" },
  fan_tianlin_after: { audio: "ext:原神/audio/nicole/skill:5" },
  fan_duanyu_guard: { audio: "ext:原神/audio/nicole/skill:3" },
  fan_tianlin_draw_voice: { audio: "ext:原神/audio/nicole/skill:3" },
  fan_xuanji_story: { audio: "ext:原神/audio/nicole/skill:5" },
  fan_duanyu_success: { audio: "ext:原神/audio/nicole/skill/fan_duanyu_success.mp3" },
  fan_duanyu_failure: { audio: "ext:原神/audio/nicole/skill/fan_duanyu_failure.mp3" },

  fan_tianlin: {
    audio: false,
    locked: true, forced: true, mark: true, marktext: "忆",
    trigger: { global: "roundStart" },
    global: "fan_tianlin_convert",
    group: ["fan_tianlin_record", "fan_tianlin_collect", "fan_tianlin_draw"],
    onremove(player) {
      const cards = memories(player);
      if (cards.length) player.loseToDiscardpile(cards);
      delete player.storage.fan_tianlin_order;
    },
    intro: { content(storage, player) {
      return `已选：${get.translation(chosen(player)) || "无"}<br>本轮：${get.translation(player.storage.fan_tianlin_current) || "无"}<br>忆：${memories(player).length}张`;
    } },
    async content(event, trigger, player) {
      const remaining = names().filter(name => !chosen(player).includes(name));
      if (!remaining.length) return;
      const result = await player.chooseButton(["天霖：选择牌名", [remaining.map(name => [get.type(name), "", name]), "vcard"]], true)
        .set("ai", button => {
          const name = button.link[2];
          return game.filterPlayer(target => !player.storage.fan_duanyu_failed || target !== player).reduce((sum, target) => sum + get.attitude(player, target)
            * target.getUseValue({ name }) / Math.max(1, target.countCards("h")), 0)
            + (get.tag({ name }, "damage") ? 8 : 0);
        }).forResult();
      if (!result.bool) return;
      const name = result.links[0][2];
      if (!remaining.includes(name)) return;
      game.trySkillAudio(player.storage.fan_duanyu_failed ? "fan_tianlin_after" : "fan_tianlin_before", player, true);
      player.storage.fan_tianlin_names = [...chosen(player), name];
      player.storage.fan_tianlin_current = name;
      player.markSkill("fan_tianlin");
      game.log(player, "为【天霖】选择了", "#y" + get.translation(name));
      if (!player.storage.fan_duanyu_done && player.hasSkill("fan_duanyu")
        && names().every(item => chosen(player).includes(item))) {
        player.storage.fan_duanyu_done = true;
        player.awakenSkill("fan_duanyu");
        game.trySkillAudio("fan_duanyu_success", player, true);
        const winners = player.getFriends(true, true);
        game.over(player === game.me || winners.includes(game.me));
      }
    },
  },
  fan_tianlin_convert: {
    enable: "chooseToUse", locked: false, direct: true,
    filter: (event, player) => options(event, player).length > 0,
    hiddenCard: (player, name) => sources().some(owner => owner.storage.fan_tianlin_current === name)
      && colors.some(color => unused(player, color) && materials(player, color).length),
    chooseButton: {
      select: [0, 1],
      filter(button, player) {
        const [id, color] = button.link.split("|");
        return options(_status.event.getParent(), player).some(([owner, item]) => owner.playerid === id && item === color);
      },
      filterOk() {
        const chooser = _status.event;
        chooser.fanPairedConfirm = true;
        // 颜色选择期间预览素材；不把实体素材混入 chooseButton 的规则结果。
        const hand = chooser.player.getCards("h");
        const selected = ui.selected.buttons.length === 1 ? ui.selected.buttons[0].link.split("|")[1] : null;
        for (const card of hand) {
          const active = selected !== null && get.color(card, chooser.player) === selected;
          card.classList.toggle("selected", active);
          card.updateTransform?.(active);
        }
        if (!chooser.fan_tianlin_preview) {
          chooser.fan_tianlin_preview = true;
          const original = chooser.custom.add.confirm;
          chooser.custom.add.confirm = bool => {
            for (const card of hand) {
              card.classList.remove("selected");
              card.updateTransform?.(false);
            }
            original?.(bool);
          };
        }
        if (ui.selected.buttons.length !== 1) return false;
        const [id, color] = ui.selected.buttons[0].link.split("|");
        const parent = _status.event.getParent();
        return options(parent, _status.event.player).some(([owner, item]) => owner.playerid === id && item === color);
      },
      dialog(event, player) {
        const owners = sources();
        return ui.create.dialog("天霖：选择转化", [owners.flatMap(owner => colors
          .filter(color => color !== "none" || materials(player, color).length)
          .map(color => [`${owner.playerid}|${color}`, `${owners.length > 1 ? get.translation(owner) + "：" : ""}${color === "red" ? "红色" : color === "black" ? "黑色" : "无色"}手牌（${materials(player, color).length}张）→${get.translation(owner.storage.fan_tianlin_current)}`])), "textbutton"]);
      },
      check(button) {
        const [id, color] = button.link.split("|");
        const player = get.player(), owner = sources().find(item => item.playerid === id);
        if (!owner) return 0;
        const cards = materials(player, color);
        return player.getUseValue({ name: owner.storage.fan_tianlin_current })
          - cards.reduce((sum, card) => sum + get.value(card, player), 0) / 2
          + get.attitude(player, owner) / 5;
      },
      backup(links, player) {
        const [id, color] = links[0].split("|");
        const owner = sources().find(item => item.playerid === id);
        const name = owner?.storage.fan_tianlin_current;
        const snapshot = materials(player, color);
        const info = get.info({ name });
        const range = get.select(info.selectTarget);
        const automatic = !info.complexTarget && !info.complexSelect
          && (info.notarget || range[1] === -1 || range[0] === 0 && range[1] === 0);
        return {
          position: "h", selectCard: automatic ? 0 : -1, manualConfirm: !automatic, direct: false,
          fanPairedConfirm: !automatic, fan_tianlin_auto: automatic,
          filterCard: card => !automatic && snapshot.includes(card),
          viewAs: automatic ? undefined : { name, storage: { fan_tianlin_owner: id, fan_tianlin_color: color } },
          ...(automatic ? { selectTarget: 0, filterTarget: () => false, discard: false, lose: false } : {}),
          filterOk() {
            const player = _status.event.player, cards = materials(player, color);
            return sources().includes(owner) && owner.storage.fan_tianlin_current === name
              && unused(player, color) && cards.length > 0 && (automatic || cards.length === ui.selected.cards.length)
              && cards.length === snapshot.length && cards.every(card => snapshot.includes(card))
              && cards.every(card => (automatic || ui.selected.cards.includes(card))
                && game.checkMod(card, player, "unchanged", "cardEnabled2", player) !== false);
          },
          async precontent(event, trigger, player) {
            if (automatic) {
              const card = get.autoViewAs({ name, storage: {
                fan_tianlin_owner: id, fan_tianlin_color: color,
              } }, snapshot);
              const parent = event.getParent();
              const legal = sources().includes(owner) && unused(player, color)
                && materials(player, color).length === snapshot.length
                && snapshot.every(item => player.getCards("h").includes(item))
                && (parent._backup?.filterCard || lib.filter.filterCard)(card, player, parent);
              if (!legal) { event.result.bool = false; event.result.cancel = true; return; }
              Object.assign(event.result, { card, cards: snapshot.slice(), targets: info.notarget ? []
                : game.filterPlayer(target => lib.filter.filterTarget(card, player, target)) });
              delete event.result.skill;
            }
            player.storage.fan_tianlin_colors = player.storage.fan_tianlin_round === game.roundNumber
              ? [...player.getStorage("fan_tianlin_colors"), color] : [color];
            player.storage.fan_tianlin_round = game.roundNumber;
          },
        };
      },
      prompt: () => "天霖：使用此颜色的所有手牌",
    },
    ai: { order: 5, respondSha: true, respondShan: true, save: true,
      skillTagFilter(player, tag, arg) {
        if (arg === "respond") return false;
        const name = tag === "respondSha" ? "sha" : tag === "respondShan" ? "shan" : "tao";
        return lib.skill.fan_tianlin_convert.hiddenCard(player, name);
      }, result: { player: 1 } },
  },
  fan_tianlin_draw: {
    audio: false,
    locked: true, forced: true, popup: false,
    trigger: { global: "useCardAfter" },
    filter: (event, player) => event.card?.storage?.fan_tianlin_owner === player.playerid,
    async content(event, trigger, player) { if (player.isIn()) { game.trySkillAudio("fan_tianlin_draw_voice", player, true); await player.draw(); } },
  },
  fan_tianlin_record: {
    audio: false,
    locked: true, forced: true, popup: false,
    trigger: { global: "useCardToPlayered" },
    filter: (event, player) => event.player !== player && player.storage.fan_duanyu_failed && chosen(player).includes(event.card.name)
      && !get.is.convertedCard(event.card)
      && event.player.getHistory("lose", loss => loss.getParent() === event.getParent()
        && event.cards?.length === 1 && loss.hs?.includes(event.cards[0])).length > 0,
    async content(event, trigger, player) {
      const use = trigger.getParent();
      if (!use.fan_tianlin_collectors) use.fan_tianlin_collectors = [];
      if (!use.fan_tianlin_collectors.includes(player.playerid)) use.fan_tianlin_collectors.push(player.playerid);
    },
  },
  fan_tianlin_collect: {
    audio: false,
    locked: true, forced: true, popup: false,
    trigger: { global: ["cardsDiscardAfter", "useCardAfter"] },
    filter(event, player) {
      const use = event.name === "useCard" ? event : orderingUse(event);
      return use?.fan_tianlin_collectors?.includes(player.playerid)
        && !use.fan_tianlin_collected?.includes(player.playerid);
    },
    async content(event, trigger, player) {
      const use = trigger.name === "useCard" ? trigger : orderingUse(trigger);
      // useCardAfter 尚在处理区时等实际入弃牌堆；没有实体素材也仅摸一次。
      if (trigger.name === "useCard" && use.cards?.some(card => get.position(card, true) === "o")) return;
      (use.fan_tianlin_collected ||= []).push(player.playerid);
      const cards = (use.cards || []).filter(card => get.position(card, true) === "d"
        && (trigger.name === "useCard" || trigger.cards.includes(card)));
      if (cards.length) {
        await player.addToExpansion(cards, "gain2").set("gaintag", ["fan_tianlin"]);
        (player.storage.fan_tianlin_order ||= []).push(...cards);
      }
      if (player.isIn()) { game.trySkillAudio("fan_tianlin_draw_voice", player, true); await player.draw(); }
    },
  },
  fan_duanyu: {
    audio: false,
    dutySkill: true, locked: false, forced: true, derivation: ["fan_xuanji"],
    trigger: { player: "damageBegin4" },
    filter: (event, player) => !player.storage.fan_duanyu_done,
    async content(event, trigger, player) {
      if (player.storage.fan_duanyu_done) return;
      trigger.cancel();
      if (!!player.storage.fan_tianlin_current && trigger.card?.name === player.storage.fan_tianlin_current) {
        game.trySkillAudio("fan_duanyu_guard", player, true);
        return;
      }
      if (player.storage.fan_duanyu_done) return;
      player.storage.fan_duanyu_done = true;
      player.storage.fan_duanyu_failed = true;
      player.awakenSkill("fan_duanyu");
      game.trySkillAudio("fan_duanyu_failure", player, true);
      await player.draw(2);
      player.addSkill("fan_xuanji");
      player.markSkill("fan_tianlin");
    },
    ai: { effect: { target(card, source, target) {
      if (!get.tag(card, "damage")) return;
      if (target.storage.fan_duanyu_done) return;
      if (target.storage.fan_tianlin_current && card.name === target.storage.fan_tianlin_current) return "zerotarget";
      // 按用户设计，使命失败是正常路线：未获本轮防止的伤害按原生收益评估。
      // 不额外加入使命进度、阻止胜利或破盾的策略分值。

    } } },
  },
  fan_xuanji: {
    audio: false,
    locked: false, forced: true,
    trigger: { player: "phaseJieshuBegin" },
    filter: (event, player) => memories(player).length > 0,
    async content(event, trigger, player) {
      startNicoleStory(player);
      try {
      const targets = game.filterPlayer(target => target !== player).sortBySeat(_status.currentPhase || player);
      const declined = [];
      for (const target of targets) {
        if (!player.isIn()) return;
        if (!target.isIn()) continue;
        const result = await target.chooseControl("失去体力", "令其摸牌", "cancel2")
          .set("prompt", `喧寂：失去1点体力，或令${get.translation(player)}摸两张牌`)
          .set("prompt2", false).set("ai", () => {
            if (get.attitude(target, player) > 0) return 1;
            const threatened = memories(player).some(card => get.effect(target, card, player, target) < 0);
            if (!threatened) return 2;
            if (target.hp <= 1) return 1;
            return target.hp > 2 && get.attitude(target, player) < -2 ? 0 : 1;
          }).forResult();
        if (!target.isIn() || !player.isIn()) continue;
        if (result.control === "cancel2") {
          declined.push(target);
          continue;
        }
        target.addTempSkill("fan_xuanji_protect", { global: "phaseAfter" });
        target.markAuto("fan_xuanji_protect", [player]);
        if (result.control === "失去体力") await target.loseHp();
        else await player.draw(2);
      }
      const queue = (player.storage.fan_tianlin_order || []).filter(card => memories(player).includes(card));
      for (const card of queue) {
        if (!player.isIn()) break;
        if (!memories(player).includes(card) || !player.hasUseTarget(card, false, true)) continue;
        // 原生选择器自动绑定指定实体牌，距离修正仅在此选择及其用牌子事件内有效。
        await player.chooseToUse({
          prompt: `喧寂：使用${get.translation(card)}`,
          prompt2: `未作出选择：${declined.filter(target => target.isIn()).map(target => get.translation(target)).join("、") || "无"}`,
          forced: true,
          position: "x", selectCard: -1, fan_xuanji_card: card,
          filterCard(item, actor) {
            return item === _status.event.fan_xuanji_card && memories(actor).includes(item)
              && lib.filter.cardEnabled(item, actor) && lib.filter.cardUsable(item, actor);
          },
          filterOk() {
            const event = _status.event, card = event.fan_xuanji_card;
            return ui.selected.cards.length === 1 && ui.selected.cards[0] === card
              && memories(event.player).includes(card) && lib.filter.cardEnabled(card, event.player)
              && lib.filter.cardUsable(card, event.player);
          },
        });
      }
      finishNicoleStory(player);
      const remaining = memories(player).slice();
      if (remaining.length) await player.loseToDiscardpile(remaining);
      player.storage.fan_tianlin_order = (player.storage.fan_tianlin_order || []).filter(card => memories(player).includes(card));
      } finally { finishNicoleStory(player); }
    },
    mod: { targetInRange(card, player) {
      let event = _status.event;
      while (event) {
        if (event.fan_xuanji_card && (card === event.fan_xuanji_card || card.cards?.includes(event.fan_xuanji_card))) return true;
        event = event.parent;
      }
    } },
  },
  fan_xuanji_protect: {
    charlotte: true, onremove: true,
    trigger: { player: "damageBegin4" }, forced: true, popup: false,
    filter: (event, player) => player.getStorage("fan_xuanji_protect").includes(event.source),
    async content(event, trigger) { trigger.cancel(); },
    ai: { effect: { target(card, source, target) {
      if (get.tag(card, "damage") && target.getStorage("fan_xuanji_protect").includes(source)) return "zerotarget";
    } } },
  },
};
