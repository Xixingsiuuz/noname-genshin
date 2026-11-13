import { get, lib, ui, _status } from "../../../noname.js";

import { copyCynoRarity } from "../ui/cyno-rarity.js";

function matchingNames(keyword) {
 return lib.inpile.filter(name =>
  [lib.translate[name], lib.translate[name + "_info"]].some(text =>
   typeof text === "string" && text.replace(/<[^>]*>/g, "").includes(keyword)
  )
 );
}

function pileCards(name) {
 return Array.from(ui.cardPile.childNodes).filter(card => card.name === name);
}

function randomPileCard(name) {
 const cards = pileCards(name);
 return cards[Math.floor(Math.random() * cards.length)];
}

export async function gainCardMatchingText(player, keyword, prompt, raritySource) {
 const names = matchingNames(keyword);
 if (!names.length) return;
 const available = names.filter(name => pileCards(name).length);
 const result = await player.chooseButton([prompt,
  [names.map(name => [get.type(name), "", name]), "vcard"]], available.length > 0)
  .set("fanTextSearchAvailable", available)
  .set("filterButton", button => _status.event.fanTextSearchAvailable.includes(button.link[2]))
  .set("ai", button => get.value({name:button.link[2]},player))
  .forResult();
 const name = result.links?.[0]?.[2];
 const card = result.bool && available.includes(name) && randomPileCard(name);
 if (card && player.isIn()) {
  if (raritySource) copyCynoRarity(card, raritySource);
  await player.gain(card,"draw");
 }
}
