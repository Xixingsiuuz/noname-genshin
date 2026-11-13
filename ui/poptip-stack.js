const installed = new WeakSet();

export function installPoptipStack(lib, game, get, status) {
  if (installed.has(game)) return;
  installed.add(game);

  const stack = [];
  const closeNative = game.closePoptipDialog.bind(game);

  function closeFrom(index) {
    for (const { dialog, layer } of stack.splice(index).reverse()) {
      if (layer) dialog._close.call(layer);
    }
    const top = stack.at(-1);
    if (top && !top.root) status.poptip = [top.dialog, top.layer];
  }

  game.closePoptipDialog = function () {
    // The engine still owns the original card intro and its pause state.
    closeFrom(stack[0]?.root ? 1 : 0);
    stack.length = 0;
    closeNative();
  };

  function handleClick(event) {
    const marker = event.target.closest?.("noname-poptip[poptip]");
    if (marker) {
      if (event.type === "click" && lib.config.touchscreen) return;
      event.stopImmediatePropagation();
      const parent = marker.closest(".dialog.popped");
      if (!stack.length && parent?._close) {
        const layer = parent.nextElementSibling;
        if (layer?.classList.contains("poplayer")) stack.push({ dialog: parent, layer, root: true });
      }
      const existing = stack.find(entry => entry.marker === marker);
      if (existing) return;
      const dialog = get.poptipIntro(marker.dialog, marker.getAttribute("poptip"), event);
      const layer = status.poptip[1];
      layer.style.pointerEvents = "none";
      dialog.style.zIndex = String(21 + stack.length);
      stack.push({ dialog, layer, marker });
      return;
    }
    if (event.type === "touchstart" || !stack.length) return;
    event.stopImmediatePropagation();
    const index = stack.findIndex(({ dialog }) => dialog.contains(event.target));
    closeFrom(Math.max(0, index));
  }

  document.addEventListener("click", handleClick, true);
  document.addEventListener("touchstart", handleClick, true);
  document.addEventListener("touchend", handleClick, true);
  document.addEventListener("mouseleave", event => {
    if (stack.some(({ dialog }) => dialog === event.target)) event.stopImmediatePropagation();
  }, true);
}
