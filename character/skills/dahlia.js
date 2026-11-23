import { lib, game, get, ui, _status } from "../../../../noname.js";

const chosenMaterials = new WeakMap();

// Read the complete current-turn history, including uses before gaining this skill.
export function freshTargets(player) {
  const used = new Set(player.getHistory("useCard").flatMap(event => event.fan_haoshi_targets || event.targets || []));
  return game.players.filter(target => target.isIn() && !used.has(target));
}
function options() {
  return lib.inpile.filter(name => get.type(name) === "trick").map(name => ["锦囊", "", name]);
}
function availableTrick(event, player, name) {
  const fresh = freshTargets(player);
  if (!fresh.length || player.countCards("hes") < fresh.length) return false;
  const card = {name, isCard:true};
  const filter = event._backup?.filterCard || event.filterCard;
  if (!filter(card, player, event)) return false;
  const info = get.info(card);
  if (info.notarget) return true;
  return fresh.some(target => lib.filter.filterTarget(card, player, target)
    && (!info.singleCard || !info.filterAddedTarget || fresh.some(other => other !== target
      && info.filterAddedTarget(card, player, other, target))));
}
export default {
  fan_zhuji: {
    audio: false, locked: false, trigger: {player: "phaseUseBegin"},
    prompt: "你可以发动【祝祭】", prompt2: false,
    check: (event, player) => game.players.some(target => target !== player && get.attitude(player, target) > 0),
    async content(event, trigger, player) {
      const targets = [player];
      const others = game.players.filter(target => target !== player).sortBySeat(_status.currentPhase || player);
      for (const target of others) {
        if (!player.isIn()) return;
        if (!target.isIn() || !target.countCards("h")) continue;
        const result = await target.chooseCard("h", "祝祭：你可以交给塔利雅一张手牌")
          .set("prompt2", false).set("ai", card => {
            const attitude = get.attitude(target, player);
            return (attitude > 0 ? 7 : 3) - get.value(card, target);
          }).forResult();
        const card = result.cards?.[0];
        if (!result.bool || !card || !target.isIn() || !player.isIn() || !target.getCards("h").includes(card)) continue;
        await target.give(card, player);
        targets.push(target);
      }
      if (!player.isIn()) return;
      const actual = targets.filter(target => target.isIn()).sortBySeat(_status.currentPhase || player);
      if (actual.length) await player.useCard({name: "wugu", isCard: true}, actual, false);
    },
  },
  fan_haoshi: {
    audio: false, locked: false, direct: true, enable: "phaseUse",
    targetprompt2(target) {
      const player = get.player(), card = get.card();
      if (_status.event.skill === "fan_haoshi_backup" && card && freshTargets(player).includes(target)
        && lib.filter.filterTarget(card, player, target)) return "好事目标";
    },
    onChooseToUse(event) {
      event.targetprompt2.add(lib.skill.fan_haoshi.targetprompt2);
      if (event.skill !== "fan_haoshi_backup" || !event.isMine() || event.fanHaoshiPending) return;
      event.fanHaoshiPending = true;
      setTimeout(() => {
        delete event.fanHaoshiPending;
        if (_status.event !== event || event.skill !== "fan_haoshi_backup" || event.result?.card) return;
        const backup = lib.skill.fan_haoshi_backup;
        const range = get.select(get.info(backup.viewAs).selectTarget);
        if (range[0] !== -1 && !get.info(backup.viewAs).notarget) return;
        if (!game.check() || _status.event !== event || !backup.filterOk()) return;
        ui.confirm?.close();
        if (event.skillDialog === true) event.skillDialog = false;
        ui.click.ok();
      }, 0);
    },
    group: "fan_haoshi_record",
    subSkill: {record: {
      audio: false, locked: false, forced: true, popup: false,
      trigger: {player: "useCard"},
      async content(event, trigger) { trigger.fan_haoshi_targets = (trigger.targets || []).slice(); },
    }},
    filter: (event, player) => options().some(link => availableTrick(event, player, link[2])),
    chooseButton: {
      dialog(event, player) {
        chosenMaterials.delete(player);
        const dialog = ui.create.dialog("好事：选择普通锦囊牌和素材", [options(event, player), "vcard"]);
        if (event.isMine()) {
          const labels = game.players.map(target => {
            const node = ui.create.div(".damage.normal-font.damageadded", target);
            node.dataset.nature = "soil";
            node.style.pointerEvents = "none";
            return {target, node};
          });
          const update = () => {
            const link = ui.selected.buttons[0]?.link;
            const card = link ? {name:link[2], cards:ui.selected.cards.slice(), isCard:true} : null;
            labels.forEach(({target,node}) => {
              node.innerHTML = freshTargets(player).includes(target)
                && (!card || lib.filter.filterTarget(card, player, target)) ? "好事目标" : "";
            });
          };
          update();
          const timer = setInterval(update, 80);
          const close = dialog.close;
          dialog.close = function (...args) {
            clearInterval(timer);
            labels.forEach(({node}) => node.remove());
            return close.apply(this, args);
          };
        }
        return dialog;
      },
      select: [0, 1],
      filter(button) {
        const event = _status.event;
        if (!event.fanHaoshiMaterials) {
          event.fanHaoshiMaterials = true;
          event.position = "hes";
          event.selectCard = () => [0, freshTargets(event.player).length];
          event.filterCard = (card, player) => ui.selected.buttons.length === 1
            && player.getCards("hes").includes(card)
            && game.checkMod(card, player, "unchanged", "cardEnabled2", player) !== false;
          event.fanPairedConfirm = true;
          event.manualConfirm = true;
          event.processAI = () => {
            const player = event.player, count = freshTargets(player).length;
            const cards = player.getCards("hes").filter(card => game.checkMod(card, player, "unchanged", "cardEnabled2", player) !== false)
              .sort((a,b) => get.value(a,player)-get.value(b,player)).slice(0,count);
            let best, score = 0;
            if (cards.length === count && count > 0) for (const button of event.dialog.buttons) {
              if (!event.filterButton(button, player)) continue;
              const value = player.getUseValue({name:button.link[2]}) - cards.reduce((sum,card)=>sum+get.value(card,player),0)/2;
              if (value > score) { score = value; best = button; }
            }
            if (best) chosenMaterials.set(player, cards); else chosenMaterials.delete(player);
            return best ? {bool:true,links:[best.link],cards} : {bool:false};
          };
          queueMicrotask(() => { if (_status.event === event) game.check(); });
        }
        return availableTrick(event.getParent(), event.player, button.link[2]);
      },
      filterOk() {
        const event = _status.event;
        const valid = ui.selected.buttons.length === 1 && freshTargets(event.player).length > 0
          && ui.selected.cards.length === freshTargets(event.player).length
          && ui.selected.cards.every(card => event.filterCard(card, event.player));
        if (valid) chosenMaterials.set(event.player, ui.selected.cards.slice());
        return valid;
      },
      check: button => _status.event.player.getUseValue({name: button.link[2]}),
      backup(links, player) {
        const name = links[0][2];
        const materials = chosenMaterials.get(player);
        chosenMaterials.delete(player);
        const valid = player => Array.isArray(materials) && materials.length === freshTargets(player).length
          && materials.length > 0 && materials.every(card => player.getCards("hes").includes(card)
            && game.checkMod(card, player, "unchanged", "cardEnabled2", player) !== false);
        return {
          audio: false, position: "hes", viewAs: {name},
          selectCard: -1, manualConfirm: true, fanPairedConfirm: true,
          viewAsFilter: valid,
          filterCard: (card, player) => valid(player) && materials.includes(card), complexCard: true,
          check: card => 6 - get.value(card),
          filterTarget(card, player, target) {
            return freshTargets(player).includes(target) && lib.filter.filterTarget(card, player, target);
          },
          filterOk() {
            const player = _status.event.player;
            const fresh = freshTargets(player);
            return valid(player) && ui.selected.cards.length === fresh.length
              && ui.selected.targets.every(target => fresh.includes(target));
          },
          async precontent(event, trigger, player) {
            const fresh = freshTargets(player);
            if (!valid(player) || event.result.cards.length !== fresh.length || event.result.targets?.some(target => !fresh.includes(target))) {
              event.result.bool = false;
            }
          },
        };
      },
      prompt: links => "好事：将X张牌当" + get.translation(links[0][2]) + "使用",
    },
    mod: {playerEnabled(card, player, target) {
      if (_status.event.skill === "fan_haoshi_backup" && !freshTargets(player).includes(target)) return false;
    }},
    ai: {order: 8, result: {player: 1}},
  },
};
