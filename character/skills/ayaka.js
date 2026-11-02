import { game, get, _status } from "../../../../noname.js";

const usedSha = (player, phase) => player.getHistory("useCard", e => e.getParent("phaseUse") === phase && e.card.name === "sha").length > 0;
const links = player => player.getStorage("fan_binghua_links");
const discardableSha = player => player.getDiscardableCards(player, "h", card => get.name(card, player) === "sha");
const exchangeValue = (player, x) => {
  const cards = discardableSha(player).sort((a, b) => get.value(a, player) - get.value(b, player)).slice(0, x);
  const draw = x * get.effect(player, { name: "draw" }, player, player) / Math.max(1, Math.abs(get.attitude(player, player)));
  return draw - cards.reduce((sum, card) => sum + Math.max(0, get.value(card, player)) / 5, 0);
};

// 对方拥有选项决定权，按两种分支中较差的收益决定是否发动。
function binghuaValue(player, target) {
  const attitude = get.attitude(player, target);
  if (links(player).some(link => link.target === target)) return 0;
  const hand = player.getCards("h");
  const attacks = hand.filter(card => get.tag(card, "damage") && get.effect(target, card, player, player) > 0).length;
  const canTake = player.countGainableCards(target, "hej") > 0;
  const distance = (canTake ? Math.min(player.countCharge(), attacks + 1) * 1.4 : 0)
    + (attacks && get.distance(player, target) > 1 ? 1 : 0)
    - Math.min(target.countCharge(), player.countCards("hej")) * 0.8;
  const distanceValue = distance * Math.max(-1, Math.min(1.5, -attitude / 3));
  const x = Math.max(1, player.countCharge());
  if (discardableSha(target).length < x) return distanceValue;
  const exchange = exchangeValue(player, x) + Math.max(-1, Math.min(1, attitude / 5)) * exchangeValue(target, x);
  return Math.min(distanceValue, exchange);
}

