export const heroFaces = Object.freeze({
  fan_yingxiongderonghe: Object.freeze(["heart", 13]),
  fan_ronghe: Object.freeze(["heart", 1]),
  fan_xinyuzhouxia: Object.freeze(["heart", 7]),
  fan_jueduilingdu: Object.freeze(["heart", 8]),
  fan_shanguangxinyi: Object.freeze(["heart", 8]),
});

export function sampleHeroes(random = Math.random) {
  const roll = () => {
    const n = random();
    if (!Number.isFinite(n) || n < 0 || n >= 1) throw new RangeError("随机数须在[0,1)内");
    return n;
  };
  const count = roll() < .5 ? 2 : 3;
  const result = [];
  for (let i = 0; i < count; i++) result.push({ source: "pile", kind: roll() < 2 / 3 ? "sha" : "equip" });
  for (let i = count; i < 5; i++) {
    let name = ["fan_ronghe", "fan_xinyuzhouxia", "fan_jueduilingdu"][Math.floor(roll() * 3)];
    if (name === "fan_xinyuzhouxia" && roll() < 1 / 3) name = "fan_shanguangxinyi";
    result.push({ source: "derived", name });
  }
  return result;
}
