export function selectConversionMaterial(event, game, ui, status, position, filterCard, score) {
  if (event.fanConversionMaterial) return;
  event.fanConversionMaterial = true;
  event.position = position;
  event.selectCard = [0, 1];
  event.filterCard = filterCard;
  event.fanPairedConfirm = true;
  event.manualConfirm = true;
  event.processAI = () => {
    const player = event.player;
    let best = { bool: false }, bestScore = 0;
    for (const button of event.dialog.buttons) {
      if (!event.filterButton(button, player)) continue;
      for (const card of player.getCards(position)) {
        if (!filterCard(card, player)) continue;
        const value = score(button, card, player);
        if (value <= bestScore) continue;
        bestScore = value;
        best = { bool: true, links: [button.link], cards: [card] };
      }
    }
    event.getParent().fanConversionCard = best.cards?.[0];
    return best;
  };
  queueMicrotask(() => { if (status.event === event) game.check(); });
}
