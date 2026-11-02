import { yaemikoCards, yaemikoCardTranslate } from "./yaemiko.js";
import { xianyunCards, xianyunCardTranslate } from "./xianyun.js";
export function createCardPackage() {
  return {
    card: {
      ...yaemikoCards,
      ...xianyunCards,
    },
    translate: {
      ...yaemikoCardTranslate,
      ...xianyunCardTranslate,
    },
    // 仅由仙助生成，不加入牌堆。
    list: [],
  };
}
