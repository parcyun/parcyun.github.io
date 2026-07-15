import { useEffect, useMemo, useRef, useState } from 'react';
import {
  adminDeleteResource,
  adminDeleteWork,
  adminDeleteCareerItem,
  adminDeleteCareerSection,
  adminDeleteSiteDesign,
  adminListCareerTimeline,
  adminSaveCareerItem,
  adminSaveCareerSection,
  adminSaveSiteDesign,
  getAdminPw,
} from '../lib/adminPw';
import type { CareerItem, CareerSection } from '../lib/adminPw';
import { useResources } from '../lib/useResources';
import { useWorks } from '../lib/useWorks';
import type { Category, Resource } from '../data/resources';
import type { Work } from '../data/works';
import ResourceEditModal from './admin/ResourceEditModal';
import WorkEditModal from './admin/WorkEditModal';
import FeedbackAdmin from './FeedbackAdmin';
import FooterComponentManager from './FooterComponentManager';
import ReviewAdmin from './ReviewAdmin';

type StudioElement = { key: string; designKey: string; label: string; html: string };
type DesignValue = Record<string, string>;
type StudioMode = 'page' | 'resources' | 'works' | 'components' | 'reviews' | 'feedback';

const PAGES = [
  { id: 'home', label: '홈', path: '/' },
  { id: 'academica', label: 'ACADEMICA', path: '/academica/' },
  { id: 'atlas', label: 'ATLAS GEARS', path: '/atlas-gears/' },
  { id: 'geoweb', label: 'GeoWeb', path: '/world-map/' },
  { id: 'spell', label: 'Spell Drill', path: '/korean-spell-drill-parcyun/' },
  { id: 'works', label: 'Works', path: '/works/' },
];
const STYLE_FIELDS = [
  ['color', '글자색', 'color'], ['backgroundColor', '배경색', 'color'], ['fontFamily', '글꼴', 'select'],
  ['fontSize', '크기', 'text'], ['fontWeight', '굵기', 'select'], ['lineHeight', '줄간격', 'text'],
  ['letterSpacing', '자간', 'text'], ['padding', '안쪽 여백', 'text'], ['margin', '바깥 여백', 'text'],
  ['borderRadius', '모서리', 'text'], ['borderColor', '테두리색', 'color'], ['borderWidth', '테두리', 'text'], ['opacity', '불투명도', 'text'],
] as const;

function message(error: unknown) { return error instanceof Error ? error.message : '저장하지 못했습니다.'; }
function nextId(prefix: string) { return `${prefix}-${Date.now().toString(36)}`; }

