// 跟随原生逐牌标签更新；不改变卡牌选择、布局或技能结算。
export function installMoranFrost(lib) {
  if (
    typeof document === "undefined" ||
    lib.element.card.addGaintag.fanMoranFrost
  ) {
    return;
  }

  const style = document.createElement("style");
  style.id = "fan-moran-frost-style";

  const image = `${lib.assetURL}extension/原神/image/effect/moran-sakura-fan.png`;

  style.textContent = `
  /* 特效容器：允许光效溢出卡牌 */
  .card > .fan-moran-frost-layer {
    position: absolute;
    inset: 0;
    pointer-events: none;
    border-radius: inherit;
    overflow: visible;
    z-index: 1;
  }

  .card > .fan-moran-frost-layer::before,
  .card > .fan-moran-frost-layer::after {
    content: "";
    position: absolute;
    inset: 0;
    pointer-events: none;
  }

  /* 深蓝寒雾：保留现有颜色 */
  .card > .fan-moran-frost-layer::before {
    border-radius: inherit;
    background:
      radial-gradient(
        circle at 0% 100%,
        rgba(18, 28, 78, 0.48) 0%,
        rgba(28, 45, 105, 0.28) 18%,
        rgba(45, 72, 145, 0.14) 32%,
        rgba(85, 125, 220, 0.05) 44%,
        transparent 58%
      ),
      radial-gradient(
        ellipse at 8% 92%,
        rgba(180, 215, 255, 0.10) 0%,
        rgba(180, 215, 255, 0.05) 35%,
        transparent 70%
      );
  }

  /* 冰霜素材：保持用户选定的105%尺寸及左下偏移。
     扩大实际承载层，而非在卡牌大小的背景框内放大裁图，完整保留外沿冰晶。 */
  .card > .fan-moran-frost-layer::after {
    inset: auto;
    left: -3px;
    bottom: -3px;
    width: 105%;
    height: 105%;
    background-image: url("${image}");
    background-repeat: no-repeat;
    background-size: 100% 100%;
    background-position: center;

    filter:
      brightness(1.10)
      contrast(1.14)
      saturate(1.08)
      drop-shadow(0 0 4px rgba(190, 225, 255, 0.45));

    opacity: 1;
  }

  /* 暗置卡牌隐藏特效 */
  .card.infohidden > .fan-moran-frost-layer,
  .card.infoflip > .fan-moran-frost-layer {
    display: none;
  }

  /* 卡牌文字保持在特效上方 */
  .card.fan-moran-frost > .name,
  .card.fan-moran-frost > .info {
    z-index: 2;
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

      if (
        typeof overlay.animate === "function" &&
        !globalThis.matchMedia?.("(prefers-reduced-motion: reduce)").matches
      ) {
        const appearance = overlay.animate(
          [{ opacity: 0 }, { opacity: 1 }],
          {
            duration: 1000,
            easing: "ease-out",
          }
        );
        appearance.onfinish = () => appearance.cancel();
      }
    } else if (!active) {
      layer?.remove();
    }

    return result;
  }

  addGaintag.fanMoranFrost = true;
  lib.element.card.addGaintag = addGaintag;
}
