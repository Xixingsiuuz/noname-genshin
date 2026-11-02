import { game, get, ui, _status } from "../../../../noname.js";

const converted = card => ["shan", "tao", "jiu"].includes(card.name);

export default {
  fan_chiyi: {
    audio: "ext:原神/audio/arlecchino/skill:2",
    logAudio: () => false,
    locked: true,
    forced: true,
    trigger: { player: "damageBegin4" },
    filter: event => event.num > 0 && event.hasNature("fire"),
    async content(event, trigger, player) {
      const amount = trigger.num;
      const gainsArmor = player.hujia < 5;
      trigger.cancel();
      await player.changeHujia(amount, "gain", 5);
      if (gainsArmor) game.trySkillAudio("fan_chiyi", player, true, true);
    },
    group: ["fan_chiyi_damage", "fan_chiyi_link"],
    mod: {
      maxHandcard(player, num) { if (player.hp <= 2) return num + 4; },
    },
    subSkill: {
      damage: {
        audio: false,
        locked: true,
        forced: true,
        trigger: { source: "damageBegin1" },
        filter: (event, player) => player.hp <= 3,
        async content(event, trigger, player) {
          // 只检查转化前的属性，避免普通/雷电伤害转火后也获得加伤。
          if (trigger.hasNature("fire")) trigger.num++;
          game.setNature(trigger, "fire");
        },
      },
      link: {
        audio: false, locked: true, forced: true,
        trigger: { player: "useCardToPlayered" },
        filter: (event, player) => player.hp <= 1 && event.target.isIn() && !event.target.isLinked(),
        async content(event, trigger, player) {
          if (trigger.target.isIn() && !trigger.target.isLinked()) await trigger.target.link(true);
        },
      },
    },
    ai: { nofire: true, effect: { target(card) { if (get.tag(card, "fireDamage")) return "zerotarget"; } } },
  },
  fan_luhuo: {
    audio: ["fan_luhuo_start", "fan_luhuo_draw", "fan_luhuo_attack"],
    logAudio: () => false,
    locked: false,
    enable: "phaseUse",
    usable: 1,
    selectTarget: [1, 2],
    filterTarget: (card, player, target) => target !== player,
    multitarget: true,
    multiline: true,
    async content(event, trigger, player) {
      const targets = event.targets.slice().sortBySeat(_status.currentPhase || player);
      game.trySkillAudio(!player.storage.fan_ruyue ? "fan_luhuo_start" : player.storage.fan_ruyue === "recover" ? "fan_luhuo_draw" : "fan_luhuo_attack", player, true, true);
      for (const target of targets) {
        if (!target.isIn() || !player.isIn()) continue;
        const choices = [];
        if (player.storage.fan_ruyue !== "recover") choices.push("不限距离次数");
        if (player.storage.fan_ruyue !== "convert") choices.push("摸牌并连环");
        // 删除选项后直接执行唯一剩余项，省去无意义的确认。
        const result = choices.length === 1 ? { control: choices[0] } : await target.chooseControl(choices)
          .set("prompt", "炉火：选择一项")
          .set("prompt2", "不限距离次数：本回合其对你用牌无距离和次数限制；摸牌并连环：其摸两张牌，全部目标连环。")
          .set("source", player)
          .set("ai", () => {
            const attacks = player.countCards("h", card => get.tag(card, "damage") && player.hasUseTarget(card));
            // 敌方优先避免开放连出伤害牌；队友倾向提供摸牌收益。
            return get.attitude(target, player) > 0 || attacks >= 2 ? choices.indexOf("摸牌并连环") : choices.indexOf("不限距离次数");
          })
          .forResult();
        if (result.control === "不限距离次数") {
          player.addTempSkill("fan_luhuo_unlimited", { global: "phaseAfter" });
          player.markAuto("fan_luhuo_unlimited", [target]);
        } else if (result.control === "摸牌并连环") {
          await player.draw(2);
          // “这些角色”包含此次全部目标，不限于选择第二项的人。
          for (const current of targets) {
            if (current.isIn() && !current.isLinked()) await current.link(true);
          }
        }
      }
    },
    ai: { order: 8, result: {
      player(player) { return player.storage.fan_ruyue === "convert" ? 0 : 1; },
      target(player, target) {
        if (player.storage.fan_ruyue === "recover") return target.isLinked() ? 0.1 : -0.3;
        const attacks = player.countCards("h", card => get.tag(card, "damage") && player.canUse(card, target, false));
        return attacks ? -Math.min(2, attacks) : player.storage.fan_ruyue === "convert" ? 0 : 0.1;
      },
    } },
    subSkill: {
      unlimited: {
        locked: false,
        charlotte: true,
        onremove: true,
        intro: { content: "本回合对$使用牌无距离和次数限制" },
        mod: {
          targetInRange(card, player, target) {
            if (player.getStorage("fan_luhuo_unlimited").includes(target)) return true;
          },
          cardUsableTarget(card, player, target) {
            if (player.getStorage("fan_luhuo_unlimited").includes(target)) return true;
          },
        },
      },
    },
  },
  fan_ruyue: {
    // 台词页由 skillVoiceGroups 汇总；主技能的任何日志/按钮流程均不播音。
    audio: false,
    logAudio: () => false,
    locked: false,
    limited: true,
    skillAnimation: true,
    animationColor: "fire",
    direct: true,
    trigger: { player: "phaseZhunbeiBegin" },
    filter: (event, player) => !player.storage.fan_ruyue,
    async content(event, trigger, player) {
      const result = await player.chooseControl("于此升起", "于此坠落", "cancel2")
        .set("dialog", ["你可以发动【如月】，选择一项", [dialog => {
          // 用按钮栏上沿定位提示框底部；文字增加行数时向上扩展。
          // 仅作用于本次对话框，不修改引擎或其他技能的布局。
          dialog.classList.add("noupdate");
          dialog.style.setProperty("bottom", "auto", "important");
          dialog.style.setProperty("top", "30%", "important");
          dialog.style.setProperty("width", "min(560px, calc(100% - 40px))", "important");
          // open() 会重写 transform 做入场动画，居中必须由 left 独立完成。
          dialog.classList.add("fixed");
          dialog.style.setProperty("transition-property", "opacity", "important");
          // 原生 open() 会缩放整个弹窗；提示框不参与该入场缩放。
          dialog.style.setProperty("transform", "none", "important");
          dialog.style.setProperty("left", "max(20px, calc(50% - 280px))", "important");
          // 原生内容层为绝对定位。改成本弹窗内的普通文档流，避免文字溢出测量框。
          for (const node of [dialog.contentContainer, dialog.content]) {
            node.style.setProperty("position", "relative", "important");
            node.style.setProperty("top", "0", "important");
            node.style.setProperty("height", "auto", "important");
            node.style.setProperty("overflow", "visible", "important");
          }
          dialog.addText('<div class="text" style="font-size:18px;line-height:1.4">于此升起：回满体力，删除炉火选项1。<br>于此坠落：失去体力至1，本局闪、桃、酒均视为火杀，删除炉火选项2。</div>');
          const relayout = () => {
            if (!dialog.isConnected) return;
            const arena = ui.arena.getBoundingClientRect();
            const scale = arena.height / ui.arena.offsetHeight;
            if (!(scale > 0)) return;
            // 控件本身可能是零高容器，实际按钮还可能有位移。
            const buttons = [...ui.control.children].filter(node => node.getClientRects().length);
            const buttonScreenTop = Math.min(ui.control.getBoundingClientRect().top,
              ...buttons.map(node => node.getBoundingClientRect().top));
            const buttonTop = (buttonScreenTop - arena.top) / scale;
            const nodes = [dialog.content, ...dialog.content.querySelectorAll(".caption, .text")];
            const bounds = () => nodes.map(node => node.getBoundingClientRect());
            const contentTop = dialog.content.getBoundingClientRect().top;
            const height = Math.max(dialog.content.scrollHeight,
              (Math.max(...bounds().map(rect => rect.bottom)) - contentTop) / scale);
            dialog.style.setProperty("height", `${height}px`, "important");
            // 提示位于牌桌中央；按钮栏只作为下边界，不能作为正常显示的锚点。
            let top = Math.max(12, Math.min(ui.arena.offsetHeight * 0.42 - height / 2, buttonTop - height - 28));
            dialog.style.setProperty("top", `${top}px`, "important");
            // 最后按文字真实边界校正，覆盖原生内容层偏移及额外CSS缩放。
            const bottom = Math.max(...bounds().map(rect => rect.bottom));
            top = Math.max(12, top + Math.min(0, (buttonScreenTop - 28 * scale - bottom) / scale));
            dialog.style.setProperty("top", `${top}px`, "important");
          };
          // 原生 ui.update 在打开及缩放/窗口布局更新时都会运行。
          ui.updates.push(relayout);
          const open = dialog.open;
          dialog.open = function (...args) {
            const result = open.apply(this, args);
            // 原生通过 style.transform 赋值会替换同属性的 !important，须在 open 后恢复。
            this.style.setProperty("transform", "none", "important");
            this.style.setProperty("transition-property", "opacity", "important");
            relayout();
            return result;
          };
          const observer = new ResizeObserver(relayout);
          observer.observe(dialog.content);
          observer.observe(ui.control);
          observer.observe(ui.arena);
          const close = dialog.close;
          dialog.close = function (...args) {
            observer.disconnect();
            const index = ui.updates.indexOf(relayout);
            if (index >= 0) ui.updates.splice(index, 1);
            return close.apply(this, args);
          };
        }, "handle"]])
        .set("ai", () => {
          const convertedCount = player.countCards("h", converted);
          const enemies = game.countPlayer(target => get.attitude(player, target) < 0 && player.inRange(target));
          const burst = convertedCount + player.countCards("h", card => get.name(card, player) === "sha");
          if (player.hp <= 2 && player.hujia < 2 && player.maxHp - player.hp >= 2) return 0;
          if (enemies && burst >= 3 && (player.hp <= 2 || player.hujia >= 2)) return 1;
          return player.maxHp - player.hp >= 3 ? 0 : 2;
        }).forResult();
      if (result.control === "cancel2") return;
      if (player.storage.fan_ruyue) return;
      player.logSkill("fan_ruyue");
      player.awakenSkill("fan_ruyue");
      player.storage.fan_ruyue = result.control === "于此升起" ? "recover" : "convert";
      player.syncStorage("fan_ruyue");
      game.trySkillAudio(player.storage.fan_ruyue === "recover" ? "fan_ruyue_rise" : "fan_ruyue_fall", player, true, true);
      if (player.storage.fan_ruyue === "recover") {
        if (player.isDamaged()) await player.recover(player.maxHp - player.hp);
      } else {
        if (player.hp > 1) await player.loseHp(player.hp - 1);
        player.addSkill("fan_ruyue_convert");
      }
    },
    subSkill: {
      convert: {
        locked: false,
        audio: false,
        charlotte: true,
        mark: true,
        marktext: "月",
        intro: { content: "你的【闪】【桃】【酒】均视为【火杀】" },
        mod: {
          cardname(card) {
            if (converted(card)) return "sha";
          },
          cardnature(card) {
            if (converted(card)) return "fire";
          },
        },
        group: "fan_ruyue_convert_voice",
      },
    },
  },
  fan_luhuo_start: { audio: "ext:原神/audio/arlecchino/skill:3" },
  fan_luhuo_draw: { audio: "ext:原神/audio/arlecchino/skill:2" },
  fan_luhuo_attack: { audio: "ext:原神/audio/arlecchino/skill:2" },
  fan_ruyue_rise: { audio: "ext:原神/audio/arlecchino/skill:2" },
  fan_ruyue_fall: { audio: "ext:原神/audio/arlecchino/skill:2" },
  fan_ruyue_convert_voice: {
    charlotte: true, locked: false, forced: true, popup: false,
    audio: "ext:原神/audio/arlecchino/skill:3",
    trigger: { player: "useCard" },
    filter(event) {
      return event.card.name === "sha" && get.nature(event.card) === "fire" &&
        event.cards?.length === 1 && converted(event.cards[0]);
    },
    async content() {},
  },
};