export default function ContentStudio() {
  const frame = useRef<HTMLIFrameElement>(null);
  const [pageId, setPageId] = useState('home');
  const [elements, setElements] = useState<StudioElement[]>([]);
  const [selected, setSelected] = useState<StudioElement | null>(null);
  const [draftHtml, setDraftHtml] = useState('');
  const [draftStyle, setDraftStyle] = useState<DesignValue>({});
  const [careers, setCareers] = useState<CareerSection[]>([]);
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<StudioMode>(() => { const value = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('mode') : ''; return value === 'feedback' || value === 'components' || value === 'reviews' ? value : 'page'; });
  const [resourceCategory, setResourceCategory] = useState<Category>('교육 활동 자료');
  const page = useMemo(() => PAGES.find((item) => item.id === pageId) || PAGES[0], [pageId]);
  const password = getAdminPw();

  function preview(): any { return frame.current?.contentWindow?.psContentStudio; }
  function inspect(enabled = true) { frame.current?.contentWindow?.postMessage({ type: 'ps-content-studio-inspect', enabled }, location.origin); }
  function refreshElements() {
    const studio = preview();
    if (!studio?.getElements) { window.setTimeout(refreshElements, 300); return; }
    const next = studio.getElements() as StudioElement[];
    setElements(next); setLoading(false); inspect(true);
  }
  async function refreshCareers() {
    try { setCareers(await adminListCareerTimeline()); } catch (error) { setStatus(message(error)); }
  }
  function selectElement(element: StudioElement) {
    setSelected(element); setDraftHtml(element.html);
    const target = frame.current?.contentDocument?.querySelector(`[data-ps-design="${CSS.escape(element.designKey.split('::').pop() || '')}"]`) as HTMLElement | null;
    const next: DesignValue = {};
    if (target) STYLE_FIELDS.forEach(([key]) => { if (target.style[key]) next[key] = target.style[key]; });
    setDraftStyle(next); inspect(true);
  }
  function onFrameLoad() { setLoading(true); setElements([]); setSelected(null); window.setTimeout(refreshElements, 350); if (page.id === 'home') refreshCareers(); }
  useEffect(() => { if (page.id === 'home') refreshCareers(); }, [page.id]);
  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (event.origin === location.origin && event.data?.type === 'ps-content-studio-selected') selectElement(event.data.element as StudioElement);
    };
    window.addEventListener('message', onMessage); return () => window.removeEventListener('message', onMessage);
  }, []);

  async function saveText() {
    if (!selected || !password) return;
    try { setStatus('문구 저장 중…'); await preview().saveText(selected.key, draftHtml); setStatus('문구를 저장했습니다.'); refreshElements(); }
    catch (error) { setStatus(message(error)); }
  }
  function updateStyle(key: string, value: string) {
    const next = { ...draftStyle, [key]: value };
    if (!value) delete next[key];
    setDraftStyle(next); if (selected) preview()?.previewStyle(selected.designKey, next);
  }
  async function saveStyle() {
    if (!selected || !password) return;
    try { setStatus('디자인 저장 중…'); await adminSaveSiteDesign(password, selected.designKey, draftStyle); setStatus('디자인을 저장했습니다.'); }
    catch (error) { setStatus(message(error)); }
  }
  async function resetStyle() {
    if (!selected || !password || !confirm('이 요소의 저장된 디자인 설정을 기본값으로 되돌릴까요?')) return;
    try { await adminDeleteSiteDesign(password, selected.designKey); setDraftStyle({}); frame.current?.contentWindow?.location.reload(); setStatus('기본 디자인으로 되돌렸습니다.'); }
    catch (error) { setStatus(message(error)); }
  }
  async function saveSection(section: CareerSection) {
    if (!password) return;
    try { await adminSaveCareerSection(password, { id: section.id, title: section.title, sort: section.sort }); await refreshCareers(); setStatus('경력 분류를 저장했습니다.'); }
    catch (error) { setStatus(message(error)); }
  }
  async function removeSection(section: CareerSection) {
    if (!password || !confirm(`“${section.title}”과(와) 그 안의 모든 경력을 삭제할까요?`)) return;
    try { await adminDeleteCareerSection(password, section.id); await refreshCareers(); setStatus('경력 분류를 삭제했습니다.'); }
    catch (error) { setStatus(message(error)); }
  }
  async function saveItem(item: CareerItem) {
    if (!password) return;
    try { await adminSaveCareerItem(password, item); await refreshCareers(); frame.current?.contentWindow?.location.reload(); setStatus('경력 항목을 저장했습니다.'); }
    catch (error) { setStatus(message(error)); }
  }
  async function removeItem(item: CareerItem) {
    if (!password || !confirm('이 경력 항목을 삭제할까요?')) return;
    try { await adminDeleteCareerItem(password, item.id); await refreshCareers(); frame.current?.contentWindow?.location.reload(); setStatus('경력 항목을 삭제했습니다.'); }
    catch (error) { setStatus(message(error)); }
  }
  async function addSection() {
    const section: CareerSection = { id: nextId('career-section'), title: '새 경력 분류', sort: (careers.length + 1) * 10, items: [] };
    await saveSection(section);
  }
  async function addItem(section: CareerSection) {
    await saveItem({ id: nextId('career-item'), section_id: section.id, year: '현재', role: '새 경력 내용', org: '', sort: (section.items.length + 1) * 10 });
  }

  if (!password) return <main className="cs-lock"><strong>관리자 로그인이 필요합니다.</strong><a href="/admin/">관리자 로그인으로 이동 →</a></main>;

  function changeMode(next: StudioMode) {
    setMode(next);
    const url = new URL(location.href);
    next === 'page' ? url.searchParams.delete('mode') : url.searchParams.set('mode', next);
    history.replaceState(null, '', url);
  }

  return <main className="cs-shell">
    <aside className="cs-pages">
      <a className="cs-back" href="/admin/">← 관리자</a><div className="cs-brand">DESIGN<br /><b>STUDIO</b></div>
      <p className="cs-caption">WORKSPACE</p>
      <button className={mode === 'page' ? 'active' : ''} onClick={() => changeMode('page')}><span>◈</span>페이지 디자인</button>
      <button className={mode === 'resources' ? 'active' : ''} onClick={() => changeMode('resources')}><span>◈</span>자료 관리</button>
      <button className={mode === 'works' ? 'active' : ''} onClick={() => changeMode('works')}><span>◈</span>Works 관리</button>
      <button className={mode === 'components' ? 'active' : ''} onClick={() => changeMode('components')}><span>◈</span>컴포넌트 디자인</button>
      <button className={mode === 'reviews' ? 'active' : ''} onClick={() => changeMode('reviews')}><span>◈</span>리뷰 관리</button>
      <button className={mode === 'feedback' ? 'active' : ''} onClick={() => changeMode('feedback')}><span>◈</span>개선 요청</button>
      {mode === 'page' && <><p className="cs-caption cs-page-caption">PAGES</p>{PAGES.map((item) => <button key={item.id} className={'cs-subnav ' + (item.id === page.id ? 'active' : '')} onClick={() => setPageId(item.id)}><span>·</span>{item.label}</button>)}</>}
      <p className="cs-tip">{mode === 'page' ? '미리보기의 문구를 클릭하거나 목록에서 선택해 편집하세요.' : '모든 변경은 기존 관리자 인증과 저장 규칙을 그대로 사용합니다.'}</p>
    </aside>
    {mode === 'page' ? <><section className="cs-canvas">
      <header><div><small>LIVE PREVIEW</small><strong>{page.label}</strong></div><a href={page.path} target="_blank" rel="noreferrer">새 창에서 보기 ↗</a></header>
      <div className="cs-frame"><iframe ref={frame} key={page.path} src={page.path} title={`${page.label} 편집 미리보기`} onLoad={onFrameLoad} /></div>
      <div className="cs-elements"><span>TEXT COMPONENTS · {elements.length}</span>{loading ? <em>불러오는 중…</em> : elements.map((element) => <button className={selected?.key === element.key ? 'chosen' : ''} key={element.key} onClick={() => selectElement(element)}>{element.label}</button>)}</div>
    </section>
    <aside className="cs-inspector">
      <header><small>INSPECTOR</small><strong>{page.id === 'home' ? '홈 컴포넌트' : '컴포넌트 설정'}</strong></header>
      {status && <div className="cs-status">{status}</div>}
      <section className="cs-panel"><div className="cs-panel-head"><b>텍스트</b><span>{selected ? selected.label.split(' · ')[0] : '선택 필요'}</span></div>
        {selected ? <><textarea value={draftHtml} onChange={(event) => { setDraftHtml(event.target.value); preview()?.previewText(selected.key, event.target.value); }} /><button className="cs-save" onClick={saveText}>문구 저장</button></> : <p className="cs-empty">미리보기의 문구를 클릭하세요.</p>}
      </section>
      <section className="cs-panel"><div className="cs-panel-head"><b>디자인 설정</b><span>Figma-style</span></div>
        {selected ? <div className="cs-style-grid">{STYLE_FIELDS.map(([key, label, kind]) => <label key={key}><span>{label}</span>{kind === 'select' ? <select value={draftStyle[key] || ''} onChange={(event) => updateStyle(key, event.target.value)}>{key === 'fontFamily' ? <><option value="">기본값</option><option value="Montserrat">Montserrat</option><option value="Pretendard Variable">Pretendard</option><option value="serif">Serif</option></> : <><option value="">기본값</option><option value="300">Light 300</option><option value="400">Regular 400</option><option value="500">Medium 500</option><option value="600">SemiBold 600</option><option value="700">Bold 700</option></>}</select> : <input type={kind} value={draftStyle[key] || ''} placeholder={kind === 'color' ? '#000000' : '기본값'} onChange={(event) => updateStyle(key, event.target.value)} />}</label>)}</div> : <p className="cs-empty">텍스트를 선택하면 디자인 도구가 열립니다.</p>}
        {selected && <div className="cs-actions"><button className="cs-reset" onClick={resetStyle}>기본값</button><button className="cs-save" onClick={saveStyle}>디자인 저장</button></div>}
      </section>
      {page.id === 'home' && <section className="cs-panel cs-careers"><div className="cs-panel-head"><b>경력 사항</b><button onClick={addSection}>＋ 분류</button></div>
        {careers.map((section) => <CareerSectionEditor key={section.id} section={section} onChange={(next) => setCareers(careers.map((item) => item.id === next.id ? next : item))} onSave={() => saveSection(section)} onDelete={() => removeSection(section)} onAdd={() => addItem(section)} onSaveItem={saveItem} onDeleteItem={removeItem} />)}
        <button className="cs-add-career" onClick={() => careers[0] && addItem(careers[0])}>＋ 경력 추가</button>
      </section>}
    </aside></> : <section className="cs-manager">
      <header className="cs-manager-head"><div><small>MANAGE</small><strong>{mode === 'resources' ? '자료 관리' : mode === 'works' ? 'Works 관리' : mode === 'components' ? '컴포넌트 디자인' : mode === 'reviews' ? '리뷰 관리' : '개선 요청'}</strong></div><span>Design Studio</span></header>
      {mode === 'resources' && <><div className="cs-category-tabs"><button className={resourceCategory === '교육 활동 자료' ? 'active' : ''} onClick={() => setResourceCategory('교육 활동 자료')}>교육 활동 자료</button><button className={resourceCategory === '강의 자료' ? 'active' : ''} onClick={() => setResourceCategory('강의 자료')}>강의 자료</button></div><ResourceManager category={resourceCategory} password={password} /></>}
      {mode === 'works' && <WorksManager password={password} />}
      {mode === 'components' && <FooterComponentManager password={password} />}
      {mode === 'reviews' && <ReviewAdmin />}
      {mode === 'feedback' && <div className="cs-feedback"><FeedbackAdmin /></div>}
    </section>}
  </main>;
}

