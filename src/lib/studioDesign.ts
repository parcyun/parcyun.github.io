export type StudioMode = 'page' | 'resources' | 'works' | 'components' | 'reviews' | 'feedback';
export type DesignValue = Record<string, string>;
export type ValueSource = 'draft' | 'saved' | 'computed' | 'default' | 'empty';
export type ResolvedDesignValue = { value: string; source: ValueSource };
export type PreviewRequest = { generation: number; frameWindow: unknown };
export const DESIGN_RESET = '__PS_DESIGN_RESET__';

const MODES = new Set<StudioMode>(['page', 'resources', 'works', 'components', 'reviews', 'feedback']);

export function parseStudioMode(search: string): StudioMode {
  const value = new URLSearchParams(search).get('mode') as StudioMode | null;
  return value && MODES.has(value) ? value : 'page';
}

export function resolveDesignValue(
  property: string,
  draft: DesignValue,
  saved: DesignValue,
  computed: DesignValue,
  defaults: DesignValue,
): ResolvedDesignValue {
  if (Object.hasOwn(draft, property) && draft[property] !== DESIGN_RESET) return { value: draft[property], source: 'draft' };
  if (draft[property] === DESIGN_RESET) {
    if (Object.hasOwn(computed, property)) return { value: computed[property], source: 'computed' };
    if (Object.hasOwn(defaults, property)) return { value: defaults[property], source: 'default' };
    return { value: '', source: 'empty' };
  }
  if (Object.hasOwn(saved, property)) return { value: saved[property], source: 'saved' };
  if (Object.hasOwn(computed, property)) return { value: computed[property], source: 'computed' };
  if (Object.hasOwn(defaults, property)) return { value: defaults[property], source: 'default' };
  return { value: '', source: 'empty' };
}

export function materializeDesignValue(value: DesignValue): DesignValue {
  return Object.fromEntries(Object.entries(value).filter(([, entry]) => entry !== DESIGN_RESET));
}

const COLOR = /^(#(?:[0-9a-f]{3}|[0-9a-f]{4}|[0-9a-f]{6}|[0-9a-f]{8})|rgba?\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}(?:\s*,\s*(?:0|1|0?\.\d+))?\s*\)|hsla?\([^;{}]+\)|transparent)$/i;
const NONNEGATIVE_DIMENSIONS = /^(?:0|\d+(?:\.\d+)?(?:px|rem|em|%|vh|vw))(?:\s+(?:0|\d+(?:\.\d+)?(?:px|rem|em|%|vh|vw))){0,3}$/i;
const SIGNED_DIMENSIONS = /^(?:0|-?\d+(?:\.\d+)?(?:px|rem|em|%|vh|vw))(?:\s+(?:0|-?\d+(?:\.\d+)?(?:px|rem|em|%|vh|vw))){0,3}$/i;

export function validateSiteDesignValue(property: string, value: string): boolean {
  if (typeof value !== 'string' || value.length > 80 || /[;{}]/.test(value)) return false;
  if (['color', 'backgroundColor', 'borderColor'].includes(property)) return COLOR.test(value);
  if (property === 'fontFamily') return /^[\p{L}\p{N}\s,'"_-]+$/u.test(value);
  if (['fontSize', 'padding', 'borderRadius', 'borderWidth'].includes(property)) return NONNEGATIVE_DIMENSIONS.test(value);
  if (['letterSpacing', 'margin'].includes(property)) return SIGNED_DIMENSIONS.test(value);
  if (property === 'lineHeight') return value === 'normal' || /^(?:\d+(?:\.\d+)?|0|\d+(?:\.\d+)?(?:px|rem|em|%))$/i.test(value);
  if (property === 'opacity') return /^(?:0(?:\.\d+)?|\.\d+|1(?:\.0+)?)$/.test(value) && Number(value) >= 0 && Number(value) <= 1;
  if (property === 'fontWeight') return /^(?:normal|bold|[1-9]00)$/.test(value);
  if (property === 'visibility') return /^(?:visible|hidden)$/.test(value);
  if (property === 'textAlign') return /^(?:left|center|right)$/.test(value);
  if (property === 'borderStyle') return /^(?:solid|dashed|dotted|none)$/.test(value);
  return false;
}

export function isDesignToggleChecked(value: string, offValue: string): boolean {
  return value !== offValue;
}

export function pushDraftHistory(history: DesignValue[], next: DesignValue, limit = 30): DesignValue[] {
  return [...history, { ...next }].slice(-limit);
}

export function undoDraft(history: DesignValue[]): { history: DesignValue[]; value: DesignValue } {
  if (history.length <= 1) return { history, value: { ...(history[0] || {}) } };
  return { history: history.slice(0, -1), value: { ...history[history.length - 2] } };
}

export function isCurrentPreviewRequest(
  request: PreviewRequest,
  currentGeneration: number,
  currentWindow: unknown,
): boolean {
  return request.generation === currentGeneration && request.frameWindow === currentWindow;
}
