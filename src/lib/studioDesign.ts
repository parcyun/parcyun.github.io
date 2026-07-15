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
