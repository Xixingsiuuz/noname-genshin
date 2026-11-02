// 可直接交给 broadcastAll：函数不依赖模块闭包，所有客户端独立播放。
export function setSulvEffect(active, owner = "columbina") {
  if (typeof document === "undefined" || !document.body) return;
  const id = "fan-sulv-effect";
  let layer = document.getElementById(id);
  if (!active) {
    if (!layer) return;
    layer.fanOwners.delete(owner);
    if (layer.fanOwners.size) return;
    layer.classList.add("fan-sulv-leaving");
    // 淡出期间重新发动时复用图层，旧计时器不得移除新的特效。
    setTimeout(() => {
      if (!layer.fanOwners.size) layer.remove();
    }, 900);
    return;
  }
  if (layer) {
    layer.fanOwners.add(owner);
    layer.classList.remove("fan-sulv-leaving");
    return;
  }
  if (!document.getElementById("fan-sulv-effect-style")) {
    const style = document.createElement("style");
    style.id = "fan-sulv-effect-style";
    style.textContent = `
      #fan-sulv-effect{position:fixed;inset:0;width:100%;height:100%;overflow:hidden;
        pointer-events:none!important;z-index:1000;opacity:1;transition:opacity .85s ease;
        contain:strict;isolation:isolate;animation:fan-sulv-arrive 1.2s ease both}
      #fan-sulv-effect *{pointer-events:none!important;box-sizing:border-box}
      #fan-sulv-effect.fan-sulv-leaving{opacity:0;animation:none}
      #fan-sulv-effect .fan-sulv-mist{position:absolute;inset:0;
        background:radial-gradient(ellipse at 0% 48%,#d9e5ff52 0%,#ad9ee82b 9%,transparent 28%),
        radial-gradient(ellipse at 100% 55%,#e3dcff57 0%,#91c5ed26 10%,transparent 28%),
        linear-gradient(0deg,#c6bcf34d,transparent 13%,transparent 86%,#d5e9ff38);
        box-shadow:inset 0 0 25px #e9e8ff77,inset 0 0 80px #a38ee84d;
        animation:fan-sulv-breathe 5s ease-in-out infinite alternate}
      #fan-sulv-effect .fan-sulv-orbit{position:absolute;top:-24%;width:30%;height:148%;
        border:1px solid #e4ddff75;border-radius:50%;
        box-shadow:0 0 14px #d2ccff55,inset 0 0 17px #afa2e822;
        animation:fan-sulv-orbit 9s ease-in-out infinite alternate}
      #fan-sulv-effect .fan-sulv-orbit-left{left:-23%;transform:rotate(-12deg)}
      #fan-sulv-effect .fan-sulv-orbit-right{right:-23%;transform:rotate(12deg);animation-delay:-4.5s}
      #fan-sulv-effect .fan-sulv-orbit-inner{width:35%;opacity:.45;animation-duration:13s}
      #fan-sulv-effect .fan-sulv-orbit-left.fan-sulv-orbit-inner{left:-30%}
      #fan-sulv-effect .fan-sulv-orbit-right.fan-sulv-orbit-inner{right:-30%}
      #fan-sulv-effect .fan-sulv-star{position:absolute;width:var(--size);height:var(--size);
        left:var(--x);top:0;border-radius:50%;background:#f1edff;
        box-shadow:0 0 8px 2px #cfbdff88;opacity:0;
        animation:fan-sulv-rewind var(--duration) linear var(--delay) infinite}
      #fan-sulv-effect .fan-sulv-thread{position:absolute;left:var(--x);top:0;width:1px;height:48px;
        background:linear-gradient(0deg,transparent,#e8dcffbb,transparent);opacity:0;
        animation:fan-sulv-rewind var(--duration) linear var(--delay) infinite}
      #fan-sulv-effect .fan-sulv-moon{position:absolute;top:10%;width:24px;height:24px;
        border-radius:50%;box-shadow:6px 2px 0 0 #ece6ffb3;opacity:.55;
        filter:drop-shadow(0 0 8px #bfaaff);animation:fan-sulv-moon 7s ease-in-out infinite alternate}
      #fan-sulv-effect .fan-sulv-moon-left{left:3%;transform:rotate(-30deg)}
      #fan-sulv-effect .fan-sulv-moon-right{right:3%;top:75%;transform:rotate(150deg);animation-delay:-3s}
      @keyframes fan-sulv-arrive{from{opacity:0}to{opacity:1}}
      @keyframes fan-sulv-breathe{from{opacity:.55}to{opacity:1}}
      @keyframes fan-sulv-orbit{from{translate:0 2%;scale:1}to{translate:0 -2%;scale:1.07}}
      @keyframes fan-sulv-rewind{0%{transform:translate3d(0,105vh,0);opacity:0}
        15%{opacity:.6}50%{transform:translate3d(var(--drift),45vh,0);opacity:.85}
        85%{opacity:.5}100%{transform:translate3d(0,-10vh,0);opacity:0}}
      @keyframes fan-sulv-moon{from{margin-top:0;opacity:.3}to{margin-top:-24px;opacity:.7}}
      @media(prefers-reduced-motion:reduce){#fan-sulv-effect,#fan-sulv-effect *{animation:none!important}
        #fan-sulv-effect .fan-sulv-star,#fan-sulv-effect .fan-sulv-thread{display:none}}
    `;
    document.head.appendChild(style);
  }
  layer = document.createElement("div");
  layer.id = id;
  layer.setAttribute("aria-hidden", "true");
  layer.fanOwners = new Set([owner]);
  const add = className => {
    const node = document.createElement("div");
    node.className = className;
    layer.appendChild(node);
    return node;
  };
  add("fan-sulv-mist");
  for (const side of ["left", "right"]) {
    add(`fan-sulv-orbit fan-sulv-orbit-${side}`);
    add(`fan-sulv-orbit fan-sulv-orbit-${side} fan-sulv-orbit-inner`);
    add(`fan-sulv-moon fan-sulv-moon-${side}`);
  }
  for (let i = 0; i < 44; i++) {
    const node = add(i % 7 === 0 ? "fan-sulv-thread" : "fan-sulv-star");
    const edge = 0.8 + ((i * 37) % 100) / 11;
    node.style.setProperty("--x", `${i % 2 ? 100 - edge : edge}%`);
    node.style.setProperty("--size", `${1.5 + i % 3}px`);
    node.style.setProperty("--duration", `${6 + i % 8}s`);
    node.style.setProperty("--delay", `${-i * 1.37}s`);
    node.style.setProperty("--drift", `${(i % 2 ? -1 : 1) * (8 + i % 15)}px`);
  }
  document.body.appendChild(layer);
}
