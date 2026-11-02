// 只调整插画的融合和裁切；卡框、纹理、尺寸、选中与禁用样式仍由当前原生皮肤负责。
export function installMechanismCardStyle() {
  if (typeof document === "undefined" || document.getElementById("fan-mechanism-card-style")) return;
  const style = document.createElement("style");
  style.id = "fan-mechanism-card-style";
  const names = ["fan_pengrenshenji", "fan_zhuxing", "fan_guizhongji", "fan_chengehu"];
  style.textContent = names.map(name => `.card.fullskin[data-card-name="${name}"] > .image`).join(",\n") + ` {
    /* 露出原生底图四周的卡框；乘色融合使纸纹透过插画底色。 */
    clip-path: inset(4% round 5px);
    border-radius: inherit;
    mix-blend-mode: multiply;
    mask-image: radial-gradient(ellipse at center, #000 48%, rgba(0,0,0,.82) 72%, transparent 96%);
    -webkit-mask-image: radial-gradient(ellipse at center, #000 48%, rgba(0,0,0,.82) 72%, transparent 96%);
    pointer-events: none;
  }`;
  document.head.appendChild(style);
}