function CareerSectionEditor({ section, onChange, onSave, onDelete, onAdd, onSaveItem, onDeleteItem }: { section: CareerSection; onChange: (next: CareerSection) => void; onSave: () => void; onDelete: () => void; onAdd: () => void; onSaveItem: (item: CareerItem) => void; onDeleteItem: (item: CareerItem) => void }) {
  return <div className="cs-section"><div className="cs-section-title"><input value={section.title} onChange={(event) => onChange({ ...section, title: event.target.value })} /><button onClick={onSave}>저장</button><button onClick={onDelete}>삭제</button></div>
    {section.items.map((item) => <div className="cs-career-row" key={item.id}><input aria-label="연도" value={item.year} onChange={(event) => onChange({ ...section, items: section.items.map((entry) => entry.id === item.id ? { ...entry, year: event.target.value } : entry) })} /><input aria-label="경력" value={item.role} onChange={(event) => onChange({ ...section, items: section.items.map((entry) => entry.id === item.id ? { ...entry, role: event.target.value } : entry) })} /><input aria-label="기관" value={item.org} onChange={(event) => onChange({ ...section, items: section.items.map((entry) => entry.id === item.id ? { ...entry, org: event.target.value } : entry) })} /><div><button onClick={() => onSaveItem(item)}>저장</button><button onClick={() => onDeleteItem(item)}>×</button></div></div>)}
    <button className="cs-add-row" onClick={onAdd}>＋ 항목 추가</button>
  </div>;
}

