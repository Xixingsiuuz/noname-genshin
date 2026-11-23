import characters from "./character.js";
const fourStar = new Set(["fan_amber", "fan_gaming", "fan_kaeya", "fan_lisa", "fan_kirara", "fan_freminet", "fan_chevreuse", "fan_kachina", "fan_sethos", "fan_lynette", "fan_charlotte", "fan_dahlia", "fan_ororon", "fan_iansan", "fan_ifa", "fan_lanyan", "fan_prune", "fan_illuga", "fan_jahoda", "fan_aino"]);
export function installCharacterCategories(lib) {
  const groups = { fan_five_star: [], fan_four_star: [], fan_test_characters: [] };
  for (const id of Object.keys(characters)) {
    groups[id === "fan_mokuai_ceshi" ? "fan_test_characters" : fourStar.has(id) ? "fan_four_star" : "fan_five_star"].push(id);
  }
  lib.characterSort["mode_extension_原神"] = groups;
  Object.assign(lib.translate, { fan_five_star: "五星角色", fan_four_star: "四星角色", fan_test_characters: "测试武将" });
}
