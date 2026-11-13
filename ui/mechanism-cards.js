import { cynoPacks, cynoPackArt } from "../character/skills/cyno.js";

// 常规牌面使用原生卡框，召唤选包单独使用方形彩色展示。
export function installMechanismCardStyle() {
  if (typeof document === "undefined" || document.getElementById("fan-mechanism-card-style")) return;
  const style = document.createElement("style");
  style.id = "fan-mechanism-card-style";
  const names = ["fan_pengrenshenji", "fan_zhuxing", "fan_guizhongji", "fan_chengehu", "fan_meirenji", "fan_xiaolicangdao"];
  style.textContent = names.map(name => `.card.fullskin[data-card-name="${name}"] > .image`).join(",\n") + ` {
    /* 露出原生底图四周的卡框；乘色融合使纸纹透过插画底色。 */
    clip-path: inset(4% round 5px);
    border-radius: inherit;
    mix-blend-mode: multiply;
    pointer-events: none;
    background-size: 96% auto;
    background-position: 68% 100%;
    background-repeat: no-repeat;
    mask-image: linear-gradient(to bottom, transparent 22%, #000 45%, #000 92%, transparent 100%);
    -webkit-mask-image: linear-gradient(to bottom, transparent 22%, #000 45%, #000 92%, transparent 100%);
  }`;
  // 保留用户的完整牌图；只以 CSS 取插画区域，原图中的牌名、点数与说明
  // 不重复叠到原生卡面。此处不改变卡牌或内部图片节点的宽高。
  const cynoNames = ["fan_heimoshumiyi", "fan_heimoshushi", "fan_modaoqishi", "fan_yongyuanzhihun", "fan_heimodaozhen", "fan_qingyanlonghonglin", "fan_qingyanbailong", "fan_zhengyihuoban", "fan_zhengyichuanshuo", "fan_baizhishaonv", "fan_yingxiongderonghe", "fan_ronghe", "fan_xinyuzhouxia", "fan_jueduilingdu", "fan_shanguangxinyi", "fan_xingchendehuiguang", "fan_xingchenlong", "fan_liuxinglong", "fan_tiaolv", "fan_feipinhuishou", "fan_yuzhouyaobian", "fan_xiwangdechaoyue", "fan_xiwanghuang", "fan_weilaihuang", "fan_xingguangliqiu", "fan_fanbeijihui", "fan_lingbaizhiqiji", "fan_yiyanhulong", "fan_yiyannilong", "fan_yiyanbawang", "fan_tiankonghongcai", "fan_dianzijielianjie", "fan_lianmayuzhe", "fan_yuanshishengming", "fan_wangjichongtu", "fan_wangjiwakuang", "fan_zhenhongzhijuexing", "fan_heilong", "fan_heiganglong", "fan_chuanshuoheishi", "fan_heiyandan", "fan_jiguanglongxilei", "fan_jinjihujiao", "fan_xinxing", "fan_wuxian", "fan_wuxianpaoying", "fan_chaonujilieche", "fan_huizhuandiaoche", "fan_paotalieche", "fan_potianjuai", "fan_zhunwuweijian", "fan_qiheizhixuanfeng", "fan_kaiyiya", "fan_chongzhuangkaiyi", "fan_zhouyuleiqie", "fan_heixuanfeng", "fan_fanshenzhidiwang", "fan_tiandi", "fan_xiedi", "fan_yuanxiedi", "fan_diwanglingyu", "fan_liuwuzhijiezhen", "fan_ziyan", "fan_zhenmoziyan", "fan_shinai", "fan_ruisui", "fan_shandaozhijilve", "fan_shandaojiling", "fan_yihualingyi", "fan_shandaoqidong", "fan_heiguafuqian"];
  style.textContent += cynoNames.map(name => `.card.fullskin[data-card-name="${name}"] > .image`).join(",\n") + ` {
    background-size: auto 150%;
    background-position: 22% 0%;
    background-repeat: no-repeat;
    clip-path: inset(5% round 5px);
    border-radius: inherit;
    mix-blend-mode: multiply;
    mask-image: linear-gradient(to bottom, transparent 29%, #000 43%, #000 88%, transparent 97%);
    -webkit-mask-image: linear-gradient(to bottom, transparent 29%, #000 43%, #000 88%, transparent 97%);
    pointer-events: none;
  }`;
  // 魔法阵和石碑完整保留中心轮廓；人物保留脸、上身及手持物。
  style.textContent += `
    .card.fullskin[data-card-name^="fan_ronghe_"] > .image {
      background-size: auto 150%;
      background-position: 22% 0%;
      background-repeat: no-repeat;
      clip-path: inset(5% round 5px);
      mix-blend-mode: multiply;
      mask-image: linear-gradient(to bottom, transparent 29%, #000 43%, #000 88%, transparent 97%);
      -webkit-mask-image: linear-gradient(to bottom, transparent 29%, #000 43%, #000 88%, transparent 97%);
      pointer-events: none;
    }
    .card.fullskin[data-card-name="fan_heimodaozhen"] > .image { background-position: 26% 0%; }
    .card.fullskin[data-card-name="fan_yongyuanzhihun"] > .image { background-position: 26% 0%; }
    .card.fullskin[data-card-name="fan_modaoqishi"] > .image { background-position: 18% 0%; }
    .card.fullskin[data-card-name="fan_zhuxing"] > .image { background-size: 92% auto; }
  `;
  // 这些源图比卡面宽，background-position 百分比减小才会向右移动。
  // 横向遮罩与原有纵向羽化取交集，为左侧原生牌名留出安静的纸纹区域。
  const rightAligned = [...cynoNames, ...names.filter(name => name !== "fan_meirenji")];
  style.textContent += [...rightAligned.map(name => `.card.fullskin[data-card-name="${name}"] > .image`),
    '.card.fullskin[data-card-name^="fan_ronghe_"] > .image'].join(",\n") + ` {
    mask-image: linear-gradient(to right, transparent 6%, rgba(0,0,0,.08) 19%, #000 35%, #000 92%, transparent 100%),
      linear-gradient(to bottom, transparent 29%, #000 43%, #000 88%, transparent 97%);
    mask-composite: intersect;
    -webkit-mask-image: linear-gradient(to right, transparent 6%, rgba(0,0,0,.08) 19%, #000 35%, #000 92%, transparent 100%),
      linear-gradient(to bottom, transparent 29%, #000 43%, #000 88%, transparent 97%);
    -webkit-mask-composite: source-in;
  }`;
  // 已独立排版的插画不再二次裁剪或遮掉左侧主体。
  style.textContent += [...cynoNames.map(name => `.card.fullskin[data-card-name="${name}"] > .image`),
    '.card.fullskin[data-card-name^="fan_ronghe_"] > .image'].join(",\n") + ` {
    background-size: 100% auto;
    background-position: center bottom;
    clip-path: none;
    mask-image: none;
    -webkit-mask-image: none;
  }`;
  // 手牌沿用四字牌名的上边距，选牌按钮则按各自的卡面高度居中。
  const fiveCharacterTricks = [
    "fan_chaonujilieche",
    "fan_dianzijielianjie",
    "fan_fanshenzhidiwang",
    "fan_heimoshumiyi",
    "fan_jiguanglongxilei",
    "fan_lingbaizhiqiji",
    "fan_liuwuzhijiezhen",
    "fan_qiheizhixuanfeng",
    "fan_qingyanlonghonglin",
    "fan_shandaozhijilve",
    "fan_xingchendehuiguang",
    "fan_xiwangdechaoyue",
    "fan_yingxiongderonghe",
    "fan_zhenhongzhijuexing",
  ];
  const trickCards = fiveCharacterTricks.map(name =>
    `.card.fullskin[data-card-type="trick"][data-card-name="${name}"]`
  );
  style.textContent += trickCards.map(card => `${card} > .name.long`).join(",\n") + " { top: 8px; }";
  // 原生卡名的 transform 可带 !important，使用独立的 translate 保留原生缩放。
  style.textContent += trickCards.map(card => `.dialog .buttons > ${card}.button > .name.long`).join(",\n") +
    " { top: 50%; translate: 0 -50%; }";
  style.textContent += `
    .dialog.fan-cyno-packs .buttons {
      display: grid;
      grid-template-columns: repeat(7, minmax(0, 1fr));
      gap: 6px;
      max-width: 840px;
      --fan-pack-title-size: min(14px, 2vw);
      --fan-pack-title-gap: 3px;
      margin: 6px auto;
      padding-bottom: calc(var(--fan-pack-title-size) * 1.4 + var(--fan-pack-title-gap));
    }
    .dialog.fan-cyno-packs .buttons:has(~ .buttons) {
      padding-bottom: calc(var(--fan-pack-title-size) * 1.4 + var(--fan-pack-title-gap) + 5px);
    }
    .dialog.fan-cyno-packs .buttons > .card.button {
      box-sizing: border-box;
      width: 100%;
      height: auto;
      aspect-ratio: 1;
      margin: 0;
      overflow: visible;
    }
    .dialog.fan-cyno-packs .buttons > .card.button > .image {
      inset: 0;
      width: 100%;
      height: 100%;
      border-radius: inherit;
      background-position: center;
      background-size: cover;
      mix-blend-mode: normal;
      mask-image: radial-gradient(ellipse farthest-corner, black 66%, transparent 100%);
      clip-path: none;
    }
    .dialog.fan-cyno-packs .buttons > .card.button > :is(.name, .info) {
      display: none;
    }
    .dialog.fan-cyno-packs .buttons > .card.button > .fan-cyno-pack-title {
      position: absolute;
      top: 100%;
      left: 0;
      width: 100%;
      padding-top: var(--fan-pack-title-gap);
      line-height: 1.4;
      font-size: var(--fan-pack-title-size);
      text-align: center;
      white-space: nowrap;
      color: white;
      pointer-events: none;
    }
  `;
  // 按卡包顺序微调取景，优先保留脸部、龙头或标志性武器。
  const packFraming = [
    [132, 46, 28], [125, 63, 20], [130, 52, 51], [130, 48, 31],
    [138, 54, 34], [128, 53, 35], [132, 48, 35], [130, 44, 30],
    [125, 52, 37], [128, 61, 100], [130, 52, 28], [125, 50, 43],
    [125, 51, 42], [138, 40, 36],
  ];
  style.textContent += cynoPacks.map((name, index) => {
    const url = new URL(`../${cynoPackArt[index]}`, import.meta.url).href;
    const [scale, x, y] = packFraming[index];
    return `.dialog.fan-cyno-packs .buttons > .card.button[data-card-name="${name}"] > .image {
      background-image: url("${url}") !important;
      background-size: ${scale}%;
      background-position: ${x}% ${y}%;
    }`;
  }).join("\n");
  document.head.appendChild(style);
}