function ResourceManager({ category, password }: { category: Category; password: string }) {
  const { items, reload } = useResources(category);
  const [editing, setEditing] = useState<Resource | 'new' | null>(null);
  async function remove(item: Resource) {
    if (!confirm(`“${item.title}” 자료를 삭제할까요?`)) return;
    try { await adminDeleteResource(password, item.id); reload(); }
    catch (error) { alert(message(error)); }
  }
  return <div className="cs-data"><div className="cs-data-top"><p><b>{items.length}</b>개 자료</p><button className="cs-save" onClick={() => setEditing('new')}>＋ 자료 추가</button></div>
    <div className="cs-data-list">{items.map((item) => <article key={item.id} className="cs-data-row"><div className="cs-data-main"><small>{item.type} · {item.subject || '분류 없음'}</small><strong>{item.title}</strong><p>{item.desc}</p><span>{item.tags.map((tag) => `#${tag}`).join(' · ')}</span></div><div className="cs-row-actions"><button onClick={() => setEditing(item)}>수정</button><button className="danger" onClick={() => remove(item)}>삭제</button></div></article>)}</div>
    {editing && <ResourceEditModal key={editing === 'new' ? 'new' : editing.id} category={category} pw={password} initial={editing === 'new' ? undefined : editing} onClose={() => setEditing(null)} onSaved={() => { reload(); setEditing(null); }} />}
  </div>;
}

function WorksManager({ password }: { password: string }) {
  const { items, reload } = useWorks();
  const [editing, setEditing] = useState<Work | 'new' | null>(null);
  const nextNum = String(Math.max(0, ...items.map((item) => Number(item.num) || 0)) + 1).padStart(3, '0');
  async function remove(item: Work) {
    if (!confirm(`Work ${item.num} “${item.title}”를 삭제할까요?`)) return;
    try { await adminDeleteWork(password, item.num); reload(); }
    catch (error) { alert(message(error)); }
  }
  return <div className="cs-data"><div className="cs-data-top"><p><b>{items.length}</b>개 Work</p><button className="cs-save" onClick={() => setEditing('new')}>＋ Work 추가</button></div>
    <div className="cs-data-list">{items.map((item) => <article key={item.num} className="cs-data-row"><div className="cs-data-main"><small>WORK {item.num} · {item.status}</small><strong>{item.title}</strong><p>{item.desc}</p><span>{item.week} · {item.tags.join(' · ')}</span></div><div className="cs-row-actions"><button onClick={() => setEditing(item)}>수정</button><button className="danger" onClick={() => remove(item)}>삭제</button></div></article>)}</div>
    {editing && <WorkEditModal key={editing === 'new' ? 'new' : editing.num} pw={password} initial={editing === 'new' ? undefined : editing} nextNum={nextNum} onClose={() => setEditing(null)} onSaved={() => { reload(); setEditing(null); }} />}
  </div>;
}
