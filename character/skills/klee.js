import { game, get, lib, ui, _status } from "../../../../noname.js";

// 以 useCard 事件和牌对象共同识别：铁索保留 card，嵌套追杀属于另一 useCard。
const useOf = damage => {
  const use = damage.getParent("useCard");
  return damage.num > 0 && damage.card?.name === "sha" && use?.name === "useCard" && use.card === damage.card ? use : null;
};
const ownSha = (damage, owner) => damage.player !== owner && damage.source === owner && useOf(damage)?.player === owner;
const escapedSha = (damage, owner) => !!useOf(damage) && (owner.storage.fan_taopao_uses || []).includes(useOf(damage));
const neighbors = (target, owner) => [...new Set([target.getPrevious(), target.getNext()])]
  .filter(current => current && current !== owner && current !== target && current.isIn());
function snapshot(damage, owner) {
  (damage.fan_huohua_neighbors ?? (damage.fan_huohua_neighbors = {}));
  (damage.fan_huohua_neighbors[owner.playerid] ?? (damage.fan_huohua_neighbors[owner.playerid] = neighbors(damage.player, owner)));
}
async function splash(damage, owner, skill) {
  // damage 节点已在扣血之后、濒死之前固定相邻者，致死伤害仍有完整结算。
  const targets = (damage.fan_huohua_neighbors?.[owner.playerid] || neighbors(damage.player, owner)).slice();
  targets.sortBySeat(_status.currentPhase || owner);
  if (!targets.some(target => target.isIn())) return;
  owner.logSkill(skill, targets, null, null, []);
  game.trySkillAudio("fan_huohua_blast", owner, true);
  for (const target of targets) {
    if (target.isIn()) await target.damage(1, "fire", owner, "nocard");
  }
}
const legalTarget = (trigger, owner, target) => target.isIn() && target !== owner && target !== trigger.player
  && !trigger.getParent().targets.includes(target) && owner.inRange(target)
  && lib.filter.targetEnabled(trigger.card, trigger.player, target);
const splashValue = (target, owner, viewer = owner) => neighbors(target, owner)
  .reduce((sum, current) => sum + get.damageEffect(current, owner, viewer, "fire"), 0);
function redirectValue(trigger, owner, target) {
  const card = { name: "shacopy", nature: trigger.card.nature, suit: trigger.card.suit };
  let value = get.effect(target, card, trigger.player, owner) + splashValue(target, owner);
  if (trigger.card.nature && target.isLinked()) {
    // 传导队友同样触发；火花抢先传导可能令其重置，折减这部分预期收益。
    for (const current of game.filterPlayer(current => current !== target && current.isLinked())) {
      value += 0.5 * (get.damageEffect(current, trigger.player, owner, trigger.card.nature) + splashValue(current, owner));
    }
  }
  return value - get.effect(owner, card, trigger.player, owner);
}

