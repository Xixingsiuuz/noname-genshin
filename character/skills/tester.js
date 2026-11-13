import { lib, game, get, ui, _status } from "../../../../noname.js";
import characters from "../character.js";
import { createCardPackage } from "../../card/index.js";
import { cynoCardFaceMap as faces } from "../../card/cyno-faces.js";

const pileCards = () => [...ui.cardPile.childNodes, ...ui.discardPile.childNodes];
const cardLink = card => ["", "", card.name, card.nature];
const cardKey = ([, , name, nature]) => JSON.stringify([name, nature || ""]);
const confirm = "确定";

async function localDialog(player, title, setup) {
  const choice = player.chooseControl(confirm, "cancel2")
    .set("prompt", title).set("dialogcontrol", true).set("ai", () => "cancel2");
  let read;
  let cleanup;
  choice.set("addDialog", [[(dialog) => {
    for (const item of dialog.content.querySelectorAll(".pointerdiv")) item.parentNode.remove();
    let canConfirm = false;
    choice.controlbar = ui.create.control("ok", "cancel2", link => {
      if (_status.event !== choice || (link === "ok" && !canConfirm)) return;
      choice.result = { control: link === "ok" ? confirm : "cancel2" };
      game.resume();
    });
    const button = choice.controlbar.firstElementChild;
    const body = ui.create.div("", dialog.content);
    body.style.cssText = "position:relative;padding:8px 12px";
    const update = valid => {
      canConfirm = valid;
      button.style.opacity = valid ? "" : "0.45";
      button.style.pointerEvents = valid ? "" : "none";
      button.setAttribute("aria-disabled", String(!valid));
    };
    update(false);
    read = setup(body, update, dialog, callback => { cleanup = callback; });
  }, "handle"]]);
  try {
    const result = await choice.forResult();
    if (result.control === confirm) return read?.();
  } finally {
    cleanup?.();
  }
}

function adjustHealth(player) {
  return localDialog(player, "测试：调整体力值和上限", (body, update) => {
    const selects = ["体力值", "体力上限"].map(text => {
      const label = document.createElement("label");
      label.style.cssText = "display:inline-flex;align-items:center;gap:8px;margin:6px 12px";
      label.append(text);
      const select = document.createElement("select");
      select.style.cssText = "font:inherit;color:#fff2d8;background:#312821;border:1px solid #ae9068;border-radius:5px;padding:4px 10px;min-width:5em;color-scheme:dark";
      label.append(select);
      body.append(label);
      return select;
    });
    const [hpSelect, maxSelect] = selects;
    let max = Math.max(1, Number.isSafeInteger(player.maxHp) ? player.maxHp : 1);
    let hp = Math.max(1, Math.min(max, Math.floor(player.hp) || 1));
    function fill(select, value, limit, expandable) {
      const start = Math.max(1, value - 20);
      const end = Math.min(limit, value + 20);
      select.replaceChildren();
      if (start > 1) select.add(new Option("更小…", "less"));
      for (let n = start; n <= end; n++) select.add(new Option(String(n), String(n)));
      if (expandable || end < limit) select.add(new Option("更大…", "more"));
      select.value = String(value);
    }
    function render() {
      fill(maxSelect, max, Number.MAX_SAFE_INTEGER, max < Number.MAX_SAFE_INTEGER - 20);
      fill(hpSelect, hp, max, false);
      update(true);
    }
    const next = (value, current, limit) => value === "less" ? Math.max(1, current - 20)
      : value === "more" ? Math.min(limit, current + 20) : Number(value);
    maxSelect.onchange = () => {
      max = next(maxSelect.value, max, Number.MAX_SAFE_INTEGER);
      hp = Math.min(hp, max);
      render();
    };
    hpSelect.onchange = () => { hp = next(hpSelect.value, hp, max); render(); };
    render();
    return () => ({ hp, max });
  });
}

