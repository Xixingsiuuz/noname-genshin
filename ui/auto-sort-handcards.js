// 扩展独立牌序；不读取原生临时排序，也不覆盖原生整理按钮。
export function compareHandcards(a, b) {
  const types = ["basic", "trick", "delay", "equip"];
  const basics = ["sha", "shan", "tao", "jiu"];
  const suits = ["spade", "heart", "club", "diamond"];
  const rank = (list, value) => list.includes(value) ? list.indexOf(value) : list.length;
  return rank(types, a.type) - rank(types, b.type)
    || rank(basics, a.name) - rank(basics, b.name)
    || (a.name < b.name ? -1 : a.name > b.name ? 1 : 0)
    || rank(["", "fire", "thunder"], a.nature || "") - rank(["", "fire", "thunder"], b.nature || "")
    || String(a.nature || "").localeCompare(String(b.nature || ""))
    || rank(suits, a.suit) - rank(suits, b.suit)
    || (Number(a.number) || 0) - (Number(b.number) || 0);
}

export function sortExtensionHandcards(game, ui, get, status) {
  const player = game.me;
  if (!player || player.hasSkillTag("noSortCard")) return false;
  const cards = player.getCards("h");
  const sorted = cards.map((card, index) => ({ card, index, type: get.type(card, null, false),
    name: card.name, nature: card.nature, suit: card.suit, number: card.number }))
    .sort((a, b) => compareHandcards(a, b) || a.index - b.index).map(item => item.card);
  // 保留原有双行归属，仅在各自所在手牌行内排序。
  let changed = false;
  for (const row of [player.node.handcards1, player.node.handcards2]) {
    if (!row) continue;
    const before = cards.filter(card => card.parentNode === row);
    const after = sorted.filter(card => card.parentNode === row);
    if (after.every((card, index) => card === before[index])) continue;
    row.prepend(...after);
    changed = true;
  }
  if (!changed) return false;
  ui.updatehl();
  if (status.connectMode) {
    const ids = player.getCards("h").map(card => card.cardid);
    if (game.online) game.send("syncHandcard", ids);
    else game.syncHandcard(player, ids);
  }
  return true;
}
