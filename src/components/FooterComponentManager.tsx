import { useState } from 'react';
import { adminDeleteComponentDesign, adminSaveComponentDesign } from '../lib/adminPw';

const FIELDS = [
  ['color', '강조 색상', '#FFB11A'], ['backgroundColor', '푸터 배경', 'rgba(0,0,0,.82)'],
  ['fontFamily', '글꼴', "'Montserrat','Pretendard Variable',sans-serif"], ['fontSize', '글자 크기', '11px'],
  ['fontWeight', '글자 굵기', '400'], ['lineHeight', '줄간격', 'normal'], ['letterSpacing', '자간', '.3px'],
  ['padding', '안쪽 여백', '4px 12px'], ['borderRadius', '모서리', '100px'], ['opacity', '불투명도', '1'],
] as const;

export default function FooterComponentManager({ password }: { password: string }) {
  const [values, setValues] = useState<Record<string, string>>({});
  const [status, setStatus] = useState('');
  function update(key: string, value: string) { setValues((current) => ({ ...current, [key]: value })); }
  async function save() { try { setStatus('저장 중…'); await adminSaveComponentDesign(password, 'footer', values); setStatus('공용 푸터 디자인을 저장했습니다.'); } catch (error) { setStatus(error instanceof Error ? error.message : '저장하지 못했습니다.'); } }
  async function reset() { if (!confirm('공용 푸터를 기본 디자인으로 되돌릴까요?')) return; try { await adminDeleteComponentDesign(password, 'footer'); setValues({}); setStatus('기본 디자인으로 되돌렸습니다.'); } catch (error) { setStatus(error instanceof Error ? error.message : '초기화하지 못했습니다.'); } }
  return <div className="cs-data cs-component-manager"><div className="cs-data-top"><p><b>공용 푸터</b><br /><small>모든 페이지에 한 번에 반영됩니다.</small></p><div className="cs-row-actions"><button className="cs-reset" onClick={reset}>기본값</button><button className="cs-save" onClick={save}>디자인 저장</button></div></div><div className="cs-style-grid">{FIELDS.map(([key, label, placeholder]) => <label key={key}><span>{label}</span><input value={values[key] || ''} placeholder={placeholder} onChange={(event) => update(key, event.target.value)} /></label>)}</div>{status && <p className="cs-status">{status}</p>}</div>;
}