function selectCards(player, title, candidates, type, repeat, pendingLabel) {
  return localDialog(player, title, (body, update, dialog, onClose) => {
    const selected = [];
    const makeRow = label => {
      const caption = document.createElement("div");
      caption.textContent = label;
      body.append(caption);
      const row = ui.create.div(".buttons", body);
      row.style.cssText = "position:relative;max-height:24vh;overflow:auto";
      return row;
    };
    const pool = repeat ? ui.create.div(".buttons", body) : makeRow("候选牌");
    let pending;
    if (repeat) {
      dialog.forcebutton = false;
      dialog.classList.remove("forcebutton", "forcebutton-auto", "nobutton");
      dialog.classList.add("noupdate");
      Object.assign(dialog.style, {
        top: "8%",
        height: "62%",
        overflow: "visible",
        background: "rgba(0,0,0,.2)",
        borderRadius: "8px",
      });
      dialog.contentContainer.style.overflow = "hidden auto";
      body.style.cssText = "display:block;position:relative;box-sizing:border-box;width:100%;padding:0 8px 8px";
      pool.style.cssText = "position:relative;display:grid;grid-template-columns:repeat(6,minmax(0,1fr));justify-items:center;gap:10px 4px;width:100%";
      const panel = ui.create.div("", dialog);
      panel.style.cssText = "position:absolute;left:calc(100% + 10px);top:0;box-sizing:border-box;padding:8px 4px;background:rgba(0,0,0,.28);border:1px solid rgba(0,0,0,.2);border-radius:8px;overflow:auto";
      const caption = ui.create.div("", panel, pendingLabel);
      caption.style.position = "relative";
      pending = ui.create.div(".buttons", panel);
      pending.style.cssText = "position:relative;display:block";
      const resize = () => {
        const card = pool.firstElementChild;
        if (card?.offsetWidth && pool.clientWidth) {
          const zoom = Math.min(1, Math.max(1, pool.clientWidth - 20) / (6 * card.offsetWidth));
          for (const candidate of pool.children) candidate.style.zoom = String(zoom);
        }
        const room = ui.arena.clientWidth - dialog.offsetLeft - dialog.offsetWidth - 20;
        const beside = room >= 100;
        if (panel.parentNode !== (beside ? dialog : body)) (beside ? dialog : body).append(panel);
        panel.style.position = beside ? "absolute" : "relative";
        panel.style.left = beside ? "calc(100% + 10px)" : "0";
        panel.style.width = beside ? Math.min(room, 220) + "px" : "100%";
        panel.style.maxHeight = beside ? dialog.offsetHeight + "px" : "24vh";
      };
      const observer = new ResizeObserver(resize);
      observer.observe(dialog);
      observer.observe(ui.arena);
      onClose(() => observer.disconnect());
    } else {
      pending = makeRow(pendingLabel);
    }
    const add = (item, row, action) => {
      const button = ui.create.button(item, type, row, true);
      // Keep custom selection clicks while restoring the native card tooltip.
      lib.setIntro(button);
      button.style.cursor = "pointer";
      if (repeat) {
        button.style.position = "relative";
        if (row === pool) button.style.margin = "0";
      }
      button.listen(action);
      return button;
    };
    for (const item of candidates) {
      let token, badge, count = 0;
      const source = add(item, pool, () => {
        if (!repeat && selected.includes(item)) return;
        selected.push(item);
        if (!count) {
          if (repeat) source.classList.add("selected");
          else source.style.opacity = "0.45";
          token = add(item, pending, () => {
            selected.splice(selected.lastIndexOf(item), 1);
            if (--count === 0) {
              token.remove();
              source.classList.remove("selected");
              source.style.opacity = "";
            } else {
              badge.textContent = count > 1 ? "x" + count : "";
            }
            update(selected.length > 0);
          });
          if (repeat) {
            badge = ui.create.div("", token);
            badge.style.cssText = "position:absolute;left:5px;bottom:4px;z-index:2;color:#fff1b4;font:bold 15px sans-serif;text-shadow:0 1px 3px #000,0 0 4px #000;pointer-events:none";
          }
        }
        count++;
        if (badge) badge.textContent = count > 1 ? "x" + count : "";
        update(true);
      });
      if (repeat) dialog.buttons.push(source);
    }
    return () => selected.slice();
  });
}

