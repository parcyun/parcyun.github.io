import { useEffect, useMemo, useState } from 'react';
import {
  adminDeleteComponentDesign,
  adminDeleteComponentDesignProperty,
  adminSaveComponentDesign,
  listComponentDesign,
} from '../lib/adminPw';
import type { DesignValue } from '../lib/studioDesign';
import { pushDraftHistory, undoDraft } from '../lib/studioDesign';
import FooterPreview from './design/FooterPreview';
import DesignInspector from './design/DesignInspector';

const FOOTER_FIELDS = ['fontFamily', 'fontSize', 'fontWeight', 'lineHeight', 'letterSpacing', 'color', 'backgroundColor', 'padding', 'borderRadius', 'opacity'] as const;
const DEFAULTS: DesignValue = { color: '#FFB11A', backgroundColor: '#000000', fontFamily: 'Montserrat', fontSize: '11px', fontWeight: '400', lineHeight: 'normal', letterSpacing: '.3px', padding: '4px 12px', borderRadius: '100px', opacity: '1' };

function errorMessage(error: unknown) { return error instanceof Error ? error.message : '처리하지 못했습니다.'; }

export default function FooterComponentManager({ password }: { password: string }) {
  const [saved, setSaved] = useState<DesignValue>({});
  const [draft, setDraft] = useState<DesignValue>({});
  const [history, setHistory] = useState<DesignValue[]>([{}]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [status, setStatus] = useState('');
  const dirty = useMemo(() => JSON.stringify(saved) !== JSON.stringify(draft), [saved, draft]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    listComponentDesign('footer').then((values) => {
      if (!active) return;
      setSaved(values); setDraft(values); setHistory([{ ...values }]); setLoading(false);
    }).catch((error) => {
      if (!active) return;
      setLoadError(errorMessage(error)); setLoading(false);
    });
    return () => { active = false; };
  }, []);

  function update(key: string, value: string) {
    setDraft((current) => { const next = { ...current, [key]: value }; if (!value) delete next[key]; setHistory((items) => pushDraftHistory(items, next)); return next; });
  }
  function undo() { const result = undoDraft(history); setHistory(result.history); setDraft(result.value); }

  async function save() {
    const changed = Object.fromEntries(Object.entries(draft).filter(([key, value]) => saved[key] !== value));
    if (!Object.keys(changed).length) return;
    try {
      setBusy(true); setStatus('저장 중…');
      await adminSaveComponentDesign(password, 'footer', changed);
      setSaved({ ...draft }); setHistory([{ ...draft }]); setStatus('공용 푸터 디자인을 저장했습니다.');
    } catch (error) { setStatus(errorMessage(error)); }
    finally { setBusy(false); }
  }

  async function resetProperty(key?: string) {
    if (!key) { await reset(); return; }
    try {
      setBusy(true); await adminDeleteComponentDesignProperty(password, 'footer', key);
      setSaved((current) => { const next = { ...current }; delete next[key]; return next; });
      setDraft((current) => { const next = { ...current }; delete next[key]; return next; });
      setHistory((current) => pushDraftHistory(current, Object.fromEntries(Object.entries(draft).filter(([property]) => property !== key))));
      setStatus('선택한 속성을 기본값으로 되돌렸습니다.');
    } catch (error) { setStatus(errorMessage(error)); }
    finally { setBusy(false); }
  }

  async function reset() {
    if (!confirm('공용 푸터를 기본 디자인으로 되돌릴까요?')) return;
    try {
      setBusy(true); await adminDeleteComponentDesign(password, 'footer');
      setSaved({}); setDraft({}); setHistory([{}]); setStatus('기본 디자인으로 되돌렸습니다.');
    } catch (error) { setStatus(errorMessage(error)); }
    finally { setBusy(false); }
  }

  return <div className="cs-component-workspace">
    <FooterPreview values={draft} />
    <aside className="cs-data cs-component-manager" aria-busy={loading || busy}>
      {loading && <p className="cs-status" role="status" aria-live="polite">저장된 디자인을 불러오는 중…</p>}
      {loadError && <p className="cs-status cs-error" role="alert">{loadError}</p>}
      {!loading && !loadError && <DesignInspector selected={{ label: 'Shared footer', designKey: 'footer', tag: 'COMPONENT' }} draft={draft} saved={saved} computed={DEFAULTS} defaults={DEFAULTS} history={history} busy={busy} applicableFields={FOOTER_FIELDS} onChange={update} onUndo={undo} onReset={resetProperty} onSave={save} />}
      {status && <p className="cs-status" role="status" aria-live="polite">{status}</p>}
    </aside>
  </div>;
}
