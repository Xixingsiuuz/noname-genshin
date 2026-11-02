import { lib, game, get, ui, _status } from "../../../../noname.js";

const giftTag = "fan_yushen_card";
const prepare = event => event.set("fanPairedConfirm", true).set("manualConfirm", true);
const materialEnabled = (card, player) => game.checkMod(card, player, "unchanged", "cardEnabled2", player) !== false;
const canSpend = (player, amount, used) => player.hasSkill("fan_wuxiang")
  && player.countCharge() >= amount && (!used || !player.hasSkill(used));

async function gainResolve(player, amount, voice, silentAwaken = false) {
  const before = player.countCharge();
  player.addCharge(Math.min(amount, Math.max(0, 9 - player.countCharge())));
  if (voice && player.countCharge() > before && player.countCharge() < 9) game.trySkillAudio(voice, player, true);
  if (player.countCharge() < 9 || !player.hasSkill("fan_wuxiang")) return;
  // 先撤销锁国，再移除来源技能；不遗留已挂载的技能封锁。
  clearHunt(player);
  await player.removeSkills(["fan_wuxiang", "fan_suoguo"]);
  if (player.countCharge() > player.getMaxCharge()) player.removeCharge(player.countCharge() - player.getMaxCharge(), false);
  await player.addSkills("fan_yushen");
  if (!silentAwaken && player.isIn() && player.hasSkill("fan_yushen")) game.trySkillAudio("fan_yushen_awaken_voice", player, true);
}

function clearHunt(owner) {
  for (const target of [...game.players, ...(game.dead || [])]) {
    if (target.storage.fan_suoguo_owner !== owner) continue;
    delete target.storage.fan_suoguo_owner;
    target.removeSkill("fan_suoguo_block");
  }
}
function hunted(player) {
  const owner = player.storage.fan_suoguo_owner;
  return owner?.isIn() && _status.currentPhase === owner && owner.hasZhuSkill("fan_suoguo")
    && player !== owner && player.group === "qun";
}

// 只认本次清理所关联的响应事件，不能用外层或最近一次用牌替代。
function responseCards(event, player) {
  const ordering = event.getParent();
  if (ordering?.name !== "orderingDiscard") return [];
  const response = ordering.relatedEvent || ordering.getParent();
  if (!["useCard", "respond"].includes(response?.name)) return [];
  const source = response.respondTo?.[0];
  if (!source || source === response.player
    || !((source === player && response.player !== player) || (response.player === player && source !== player))) return [];
  return (event.cards || []).filter(card => response.cards?.includes(card) && get.position(card, true) === "d");
}
const giftCards = player => player.getCards("h", card => card.hasGaintag(giftTag) && materialEnabled(card, player));
const names = (event, player) => get.inpileVCardList(([, , name, nature]) => ["basic", "trick", "delay"].includes(get.type(name))
  && (name !== "sha" || !nature || ["fire", "thunder"].includes(nature)))
  .filter(([, , name, nature]) => (event._backup?.filterCard || event.filterCard)({ name, nature, isCard: true }, player, event));

const pendingYushen = new WeakSet();
function confirmYushen(source) {
  if (!source.isMine?.() || pendingYushen.has(source)) return;
  pendingYushen.add(source);
  queueMicrotask(() => {
    try {
      if (_status.event === source && source.skill === "fan_yushen_convert_backup" && game.check()
        && _status.event === source && source.skill === "fan_yushen_convert_backup") {
        ui.confirm?.close();
        if (source.skillDialog === true) source.skillDialog = false;
        ui.click.ok();
      }
    } finally { pendingYushen.delete(source); }
  });
}

const wuxiangShaOptions = (event, player) => get.inpileVCardList(([, , name]) => name === "sha")
  .filter(([, , name, nature]) => (event._backup?.filterCard || event.filterCard || (() => true))({ name, nature, isCard: true }, player, event));
function spendWuxiangSha(result, player) {
  player.removeCharge(1);
  game.trySkillAudio("fan_wuxiang_sha_voice", player, true);
  player.addTempSkill("fan_wuxiang_sha_used", { global: "phaseAfter" });
}

