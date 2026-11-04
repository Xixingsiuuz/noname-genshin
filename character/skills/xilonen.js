import { lib, game, get, ui } from "../../../../noname.js";

const effects = ["fan_duanyin_draw", "fan_duanyin_hand", "fan_duanyin_rescue"];
const yin = player => !!player.storage.fan_duanyin;
const equipment = (card, player) => get.type(card) === "equip" && player.canRecast(card);
const grant = (target, skill) => { target.addSkill(skill); target.addMark(skill, 1, false); };
const giftOwners = player => game.filterPlayer(current => current !== player && current.hasSkill("fan_duanyin") && yin(current));
const availableSkills = (name, target) => get.character(name, 3).filter(skill => {
  const info = get.info(skill);
  return info && !info.charlotte && !info.hiddenSkill && (!info.zhuSkill || target.isZhu) && !target.hasSkill(skill, null, false, false);
});
function pool() { return game.initCharacterList(true); }
function rank(skill, target) {
  const info = get.info(skill);
  if (info?.ai?.neg) return -5;
  if (info?.ai?.combo && !target.hasSkill(info.ai.combo)) return 0;
  return get.skillRank(skill, "in") || 1;
}

export default {
  fan_duanyin: {
    audio: "ext:原神/audio/xilonen/skill:3",
    logAudio: () => false,
    enable: "phaseUse",
    usable: 1,
    locked: false,
    zhuanhuanji: true,
    mark: true,
    marktext: "☯",
    intro: { content(storage) { return `当前状态：${storage ? "阴" : "阳"}`; } },
    filter(event, player) { return yin(player) || player.hasCard(card => equipment(card, player), "he"); },
    selectCard() { return yin(get.player()) ? 0 : [0, 1]; },
    position: "he",
    filterCard: equipment,
    selectTarget() { return yin(get.player()) ? 0 : 1; },
    filterTarget: true,
    filterOk() { return yin(get.player()) || ui.selected.cards.length === 1 && ui.selected.targets.length === 1; },
    manualConfirm: true,
    fanPairedConfirm: true,
    discard: false,
    lose: false,
    delay: false,
    prompt(event, player) {
      return yin(player) ? "锻音：摸一张牌并回复1点体力"
        : "锻音：重铸一张装备牌，选择受益角色";
    },
    prompt2: false,
    global: "fan_duanyin_gift",
    async content(event, trigger, player) {
      const isYin = yin(player);
      const target = event.targets?.[0];
      const card = event.cards?.[0];
      if (!isYin && (!target?.isIn() || !player.getCards("he").includes(card) || !equipment(card, player))) return;
      // 主动转换在效果开始时消耗次数并转换，结算中的嵌套事件不会重复发动原分支。
      player.changeZhuanhuanji("fan_duanyin");
      if (isYin) {
        game.trySkillAudio("fan_duanyin_yin_voice", player, true);
        await player.draw();
        if (player.isIn()) await player.recover();
        return;
      }
      game.trySkillAudio("fan_duanyin", player, true);
      await player.recast(card);
      if (!target.isIn()) return;
      const result = await player.chooseControl("摸牌数+1", "手牌上限+2", "脱离濒死回复")
        .set("prompt", "锻音：选择增益").set("ai", () => {
          if (target.hp <= 1 && !target.countMark(effects[2])) return 2;
          return target.countCards("h") > target.getHandcardLimit() + 1 ? 1 : 0;
        }).forResult();
      if (target.isIn() && effects[result.index]) grant(target, effects[result.index]);
    },
    ai: {
      order(player) { return yin(player) ? (player.isDamaged() ? 9 : 2) : 8; },
      check(card) { return 7 - get.value(card); },
      result: {
        player(player) { return yin(player) ? 1 + (player.isDamaged() ? 2 : 0) : 0.5; },
        target: 2,
      },
    },
  },
  fan_duanyin_gift: {
    audio: false,
    enable: "phaseUse",
    filter(event, player) { return giftOwners(player).length > 0 && player.hasCard(card => get.type(card) === "equip", "he"); },
    position: "he",
    filterCard: card => get.type(card) === "equip",
    selectCard: [0, 1],
    selectTarget: 1,
    filterTarget(card, player, target) { return giftOwners(player).includes(target); },
    filterOk() { return ui.selected.cards.length === 1 && ui.selected.targets.length === 1; },
    manualConfirm: true,
    fanPairedConfirm: true,
    prompt: "锻音：交给希诺宁一张装备牌",
    prompt2: false,
    discard: false,
    lose: false,
    async content(event, trigger, player) {
      const target = event.targets[0], card = event.cards[0];
      if (!giftOwners(player).includes(target) || !player.getCards("he").includes(card) || get.type(card) !== "equip") return;
      await player.give(card, target);
      if (target.isIn() && target.hasSkill("fan_duanyin") && yin(target)) {
        target.changeZhuanhuanji("fan_duanyin");
        game.trySkillAudio("fan_duanyin_change_voice", target, true);
      }
    },
    ai: { order: 5, check: card => 5 - get.value(card), result: { target: 2 } },
  },
  fan_duanyin_yin_voice: { audio: "ext:原神/audio/xilonen/skill:2" },
  fan_duanyin_change_voice: { audio: "ext:原神/audio/xilonen/skill:2" },
  fan_duanyin_draw: {
    charlotte: true, marktext: "音", intro: { content: "摸牌阶段摸牌数+#" },
    trigger: { player: "phaseDrawBegin2" }, forced: true,
    filter: event => !event.numFixed,
    async content(event, trigger, player) { trigger.num += player.countMark("fan_duanyin_draw"); },
  },
  fan_duanyin_hand: {
    charlotte: true, marktext: "音", intro: { content(storage) { return `手牌上限+${2 * storage}`; } },
    mod: { maxHandcard(player, num) { return num + 2 * player.countMark("fan_duanyin_hand"); } },
  },
  fan_duanyin_rescue: {
    charlotte: true, marktext: "音", intro: { content: "脱离濒死状态后回复#点体力" },
    trigger: { player: "dyingAfter" }, forced: true,
    filter(event, player) { return player.isIn() && player.hp > 0; },
    async content(event, trigger, player) { if (player.isIn() && player.hp > 0) await player.recover(player.countMark("fan_duanyin_rescue")); },
  },
  fan_zhuhun: {
    audio: "ext:原神/audio/xilonen/skill:3",
    limited: true, skillAnimation: true, animationColor: "orange",
    trigger: { player: "dying" }, direct: true, locked: false,
    filter(event, player) { return !player.storage.fan_zhuhun && pool().length > 0; },
    async content(event, trigger, player) {
      if (player.storage.fan_zhuhun) return;
      const result = await player.chooseTarget("铸魂：选择获得技能的角色")
        .set("prompt2", false).set("fanPairedConfirm", true).set("manualConfirm", true)
        .set("ai", target => get.attitude(player, target) + (target === player ? 1 : 0)).forResult();
      if (!result.bool || player.storage.fan_zhuhun) return;
      const target = result.targets[0], names = pool().randomGets(3);
      if (!target.isIn() || !names.length) return;
      player.awakenSkill("fan_zhuhun");
      player.logSkill("fan_zhuhun", target);
      // 查看并不取走武将牌；抽样后不重抽，不因无合格技能改变随机分布。
      const options = [...new Set(names.flatMap(name => availableSkills(name, target)))];
      const dialog = ["铸魂：选择一个技能", [names, "character"]];
      if (!options.length) { await player.chooseButton(dialog, true).set("selectButton", 0); return; }
      const rows = options.map(skill => [skill, `<div class="popup text"><div class="skill">${get.translation(skill)}</div><div>${get.translation(skill + "_info")}</div></div>`]);
      dialog.push([rows, "textbutton"]);
      const choice = await player.chooseButton(dialog, true)
        .set("filterButton", button => options.includes(button.link))
        .set("ai", button => rank(button.link, target)).forResult();
      const skill = choice.links?.[0];
      if (!target.isIn() || !options.includes(skill) || !names.some(name => availableSkills(name, target).includes(skill))) return;
      // 参考势小乔音洄：授予前清理该技能旧持有期状态、恢复原生限定标记。
      for (const key of Object.keys(target.storage)) {
        if (key.startsWith(skill)) delete target.storage[key];
      }
      if (target.awakenedSkills.includes(skill)) target.restoreSkill(skill);
      for (const type of ["triggerSkill", "skill"]) delete target.getStat(type)[skill];
      for (const suffix of ["used", "round", "block", "blocker"]) {
        if (target.hasSkill(skill + "_" + suffix)) target.removeSkill(skill + "_" + suffix);
      }
      await target.addSkills(skill);
    },
  },
};
