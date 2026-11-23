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
      if (node?.link === "fan_kaeya") node.style.backgroundImage = `url("${lib.assetURL}extension/原神/image/character/portraits/kaeya-select.png")`;
      if (node?.link === "fan_amber") node.style.backgroundImage = `url("${lib.assetURL}extension/原神/image/character/portraits/amber-select.png")`;
      if (node?.link === "fan_lisa") node.style.backgroundImage = `url("${lib.assetURL}extension/原神/image/character/portraits/lisa-select.png")`;
      if (node?.link === "fan_kirara") node.style.backgroundImage = `url("${lib.assetURL}extension/原神/image/character/portraits/kirara-select.png")`;
      if (node?.link === "fan_gaming") node.style.backgroundImage = `url("${lib.assetURL}extension/原神/image/character/portraits/gaming-select.png")`;
      if (node?.link === "fan_kachina") node.style.backgroundImage = `url("${lib.assetURL}extension/原神/image/character/portraits/kachina-select.png")`;
      if (node?.link === "fan_sethos") node.style.backgroundImage = `url("${lib.assetURL}extension/原神/image/character/portraits/sethos-select.png")`;
      if (node?.link === "fan_lynette") node.style.backgroundImage = `url("${lib.assetURL}extension/原神/image/character/portraits/lynette-select.png")`;
      if (node?.link === "fan_charlotte") node.style.backgroundImage = `url("${lib.assetURL}extension/原神/image/character/portraits/charlotte-select.png")`;
      if (node?.link === "fan_dahlia") node.style.backgroundImage = `url("${lib.assetURL}extension/原神/image/character/portraits/dahlia-select.png")`;
      if (node?.link === "fan_iansan") node.style.backgroundImage = `url("${lib.assetURL}extension/原神/image/character/portraits/iansan-select.png")`;
      if (node?.link === "fan_freminet") node.style.backgroundImage = `url("${lib.assetURL}extension/原神/image/character/portraits/freminet-select.png")`;
      if (node?.link === "fan_ororon") node.style.backgroundImage = `url("${lib.assetURL}extension/原神/image/character/portraits/ororon-select.png")`;
      if (node?.link === "fan_ifa") node.style.backgroundImage = `url("${lib.assetURL}extension/原神/image/character/portraits/ifa-select.png")`;
      if (node?.link === "fan_lanyan") node.style.backgroundImage = `url("${lib.assetURL}extension/原神/image/character/portraits/lanyan-select.png")`;
      if (node?.link === "fan_illuga") node.style.backgroundImage = `url("${lib.assetURL}extension/原神/image/character/portraits/illuga-select.png")`;
      if (node?.link === "fan_mokuai_ceshi") node.style.backgroundImage = `url("${lib.assetURL}extension/原神/image/character/portraits/mokuai-ceshi-select.png")`;
      if (node?.link === "fan_prune") node.style.backgroundImage = `url("${lib.assetURL}extension/原神/image/character/portraits/prune-select.png")`;
      if (node?.link === "fan_chevreuse") node.style.backgroundImage = `url("${lib.assetURL}extension/原神/image/character/portraits/chevreuse-select.png")`;
      if (node?.link === "fan_jahoda") node.style.backgroundImage = `url("${lib.assetURL}extension/原神/image/character/portraits/jahoda-select.png")`;
      if (node?.link === "fan_aino") node.style.backgroundImage = `url("${lib.assetURL}extension/原神/image/character/portraits/aino-select.png")`;
      if (node?.link === "fan_cyno") node.style.backgroundImage = `url("${lib.assetURL}extension/原神/image/character/portraits/cyno-select.png")`;
      if (node?.link === "fan_alhaitham") node.style.backgroundImage = `url("${lib.assetURL}extension/原神/image/character/portraits/alhaitham-select.png")`;
      if (node?.link === "fan_dehya") node.style.backgroundImage = `url("${lib.assetURL}extension/原神/image/character/portraits/dehya-select.png")`;
      if (node?.link === "fan_wanderer") node.style.backgroundImage = `url("${lib.assetURL}extension/原神/image/character/portraits/wanderer-select.png")`;
      if (["fan_sandrone", "fan_sp_sandrone"].includes(node?.link)) node.style.backgroundImage = `url("${lib.assetURL}extension/原神/image/character/portraits/sandrone-select.png")`;
      if (node?.link === "fan_re_zhongli") node.style.backgroundImage = `url("${lib.assetURL}extension/原神/image/character/portraits/zhongli-rework-select.png")`;
      if (node?.link === "fan_linnea") node.style.backgroundImage = `url("${lib.assetURL}extension/原神/image/character/portraits/linnea-select.png")`;
      if (node?.link === "fan_durin") node.style.backgroundImage = `url("${lib.assetURL}extension/原神/image/character/portraits/durin-select.png")`;
      if (node?.link === "fan_nicole") node.style.backgroundImage = `url("${lib.assetURL}extension/原神/image/character/portraits/nicole-select.png")`;
      if (["fan_citlali", "fan_citlali_revised"].includes(node?.link)) node.style.backgroundImage = `url("${lib.assetURL}extension/原神/image/character/portraits/citlali-select.png")`;
      if (node?.link === "fan_tighnari") node.style.backgroundImage = `url("${lib.assetURL}extension/原神/image/character/portraits/tighnari-select.png")`;
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
    fan_amber: "amber-detail.png",
    fan_lisa: "lisa-detail.png",
    fan_kirara: "kirara-detail.png",
    fan_wanderer: "../originals/wanderer.png",
    ...Object.fromEntries(Object.entries(originalPortraits).map(([id, path]) => [id, `../${path.slice("image/character/".length)}`])),
    fan_kaeya: "kaeya-detail.png",
    fan_mokuai_ceshi: "mokuai-ceshi-detail.png",
    fan_prune: "prune-detail.png",
    fan_chevreuse: "chevreuse-detail.png",
    fan_jahoda: "jahoda-detail.png",
    fan_aino: "aino-detail.png",
    fan_cyno: "cyno-detail.png",
    fan_alhaitham: "alhaitham-detail.png",
    fan_dehya: "dehya-detail.png",
    fan_re_zhongli: "zhongli-rework-detail.png",
    fan_sp_sandrone: "sandrone-detail.png",
    fan_sandrone: "sandrone-detail.png",
    fan_gaming: "gaming-detail.png",
    fan_kachina: "kachina-detail.png",
    fan_sethos: "sethos-detail.png",
    fan_lynette: "lynette-detail.png",
    fan_charlotte: "charlotte-detail.png",
    fan_dahlia: "dahlia-detail.png",
    fan_iansan: "iansan-detail.png",
    fan_ifa: "ifa-detail.png",
    fan_freminet: "freminet-detail.png",
    fan_ororon: "ororon-detail.png",
    fan_lanyan: "lanyan-detail.png",
    fan_illuga: "illuga-detail.png",
    fan_linnea: "linnea-detail.png",
    fan_durin: "durin-detail.png",
    fan_nicole: "nicole-detail.png",
    fan_citlali: "citlali-detail.png",
    fan_citlali_revised: "citlali-detail.png",
    fan_mona: "mona-detail.png",
    fan_qiqi: "qiqi-detail.png",
    fan_jean: "jean-detail-centered-20261028.png",
    fan_xiao: "xiao-detail-centered-20261027.png",
    fan_ganyu: "ganyu-detail.png",
    fan_kokomi: "kokomi-detail.png",
    fan_xianyun: "xianyun.png",
    fan_skirk: "skirk-v2.png",
    fan_tighnari: "tighnari-detail.png",
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
        if (args[0] === "fan_dehya") {
          portrait.style.backgroundSize = "auto 100%";
          portrait.style.backgroundRepeat = "no-repeat";
        }
        // 镜头右移5个显示像素，即画面向左移动5px，不改变大图比例。
        if (args[0] === "fan_re_zhongli") portrait.style.backgroundPosition = "calc(50% - 5px) top";
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
