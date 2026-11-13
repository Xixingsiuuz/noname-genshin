export function installCynoCardPrompt(lib, ui, get, status) {
  if (lib.hooks.checkEnd.some(hook => hook.fanCynoCardPrompt)) return;

  let activePrompt;
  let finishReturn;
  let revision = 0;

  function fade(node, from, to, duration) {
    return node.animate([{ opacity: from }, { opacity: to }], { duration, easing: "ease", fill: "forwards" });
  }

  function restorePrompt() {
    if (!activePrompt) return;
    const { dialog, caption, original, preview, animation } = activePrompt;
    activePrompt = undefined;
    animation?.cancel();
    if (preview.parentNode !== caption) return;
    caption.replaceChildren(...original);
    if (ui.dialog === dialog) ui.update();
  }

  async function updatePrompt(event, clear = false) {
    const version = ++revision;
    const selected = !clear && event === status.event && event?.name === "chooseToUse" &&
      event.isMine() && ui.selected.cards.length === 1 ? ui.selected.cards[0] : undefined;
    const name = selected && get.card()?.name;
    const card = name && lib.card[name];
    const description = card?.derivation === "fan_cyno" &&
      lib.translate[name + "_info"];
    const dialog = event?.dialog;
    const caption = description && dialog?.content?.querySelector(".caption");
    const current = activePrompt;
    if (caption && current?.caption === caption && current.name === name && !current.leaving) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const duration = reduced ? 0 : selected
      ? opacityDuration(selected) : current?.duration ?? 0;
    if (caption || (current && current.dialog !== dialog)) finishReturn?.();
    if (!caption && duration && current?.caption.isConnected &&
        current.dialog === dialog && current.preview.parentNode === current.caption) {
      const { caption: container, original, preview } = current;
      const opacity = getComputedStyle(preview).opacity;
      const { offsetTop, offsetLeft, offsetWidth, offsetHeight } = preview;
      current.animation?.cancel();
      activePrompt = undefined;

      const normal = document.createElement("span");
      normal.style.display = "block";
      normal.style.minHeight = offsetHeight + "px";
      normal.append(...original);
      Object.assign(preview.style, {
        position: "absolute",
        top: offsetTop + "px",
        left: offsetLeft + "px",
        width: offsetWidth + "px",
        pointerEvents: "none",
      });
      preview.inert = true;
      container.prepend(normal);
      const outgoing = fade(preview, opacity, 0, duration);
      const incoming = fade(normal, 0, 1, duration);
      const finish = () => {
        if (finishReturn !== finish) return;
        finishReturn = undefined;
        outgoing.cancel();
        incoming.cancel();
        preview.remove();
        if (normal.parentNode === container) normal.replaceWith(...original);
        if (ui.dialog === dialog) ui.update();
      };
      finishReturn = finish;
      void outgoing.finished.then(finish, finish);
      if (ui.dialog === dialog) ui.update();
      return;
    }
    if (duration && current?.caption.isConnected && current.dialog === dialog) {
      if (!current.leaving) {
        const opacity = getComputedStyle(current.preview).opacity;
        current.animation?.cancel();
        current.leaving = true;
        current.animation = fade(current.preview, opacity, 0, duration);
      }
      await current.animation.finished.catch(() => {});
      if (version !== revision) return;
    }
    restorePrompt();
    if (!caption?.isConnected || event !== status.event) return;

    const preview = document.createElement("span");
    preview.style.display = "block";
    const title = document.createElement("strong");
    title.textContent = get.translation(name);
    const category = document.createElement("span");
    Object.assign(category.style, {
      display: "block",
      marginTop: "0.5em",
      fontSize: "0.8em",
      fontWeight: "normal",
    });
    const type = lib.translate[card.type];
    const subtype = lib.translate[card.subtype];
    category.textContent = type ? type + "牌" + (subtype ? "-" + subtype : "") : "";
    const effect = document.createElement("span");
    Object.assign(effect.style, {
      display: "block",
      maxWidth: "min(32em, 75vw)",
      margin: "0.35em auto 0",
      fontSize: "0.75em",
      lineHeight: "1.4",
      whiteSpace: "normal",
    });
    effect.innerHTML = description;
    preview.append(title, category, effect);
    activePrompt = { dialog, caption, original: [...caption.childNodes], preview, name, duration };
    caption.replaceChildren(preview);
    if (duration) activePrompt.animation = fade(preview, 0, 1, duration);
    if (ui.dialog === dialog) ui.update();
  }

  function opacityDuration(card) {
    const style = getComputedStyle(card, "::after");
    const properties = style.transitionProperty.split(",").map(value => value.trim());
    const index = properties.findLastIndex(value => value === "opacity" || value === "all");
    if (index < 0) return 0;
    const durations = style.transitionDuration.split(",");
    const time = durations[index % durations.length].trim();
    return (parseFloat(time) || 0) * (time.endsWith("ms") ? 1 : 1000);
  }

  const checkPrompt = event => void updatePrompt(event);
  checkPrompt.fanCynoCardPrompt = true;
  lib.hooks.checkEnd.push(checkPrompt);
  lib.hooks.uncheckEnd.push((event, types) => {
    if (!types.includes("card")) return;
    const version = revision;
    queueMicrotask(() => {
      if (version === revision) void updatePrompt(event, true);
    });
  });
}
