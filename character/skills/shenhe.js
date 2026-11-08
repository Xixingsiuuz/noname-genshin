import { game, get, ui, _status } from "../../../../noname.js";

export const curseCount = player => Object.values(player.storage.fan_yizhou_tokens || {}).reduce((sum, num) => sum + num, 0);
export const fieldCurses = () => game.filterPlayer().reduce((sum, player) => sum + curseCount(player), 0);
export const lingweiUses = player => player.storage.fan_lingwei_round === game.roundNumber ? player.storage.fan_lingwei_uses || 0 : 0;
export const canLingwei = player => lingweiUses(player) < Math.max(0, 4 - fieldCurses());
const xinzhaiActive = player => !curseCount(player) && game.hasPlayer(target => target !== player && curseCount(target) > 0);
const lingweiCard = (player, nature) => ({ name: "sha", nature, isCard: true,
  storage: { fan_lingwei: player.playerid, fan_lingwei_free: fieldCurses() === 0 } });
const lingweiNatures = [undefined, "fire", "thunder"];

export function changeCurse(target, owner, amount) {
  const tokens = (target.storage.fan_yizhou_tokens || (target.storage.fan_yizhou_tokens = {}));
  tokens[owner] = Math.max(0, (tokens[owner] || 0) + amount);
  if (!tokens[owner]) delete tokens[owner];
  target.syncStorage("fan_yizhou_tokens");
  if (curseCount(target)) { target.addSkill("fan_yizhou_mark"); target.markSkill("fan_yizhou_mark"); }
  else { target.removeSkill("fan_yizhou_mark"); target.unmarkSkill("fan_yizhou_mark"); }
}

function markValue(owner, target) {
  const attack = target.countCards("h", card => get.tag(card, "damage"));
  const value = get.attitude(owner, target) * (1 + Math.min(3, attack)) / (1 + curseCount(target));
  // 首次分配前场上可能尚无咒，也要计入把咒交给自己会放弃心斋保护的代价。
  return value - (target === owner && !curseCount(owner) ? 4 : 0);
}

async function allocate(player, amount) {
  let remaining = amount;
  const plan = new Map();
  while (remaining > 0 && player.isIn() && game.hasPlayer(target => target.isIn())) {
    const result = await player.chooseTarget(true, `役咒：分配${remaining}个咒`, (card, owner, target) => target.isIn())
      .set("prompt2", false).set("ai", target => markValue(player, target) / (1 + (plan.get(target) || 0))).forResult();
    const target = result.targets?.[0];
    if (!target?.isIn()) continue;
    let count = remaining;
    if (remaining > 1) {
      const choice = await player.chooseControl(Array.from({ length: remaining }, (_, i) => String(i + 1)))
        .set("prompt", "役咒：选择数量").set("prompt2", false)
        .set("ai", () => Math.min(remaining, Math.max(1, target.countCards("h", card => get.tag(card, "damage")))) - 1).forResult();
      count = choice.index + 1;
    }
    if (!target.isIn() || count < 1 || count > remaining) continue;
    plan.set(target, (plan.get(target) || 0) + count);
    remaining -= count;
  }
  // 先确定分配方案，再按座次授予，不能沿用点击顺序。
  for (const target of [...plan.keys()].sortBySeat(_status.currentPhase || player)) {
    if (!player.isIn()) break;
    if (target.isIn()) changeCurse(target, player.playerid, plan.get(target));
    else await allocate(player, plan.get(target));
  }
}

function spendLingwei(result, player) {
  // onuse/onrespond 在原生实际提交处执行，取消选择不会消耗每轮次数。
  if (!canLingwei(player)) return;
  const free = fieldCurses() === 0;
  player.storage.fan_lingwei_uses = lingweiUses(player) + 1;
  player.storage.fan_lingwei_round = game.roundNumber;
  (result.card.storage || (result.card.storage = {}));
  result.card.storage.fan_lingwei = player.playerid;
  result.card.storage.fan_lingwei_free = free;
  player.syncStorage("fan_lingwei_uses");
  player.syncStorage("fan_lingwei_round");
}

