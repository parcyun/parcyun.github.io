export const GEOWEB_UPDATE_VERSION = '2026-07-onboarding-search-v2';
export const GEOWEB_UPDATE_STORAGE_KEY = 'parcyun:geoweb:update';

export function hasSeenGeoUpdate(storage) {
  try {
    return storage?.getItem(GEOWEB_UPDATE_STORAGE_KEY) === GEOWEB_UPDATE_VERSION;
  } catch {
    return false;
  }
}

export function markGeoUpdateSeen(storage) {
  try {
    storage?.setItem(GEOWEB_UPDATE_STORAGE_KEY, GEOWEB_UPDATE_VERSION);
  } catch {
    // Storage may be blocked; the map must still remain usable.
  }
}
