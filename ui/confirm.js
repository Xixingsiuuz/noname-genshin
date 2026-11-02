// 默认保留原生按钮；显式标记的选择事件固定显示确定/取消。
export function installSelectionConfirm(ui, status, lib) {
  installSkillButtons(ui, status, lib);
  installXiajiControls(ui, status);
  installMuniuSelection(ui, status, lib);
  if (ui.create.confirm.fanSelectionConfirm) return;
  const original = ui.create.confirm;
  function confirm(...args) {
    const event = status?.event;
    const pairedSelection = (event?.fanPairedConfirm || lib?.skill?.[event?.skill]?.fanPairedConfirm || event?.skill === "muniu_skill_backup") && event.isMine?.()
      && ["o", "c", "oc", "co"].includes(args[0]);
    const disabled = pairedSelection && !args[0].includes("o");
    if (pairedSelection) args[0] = "oc";
    const result = original.apply(this, args);
    const control = ui.confirm;
    if (!control) return result;
    const buttons = Array.from(control.childNodes);
    const paired = buttons.some(node => node.link === "ok") && buttons.some(node => node.link === "cancel");
    for (const node of buttons) {
      const unavailable = node.link === "ok" && disabled;
      node.classList.toggle("disabled", !!unavailable);
      node.setAttribute("aria-disabled", String(!!unavailable));
      node.style.opacity = unavailable ? "0.4" : "";
      node.style.pointerEvents = unavailable ? "none" : "";
      node.style.marginLeft = paired && node.link === "cancel" ? "32px" : "";
    }
    // 与原生 replace()/updatec() 一致使用内容区像素宽度；计入新增间距。
    // max-content 会改变原生绝对定位容器的测量结果，使视觉中心偏移。
    const width = buttons.reduce((sum, node) => sum + node.offsetWidth, 0) + (paired ? 32 : 0);
    control.style.width = `${width}px`;
    ui.updatec?.();
    return result;
  }
  confirm.fanSelectionConfirm = true;
  ui.create.confirm = confirm;
}

// 单辆木牛没有装备选择空间，直接使用原生 backup 进入扣置手牌的步骤。
// 不改写木牛的存牌、限次、移动或卸下装备的结算。
export function installMuniuSelection(ui, status, lib) {
  if (!lib || !ui.click?.skill || ui.click.skill.fanMuniuSelection) return;
  const original = ui.click.skill;
  function skill(id, ...args) {
    const event = status.event;
    const info = lib.skill.muniu_skill;
    if (id === "muniu_skill" && !status.connectMode && event?.name === "chooseToUse"
      && event.isMine?.() && event.muniu_skill?.length === 1
      && info?.chooseButton?.backup && info.filter(event, event.player)) {
      const backup = info.chooseButton.backup(event.muniu_skill, event.player);
      lib.skill.muniu_skill_backup = {
        ...backup,
        sourceSkill: "muniu_skill",
        position: "h",
        selectCard: 1,
        manualConfirm: true,
        prompt: "木牛：选择一张手牌扣置于木牛流马下",
      };
      return original.call(this, "muniu_skill_backup", ...args);
    }
    return original.call(this, id, ...args);
  }
  skill.fanMuniuSelection = true;
  ui.click.skill = skill;
}

// 保留原生技能控件、点击回调和关闭流程，只拆开各子按钮的视觉样式。
export function orderCharacterSkills(skills, player, lib) {
  if (!Array.isArray(skills) || !player || !lib?.character) return skills;
  const roots = [];
  for (const name of [player.name1 || player.name, player.name2]) {
    const character = lib.character[name];
    for (const id of character?.skills || character?.[3] || []) if (!roots.includes(id)) roots.push(id);
  }
  const owns = (root, id, seen = new Set()) => {
    if (root === id) return true;
    if (seen.has(root)) return false;
    seen.add(root);
    const info = lib.skill?.[root];
    const related = [info?.group, info?.derivation].flat().filter(value => typeof value === "string");
    return related.some(child => owns(child, id, seen))
      || (lib.skill?.[id]?.sourceSkill && owns(root, lib.skill[id].sourceSkill, seen));
  };
  const rank = id => { const index = roots.findIndex(root => owns(root, id)); return index < 0 ? roots.length : index; };
  return skills.map((id, index) => ({ id, index, rank: rank(id) }))
    .sort((a, b) => a.rank - b.rank || a.index - b.index).map(item => item.id);
}

