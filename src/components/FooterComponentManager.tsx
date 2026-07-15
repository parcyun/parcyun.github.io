import { useEffect, useMemo, useReducer, useState } from 'react';
import {
  adminApplyComponentDesign,
  adminDeleteComponentDesign,
  listComponentDesign,
} from '../lib/adminPw';
import type { DesignValue } from '../lib/studioDesign';
import { DESIGN_RESET, materializeDesignValue, pushDraftHistory, undoDraft } from '../lib/studioDesign';
import FooterPreview from './design/FooterPreview';
import DesignInspector from './design/DesignInspector';

const FOOTER_FIELDS = ['display', 'fontFamily', 'fontSize', 'fontWeight', 'lineHeight', 'letterSpacing', 'color', 'backgroundColor', 'padding', 'borderRadius', 'opacity'] as const;
const DEFAULTS: DesignValue = { display: 'flex', color: '#FFB11A', backgroundColor: '#000000', fontFamily: 'Montserrat', fontSize: '11px', fontWeight: '400', lineHeight: 'normal', letterSpacing: '.3px', padding: '4px 12px', borderRadius: '100px', opacity: '1' };

function errorMessage(error: unknown) { return error instanceof Error ? error.message : '처리하지 못했습니다.'; }
type DesignState = { draft: DesignValue; history: DesignValue[] };
type DesignAction = { type: 'replace'; value: DesignValue } | { type: 'change'; key: string; value: string } | { type: 'undo' };
function designStateReducer(state: DesignState, action: DesignAction): DesignState {
  if (action.type === 'replace') return { draft: { ...action.value }, history: [{ ...action.value }] };
  if (action.type === 'undo') { const result = undoDraft(state.history); return { draft: result.value, history: result.history }; }
  const next = { ...state.draft, [action.key]: action.value || DESIGN_RESET };
  return { draft: next, history: pushDraftHistory(state.history, next) };
}

export default function FooterComponentManager({ password }: { password: string }) {
  const [saved, setSaved] = useState<DesignValue>({});
  const [{ draft, history }, dispatchDesign] = useReducer(designStateReducer, { draft: {}, history: [{}] });
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [status, setStatus] = useState('');
  const [statusKind, setStatusKind] = useState<'progress' | 'success' | 'error'>('progress');
  const dirty = useMemo(() => JSON.stringify(saved) !== JSON.stringify(draft), [saved, draft]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    listComponentDesign('footer').then((values) => {
      if (!active) return;
      setSaved(values); dispatchDesign({ type: 'replace', value: values }); setLoading(false);
    }).catch((error) => {
      if (!active) return;
      setLoadError(errorMessage(error)); setLoading(false);
    });
    return () => { active = false; };
  }, []);

  function update(key: string, value: string) { dispatchDesign({ type: 'change', key, value }); }
  function undo() { dispatchDesign({ type: 'undo' }); }

  async function save() {
    const resetKeys = Object.entries(draft).filter(([, value]) => value === DESIGN_RESET).map(([key]) => key);
    const persisted = materializeDesignValue(draft);
    const changed = Object.fromEntries(Object.entries(persisted).filter(([key, value]) => saved[key] !== value));
    if (!Object.keys(changed).length && !resetKeys.length) return;
    try {
      setBusy(true); setStatusKind('progress'); setStatus('저장 중…');
      await adminApplyComponentDesign(password, 'footer', resetKeys, changed);
      setSaved(persisted); dispatchDesign({ type: 'replace', value: persisted }); setStatusKind('success'); setStatus('공용 푸터 디자인을 저장했습니다.');
    } catch (error) { setStatusKind('error'); setStatus(errorMessage(error)); }
    finally { setBusy(false); }
  }

  async function resetProperty(key?: string) {
    if (!key) { await reset(); return; }
    dispatchDesign({ type: 'change', key, value: DESIGN_RESET });
    setStatusKind('progress'); setStatus('초기화가 미리보기에 반영되었습니다. 저장하면 확정됩니다.');
  }

  async function reset() {
    if (!confirm('공용 푸터를 기본 디자인으로 되돌릴까요?')) return;
    try {
      setBusy(true); setStatusKind('progress'); await adminDeleteComponentDesign(password, 'footer');
      setSaved({}); dispatchDesign({ type: 'replace', value: {} }); setStatusKind('success'); setStatus('기본 디자인으로 되돌렸습니다.');
    } catch (error) { setStatusKind('error'); setStatus(errorMessage(error)); }
    finally { setBusy(false); }
  }

  return <div className="cs-component-workspace">
    <FooterPreview values={materializeDesignValue(draft)} />
    <aside className="cs-data cs-component-manager" aria-busy={loading || busy}>
      {loading && <p className="cs-status" role="status" aria-live="polite">저장된 디자인을 불러오는 중…</p>}
      {loadError && <p className="cs-status cs-error" role="alert">{loadError}</p>}
      {!loading && !loadError && <DesignInspector selected={{ label: 'Shared footer', designKey: 'footer', tag: 'COMPONENT' }} draft={draft} saved={saved} computed={{}} defaults={DEFAULTS} history={history} busy={busy} applicableFields={FOOTER_FIELDS} onChange={update} onUndo={undo} onReset={resetProperty} onSave={save} />}
      {status && <p className={`cs-status ${statusKind === 'error' ? 'cs-error' : ''}`} role={statusKind === 'error' ? 'alert' : 'status'} aria-live="polite">{status}</p>}
    </aside>
  </div>;
}
