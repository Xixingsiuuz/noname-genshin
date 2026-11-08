import { lib, game, get, ui, _status } from "../../../../noname.js";
import { setZibaiEyes } from "../../ui/zibai-eyes.js";

const primes = [2, 3, 5, 7, 11, 13];
const forms = ["yun", "yan", "ren"];
const formNames = { yun: "兹踞", yan: "兹踬", ren: "兹蹻" };
const formSkills = { yun: "fan_yunjian", yan: "fan_yanjian", ren: "fan_renjian" };
const voicePath = "ext:原神/audio/zibai/skill:";
function playVoice(player, formSkill, branch) {
  const suffix = player.storage.fan_zibai_complete ? "full_" : "";
  game.trySkillAudio(`${formSkill}_${suffix}${branch}`, player, true);
}
const shown = card => get.is.shownCard(card) || card.hasGaintag("faceup_tag");
const visibleTag = tag => tag === "faceup_tag" || tag.startsWith("visible_") || tag.startsWith("eternal_visible_");
const level = player => player.storage.fan_nichi_level || 1;
const isPrime = n => {
  if (!Number.isInteger(n) || n < 2) return false;
  for (let i = 2; i * i <= n; i++) if (n % i === 0) return false;
  return true;
};
const nextPrime = count => { let n = count + 1; while (!isPrime(n)) n++; return n; };
const useCount = player => player.storage.fan_yunjian_session?.count || 0;
const primeNumbers = player => player.storage.fan_yunjian_session?.numbers || [];
const availableForms = player => forms.filter(form => form !== player.storage.fan_zibai_form
  && !(player.storage.fan_zibai_lost_forms || []).includes(form));
const nextForm = player => {
  const current = player.storage.fan_zibai_form;
  if (!forms.includes(current) || player.storage.fan_zibai_complete || !player.hasSkill("fan_sanxiang")) return;
  const available = availableForms(player);
  for (let step = 1; step < forms.length; step++) {
    const next = forms[(forms.indexOf(current) + step) % forms.length];
    if (available.includes(next)) return next;
  }
};
function refreshCount(player) {
  if (player.hasSkill("fan_yunjian")) player.markSkill("fan_yunjian_count");
  else player.unmarkSkill("fan_yunjian_count");
}
function refreshForm(player) {
  if (player.storage.fan_zibai_form) player.markSkill("fan_sanxiang");
  else player.unmarkSkill("fan_sanxiang");
  refreshCount(player);
  game.broadcastAll(setZibaiEyes, player, player.storage.fan_zibai_complete ? "full" : player.storage.fan_zibai_form);
}
function changeForm(player, next) {
  if (!forms.includes(next) || (player.storage.fan_zibai_lost_forms || []).includes(next)) return false;
  const old = player.storage.fan_zibai_form;
  if (old === next || player.storage.fan_zibai_complete) return false;
  if (forms.includes(old)) {
    (player.storage.fan_zibai_lost_forms || (player.storage.fan_zibai_lost_forms = []));
    if (!player.storage.fan_zibai_lost_forms.includes(old)) player.storage.fan_zibai_lost_forms.push(old);
  }
  player.storage.fan_zibai_form = next;
  // additionalSkills 单独记录形态赋予的来源；不会移除其他来源获得的同名技能。
  player.addAdditionalSkill("fan_sanxiang_form", formSkills[next]);
  refreshForm(player);
  game.log(player, "变为", "#g" + formNames[next]);
  if (forms.includes(old)) game.trySkillAudio("fan_sanxiang_leave_" + old, player, true);
  return true;
}
function advance(player, from) {
  // 当前仍有真实形象时，先升级，再尝试变形；不能变形不撤销升级。
  // 无形象的复制者、完全体不执行此步骤；同一形象的任务只奖励一次。
  if (!["yun", "yan"].includes(from) || player.storage.fan_zibai_form !== from
    || !player.hasSkill("fan_sanxiang") || player.storage.fan_zibai_complete
    || (player.storage.fan_zibai_upgraded_forms || []).includes(from)) return false;
  (player.storage.fan_zibai_upgraded_forms || (player.storage.fan_zibai_upgraded_forms = []));
  player.storage.fan_zibai_upgraded_forms.push(from);
  player.storage.fan_nichi_level = Math.min(3, level(player) + 1);
  if (player.hasSkill("fan_nichi")) player.markSkill("fan_nichi");
  const next = nextForm(player);
  if (next) changeForm(player, next);
  return true;
}
async function revealOne(player, skill) {
  if (!player.isIn()) return;
  const cards = player.getCards("h", card => !shown(card));
  if (!cards.length) return;
  const result = await player.chooseCard("h", true, "明置1张手牌", card => !shown(card))
    .set("prompt2", false).set("ai", card => 6 - get.value(card)).forResult();
  if (result.bool) await player.addShownCards(result.cards, "visible_" + skill);
}
async function drawReveal(player) {
  if (!player.isIn()) return;
  await player.draw();
  await revealOne(player, "fan_nichi");
}
function shownMaterials(event, player) {
  const cards = event.cards || [];
  const result = new Set();
  for (const loss of player.getHistory("lose", loss => loss.getParent() === event)) {
    for (const card of loss.hs || []) {
      if (cards.includes(card) && (loss.gaintag_map?.[card.cardid] || []).some(visibleTag)) result.add(card);
    }
    // 装备区明置状态同样有效；判定区不属于“你的明置牌”。
    for (const card of loss.es || []) if (cards.includes(card)) result.add(card);
  }
  return [...result];
}
function giftCards(event, player) {
  // 1.11.6 的 useCardAfter 早于 useCard.after 中的 orderingDiscard。
  // 必须在实际入弃牌堆后，通过 orderingDiscard.relatedEvent 找回本次使用牌。
  const ordering = event.getParent?.();
  if (ordering?.name !== "orderingDiscard") return [];
  const use = ordering.relatedEvent || ordering.getParent?.();
  if (use?.name !== "useCard" || use.player !== player) return [];
  return (use.fan_zibai_shown || []).filter(card => event.cards?.includes(card) && get.position(card, true) === "d");
}

