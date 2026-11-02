import { ui } from "../../../noname.js";

// 可广播的纯展示流程；只创建 UI 牌，不生成实体牌或用牌事件。
export function showSulvQueue(action, records = [], index = 0, owner = "columbina") {
  if (typeof document === "undefined" || !document.body) return;
  const id = `fan-sulv-queue-${owner}`;
  let root = document.getElementById(id);
  if (action === "stop") {
    if (!root) return;
    const cards = [...root.fanCards.values()];
    for (const card of cards) card.classList.add("fan-sulv-card-done");
    setTimeout(() => { for (const card of cards) card.remove(); root.remove(); }, 900);
    return;
  }
  if (action === "settle") {
    root?.fanCards.get(index)?.classList.add("fan-sulv-card-done");
    return;
  }
  if (action === "start") {
    if (root) for (const card of root.fanCards.values()) card.remove();
    root?.remove();
    if (!records.length) return;
    if (!document.getElementById("fan-sulv-queue-style")) {
      const style = document.createElement("style");
      style.id = "fan-sulv-queue-style";
      style.textContent = `
        .fan-sulv-queue{display:none!important}
        .card.fan-sulv-queue-card{position:absolute!important;pointer-events:none!important;
          left:50%!important;top:46%!important;margin:0!important;
          transform:translate(-50%,-50%) translateX(var(--fan-offset)) scale(var(--fan-scale))!important;
          transform-origin:center;opacity:var(--fan-opacity);
          transition:transform .85s cubic-bezier(.22,.7,.25,1),opacity .85s ease,box-shadow .85s ease;
          animation:fan-sulv-card-enter 1.1s ease both;
          box-shadow:0 3px 13px #231a3955}
        .card.fan-sulv-queue-current{
          box-shadow:0 0 16px #d8c8ff99,0 4px 18px #27203a55}
        .card.fan-sulv-card-done{opacity:0!important;animation:none;
          transform:translate(-50%,-65%) translateX(var(--fan-offset)) scale(var(--fan-scale))!important}
        @keyframes fan-sulv-card-enter{from{opacity:0}to{opacity:var(--fan-opacity)}}
        @media(prefers-reduced-motion:reduce){.card.fan-sulv-queue-card{animation:none;transition:opacity .15s}}
      `;
      document.head.appendChild(style);
    }
    root = document.createElement("div");
    root.id = id;
    root.className = "fan-sulv-queue";
    root.setAttribute("aria-hidden", "true");
    root.fanCards = new Map();
    root.fanRecords = records;
    // 必须在原生抛牌所在的 arena 测量，包含当前布局的长牌/方牌及缩放。
    const host = ui.arena || document.body;
    root.fanHost = host;
    const probe = ui.create.card(host, "noclick");
    probe.classList.add("thrown");
    probe.style.visibility = "hidden";
    root.fanNativeWidth = probe.offsetWidth || 104;
    root.fanNativeHeight = probe.offsetHeight || 104;
    probe.remove();
    host.appendChild(root);
  }
  if (!root || !["start", "advance"].includes(action)) return;
  const end = Math.min(root.fanRecords.length, index + 6);
  for (const [key, card] of root.fanCards) {
    if (key < index || key >= end) { card.remove(); root.fanCards.delete(key); }
  }
  const hostWidth = root.fanHost.clientWidth || document.documentElement.clientWidth;
  const scale = Math.min(1, hostWidth / (9.5 * root.fanNativeWidth));
  const width = root.fanNativeWidth * scale;
  const step = width * .66;
  for (let n = index; n < end; n++) {
    let card = root.fanCards.get(n);
    if (!card) {
      const record = root.fanRecords[n];
      // 原生长牌的图片尺寸和裁切规则依赖 #arena > .card > .image。
      // 必须保留直接父级及 thrown 状态，不包裹卡面，不改内部图片样式。
      card = ui.create.card(root.fanHost, "noclick");
      card.init(["none", "", record.name, record.nature]);
      card.classList.add("thrown");
      // ui.clear() 会清理普通 thrown；牌列由自己的结算动画统一移除。
      card.fixed = true;
      card.classList.add("fan-sulv-queue-card");
      card.setAttribute("aria-hidden", "true");
      const earlier = root.fanCards.get(n - 1);
      if (earlier) root.fanHost.insertBefore(card, earlier);
      root.fanCards.set(n, card);
    }
    const offset = n - index;
    card.classList.toggle("fan-sulv-queue-current", offset === 0);
    // 原生 thrown 为3，提示对话框为更高层；队列只在原生牌层内排序。
    card.style.zIndex = offset ? "2" : "3";
    // 当前牌与第一张待用牌完全分开，其余待用牌才按手牌方式相叠。
    card.style.setProperty("--fan-offset", `${offset ? -(width * 1.1 + (offset - 1) * step) : 0}px`);
    card.style.setProperty("--fan-scale", String(scale));
    card.style.setProperty("--fan-opacity", offset ? ".88" : "1");
  }
}
