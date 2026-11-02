// 跟随原生逐牌标签更新；不改变卡牌选择、布局或技能结算。
export function installMoranFrost(lib) {
  if (typeof document === "undefined" || lib.element.card.addGaintag.fanMoranFrost) return;
  const style = document.createElement("style");
  style.id = "fan-moran-frost-style";
  const image = `${lib.assetURL}extension/原神/image/effect/moran-flowing-snow-left-bottom.png`;
  style.textContent = `
    .card > .fan-moran-frost-layer {
      position:absolute;inset:auto;left:-3px;top:-2px;
      width:calc(100% + 6px);height:calc(100% + 11px);pointer-events:none;
      background-image:url("${image}");background-size:100% 100%;
      background-repeat:no-repeat;border-radius:inherit;z-index:1;opacity:.85;
    }
    .card.infohidden > .fan-moran-frost-layer,
    .card.infoflip > .fan-moran-frost-layer { display:none; }
    .card.fan-moran-frost > .name,.card.fan-moran-frost > .info {
      z-index:2;
    }
  `;
  document.head.appendChild(style);
  const original = lib.element.card.addGaintag;
  function addGaintag(...args) {
    const result = original.apply(this, args);
    const active = this.hasGaintag("fan_moran_sha");
    this.classList.toggle("fan-moran-frost", active);
    const layer = this.querySelector(".fan-moran-frost-layer");
    if (active && !layer) {
      const overlay = document.createElement("div");
      overlay.className = "fan-moran-frost-layer";
      overlay.setAttribute("aria-hidden", "true");
      this.appendChild(overlay);
    } else if (!active) {
      layer?.remove();
    }
    return result;
  }
  addGaintag.fanMoranFrost = true;
  lib.element.card.addGaintag = addGaintag;
}