export default {
  fan_bailu: {
    audio: ["ext:原神/audio/ayaka/skill/fan_bailu.mp3", "ext:原神/audio/ayaka/skill/fan_bailu_party.mp3"],
    locked: true,
    trigger: { target: "useCardToTarget" }, forced: true,
    usable: 1,
    filter: (event, player) => !(player.storage.counttrigger?.fan_bailu > 0)
      && get.color(event.card, event.player) === "black" && event.getParent().targets.includes(player),
    async content(event, trigger, player) {
      trigger.getParent().targets.remove(player);
      if (player.isIn()) await player.draw(1);
    },
    ai: {
      effect: {
        target(card, player, target, current, isLink) {
          // 连环传导不是成为牌的目标，不触发白鹭。
          if (isLink || target.storage.counttrigger?.fan_bailu > 0 || get.color(card, player) !== "black") return;
          // 只替换绫华这一目标的收益；其他目标和使用者的技能收益仍由引擎评估。
          // 使用原生摸牌评估，兼容摸牌收益被其他技能改变的情况。
          const draw = get.effect(target, { name: "draw" }, target, target);
          const selfAttitude = Math.max(1, Math.abs(get.attitude(target, target)));
          return [0, draw / selfAttitude];
        },
      },
    },
  },
  fan_moran: {
    audio: "ext:原神/audio/ayaka/skill:2",
    locked: true,
    trigger: { player: "phaseUseEnd" },
    forced: true,
    filter: (event, player) => !usedSha(player, event),
    async content(event, trigger, player) {
      if (!player.isIn()) return;
      player.addCharge(1);
      player.addGaintag(player.getCards("h", card => get.name(card, player) === "sha"), "fan_moran_sha");
      player.addSkill("fan_moran_effect");
    },
    subSkill: {
      effect: {
        locked: true, mark: true, marktext: "染",
        onremove(player) { player.removeGaintag("fan_moran_sha"); },
        intro: { content: "手牌中的杀不计入手牌上限和次数限制，直到下个使用过杀的出牌阶段结束" },
        trigger: { player: "phaseUseEnd" }, forced: true, popup: false,
        filter: (event, player) => usedSha(player, event),
        async content(event, trigger, player) { player.removeSkill("fan_moran_effect"); },
        group: "fan_moran_refund",
        mod: {
          cardUsable(card, player) {
            if (card.name !== "sha") return;
            const materials = card.cards?.length ? card.cards : [card];
            const hand = player.getCards("h");
            if (materials.every(material => hand.includes(material) && material.hasGaintag("fan_moran_sha"))) return Infinity;
          },
          ignoredHandcard(card, player) { if (card.hasGaintag("fan_moran_sha")) return true; },
          cardDiscardable(card, player, name) { if (name === "phaseDiscard" && card.hasGaintag("fan_moran_sha")) return false; },
        },
      },
    },
  },
  fan_moran_refund: {
    audio: false,
    locked: true, forced: true, popup: false,
    trigger: { player: "useCard1" },
    filter(event, player) {
      if (event.card.name !== "sha" || event.addCount === false || !event.cards?.length) return false;
      const tagged = new Set();
      player.getHistory("lose", loss => {
        if (loss.getParent() !== event) return false;
        for (const card of loss.hs || []) {
          if (loss.gaintag_map?.[card.cardid]?.includes("fan_moran_sha")) tagged.add(card);
        }
        return false;
      });
      return event.cards.every(card => tagged.has(card));
    },
    async content(event, trigger, player) {
      trigger.addCount = false;
      const stat = player.getStat("card");
      if (stat.sha > 0) stat.sha--;
    },
  },
  fan_binghua: {
    audio: "ext:原神/audio/ayaka/skill/fan_binghua_intro.mp3",
    locked: false, chargeSkill: 4,
    init(player) { if (!player.storage.fan_binghua_initialized) { player.storage.fan_binghua_initialized = true; player.addCharge(1, false); } },
    enable: "phaseUse", usable: 1,
    filterTarget: (card, player, target) => target !== player,
    async content(event, trigger, player) {
      const target = event.target;
      // 发动时固定X；后续弃牌引起的蓄力变化不改变本次数量。
      const x = Math.max(1, player.countCharge());
      const result = discardableSha(target).length < x ? { index: 0 } : await target.chooseControl("相距为一", "弃杀摸牌").set("prompt", "冰华：选择一项").set("prompt2", `弃置${x}张杀，各摸${x}张牌`)
        .set("ai", () => {
          const friendship = Math.max(-1, Math.min(1, get.attitude(target, player) / 5));
          const exchange = exchangeValue(target, x) + friendship * exchangeValue(player, x);
          const distance = Math.min(target.countCharge(), player.countCards("hej"))
            + friendship * Math.min(player.countCharge(), target.countCards("hej"));
          return exchange > distance ? 1 : 0;
        }).forResult();
      if (!player.isIn() || !target.isIn()) return;
      if (result.index === 0) {
        player.addSkill("fan_binghua_links");
        if (!player.storage.fan_binghua_links) player.storage.fan_binghua_links = [];
        player.storage.fan_binghua_links.push({ target, mode: 0 });
        player.addSkill("fan_binghua_distance"); target.addSkill("fan_binghua_distance");
      } else {
        // 每个客户端等待自己的发动语音 ended，不用固定秒数拖延技能结算。
        game.broadcastAll(function (speaker) {
          const play = () => game.trySkillAudio("fan_binghua_choice", speaker, true, true);
          const intro = typeof document === "undefined" ? null : Array.from(document.querySelectorAll("audio"))
            .find(audio => (audio.currentSrc || audio.src || "").includes("fan_binghua_intro.mp3") && !audio.ended && !audio.error);
          if (!intro) { play(); return; }
          let finished = false;
          const finish = () => {
            if (finished) return;
            finished = true;
            intro.removeEventListener("ended", finish);
            intro.removeEventListener("error", finish);
            play();
          };
          intro.addEventListener("ended", finish);
          intro.addEventListener("error", finish);
        }, player);
        const participants = [player, target].sortBySeat(_status.currentPhase || player);
        for (const current of participants) {
          if (!current.isIn()) continue;
          const count = Math.min(x, discardableSha(current).length);
          if (count) await current.chooseToDiscard("h", count, true, card => get.name(card, current) === "sha")
            .set("prompt", `冰华：弃置${count}张杀`).set("prompt2", false)
            .set("ai", card => 8 - get.value(card, current));
        }
        for (const current of participants) {
          if (x > 0 && current.isIn()) await current.draw(x);
        }
      }
    },
    ai: {
      order: 8,
      result: { player: (player, target) => binghuaValue(player, target) },
    },
  },
  fan_binghua_links: {
    charlotte: true, onremove: true,
    trigger: { global: "phaseJieshuBegin" }, forced: true, popup: false,
    filter: (event, player) => links(player).some(link => link.target === event.player),
    async content(event, trigger, player) {
      player.storage.fan_binghua_links = links(player).filter(link => link.target !== trigger.player);
    },
    group: "fan_binghua_take",
  },
  fan_binghua_choice: {
    charlotte: true,
    audio: "ext:原神/audio/ayaka/skill:true",
  },
  fan_binghua_distance: {
    charlotte: true,
    mod: {
      globalFrom(from, to) {
        if (links(from).some(l => l.mode === 0 && l.target === to) || links(to).some(l => l.mode === 0 && l.target === from)) return -Infinity;
      },
    },
  },
  fan_binghua_take: {
    audio: ["ext:原神/audio/ayaka/skill/fan_binghua_take.mp3", "ext:原神/audio/ayaka/skill/fan_binghua_take_extra1.mp3", "ext:原神/audio/ayaka/skill/fan_binghua_take_extra2.mp3"],
    charlotte: true, direct: true,
    trigger: { global: "useCardToPlayer" },
    filter(event, player) {
      return links(player).some(l => l.mode === 0 && ((event.player === player && event.target === l.target) || (event.player === l.target && event.target === player))) && event.player.countCharge() > 0 && event.player.countGainableCards(event.target, "hej") > 0;
    },
    async content(event, trigger, player) {
      const actor = trigger.player, target = trigger.target;
      const result = await actor.chooseBool("冰华：消耗1点蓄力，获得目标一张牌？").set("prompt2", false).set("choice", get.attitude(actor, target) < 0).forResult();
      if (!result.bool || !actor.isIn() || !target.isIn() || actor.countCharge() < 1 || !actor.countGainableCards(target, "hej")) return;
      actor.removeCharge(1);
      actor.logSkill("fan_binghua_take", target);
      await actor.gainPlayerCard(target, "hej", true);
    },
  },
};
