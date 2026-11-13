// 独立抽样层：不依赖引擎，不创建实体牌；结算层按计划逐张取牌。
export const darkMagicianPool = Object.freeze({
  pile: Object.freeze(["wuxie", "wuzhong"]),
  derived: Object.freeze(["fan_heimoshushi", "fan_heimodaozhen", "fan_yongyuanzhihun"]),
});

export function sampleDarkMagician(random = Math.random) {
  const roll = () => {
    const value = random();
    if (!Number.isFinite(value) || value < 0 || value >= 1) throw new RangeError("随机数须在[0,1)内");
    return value;
  };
  const pileCount = roll() < 0.5 ? 2 : 3;
  const result = [];
  for (let i = 0; i < pileCount; i++) {
    result.push({ source: "pile", name: roll() < 2 / 3 ? "wuxie" : "wuzhong" });
  }
  for (let i = pileCount; i < 5; i++) {
    let name = darkMagicianPool.derived[Math.floor(roll() * 3)];
    if (name === darkMagicianPool.derived[0] && roll() < 1 / 3) name = "fan_modaoqishi";
    result.push({ source: "derived", name });
  }
  return result;
}

