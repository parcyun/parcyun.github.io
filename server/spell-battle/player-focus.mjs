export function setPlayerFocus(battle, room, id, paused) {
  const player = battle.member(room, id);
  if (player.isHost || !["starting", "playing", "between"].includes(room.phase)) return;
  const now = battle.now();
  if (paused) {
    player.focusWarned = true;
    if (player.focusPausedAt == null) player.focusPausedAt = now;
  } else if (player.focusPausedAt != null) {
    if (player.questionStartedAt != null) player.questionStartedAt += now - player.focusPausedAt;
    player.focusPausedAt = null;
  }
}