export default {
  fan_wuxiang_ready_voice: { audio: "ext:原神/audio/raiden/skill:true" },
  fan_wuxiang_hurt_voice: { audio: "ext:原神/audio/raiden/skill:true" },
  fan_wuxiang_sha_voice: { audio: "ext:原神/audio/raiden/skill:true" },
  fan_wuxiang_duel_voice: { audio: "ext:原神/audio/raiden/skill:true" },
  fan_wuxiang_thunder_voice: { audio: "ext:原神/audio/raiden/skill:3" },
  fan_suoguo_voice: { audio: "ext:原神/audio/raiden/skill:3" },
  fan_yushen_awaken_voice: { audio: "ext:原神/audio/raiden/skill:true" },
  fan_yushen_voice: { audio: ["ext:原神/audio/raiden/skill/fan_yushen_voice.mp3", "ext:原神/audio/raiden/skill/fan_yushen_voice_hm.mp3", "ext:原神/audio/raiden/skill/fan_yushen_voice_cooking.mp3"] },

  fan_wuxiang: {
    resolveCharge: gainResolve,
    persevereSkill: true, locked: false, chargeSkill: 9, derivation: ["fan_yushen"],
    init(player) {
      if (player.storage.fan_wuxiang_initialized) return;
      player.storage.fan_wuxiang_initialized = true;
      player.addCharge(3, false);
    },
    group: ["fan_wuxiang_gain", "fan_wuxiang_sha", "fan_wuxiang_duel", "fan_wuxiang_thunder"],
  },
  fan_wuxiang_gain: {
    audio: false,
    persevereSkill: true, locked: false, forced: true,
    trigger: { player: ["phaseZhunbeiBegin", "damageEnd"], source: "damageSource" },
    filter: (event, player) => player.hasSkill("fan_wuxiang") && (event.name !== "damage" || (event.num > 0 && !event.unreal)),
    async content(event, trigger, player) {
      const amount = trigger.name !== "damage" ? 1 : trigger.num * (event.triggername === "damageEnd" ? 2 : 1);
      await gainResolve(player, amount, trigger.name !== "damage" ? "fan_wuxiang_ready_voice" : event.triggername === "damageEnd" ? "fan_wuxiang_hurt_voice" : null);
    },
  },
  fan_wuxiang_sha: {
    audio: false,
    persevereSkill: true, locked: false,
    enable: ["chooseToUse", "chooseToRespond"],
    direct: true,
    filter: (event, player) => canSpend(player, 1, "fan_wuxiang_sha_used") && wuxiangShaOptions(event, player).length > 0,
    hiddenCard: (player, name) => name === "sha" && canSpend(player, 1, "fan_wuxiang_sha_used"),
    prompt: "无想：选择杀的类型", prompt2: false,
    onChooseToUse: prepare,
    onuse: spendWuxiangSha, onrespond: spendWuxiangSha,
    chooseButton: {
      dialog(event, player) {
        return { dialog: ui.create.dialog("无想：选择杀的类型", [wuxiangShaOptions(event, player), "vcard"]), fanPairedConfirm: true };
      },
      filter(button, player) {
        return canSpend(player, 1, "fan_wuxiang_sha_used") && wuxiangShaOptions(_status.event.getParent(), player)
          .some(link => link[3] === button.link[3]);
      },
      check(button) {
        const event = _status.event.getParent();
        return event.type === "phase" ? get.player().getUseValue({name:"sha",nature:button.link[3],isCard:true}) : 1;
      },
      backup(links, player) {
        const source = _status.event, nature = links[0][3];
        const valid = () => canSpend(player, 1, "fan_wuxiang_sha_used")
          && wuxiangShaOptions(source, player).some(link => link[3] === nature);
        let pending = false;
        return {
          audio: false, persevereSkill: true, locked: false,
          filterCard: () => false, selectCard: -1,
          viewAs: { name: "sha", nature, isCard: true }, viewAsFilter: valid,
          manualConfirm: source.name !== "chooseToRespond",
          filterOk() {
            if (!valid()) return false;
            // Defer until the native check/pause sequence has completed, even
            // when the player's automatic-confirm setting is disabled.
            if (source.name === "chooseToRespond" && source.isMine?.() && !pending) {
              pending = true;
              setTimeout(() => {
                try {
                  if (_status.event === source && source.skill === "fan_wuxiang_sha_backup" && valid() && game.check()) ui.click.ok();
                } finally { pending = false; }
              }, 0);
            }
            return true;
          },
          onuse: spendWuxiangSha, onrespond: spendWuxiangSha,
        };
      },
      prompt: () => "无想：选择杀的目标",
    },
    ai: { respondSha: true, skillTagFilter: player => canSpend(player, 1, "fan_wuxiang_sha_used") },
  },
  fan_wuxiang_sha_used: { charlotte: true },
  fan_wuxiang_duel: {
    audio: false,
    persevereSkill: true, locked: false, enable: "phaseUse", usable: 1,
    filter: (event, player) => canSpend(player, 3),
    viewAs: { name: "juedou", isCard: true }, filterCard: () => false, selectCard: -1,
    prompt: "无想：消耗3个蓄力点，视为使用【决斗】", prompt2: false,
    onChooseToUse: prepare,
    onuse(result, player) { player.removeCharge(3); game.trySkillAudio("fan_wuxiang_duel_voice", player, true); },
    ai: { order: 7 },
  },
  fan_wuxiang_thunder: {
    audio: false,
    persevereSkill: true, locked: false, enable: "phaseUse", usable: 1,
    filter: (event, player) => canSpend(player, 6), filterTarget: true,
    prompt: "无想：消耗6个蓄力点，对一名角色造成3点雷电伤害", prompt2: false,
    onChooseToUse: prepare,
    async content(event, trigger, player) {
      if (!canSpend(player, 6) || !event.target.isIn()) return;
      player.removeCharge(6);
      game.trySkillAudio("fan_wuxiang_thunder_voice", player, true);
      await event.target.damage(3, "thunder", player);
    },
    ai: { order: 8, result: { target: -3 } },
  },
  fan_suoguo: {
    audio: false,
    persevereSkill: true, locked: false, zhuSkill: true, forced: true, firstDo: true,
    trigger: { player: "phaseBeginStart", global: ["enterGame", "phaseJudgeBegin"] },
    filter: (event, player) => player.hasZhuSkill("fan_suoguo") && (event.name === "phaseJudge" ? event.player !== player : _status.currentPhase === player),
    onremove: clearHunt,
    async content(event, trigger, player) {
      if (trigger.name === "phaseJudge") {
        const target = trigger.player;
        if (!target.isIn()) return;
        game.trySkillAudio("fan_suoguo_voice", player, true);
        const result = await target.judge(lib.card.shandian.judge).set("judge2", lib.card.shandian.judge2).forResult();
        if (result.bool === false && target.isIn()) await target.damage(3, "thunder", "nosource");
        return;
      }
      const targets = (trigger.name === "phase" ? game.players.slice() : [trigger.player]).sortBySeat(_status.currentPhase || player);
      for (const target of targets) {
        if (target === player || !target.isIn()) continue;
        target.storage.fan_suoguo_owner = player;
        target.addTempSkill("fan_suoguo_block", { global: "phaseAfter" });
      }
    },
  },
  fan_suoguo_block: {
    charlotte: true, persevereSkill: true, locked: false,
    init(player, skill) { player.addSkillBlocker(skill); },
    onremove(player, skill) { player.removeSkillBlocker(skill); delete player.storage.fan_suoguo_owner; },
    skillBlocker(skill, player) {
      const info = lib.skill[skill];
      return hunted(player) && info && !info.charlotte && !info.persevereSkill && !get.is.locked(skill, player);
    },

  },
  fan_yushen: {
    audio: false,
    persevereSkill: true, locked: false, direct: true,
    trigger: { global: "cardsDiscardAfter" },
    filter: (event, player) => !player.hasSkill("fan_yushen_used") && responseCards(event, player).length > 0
      && game.hasPlayer(target => target !== player),
    async content(event, trigger, player) {
      const cards = responseCards(trigger, player);
      if (player.hasSkill("fan_yushen_used") || !cards.length) return;
      // 虚拟响应牌对应多张实体时，交给同一角色，不额外选择其中一张。
      const result = await prepare(player.chooseTarget("御神：选择获得此牌的角色", (card, source, target) => source !== target)).set("prompt2", false)
        .set("ai", target => get.attitude(player, target)).forResult();
      if (!result.bool) return;
      const remaining = cards.filter(card => get.position(card, true) === "d"), target = result.targets?.[0];
      if (!remaining.length || !target?.isIn() || target === player
        || player.hasSkill("fan_yushen_used")) return;
      player.addTempSkill("fan_yushen_used", { global: "phaseAfter" });
      player.logSkill("fan_yushen", target);
      game.trySkillAudio("fan_yushen_voice", player, true);
      target.addSkill("fan_yushen_convert");
      const gain = target.gain(remaining, "gain2");
      gain.gaintag.add(giftTag);
      await gain;
      if (player.isIn()) await player.draw();
    },
  },
  fan_yushen_used: { charlotte: true },
  fan_yushen_convert: {
    audio: false, direct: true,
    charlotte: true, persevereSkill: true, locked: false,
    enable: ["chooseToUse", "chooseToRespond"],
    filter: (event, player) => giftCards(player).length > 0 && names(event, player).length > 0,
    hiddenCard: (player, name) => giftCards(player).length > 0 && lib.inpile.includes(name)
      && ["basic", "trick", "delay"].includes(get.type(name)),
    onChooseToUse: prepare,
    chooseButton: {
      dialog(source, player) {
        delete source.fan_yushen_material;
        return {
          dialog: ui.create.dialog("御神：选择手牌和转化牌名", [names(source, player), "vcard"]),
          position: "h", selectCard: [0, 1],
          filterCard: card => giftCards(player).includes(card),
          fanPairedConfirm: true, manualConfirm: true,
          // Both selections remain native: the material is selected in the hand,
          // not duplicated as a button in the name dialog.
          callback(current, result) {
            source.fan_yushen_material = result.bool && result.cards?.length === 1
              && giftCards(current).includes(result.cards[0]) ? result.cards[0] : null;
          },
          processAI() {
            const material = giftCards(player).sort((a, b) => get.value(a, player) - get.value(b, player))[0];
            if (!material) return { bool: false };
            const options = names(source, player).map(link => ({ link, value: source.type === "phase"
              ? player.getUseValue({ name: link[2], nature: link[3], cards: [material] }) - get.value(material, player) * 0.2 : 1 }))
              .sort((a, b) => b.value - a.value);
            return material && options[0]?.value > 0 ? { bool: true, cards: [material], links: [options[0].link] } : { bool: false };
          },
        };
      },
      select: [0, 1],
      filter(button, player) {
        const source = _status.event.getParent();
        return names(source, player).some(link => link[2] === button.link[2] && link[3] === button.link[3]);
      },
      filterOk() {
        const player = _status.event.player;
        return ui.selected.cards.length === 1 && giftCards(player).includes(ui.selected.cards[0])
          && ui.selected.buttons.length === 1
          && lib.skill.fan_yushen_convert.chooseButton.filter(ui.selected.buttons[0], player);
      },
      check: button => _status.event.getParent().type === "phase"
        ? get.player().getUseValue({ name: button.link[2], nature: button.link[3] }) : 1,
      backup(links, player) {
        const source = _status.event, material = source.fan_yushen_material;
        delete source.fan_yushen_material;
        const card = { name: links[0][2], nature: links[0][3], cards: material ? [material] : [] };
        const info = get.info(card), range = lib.filter.selectTarget(card, player);
        const dying = source.type === "dying" && ["tao", "jiu"].includes(card.name) ? source.dying : null;
        const responding = source.name === "chooseToRespond";
        const automatic = responding || !!dying || !info.complexTarget && !info.complexSelect
          && (info.notarget || range?.[1] === -1 || range?.[0] === 0 && range?.[1] === 0);
        const sourceFilter = source.filterTarget;
        const valid = () => !!material && giftCards(player).includes(material)
          && names(source, player).some(link => link[2] === card.name && link[3] === card.nature);
        return {
          audio: false, charlotte: true, persevereSkill: true,
          position: "h", selectCard: -1,
          filterCard: current => current === material && valid(),
          viewAs: card, viewAsFilter: () => valid(),
          direct: false, manualConfirm: true,
          ...(dying ? { selectTarget: -1, filterTarget: (vcard, current, target) => target === dying && target.isIn()
            && (sourceFilter || lib.filter.filterTarget)(vcard, current, target) } : {}),
          filterOk() {
            if (!valid() || ui.selected.cards.length !== 1 || ui.selected.cards[0] !== material) return false;
            if (dying && (!dying.isIn() || ui.selected.targets.length !== 1 || ui.selected.targets[0] !== dying)) return false;
            if (automatic) confirmYushen(source);
            return true;
          },
        };
      },
      prompt: () => "御神：选择目标",
    },
    ai: { order: 6, result: { player: 1 }, respondSha: true, respondShan: true,
      skillTagFilter: player => giftCards(player).length > 0 },
  },
};
