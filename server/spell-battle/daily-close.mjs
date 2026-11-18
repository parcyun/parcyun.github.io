const DAY_MS = 24 * 60 * 60 * 1000;
const KST_17_IN_UTC_MS = 8 * 60 * 60 * 1000;
const activePhases = new Set(["lobby", "starting", "playing", "between"]);

export function closeAtDailyCutoff(room, now) {
  const cutoff = Math.floor((now - KST_17_IN_UTC_MS) / DAY_MS) * DAY_MS + KST_17_IN_UTC_MS;
  if (activePhases.has(room.phase) && (room.activeAt ?? room.createdAt) < cutoff) {
    room.phase = "cancelled";
    room.dailyClosed = true;
    room.closedAt = cutoff;
  }
  return room.dailyClosed === true;
}
