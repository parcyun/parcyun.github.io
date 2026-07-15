import { useEffect, useMemo, useState } from 'react';
import {
  adminDeleteComponentDesign,
  adminDeleteComponentDesignProperty,
  adminSaveComponentDesign,
  listComponentDesign,
} from '../lib/adminPw';
import type { DesignValue } from '../lib/studioDesign';
import FooterPreview from './design/FooterPreview';

const FIELDS = [
  ['color', '강조 색상', '#FFB11A'], ['backgroundColor', '푸터 배경', 'rgba(0,0,0,.82)'],
  ['fontFamily', '글꼴', "'Montserrat','Pretendard Variable',sans-serif"], ['fontSize', '글자 크기', '11px'],
  ['fontWeight', '글자 굵기', '400'], ['lineHeight', '줄간격', 'normal'], ['letterSpacing', '자간', '.3px'],
  ['padding', '안쪽 여백', '4px 12px'], ['borderRadius', '모서리', '100px'], ['opacity', '불투명도', '1'],
] as const;

function errorMessage(error: unknown) { return error instanceof Error ? error.message : '처리하지 못했습니다.'; }

export default function FooterComponentManager({ password }: { password: string }) {
  const [saved, setSaved] = useState<DesignValue>({});
  const [draft, setDraft] = useState<DesignValue>({});
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
      setSaved(values); setDraft(values); setLoading(false);
    }).catch((error) => {
      if (!active) return;
      setLoadError(errorMessage(error)); setLoading(false);
    });
    return () => { active = false; };
  }, []);

  function update(key: string, value: string) { setDraft((current) => ({ ...current, [key]: value })); }

  async function save() {
    const changed = Object.fromEntries(Object.entries(draft).filter(([key, value]) => saved[key] !== value));
    if (!Object.keys(changed).length) return;
    try {
      setBusy(true); setStatus('저장 중…');
      await adminSaveComponentDesign(password, 'footer', changed);
      setSaved({ ...draft }); setStatus('공용 푸터 디자인을 저장했습니다.');
    } catch (error) { setStatus(errorMessage(error)); }
    finally { setBusy(false); }
  }

  async function resetProperty(key: string) {
    try {
      setBusy(true); await adminDeleteComponentDesignProperty(password, 'footer', key);
      setSaved((current) => { const next = { ...current }; delete next[key]; return next; });
      setDraft((current) => { const next = { ...current }; delete next[key]; return next; });
      setStatus('선택한 속성을 기본값으로 되돌렸습니다.');
    } catch (error) { setStatus(errorMessage(error)); }
    finally { setBusy(false); }
  }

  async function reset() {
    if (!confirm('공용 푸터를 기본 디자인으로 되돌릴까요?')) return;
    try {
      setBusy(true); await adminDeleteComponentDesign(password, 'footer');
      setSaved({}); setDraft({}); setStatus('기본 디자인으로 되돌렸습니다.');
    } catch (error) { setStatus(errorMessage(error)); }
    finally { setBusy(false); }
  }

  return <div className="cs-component-workspace">
    <FooterPreview values={draft} />
    <aside className="cs-data cs-component-manager" aria-busy={loading || busy}>
      <div className="cs-data-top"><p><b>공용 푸터</b><br /><small>한 번 수정하면 모든 페이지에 반영됩니다.</small></p><div className="cs-row-actions"><button className="cs-reset" disabled={loading || busy || !!loadError} onClick={reset}>전체 기본값</button><button className="cs-save" disabled={loading || busy || !!loadError || !dirty} onClick={save}>디자인 저장</button></div></div>
      {loading && <p className="cs-status" role="status" aria-live="polite">저장된 디자인을 불러오는 중…</p>}
      {loadError && <p className="cs-status cs-error" role="alert">{loadError}</p>}
      {!loading && !loadError && <div className="cs-style-grid">{FIELDS.map(([key, label, placeholder]) => <label key={key}><span>{label}</span><span className="cs-component-field"><input value={draft[key] || ''} placeholder={placeholder} onChange={(event) => update(key, event.target.value)} /><button type="button" disabled={busy || !(key in saved)} onClick={() => resetProperty(key)} aria-label={`${label} 기본값으로 되돌리기`}>↺</button></span></label>)}</div>}
      {status && <p className="cs-status" role="status" aria-live="polite">{status}</p>}
    </aside>
  </div>;
}