export default {
  fan_huohua_blast: { audio: "ext:原神/audio/klee/skill:3" },
  fan_huohua: {
    locked: true, forced: true, popup: false, logAudio: () => false,
    audio: "fan_huohua_blast",
    trigger: { global: "damageSource" },
    filter: ownSha,
    async content(event, trigger, player) { await splash(trigger, player, "fan_huohua"); },
    group: "fan_huohua_record",
    subSkill: {
      record: {
        locked: true, forced: true, silent: true, popup: false,
        trigger: { global: "damage" }, filter: ownSha,
        // 普通函数会被 StepCompiler 重建，无法访问模块闭包；async 保留 snapshot。
        async content(event, trigger, player) { snapshot(trigger, player); },
      },
    },
    ai: {
      effect: {
        player_use(card, player, target) {
          if (card.name !== "sha" || !target || target === player) return;
          let extra = splashValue(target, player);
          if (card.nature && target.isLinked()) {
            for (const current of game.filterPlayer(current => current !== target && current !== player && current.isLinked())) {
              extra += 0.5 * splashValue(current, player);
            }
          }
          // 保留原牌命中、免伤、多目标与用牌者自身收益的原生评估。
          return [1, extra * (target.countCards("h") ? 0.5 : 1)];
        },
      },
    },
  },
  fan_taopao: {
    locked: false, direct: true, logAudio: () => false,
    audio: "ext:原神/audio/klee/skill:3",
    trigger: { target: "useCardToTarget" },
    filter(event, player) {
      return event.card.name === "sha" && event.player !== player && player.countDiscardableCards(player, "he") > 0
        && game.hasPlayer(target => legalTarget(event, player, target));
    },
    async content(event, trigger, player) {
      const result = await player.chooseCardTarget({
        prompt: "你可以发动【逃跑】，弃置一张牌并转移目标", prompt2: false,
        position: "he", selectCard: [0, 1], selectTarget: 1,
        manualConfirm: true, fanPairedConfirm: true,
        filterCard: lib.filter.cardDiscardable,
        filterTarget: (card, owner, target) => legalTarget(trigger, owner, target),
        filterOk: () => ui.selected.cards.length === 1 && ui.selected.targets.length === 1,
        ai1(card) {
          const best = Math.max(...game.filterPlayer(target => legalTarget(trigger, player, target)).map(target => redirectValue(trigger, player, target)), -Infinity);
          return best > Math.max(0, get.value(card, player) - 3) ? Math.max(0.1, 7 - get.value(card, player)) : -1;
        },
        ai2: target => redirectValue(trigger, player, target),
      }).forResult();
      if (!result.bool || result.cards?.length !== 1 || result.targets?.length !== 1) return;
      const card = result.cards[0], target = result.targets[0], use = trigger.getParent();
      if (!player.isIn() || !player.getCards("he").includes(card) || !lib.filter.cardDiscardable(card, player)
        || !use.targets.includes(player) || !legalTarget(trigger, player, target)) return;
      // 与原生流离相同：支付前确定范围并替换目标；弃武器不撤销已合法确认的转移。
      // 实际弃牌失败则撤销替换，不能免费发动。
      const index = use.targets.indexOf(player);
      use.targets.splice(index, 1, target);
      use.triggeredTargets2.remove(player);
      const discarded = player.discard({ cards: [card] });
      await discarded;
      const loss = player.getHistory("lose", evt => evt.getParent() === discarded && evt.cards.includes(card));
      if (!loss.length) {
        const changed = use.targets.indexOf(target);
        if (changed >= 0) use.targets.splice(changed, 1, player);
        use.triggeredTargets2.add(player);
        return;
      }
      (player.storage.fan_taopao_uses ?? (player.storage.fan_taopao_uses = []));
      if (!player.storage.fan_taopao_uses.includes(use)) player.storage.fan_taopao_uses.push(use);
      player.addSkill("fan_taopao_effect");
      player.logSkill("fan_taopao", target, null, null, []);
      game.trySkillAudio("fan_taopao", player, true);
    },
    ai: {
      effect: {
        target_use(card, source, target) {
          if (card.name !== "sha" || source === target || !target.countDiscardableCards(target, "he")) return;
          // 保留其他目标和用牌收益；有可转移对象只降低本目标的预期命中收益。
          const potential = game.hasPlayer(current => current !== source && current !== target && target.inRange(current)
            && lib.filter.targetEnabled(card, source, current) && get.attitude(target, current) < 0);
          if (potential) return 0.5;
        },
      },
    },
  },
  // 既成的牌效果独立于随后技能失效；不使用临时技能默认期限，避免嵌套 useCardAfter 提前清除。
  fan_taopao_effect: {
    charlotte: true, locked: false, forced: true, silent: true, popup: false, forceDie: true,
    trigger: { global: ["damage", "damageSource", "useCardAfter"] },
    filter(event, player) {
      return event.name === "useCard" ? (player.storage.fan_taopao_uses || []).includes(event) : escapedSha(event, player);
    },
    async content(event, trigger, player) {
      if (trigger.name === "useCard") {
        player.storage.fan_taopao_uses = player.storage.fan_taopao_uses.filter(use => use !== trigger);
        if (!player.storage.fan_taopao_uses.length) player.removeSkill("fan_taopao_effect");
      } else if (event.triggername === "damage") snapshot(trigger, player);
      else await splash(trigger, player, "fan_taopao");
    },
    onremove: player => { delete player.storage.fan_taopao_uses; },
  },
};
