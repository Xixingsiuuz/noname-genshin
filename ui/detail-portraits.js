import smoothPortraits from "./smooth-portrait-map.js";
import { originalPortraits } from "../character/character.js";
function smoothUrl(value) {
  for (const [source, target] of Object.entries(smoothPortraits)) value = value.replace(source, target);
  return value;
}
// 对局头像与详情立绘分别取景，保留原生详情弹窗交互。
export function hutaoPortrait(lib, kind) {
  const file = lib.config.skin?.fan_hutao?.[0];
  const name = file === "1.png" ? "hutao-skin1" : file === "2.png" ? "hutao-skin2" : "hutao";
  const url = `${lib.assetURL}extension/原神/image/character/portraits/${name}-${kind}.png`;
  return kind === "detail" ? url : smoothUrl(url);
}
export function installDetailPortraits(ui, lib) {
  const preset = ui.create?.buttonPresets?.character;
  if (preset && !preset.fanGanyuPortrait) {
    const character = function (...args) {
      const node = preset.apply(this, args);
      if (["fan_sandrone", "fan_sp_sandrone"].includes(node?.link)) node.style.backgroundImage = `url("${lib.assetURL}extension/原神/image/character/portraits/sandrone-select.png")`;
      if (node?.link === "fan_linnea") node.style.backgroundImage = `url("${lib.assetURL}extension/原神/image/character/portraits/linnea-select.png")`;
      if (node?.link === "fan_nicole") node.style.backgroundImage = `url("${lib.assetURL}extension/原神/image/character/portraits/nicole-select.png")`;
      if (node?.link === "fan_citlali") node.style.backgroundImage = `url("${lib.assetURL}extension/原神/image/character/portraits/citlali-select.png")`;
      if (node?.link === "fan_mona") node.style.backgroundImage = `url("${lib.assetURL}extension/原神/image/character/portraits/mona-select.png")`;
      if (node?.link === "fan_qiqi") node.style.backgroundImage = `url("${lib.assetURL}extension/原神/image/character/portraits/qiqi-select.png")`;
      if (node?.link === "fan_jean") node.style.backgroundImage = `url("${lib.assetURL}extension/原神/image/character/portraits/jean-select-centered-20261028.png")`;
      if (node?.link === "fan_xiao") node.style.backgroundImage = `url("${lib.assetURL}extension/原神/image/character/portraits/xiao-select.png")`;
      if (node?.link === "fan_ganyu") node.style.backgroundImage = `url("${lib.assetURL}extension/原神/image/character/portraits/ganyu-select.png")`;
      if (node?.link === "fan_hutao") node.style.backgroundImage = `url("${hutaoPortrait(lib, "select")}")`;
      if (node?.style.backgroundImage) node.style.backgroundImage = smoothUrl(node.style.backgroundImage);
      return node;
    };
    character.fanGanyuPortrait = true;
    ui.create.buttonPresets.character = character;
  }
  const detailImages = {
    ...Object.fromEntries(Object.entries(originalPortraits).map(([id, path]) => [id, `../${path.slice("image/character/".length)}`])),
    fan_sp_sandrone: "sandrone-detail.png",
    fan_sandrone: "sandrone-detail.png",
    fan_linnea: "linnea-detail.png",
    fan_nicole: "nicole-detail.png",
    fan_citlali: "citlali-detail.png",
    fan_mona: "mona-detail.png",
    fan_qiqi: "qiqi-detail.png",
    fan_jean: "jean-detail-centered-20261028.png",
    fan_xiao: "xiao-detail-centered-20261027.png",
    fan_ganyu: "ganyu-detail.png",
    fan_kokomi: "kokomi-detail.png",
    fan_xianyun: "xianyun.png",
    fan_skirk: "skirk-v2.png",
    fan_shenhe: "shenhe.png",
  };
  if (typeof document !== "undefined" && !document.getElementById("fan-xianyun-detail-style")) {
    const style = document.createElement("style");
    style.id = "fan-xianyun-detail-style";
    style.textContent = `.menubg.charactercard.fan-xianyun-detail { width:min(94vw,800px); height:min(90vh,480px); }`;
    document.head.appendChild(style);
  }
  const original = ui.click.charactercard;
  if (!original || original.fanDetailPortraits) return;
  function characterCard(...args) {
    if ((!Object.hasOwn(detailImages, args[0]) && args[0] !== "fan_hutao") || typeof document === "undefined") return original.apply(this, args);
    const before = new Set(document.querySelectorAll(".menubg.charactercard"));
    const result = original.apply(this, args);
    for (const dialog of document.querySelectorAll(".menubg.charactercard")) {
      if (before.has(dialog)) continue;
      const isXianyun = args[0] === "fan_xianyun";
      if (isXianyun) dialog.classList.add("fan-xianyun-detail");
      const portrait = dialog.querySelector(".ava > .avatar");
      if (portrait) {
        if (args[0] === "fan_hutao") {
          const refresh = () => {
            const image = `url("${hutaoPortrait(lib, "detail")}")`;
            if (portrait.style.backgroundImage !== image) portrait.style.backgroundImage = image;
            if (portrait.style.backgroundSize !== "cover") portrait.style.backgroundSize = "cover";
            if (portrait.style.backgroundPosition !== "center center") portrait.style.backgroundPosition = "center center";
            if (portrait.style.backgroundRepeat !== "no-repeat") portrait.style.backgroundRepeat = "no-repeat";
          };
          refresh();
          // Native skin buttons update config and this avatar. Keep their click/save semantics.
          const observer = new MutationObserver(refresh);
          observer.observe(portrait, { attributes: true, attributeFilter: ["style"] });
          continue;
        }
        portrait.style.backgroundImage = `url("${lib.assetURL}extension/原神/image/character/portraits/${detailImages[args[0]]}")`;
        portrait.style.backgroundSize = "cover";
        portrait.style.backgroundPosition = "center top";
        if (args[0] === "fan_linnea") {
          portrait.style.backgroundSize = "auto 135%";
          portrait.style.backgroundPosition = "0% 32%";
          portrait.style.backgroundRepeat = "no-repeat";
        }
      }
    }
    return result;
  }
  characterCard.fanDetailPortraits = true;
  ui.click.charactercard = characterCard;
}