export default {
  fan_ceshi: {
    enable: "phaseUse",
    fan_ceshi_auto: true,
    selectCard: 0,
    selectTarget: 0,
    filterCard: () => false,
    filterTarget: () => false,
    discard: false,
    lose: false,
    locked: false,
    async content(event, trigger, player) {
      const result = await player.chooseControl("获得牌", "摸牌", "获得技能", "获得衍生牌", "调整体力", "交给牌", "cancel2")
        .set("prompt", "测试").set("prompt2", false).set("ai", () => "cancel2").forResult();
      if (result.control === "摸牌") {
        const numbers = Array.from({ length: 10 }, (_, i) => String(i + 1));
        const choice = await player.chooseControl(...numbers, "cancel2")
          .set("prompt", "测试：选择摸牌张数").set("ai", () => "10").forResult();
        if (numbers.includes(choice.control) && player.isIn()) await player.draw(Number(choice.control));
        return;
      }
      if (result.control === "获得技能") {
        const roster = Object.keys(characters).filter(id => lib.character[id]);
        const selected = await player.chooseButton(["测试：选择武将", [roster, "character"]])
          .set("ai", () => 0).forResult();
        const name = selected.links?.[0];
        if (!selected.bool || !roster.includes(name)) return;
        const choices = characters[name][3].filter(id => lib.skill[id]);
        const choice = await player.chooseButton(["测试：选择技能", [choices.map(id => [id, get.translation(id)]), "textbutton"]])
          .set("filterButton", button => !player.hasSkill(button.link))
          .set("ai", () => 0).forResult();
        if (choice.bool && player.isIn() && choices.includes(choice.links[0]) && !player.hasSkill(choice.links[0])) player.addSkill(choice.links[0]);
        return;
      }
      // The tester's custom controls are local; the AI does not activate this debug skill.
      if (!event.isMine() || !player.isIn()) return;
      if (result.control === "调整体力") {
        const values = await adjustHealth(player);
        if (!values || !player.isIn()) return;
        game.broadcastAll((target, hp, maxHp) => {
          target.maxHp = maxHp;
          target.hp = hp;
          target.update();
        }, player, values.hp, values.max);
        return;
      }
      if (result.control === "交给牌") {
        const choice = await player.chooseCardTarget({
          prompt: "测试：选择要交给的牌和接收角色",
          prompt2: false,
          position: "hej",
          selectCard: [0, Infinity],
          selectTarget: 1,
          filterCard: () => true,
          filterTarget: (card, source, target) => source !== target && target.isIn(),
          filterOk: () => ui.selected.cards.length > 0 && ui.selected.targets.length === 1,
          manualConfirm: true,
          fanPairedConfirm: true,
          ai1: card => {
            const target = ui.selected.targets[0];
            return target && get.attitude(player, target) > 0 && !ui.selected.cards.length
              ? Math.max(0, 5 - get.value(card, player)) : 0;
          },
          ai2: target => get.attitude(player, target),
        }).forResult();
        const target = choice.targets?.[0];
        if (!choice.bool || !player.isIn() || !target?.isIn() || target === player) return;
        const available = player.getCards("hej");
        if (choice.cards?.length && choice.cards.every(card => available.includes(card))) {
          await player.give(choice.cards, target);
        }
        return;
      }
      if (result.control === "获得牌") {
        const catalog = [...new Set([...lib.inpile, ...pileCards().map(card => card.name)])].flatMap(id => id === "sha"
          ? [["", "", id], ["", "", id, "fire"], ["", "", id, "thunder"]]
          : [["", "", id]]);
        const links = await selectCards(player, "测试：选择要获得的牌", catalog, "vcard", true, "待获得");
        if (!links?.length || !player.isIn()) return;
        const available = pileCards();
        const cards = [];
        for (const link of links) {
          const index = available.findIndex(card => cardKey(cardLink(card)) === cardKey(link));
          if (index >= 0) cards.push(...available.splice(index, 1));
        }
        if (cards.length) await player.gain(cards, "gain2");
        return;
      }
      if (result.control !== "获得衍生牌") return;
      const names = Object.keys(createCardPackage().card).filter(id => lib.card[id]?.derivation);
      const links = await selectCards(player, "测试：选择要生成的衍生牌",
        names.map(id => ["", "", id]), "vcard", true, "待获得");
      if (!links?.length || !player.isIn()) return;
      const cards = links.filter(link => names.includes(link[2])).map(link => {
        const [suit, number] = faces[link[2]] || [];
        return game.createCard(link[2], suit, number);
      });
      if (cards.length) await player.gain(cards, "gain2");
    },
    ai: { order: 1, result: { player: 0 } },
  },
  fan_biesi: {
    trigger: { player: "die" },
    forceDie: true,
    direct: true,
    locked: false,
    filter(event, player) { return player.isDead(); },
    async content(event, trigger, player) {
      const result = await player.chooseBool("你可以发动【别死】复活").set("forceDie", true)
        .set("prompt2", false).set("ai", () => true).forResult();
      if (!result.bool || !player.isDead()) return;
      player.logSkill("fan_biesi");
      player.revive(player.maxHp);
    },
    ai: { threaten: 0.1 },
  },
};
