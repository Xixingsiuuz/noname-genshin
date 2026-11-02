import { game, lib } from "../../../noname.js";

// Each client advances from native audio ended events; ending the effect lets the current line finish.
function controlNicoleStory(player, active) {
  if (!active) {
    if (player._fanXuanjiStory) player._fanXuanjiStory.active = false;
    return;
  }
  if (player._fanXuanjiStory) player._fanXuanjiStory.active = false;
  const state = { active: true, index: 1 };
  player._fanXuanjiStory = state;
  const next = () => {
    if (!state.active || player._fanXuanjiStory !== state || !player.isIn()
      || !lib.config.background_speak || state.index > 5) return;
    game.playAudio({ path: `ext:原神/audio/nicole/skill/fan_xuanji_story${state.index++}.mp3`,
      onEnded: next, onError: () => { state.active = false; } });
  };
  next();
}
export function startNicoleStory(player) { game.broadcastAll(controlNicoleStory, player, true); }
export function finishNicoleStory(player) { game.broadcastAll(controlNicoleStory, player, false); }
