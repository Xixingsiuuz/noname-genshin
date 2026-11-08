// 可直接用于 broadcastAll，不依赖模块闭包；原图不改色，效果均为 SVG 图层。
// 400×560 坐标与裁切版一致；cover + xMidYMin slice 保持大小图眼部对齐。
export function setZibaiEyes(player, mode, surface) {
  if (typeof document === "undefined" || !player?.node) return;
  if (![player.name, player.name1, player.name2].includes("fan_zibai")) return;
  if (mode?.startsWith("pulse_")) {
    const token = {};
    player.fanZibaiEyeFlash = { token, mode: mode.slice(6) };
    setTimeout(() => {
      if (player.fanZibaiEyeFlash?.token !== token) return;
      delete player.fanZibaiEyeFlash;
      setZibaiEyes(player, player.storage?.fan_zibai_complete ? "full" : player.storage?.fan_zibai_form);
    }, 1500);
    mode = player.fanZibaiEyeFlash.mode;
  } else if (mode === "hold_yan") {
    player.fanZibaiEyeHeld = "yan";
    mode = "yan";
  } else if (mode === "release") {
    delete player.fanZibaiEyeHeld;
    mode = player.storage?.fan_zibai_complete ? "full" : player.storage?.fan_zibai_form;
  }
  mode = player.fanZibaiEyeFlash?.mode || player.fanZibaiEyeHeld || mode;
  const avatar = surface || (player.name2 === "fan_zibai" ? player.node.avatar2 : player.node.avatar);
  if (!avatar) return;
  const palettes = {
    yun: ["#102356", "#244dba", "#298fe6", "#51daef", "#d9ffff", "#78e8ff"],
    yan: ["#40132f", "#8d2346", "#d5425e", "#ff996e", "#ffe7c5", "#ff657e"],
    ren: ["#4a3221", "#977022", "#d4a32b", "#f5d75a", "#fff4bc", "#ffd557"],
    full: ["#57361d", "#b37d20", "#edb82e", "#ffe77d", "#fffce0", "#ffe989"],
  };
  if (!document.getElementById("fan-zibai-eyes-style")) {
    const style = document.createElement("style");
    style.id = "fan-zibai-eyes-style";
    style.textContent = `
      .fan-zibai-eyes{position:absolute!important;inset:0!important;width:100%!important;height:100%!important;
        pointer-events:none!important;overflow:hidden;z-index:2;border-radius:inherit}
      .fan-zibai-eyes *{pointer-events:none!important}
      .fan-zibai-eyes .fan-zibai-aura{animation:fan-zibai-breathe 3.2s ease-in-out infinite}
      .fan-zibai-eyes .fan-zibai-rim{animation:fan-zibai-flow 3.8s linear infinite}
      .fan-zibai-eyes .fan-zibai-glint{animation:fan-zibai-glint 2.8s ease-in-out infinite}
      .fan-zibai-eyes[data-intensity="2"] .fan-zibai-aura{animation:fan-zibai-burst .7s ease-in-out infinite}
      @keyframes fan-zibai-burst{0%,100%{opacity:.65}50%{opacity:1}}
      .fan-zibai-eyes[data-mode="yan"] .fan-zibai-aura{animation-duration:2.4s}
      .fan-zibai-eyes[data-mode="full"] .fan-zibai-aura{animation-duration:3.6s}
      @keyframes fan-zibai-breathe{0%,100%{opacity:.34}50%{opacity:.9}}
      @keyframes fan-zibai-flow{from{stroke-dashoffset:0}to{stroke-dashoffset:-64}}
      @keyframes fan-zibai-glint{0%,100%{opacity:.45}45%{opacity:.95}70%{opacity:.65}}
      @media(prefers-reduced-motion:reduce){.fan-zibai-eyes *{animation:none!important}}
    `;
    document.head.appendChild(style);
  }
  const draw = node => {
    node.fanZibaiOwner = player;
    const previous = node.querySelector(".fan-zibai-eyes");
    const intensity = player.fanZibaiEyeFlash ? "2" : player.fanZibaiEyeHeld ? "1" : "0";
    if (previous?.getAttribute("data-mode") === mode && previous.getAttribute("data-intensity") === intensity) return;
    previous?.remove();
    if (!palettes[mode]) {
      node.classList.remove("fan-zibai-portrait");
      delete node.dataset.fanZibaiMode;
      if (node.fanZibaiLayout) {
        node.style.backgroundSize = node.fanZibaiLayout.size;
        node.style.backgroundPosition = node.fanZibaiLayout.position;
        delete node.fanZibaiLayout;
      }
      return;
    }
    const [dark, shade, mid, light, core, glow] = palettes[mode];
    node.classList.add("fan-zibai-portrait");
    node.dataset.fanZibaiMode = mode;
    node.fanZibaiLayout || (node.fanZibaiLayout = { size: node.style.backgroundSize, position: node.style.backgroundPosition });
    node.style.backgroundSize = "cover";
    node.style.backgroundPosition = "center top";
    const ns = "http://www.w3.org/2000/svg";
    const make = (tag, attributes, parent) => {
      const element = document.createElementNS(ns, tag);
      for (const [key, value] of Object.entries(attributes || {})) element.setAttribute(key, value);
      if (parent) parent.appendChild(element);
      return element;
    };
    const id = `fan-zibai-eye-${document.fanZibaiEyeSequence = (document.fanZibaiEyeSequence || 0) + 1}`;
    const svg = make("svg", { class: "fan-zibai-eyes", viewBox: "0 0 400 560", preserveAspectRatio: "xMidYMin slice", "aria-hidden": "true", "data-mode": mode });
    svg.setAttribute("data-intensity", intensity);
    const defs = make("defs", {}, svg);
    const gradient = make("radialGradient", { id: `${id}-iris`, cx: "46%", cy: "78%", r: "82%" }, defs);
    for (const [offset, color] of [[0, core], [.2, light], [.43, mid], [.66, shade], [.86, dark], [1, dark]]) make("stop", { offset, "stop-color": color }, gradient);
    const haze = make("radialGradient", { id: `${id}-haze` }, defs);
    for (const [offset, opacity] of [[0, 0], [.42, .04], [.62, .24], [1, 0]]) make("stop", { offset, "stop-color": glow, "stop-opacity": opacity }, haze);
    const blur = make("filter", { id: `${id}-blur`, x: "-80%", y: "-100%", width: "260%", height: "300%", "color-interpolation-filters": "sRGB" }, defs);
    make("feGaussianBlur", { stdDeviation: mode === "full" ? 1.7 : 1.2 }, blur);
    const bright = mode === "full";
    for (const [index, eye] of [
      { x: 216.8, y: 174.2, rx: 7.5, ry: 8.3, rim: "M202 168 Q211 162 229 173 M207 179 Q216 188 228 176" },
      { x: 158.7, y: 160.2, rx: 3.5, ry: 5.6, rim: "M150 153 Q156 153 165 161 M151 161 Q156 170 165 168" },
    ].entries()) {
      const { x, y, rx, ry, rim } = eye;
      const aura = make("g", { class: "fan-zibai-aura", style: `animation-delay:${index ? "-.7s" : "0s"}` }, svg);
      make("ellipse", { cx: x, cy: y, rx: rx * 2.3, ry: ry * 1.65, fill: `url(#${id}-haze)`, opacity: bright ? 1 : .75 }, aura);
      make("path", { d: rim, fill: "none", stroke: glow, "stroke-width": bright || player.fanZibaiEyeFlash || player.fanZibaiEyeHeld ? 2.5 : 1.35, "stroke-linecap": "round", filter: `url(#${id}-blur)` }, aura);
      make("path", { class: "fan-zibai-rim", d: rim, fill: "none", stroke: core, opacity: bright ? .85 : .65, "stroke-width": .45, "stroke-linecap": "round", "stroke-dasharray": "5 27", style: `animation-delay:${index ? "-1.2s" : "0s"}` }, svg);
      const clip = make("clipPath", { id: `${id}-clip-${index}` }, defs);
      make("ellipse", { cx: x, cy: y, rx, ry }, clip);
      const iris = make("g", { "clip-path": `url(#${id}-clip-${index})` }, svg);
      make("ellipse", { cx: x, cy: y, rx, ry, fill: `url(#${id}-iris)`, opacity: .9 }, iris);
      // 径向纹理、暗色上缘、下弦反光和独立瞳孔高光，避免单色实心眼。
      for (let spoke = 0; spoke < 18; spoke++) {
        const angle = spoke * Math.PI * 2 / 18;
        make("path", { d: `M${x + Math.cos(angle) * rx * .43} ${y + Math.sin(angle) * ry * .43} L${x + Math.cos(angle) * rx * .94} ${y + Math.sin(angle) * ry * .94}`, stroke: spoke % 2 ? core : shade, "stroke-width": .23, opacity: .3 }, iris);
      }
      make("ellipse", { cx: x, cy: y, rx: rx - .2, ry: ry - .2, fill: "none", stroke: dark, "stroke-width": .65, opacity: .8 }, iris);
      make("path", { d: `M${x - rx * .64} ${y + ry * .48} Q${x} ${y + ry * 1.05} ${x + rx * .68} ${y + ry * .3}`, stroke: core, "stroke-width": .65, fill: "none", opacity: bright ? .95 : .7 }, iris);
      make("ellipse", { cx: x + .1, cy: y - 1, rx: rx * .22, ry: ry * .49, fill: dark, opacity: .85 }, iris);
      make("ellipse", { cx: x + rx * .21, cy: y - ry * .28, rx: rx * .18, ry: ry * .32, fill: "#f5ffff", opacity: .93 }, iris);
      make("ellipse", { class: "fan-zibai-glint", cx: x - rx * .38, cy: y - ry * .53, rx: rx * .12, ry: ry * .17, fill: core }, iris);
      make("circle", { class: "fan-zibai-glint", cx: x + rx * .48, cy: y + ry * .45, r: bright ? .65 : .43, fill: "#fffbe6", style: "animation-delay:-1.4s" }, iris);
    }
    node.appendChild(svg);
  };
  draw(avatar);
  // 大图绑定实际角色实例，多名兹白互不覆盖；关闭后没有常驻计时器。
  if (!surface) for (const node of document.querySelectorAll(".fan-zibai-portrait")) {
    if (node !== avatar && node.fanZibaiOwner === player) draw(node);
  }
}

// 包装原生详情入口，不改引擎文件，不替代弹窗和关闭流程。
export function installZibaiEyes(ui, game) {
  const original = ui.click.charactercard;
  if (!original || original.fanZibaiEyes) return;
  function characterCard(...args) {
    if (args[0] !== "fan_zibai" || typeof document === "undefined") return original.apply(this, args);
    const before = new Set(document.querySelectorAll(".menubg.charactercard"));
    const result = original.apply(this, args);
    const source = args[4] || args[1];
    const owner = source ? source.fanZibaiOwner || [...(game.players || []), ...(game.dead || [])]
      .find(player => player.node?.avatar === source || player.node?.avatar2 === source) : undefined;
    const mode = owner ? owner.storage.fan_zibai_complete ? "full" : owner.storage.fan_zibai_form || "ren" : "ren";
    for (const dialog of document.querySelectorAll(".menubg.charactercard")) {
      if (before.has(dialog)) continue;
      const portrait = dialog.querySelector(".ava > .avatar");
      if (portrait) setZibaiEyes(owner || { name: "fan_zibai", node: {} }, mode, portrait);
    }
    return result;
  }
  characterCard.fanZibaiEyes = true;
  ui.click.charactercard = characterCard;
}