export default {
  fan_nichi: {
    audio: voicePath + "3",
    forceDie: true,
    trigger: { global: "damageBegin4" },
    usable: 1,
    mark: true,
    marktext: "敕",
    intro: { content: (storage, player) => `当前等级：${level(player)}` },
    filter(event, player) {
      return event.num > 0;
    },
    direct: true,
    async content(event, trigger, player) {
      const current = level(player);
      let payHp = current < 3 || !player.hasCard(card => lib.filter.cardDiscardable(card, player, "fan_nichi"), "he");
      if (!payHp) {
        const cost = await player.chooseControl("失去体力", "弃置牌", "取消")
          .set("prompt", "逆敕：选择代价").set("prompt2", false)
          .set("ai", () => get.attitude(player, trigger.player) > 0 ? 1 : 2).forResult();
        if (cost.index === 2) { player.getStat("triggerSkill").fan_nichi--; return; }
        payHp = cost.index === 0;
      }
      if (payHp) {
        const result = await player.chooseBool(`是否发动【逆敕】，失去1点体力保护${get.translation(trigger.player)}？`)
          .set("prompt2", false).set("ai", () => get.attitude(player, trigger.player) > 0 && (player.hp > 1 || trigger.player === player)).forResult();
        if (!result.bool) { player.getStat("triggerSkill").fan_nichi--; return; }
        player.logSkill("fan_nichi", trigger.player);
        // 即使代价导致兹白死亡，当前已发动技能仍防止这次完整伤害。
        await player.loseHp();
      } else {
        const result = await player.chooseToDiscard("he", 1, `逆敕：弃置1张牌，保护${get.translation(trigger.player)}`)
          .set("prompt2", false).set("fanPairedConfirm", true).set("manualConfirm", true)
          .set("ai", card => get.attitude(player, trigger.player) > 0 ? 7 - get.value(card) : 0).forResult();
        if (!result.bool) { player.getStat("triggerSkill").fan_nichi--; return; }
        player.logSkill("fan_nichi", trigger.player);
      }
      trigger.cancel();
      if (current >= 2) await drawReveal(player);
      if (current >= 3) await drawReveal(trigger.player);
    },
  },
  fan_sanxiang: {
    audio: false,
    subSkill: {
      leave_yun: { audio: voicePath + "true", charlotte: true },
      leave_yan: { audio: voicePath + "true", charlotte: true },
      leave_ren: { audio: voicePath + "2", charlotte: true },
    },
    trigger: { global: "phaseBefore", player: "enterGame" },
    forced: true,
    filter(event, player) {
      return !player.storage.fan_zibai_initialized && (event.name !== "phase" || game.phaseNumber === 0);
    },
    derivation: ["fan_yunjian", "fan_yanjian", "fan_renjian"],
    marktext: "相",
    intro: { content: (storage, player) => `当前形象：${formNames[player.storage.fan_zibai_form] || "兹白"}` },
    async content(event, trigger, player) {
      player.storage.fan_zibai_initialized = true;
      const result = await player.chooseControl(...forms.map(f => formNames[f]))
        .set("prompt", "三相：选择初始形象").set("prompt2", false).set("ai", () => forms.indexOf(forms.randomGet())).forResult();
      changeForm(player, forms[result.index] || "ren");
    },
    onremove(player) {
      player.removeAdditionalSkill("fan_sanxiang_form");
      delete player.storage.fan_zibai_form;
      refreshForm(player);
    },
  },
  // 人间的分组记录器，随技能获得而挂载；不能在扩展 content 中提前全局注册。
  fan_zibai_record: {
    trigger: { player: "useCard1" },
    charlotte: true,
    forced: true,
    silent: true,
    firstDo: true,
    priority: 10000,
    async content(event, trigger, player) {
      trigger.fan_zibai_number = get.number(trigger.card);
      trigger.fan_zibai_shown = shownMaterials(trigger, player);
    },
  },
  fan_yunjian_count: {
    charlotte: true,
    marktext: "质",
    intro: {
      content(storage, player) {
        const count = useCount(player);
        const counter = `已使用牌数：${count}；<br>下一个质数：${nextPrime(count)}`;
        if (player.storage.fan_zibai_complete) return counter;
        const remaining = primes.filter(n => !primeNumbers(player).includes(n));
        return `${counter}；<br>未使用的质数点数：${remaining.map(n => ({ 11: "J", 13: "K" })[n] || n).join("、") || "无"}`;
      },
      markcount: (storage, player) => useCount(player),
    },
  },
  fan_yunjian: {
    audio: false,
    locked: true,
    group: ["fan_yunjian_count", "fan_yunjian_record"],
    trigger: { player: "useCard" },
    forced: true,
    init(player) {
      // 按每次实际获得技能建立独立持有期，不混入其他形态的用牌历史。
      player.storage.fan_yunjian_session = { count: 0, numbers: [] };
      refreshCount(player);
    },
    onremove(player) {
      delete player.storage.fan_yunjian_session;
      player.unmarkSkill("fan_yunjian_count");
    },
    filter(event, player) {
      if (!event.fan_yunjian_session || event.fan_yunjian_session !== player.storage.fan_yunjian_session) return false;
      return isPrime(event.fan_yunjian_index) || primes.includes(event.fan_zibai_number ?? get.number(event.card))
        || player.hasSkill("fan_sanxiang") && player.storage.fan_zibai_form === "yun"
          && !(player.storage.fan_zibai_upgraded_forms || []).includes("yun") && primeNumbers(player).length === primes.length;
    },
    async content(event, trigger, player) {
      const number = trigger.fan_zibai_number ?? get.number(trigger.card);
      const amount = Number(isPrime(trigger.fan_yunjian_index)) + Number(primes.includes(number));
      if (amount && number >= 1 && number < 13) {
        // 每项条件各提供一张，随机抽取不重复实体牌；不足则全取。13+1 无对应牌。
        const cards = Array.from(ui.cardPile.childNodes).filter(card => get.number(card) === number + 1);
        if (cards.length) {
          game.trySkillAudio(player.storage.fan_zibai_complete ? "fan_yunjian_full" : "fan_yunjian_form", player, true);
          if (player.storage.fan_zibai_complete) game.broadcastAll(setZibaiEyes, player, "pulse_yun");
          await player.gain(cards.randomGets(amount), "gain2");
        }
      }
      if (player.isIn() && primeNumbers(player).length === primes.length) advance(player, "yun");
    },
    subSkill: {
      form: { audio: voicePath + "2", charlotte: true },
      full: { audio: voicePath + "4", charlotte: true },
      record: {
        trigger: { player: "useCard1" },
        locked: true,
        forced: true,
        silent: true,
        firstDo: true,
        priority: 1000,
        filter: (event, player) => player.hasSkill("fan_yunjian")
          && event.fan_yunjian_session !== player.storage.fan_yunjian_session,
        async content(event, trigger, player) {
          const session = player.storage.fan_yunjian_session;
          if (!session) return;
          trigger.fan_yunjian_session = session;
          trigger.fan_yunjian_index = ++session.count;
          const number = trigger.fan_zibai_number ?? get.number(trigger.card);
          if (primes.includes(number) && !session.numbers.includes(number)) session.numbers.push(number);
          refreshCount(player);
        },
      },
    },
  },
  fan_yanjian: {
    audio: false,
    onChooseToUse(event) { event.set("fanPairedConfirm", true).set("manualConfirm", true); },
    enable: "phaseUse",
    usable: 1,
    selectTarget: 1,
    filterTarget: true,
    prompt: "岩间：选择一名角色，造成1点火焰伤害",
    async content(event, trigger, player) {
      playVoice(player, "fan_yanjian", "damage");
      if (player.storage.fan_zibai_complete) game.broadcastAll(setZibaiEyes, player, "pulse_yan");
      await event.target.damage(1, "fire", player);
    },
    init(player) {
      // 独立记录本次持有期：重复初始化不刷新，真正失去技能后才清除。
      if (typeof player.storage.fan_yanjian_control_used !== "boolean") {
        player.storage.fan_yanjian_control_used = false;
        if (player.awakenedSkills.includes("fan_yanjian_control")) player.restoreSkill("fan_yanjian_control");
      }
    },
    onremove(player) { delete player.storage.fan_yanjian_control_used; },
    group: "fan_yanjian_control",
    ai: { order: 8, result: { target: -1 }, tag: { damage: 1, fireDamage: 1, natureDamage: 1 } },
    subSkill: {
      damage: { audio: voicePath + "2", charlotte: true },
      full_damage: { audio: voicePath + "3", charlotte: true },
      control_voice: { audio: voicePath + "2", charlotte: true },
      full_control_voice: { audio: voicePath + "true", charlotte: true },
      control: {
        audio: false,
        trigger: { global: "phaseBeginStart" },
        limited: true,
        skillAnimation: true,
        animationColor: "fire",
        filter: (event, player) => !player.storage.fan_yanjian_control_used
          && event.player !== player && !event.player._trueMe,
        prompt: event => `是否发动【岩间】，操控${get.translation(event.player)}的本回合？`,
        prompt2: false,
        check: (event, player) => get.attitude(player, event.player) < 0,
        logTarget: "player",
        async content(event, trigger, player) {
          // 分组技能不能仅依赖 awakenSkill 禁用：主技能展开后仍可能进入触发检查。
          // 发动前再次检查，并在任何后续事件前消耗本持有期的唯一次数。
          if (player.storage.fan_yanjian_control_used) return;
          player.storage.fan_yanjian_control_used = true;
          playVoice(player, "fan_yanjian", "control_voice");
          player.awakenSkill("fan_yanjian_control");
          const target = trigger.player;
          target._trueMe = player;
          if (player.storage.fan_zibai_complete) game.broadcastAll(setZibaiEyes, player, "hold_yan");
          target.storage.fan_zibai_control = true;
          target.addSkill("fan_zibai_controlled");
          game.addGlobalSkill("autoswap");
          // 与本地 pshuoxin 一致；原玩家的回合交由操控方决策。
          if (target === game.me) {
            game.notMe = true;
            if (!_status.auto) ui.click.auto();
          }
          // 排入原回合的 after 队列，待整个回合及其结束结算完成后再切换。
          // 与目标上的操控清理分离，目标死亡不会令兹白提前升级。
          const next = game.createEvent("fan_yanjian_finish");
          next.player = player;
          next.forceDie = true;
          event.next.remove(next);
          trigger.after.push(next);
          next.setContent(async event => { advance(event.player, "yan"); });
        },
      },
    },
  },
  // 操控及技能失效属于目标上的独立效果，不随兹白失去岩间或死亡而移除。
  fan_zibai_controlled: {
    charlotte: true,
    forceDie: true,
    forced: true,
    silent: true,
    lastDo: true,
    trigger: { player: ["phaseAfter", "dieAfter"], global: "phaseBeforeStart" },
    init(player, skill) { player.addSkillBlocker(skill); },
    skillBlocker(skill, player) {
      if (lib.skill[skill]?.charlotte) return false;
      // 全部武将技能（含锁定技）失效，装备技能保留。
      const skills = player.getSkills(null, false, false);
      game.expandSkills(skills);
      return skills.includes(skill);
    },
    mod: { cardUsable() { return Infinity; } },
    async content(event, trigger, player) { player.removeSkill("fan_zibai_controlled"); },
    onremove(player, skill) {
      player.removeSkillBlocker(skill);
      const controller = player._trueMe;
      if (controller?.storage.fan_zibai_complete) game.broadcastAll(setZibaiEyes, controller, "release");
      if (player === game.me) {
        if (!game.notMe) game.swapPlayerAuto(player._trueMe);
        else delete game.notMe;
        if (_status.auto) ui.click.auto();
      }
      delete player._trueMe;
      delete player.storage.fan_zibai_control;
      refreshCount(player);
    },
  },
  fan_renjian: {
    audio: false,
    onChooseToUse(event) { event.set("fanPairedConfirm", true).set("manualConfirm", true); },
    enable: "phaseUse",
    usable: 1,
    filter: (event, player) => player.hasCard(card => !shown(card), "h"),
    filterCard: card => !shown(card),
    selectCard: 1,
    position: "h",
    discard: false,
    lose: false,
    delay: false,
    prompt: "人间：明置1张手牌",
    async content(event, trigger, player) {
      const cards = event.cards.filter(card => player.getCards("h").includes(card) && !shown(card));
      if (!cards.length) return;
      playVoice(player, "fan_renjian", "reveal");
      if (player.storage.fan_zibai_complete) game.broadcastAll(setZibaiEyes, player, "pulse_full");
      await player.addShownCards(cards, "visible_fan_renjian");
    },
    group: ["fan_zibai_record", "fan_renjian_give", "fan_renjian_prepare"],
    ai: { order: 9, result: { player: 1 } },
    subSkill: {
      reveal: { audio: voicePath + "2", charlotte: true },
      full_reveal: { audio: voicePath + "2", charlotte: true },
      gift: { audio: voicePath + "true", charlotte: true },
      full_gift: { audio: voicePath + "true", charlotte: true },
      give: {
        audio: false,
        trigger: { global: "cardsDiscardAfter" },
        direct: true,
        filter: (event, player) => giftCards(event, player).length > 0 && game.hasPlayer(target => target !== player),
        async content(event, trigger, player) {
          const cards = giftCards(trigger, player);
          const result = await player.chooseTarget("人间：将牌交给一名其他角色", (card, player, target) => target !== player)
            .set("prompt2", get.translation(cards)).set("fanPairedConfirm", true).set("manualConfirm", true)
            .set("ai", target => get.attitude(player, target)).forResult();
          if (result.bool) {
            player.logSkill("fan_renjian", result.targets);
            const remaining = giftCards(trigger, player);
            if (remaining.length && result.targets[0].isIn()) {
              playVoice(player, "fan_renjian", "gift");
              if (player.storage.fan_zibai_complete) game.broadcastAll(setZibaiEyes, player, "pulse_full");
              await result.targets[0].gain(remaining, "gain2");
            }
          }
        },
      },
      prepare: {
        audio: false,
        trigger: { player: "phaseZhunbeiBegin" },
        direct: true,
        filter: (event, player) => player.storage.fan_zibai_form === "ren" && player.hasSkill("fan_sanxiang")
          && !player.storage.fan_zibai_complete && (level(player) === 3 || availableForms(player).length > 0),
        async content(event, trigger, player) {
          if (level(player) === 3) {
            const result = await player.chooseBool("人间：是否令兹蹻消失，成为兹白？")
              .set("prompt2", false).set("ai", () => true).forResult();
            if (!result.bool) return;
            player.logSkill("fan_renjian");
            // 完全体不是第四种形态：清除形态记录，独立获得全部三个技能。
            // 先保留人间来源，避免增删同名技能造成错误重置。
            player.addAdditionalSkill("fan_zibai_complete", Object.values(formSkills), true);
            player.removeAdditionalSkill("fan_sanxiang_form");
            delete player.storage.fan_zibai_form;
            delete player.storage.fan_zibai_lost_forms;
            delete player.storage.fan_zibai_upgraded_forms;
            player.storage.fan_zibai_complete = true;
            game.trySkillAudio("fan_sanxiang_leave_ren", player, true);
            refreshForm(player);
            game.log(player, "三神合一，复归", "#g兹白");
            return;
          }
          const available = availableForms(player);
          if (!available.length) return;
          const result = await player.chooseControl(...available.map(form => formNames[form]), "取消")
            // 未到完全体时推进形象任务，优先云间获取资源；不可返回已失去的形象。
            .set("prompt", "人间：是否变为其他形象？").set("prompt2", false)
            .set("ai", () => Math.max(0, available.indexOf("yun"))).forResult();
          if (result.index >= 0 && result.index < available.length) {
            player.logSkill("fan_renjian");
            changeForm(player, available[result.index]);
          }
        },
      },
    },
  },
};
