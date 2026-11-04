import { lib, game, ui, get, _status } from "../../../../noname.js";

const giftTag = "fan_wenbu_gift";
const freeTag = "fan_tongxuan_free";
const phaseOf = () => _status.event.getParent("phaseUse");
const canVisit = (player, target) => target !== player && target.isIn() && target.hasSkill("fan_wenbu")
  && !(phaseOf()?.fan_wenbu_visits || []).includes(target);

export default {
  fan_wenbu: { audio: "ext:原神/audio/baizhu/skill:3", global: "fan_wenbu_give" },
  fan_wenbu_give: {
    enable: "phaseUse",
    filter: (event, player) => player.countCards("h") > 0 && game.hasPlayer(target => canVisit(player, target)),
    position: "h", selectCard: [0, 1], filterCard: true,
    filterOk: () => ui.selected.cards.length === 1 && ui.selected.targets.length === 1,
    discard: false, lose: false, delay: false,
    // 唯一对象固定绑定，由原生 selectTarget:-1 自动选中；多人时才手选。
    selectTarget: () => _status.event.fan_wenbu_target ? -1 : 1,
    filterTarget: (card, player, target) => (!_status.event.fan_wenbu_target || target === _status.event.fan_wenbu_target)
      && canVisit(player, target),
    prompt: "问卜：交给白术一张手牌",
    onChooseToUse(event) {
      const phase = event.getParent("phaseUse");
      const targets = game.filterPlayer(target => target !== event.player && target.hasSkill("fan_wenbu")
        && !(phase?.fan_wenbu_visits || []).includes(target));
      event.set("fan_wenbu_target", targets.length === 1 ? targets[0] : null);
      event.set("fanPairedConfirm", true).set("manualConfirm", true);
    },
    async content(event, trigger, player) {
      const target = event.target;
      const phase = event.getParent("phaseUse");
      if (!phase || !target.isIn() || !target.hasSkill("fan_wenbu") || !player.getCards("h").includes(event.cards[0])) return;
      phase.fan_wenbu_visits ||= [];
      if (phase.fan_wenbu_visits.includes(target)) return;
      phase.fan_wenbu_visits.push(target);
      game.trySkillAudio("fan_wenbu", target, true, true);
      const gain = target.gain(event.cards, player, "giveAuto");
      gain.gaintag.add(giftTag);
      await gain;
      if (player.isIn()) await player.recover();
    },
    ai: { order: 5, result: { player: player => player.isDamaged() ? 2 : 0, target: 1 } },
  },
  fan_tongxuan: {
    audio: "ext:原神/audio/baizhu/skill:3",
    enable: "phaseUse", usable: 1, locked: false,
    async content(event, trigger, player) {
      const top = get.cards(5);
      await game.cardsGotoOrdering(top);
      const gifts = player.getCards("h", card => card.hasGaintag(giftTag));
      // 原顶牌只能留在原槽位或被换走，不能借下栏回到其他槽位。
      const validLayout = moved => {
        if (!Array.isArray(moved) || moved.length !== 2 || !moved.every(Array.isArray)
          || moved[0].length !== top.length || moved[1].length !== gifts.length) return false;
        const all = moved.flat();
        const original = top.concat(gifts);
        return new Set(all).size === original.length && all.length === original.length
          && all.every(card => original.includes(card))
          && moved[0].every((card, index) => !top.includes(card) || top[index] === card);
      };
      const result = await player.chooseToMove("通玄：以问卜手牌替换牌堆顶的牌")
        .set("list", [["牌堆顶（从左至右）", top.slice()], ["问卜手牌", gifts.slice()]])
        .set("fanPairedConfirm", true)
        .set("filterMove", (from, to, moved) => {
          if (typeof to === "number") return false;
          const fromRow = moved.findIndex(row => row.includes(from.link));
          const toRow = moved.findIndex(row => row.includes(to.link));
          if (fromRow < 0 || toRow < 0 || fromRow === toRow) return false;
          const next = moved.map(row => row.slice());
          const fromIndex = next[fromRow].indexOf(from.link), toIndex = next[toRow].indexOf(to.link);
          [next[fromRow][fromIndex], next[toRow][toIndex]] = [to.link, from.link];
          return validLayout(next);
        })
        .set("filterOk", moved => validLayout(moved) && moved[0].some(card => gifts.includes(card)))
        .set("processAI", list => {
          const moved = list.map(row => row[1].slice());
          for (let i = 0; i < moved[0].length; i++) {
            const j = moved[1].findIndex(card => gifts.includes(card) && get.value(card, player) < get.value(moved[0][i], player));
            if (j >= 0) [moved[0][i], moved[1][j]] = [moved[1][j], moved[0][i]];
          }
          return moved;
        }).forResult();
      let pile = top, gains = [], costs = [];
      if (result.bool && validLayout(result.moved)) {
        costs = result.moved[0].filter(card => gifts.includes(card));
        gains = top.filter(card => !result.moved[0].includes(card));
        if (costs.length === gains.length
          && costs.every(card => player.getCards("h").includes(card) && card.hasGaintag(giftTag))) {
          pile = result.moved[0];
          if (costs.length) await player.lose(costs, ui.ordering);
        } else { gains = []; costs = []; }
      }
      // 处理区的牌可能被失牌触发移走；不从其他区域强取。
      const available = card => get.position(card, true) === "o";
      await game.cardsGotoPile(pile.filter(available).slice().reverse(), "insert");
      game.updateRoundNumber();
      gains = gains.filter(available);
      if (gains.length && player.isIn()) {
        const gain = player.gain(gains, "draw");
        gain.gaintag.add(freeTag);
        await gain;
      }
    },
    mod: {
      ignoredHandcard: card => card.hasGaintag(freeTag) ? true : undefined,
      cardDiscardable(card, player, name) { if (name === "phaseDiscard" && card.hasGaintag(freeTag)) return false; },
    },
    ai: { order: 7, result: { player: 1 } },
  },
  fan_shiqi: {
    audio: "ext:原神/audio/baizhu/skill:3",
    trigger: { global: "dying" }, limited: true, skillAnimation: true, animationColor: "wood", locked: false,
    filter: (event, player) => !player.storage.fan_shiqi_used && event.player !== player && event.player.isIn() && event.player.hp <= 0,
    prompt: "你可以发动【拾柒】救援该角色", prompt2: false,
    check: (event, player) => get.attitude(player, event.player) > 0,
    async content(event, trigger, player) {
      const target = trigger.player;
      if (player.storage.fan_shiqi_used || !target.isIn() || target.hp > 0) return;
      player.storage.fan_shiqi_used = true;
      player.awakenSkill("fan_shiqi");
      const originals = target.getOriginalSkills().slice();
      await target.recover(target.maxHp - target.hp);
      if (!target.isIn()) return;
      target.clearSkills(true);
      target.storage.fan_shiqi_returns ||= [];
      target.storage.fan_shiqi_returns.push({ owner: player, skills: originals });
      target.addSkill("fan_shiqi_return");
    },
    ai: { expose: 0.3 },
  },
  fan_shiqi_return: {
    charlotte: true, superCharlotte: true, forced: true, popup: false,
    trigger: { player: "phaseZhunbeiBegin" },
    filter: (event, player) => event.player === player && !!player.storage.fan_shiqi_returns?.length,
    async content(event, trigger, player) {
      // 原生判定完整结算改判等效果后，读取最终判定点数。
      const result = await player.judge({
        judge: card => get.number(card) === 7 ? 1 : -1,
        judge2: result => result.number === 7,
      }).forResult();
      if (result.number !== 7 || !player.isIn()) return;
      const originals = [...new Set((player.storage.fan_shiqi_returns || []).flatMap(record => record.skills))];
      const pool = originals.filter(skill => lib.skill[skill] && !player.hasSkill(skill, null, false, false));
      if (pool.length) await player.addSkills(pool.randomGet());
    },
  },
};