export default {
  fan_xinzhai: {
    locked: true, forced: true, audio: ["ext:原神/audio/shenhe/skill/fan_xinzhai.mp3", "ext:原神/audio/shenhe/skill/fan_xinzhai_extra1.mp3", "ext:原神/audio/shenhe/skill/fan_xinzhai_extra2.mp3"],
    trigger: { player: "damageBegin4" },
    filter: (event, player) => event.num > 0 && !!event.card && get.color(event.card, event.source) === "black" && xinzhaiActive(player),
    async content(event, trigger) { trigger.num--; },
    ai: { effect: { target(card, player, target, current, isLink) {
      if (!get.tag(card, "damage") || get.color(card, player) !== "black" || !xinzhaiActive(target)) return;
      // 伤害来源的咒先消耗；若恰为全场最后一个，进入减伤节点时已不满足条件。
      const bonus = player && curseCount(player) ? 1 : 0;
      if (fieldCurses() - bonus <= 0) return;
      const damage = (card.baseDamage || 1) + bonus;
      return [(damage - 1) / damage, 0];
    } } },
  },
  fan_yizhou: {
    locked: false, forced: true, audio: ["ext:原神/audio/shenhe/skill/fan_yizhou1.mp3", "ext:原神/audio/shenhe/skill/fan_yizhou_start_extra.mp3"],
    trigger: { player: "phaseZhunbeiBegin" },
    filter: (event, player) => !player.storage.fan_yizhou_distributed,
    async content(event, trigger, player) {
      if (player.storage.fan_yizhou_distributed) return;
      player.storage.fan_yizhou_distributed = true;
      await allocate(player, 4);
    },
    group: ["fan_yizhou_move", "fan_yizhou_death"],
  },
  fan_yizhou_move: {
    locked: false, enable: "phaseUse", usable: 1, audio: ["ext:原神/audio/shenhe/skill/fan_yizhou2.mp3", "ext:原神/audio/shenhe/skill/fan_yizhou_move_extra1.mp3", "ext:原神/audio/shenhe/skill/fan_yizhou_move_extra2.mp3"],
    prompt: "移动一个“咒”", prompt2: false,
    filter: () => fieldCurses() > 0 && game.filterPlayer().length > 1,
    selectTarget: 2, multitarget: true, targetprompt: ["移出", "移入"],
    filterTarget(card, player, target) { return !ui.selected.targets.length ? curseCount(target) > 0 : target !== ui.selected.targets[0]; },
    async content(event, trigger, player) {
      const [from, to] = event.targets;
      if (!from.isIn() || !to.isIn() || !curseCount(from)) return;
      const owners = Object.keys(from.storage.fan_yizhou_tokens);
      let owner = owners[0];
      if (owners.length > 1) {
        const result = await player.chooseControl(owners.map(id => `来源：${get.translation(game.findPlayer(p => p.playerid === id))}（${id}）`))
          .set("prompt", "役咒：选择移动的咒").set("prompt2", false).set("ai", () => Math.max(0, owners.indexOf(player.playerid))).forResult();
        owner = owners[result.index];
      }
      if (!from.isIn() || !to.isIn() || !(from.storage.fan_yizhou_tokens?.[owner] > 0)) return;
      changeCurse(from, owner, -1); changeCurse(to, owner, 1);
    },
    ai: { order: 7, result: { target(player, target) {
      return ui.selected.targets.length ? markValue(player, target) / Math.max(1, Math.abs(get.attitude(player, target)))
        : -markValue(player, target) / Math.max(1, Math.abs(get.attitude(player, target)));
    } } },
  },
  fan_yizhou_death: {
    charlotte: true, locked: false, forced: true, forceDie: true, popup: false, audio: false,
    trigger: { global: "die" },
    filter: (event, player) => event.player === player || player.isIn() && (event.player.storage.fan_yizhou_tokens?.[player.playerid] || 0) > 0,
    async content(event, trigger, player) {
      if (trigger.player === player) {
        for (const target of [...game.players, ...game.dead]) {
          const num = target.storage.fan_yizhou_tokens?.[player.playerid] || 0;
          if (num) changeCurse(target, player.playerid, -num);
        }
        return;
      }
      const amount = trigger.player.storage.fan_yizhou_tokens?.[player.playerid] || 0;
      if (!amount || !player.isIn()) return;
      changeCurse(trigger.player, player.playerid, -amount);
      await allocate(player, amount);
    },
  },
  fan_yizhou_mark: {
    charlotte: true, locked: false, forced: true, popup: false, audio: false,
    mark: true, marktext: "咒", intro: { content: (storage, player) => `共有${curseCount(player)}个咒；造成伤害时移除一个，此伤害+1` },
    trigger: { source: "damageBegin1" },
    filter: (event, player) => event.num > 0 && curseCount(player) > 0,
    async content(event, trigger, player) {
      const owner = Object.keys(player.storage.fan_yizhou_tokens || {})[0];
      if (!owner) return;
      changeCurse(player, owner, -1);
      trigger.num++;
    },
    ai: { damageBonus: true, effect: { player(card, player, target) {
      if (target && curseCount(player) && get.tag(card, "damage")) return [1, 0, 1, -1];
    } } },
  },
  fan_lingwei: {
    locked: false, audio: ["ext:原神/audio/shenhe/skill/fan_lingwei.mp3", "ext:原神/audio/shenhe/skill/fan_lingwei_extra1.mp3", "ext:原神/audio/shenhe/skill/fan_lingwei_extra2.mp3"],
    direct: true,
    onChooseToRespond(event) {
      if (event.skill !== "fan_lingwei_backup" || !event.isMine() || event.fan_lingwei_submitPending) return;
      // 1.11.6关闭自动确认时，check中的direct提交后仍会被content再次pause。
      // 等本步完成暂停，再按原生check/filterOk重新校验并提交，避免留下无控件的暂停。
      event.fan_lingwei_submitPending = true;
      setTimeout(() => {
        delete event.fan_lingwei_submitPending;
        if (_status.event !== event || event.skill !== "fan_lingwei_backup" || event.result?.card
          || !event.isMine() || !canLingwei(event.player)) return;
        if (game.check() && _status.event === event && !event.result?.card) ui.click.ok();
      }, 0);
    },
    enable: ["chooseToUse", "chooseToRespond"],
    filter(event, player) {
      if (!canLingwei(player)) return false;
      if (typeof event.filterCard !== "function") return false;
      return lingweiNatures.some(nature => event.filterCard(lingweiCard(player, nature), player, event));
    },
    chooseButton: {
      dialog() { return ui.create.dialog("灵威", [lingweiNatures.map(nature => ["基本", "", "sha", nature]), "vcard"]); },
      filter(button, player) {
        const event = _status.event.getParent();
        return canLingwei(player) && event.filterCard(lingweiCard(player, button.link[3]), player, event);
      },
      check(button) {
        const player = get.player();
        return _status.event.getParent().type === "phase" ? player.getUseValue(lingweiCard(player, button.link[3])) : 1;
      },
      backup(links, player) {
        // 响应由onChooseToRespond在原生暂停后提交；主动使用保留目标确认。
        return { audio: "fan_lingwei", locked: false, direct: false,
          filterCard: () => false, selectCard: -1,
          viewAs: lingweiCard(player, links[0][3]), viewAsFilter: current => canLingwei(current),
          onuse: spendLingwei, onrespond: spendLingwei,
        };
      },
      prompt: () => _status.event.name === "chooseToRespond" ? "灵威：打出杀" : "灵威：选择目标",
    },
    hiddenCard: (player, name) => name === "sha" && canLingwei(player),
    prompt: "灵威：视为使用或打出一张杀", prompt2: false,
    group: "fan_lingwei_refund",
    mod: { cardUsable(card, player) { if (card.name === "sha" && card.storage?.fan_lingwei === player.playerid && card.storage.fan_lingwei_free) return Infinity; } },
    ai: { order: 5, respondSha: true, skillTagFilter: player => canLingwei(player) },
  },
  fan_lingwei_refund: {
    locked: false, forced: true, popup: false, audio: false,
    trigger: { player: "useCard1" },
    filter: (event, player) => event.card.name === "sha" && event.card.storage?.fan_lingwei === player.playerid
      && event.card.storage.fan_lingwei_free && event.addCount !== false,
    async content(event, trigger, player) { trigger.addCount = false; const stat = player.getStat("card"); if (stat.sha > 0) stat.sha--; },
  },
};
