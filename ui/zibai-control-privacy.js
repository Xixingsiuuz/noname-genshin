// 1.11.6 swapPlayer 在切换手牌视角后会直接显示 game.me.identity。
// 岩间只转交操作权，不转交身份信息；仅在这段同步切换期间拦截显示。
export function installZibaiControlPrivacy(game, lib) {
  if (game.fanZibaiControlPrivacy || typeof game.swapPlayer !== "function") return;
  const original = game.swapPlayer;
  game.swapPlayer = function (...args) {
    if (lib.config.mode !== "identity") return original.apply(this, args);
    const restores = [];
    for (const player of new Set([game.me, ...args])) {
      if (!player?.storage?.fan_zibai_control || player.identityShown || typeof player.setIdentity !== "function") continue;
      const own = Object.getOwnPropertyDescriptor(player, "setIdentity");
      const setIdentity = player.setIdentity;
      player.setIdentity = function (...values) {
        // 正式公开身份（例如死亡）仍由原生规则正常处理。
        if (this.identityShown) return setIdentity.apply(this, values);
        return this;
      };
      restores.push(() => {
        if (own) Object.defineProperty(player, "setIdentity", own);
        else delete player.setIdentity;
      });
    }
    try {
      return original.apply(this, args);
    } finally {
      for (const restore of restores.reverse()) restore();
    }
  };
  game.fanZibaiControlPrivacy = true;
}