export function installSkillButtons(ui, status, lib) {
  if (typeof document === "undefined") return;
  if (!document.getElementById("fan-skill-buttons-style")) {
    const style = document.createElement("style");
    style.id = "fan-skill-buttons-style";
    style.textContent = `
      #control > .control.fan-skill-buttons {
        display: inline-flex; gap: 16px; overflow: visible;
        box-sizing: content-box; justify-content: flex-start;
        padding-left: 4px; padding-right: 4px;
        background: none !important; box-shadow: none !important; border: none !important;
      }
      #control > .control.fan-skill-buttons > div {
        flex: 0 0 auto; padding: 5px 10px; margin: 0;
        border-radius: 6px;
        background: linear-gradient(rgba(0,0,0,.48),rgba(0,0,0,.48));
        box-shadow: 0 0 0 1px rgba(0,0,0,.4), 0 3px 8px rgba(0,0,0,.2);
      }
      #control > .control.fan-skill-buttons > div:active {
        background: rgba(90,110,120,.7);
      }
    `;
    document.head.appendChild(style);
  }
  // 重铸属于另一组原生技能控件。每次布局都重新测量，并为组间留出空隙，
  // 避免后创建的控件或文字宽度变化沿用旧宽度，覆盖前一组的末尾按钮。
  if (ui.updatec && !ui.updatec.fanSkillButtons) {
    const originalUpdate = ui.updatec;
    const observed = new Set();
    let pending = false;
    const relayout = () => {
      if (pending) return;
      pending = true;
      requestAnimationFrame(() => {
        pending = false;
        ui.updatec();
      });
    };
    // 字体加载、缩放及动态文字可能在上次排列之后改变按钮宽度。
    // 只观察子按钮，不观察我们设置宽度的父控件，避免布局反馈循环。
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(relayout);
    function update(...args) {
      const current = new Set();
      const controls = new Set([
        ...["skills", "skills2", "skills3"].map(name => ui[name]),
        ...Array.from(ui.control?.childNodes || []),
      ]);
      for (const control of controls) {
        if (!control?.classList.contains("fan-skill-buttons") || control.style.display === "none") continue;
        if (control.classList.contains("removing")) continue;
        const buttons = Array.from(control.childNodes);
        for (const button of buttons) {
          current.add(button);
          if (!observed.has(button)) observer?.observe(button);
        }
        const width = buttons.reduce((sum, node) => sum + node.offsetWidth, 0)
          + Math.max(0, buttons.length - 1) * 16 + 32;
        // 原生 updatec 另加8px内边距；末尾32px是实际占位的组间留白。
        control.style.width = `${width}px`;
      }
      for (const button of observed) if (!current.has(button)) observer?.unobserve(button);
      observed.clear();
      for (const button of current) observed.add(button);
      return originalUpdate.apply(this, args);
    }
    update.fanSkillButtons = true;
    ui.updatec = update;
    document.fonts?.addEventListener("loadingdone", relayout);
  }
  for (const name of ["skills", "skills2", "skills3"]) {
    const original = ui.create[name];
    if (!original || original.fanSkillButtons) continue;
    function create(...args) {
      args[0] = orderCharacterSkills(args[0], status?.event?.player, lib);
      const result = original.apply(this, args);
      const control = ui[name];
      if (control) {
        // 原生缓存仅比较成员，不比较顺序；保留节点与回调，修正缓存命中后的排列。
        if (Array.isArray(args[0]) && control.appendChild) {
          const nodes = Array.from(control.childNodes);
          const ordered = args[0].map(id => nodes.find(node => node.link === id)).filter(Boolean);
          if (ordered.some((node, index) => node !== nodes[index])) for (const node of ordered) control.appendChild(node);
          if (control.skills) control.skills = args[0].slice();
        }
        control.classList.add("fan-skill-buttons");
        if (control.style.display !== "none") {
          ui.updatec?.();
        }
      }
      return result;
    }
    create.fanSkillButtons = true;
    ui.create[name] = create;
  }
}

// 夏祭沿用原生小型数量控件；不足的数量保留显示并禁用。
export function installXiajiControls(ui, status) {
  if (!ui.create.control || !ui.click?.control || ui.create.control.fanXiajiControls) return;
  const isChoice = () => status?.event?.name === "chooseControl"
    && status.event.fan_xiaji_count_choice === true;
  const originalControl = ui.create.control;
  const originalClick = ui.click.control;
  function update(control) {
    for (const node of Array.from(control?.childNodes || [])) {
      const amount = Number(node.link);
      const unavailable = [1, 2, 3].includes(amount) && amount > status.event.player.countCharge();
      node.classList.toggle("disabled", unavailable);
      node.setAttribute("aria-disabled", String(unavailable));
      node.style.opacity = unavailable ? "0.4" : "";
      node.style.pointerEvents = unavailable ? "none" : "";
    }
  }
  function control(...args) {
    const result = originalControl.apply(this, args);
    if (isChoice()) update(result);
    return result;
  }
  ui.click.control = function (...args) {
    if (isChoice()) {
      update(this.parentNode);
      const amount = Number(this.link);
      if ([1, 2, 3].includes(amount) && amount > status.event.player.countCharge()) return;
    }
    return originalClick.apply(this, args);
  };
  control.fanXiajiControls = true;
  ui.create.control = control;
}
