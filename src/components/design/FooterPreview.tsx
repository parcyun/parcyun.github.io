import { useEffect, useRef, useState } from 'react';

export type FooterContext = 'home' | 'atlas' | 'geoweb' | 'spell';
export type FooterViewport = 'desktop' | 'mobile';

const CONTEXTS: Array<{ value: FooterContext; label: string }> = [
  { value: 'home', label: 'Home' },
  { value: 'atlas', label: 'ATLAS Gears' },
  { value: 'geoweb', label: 'GeoWeb' },
  { value: 'spell', label: 'Spell Drill' },
];

type Props = {
  values: Record<string, string>;
  context?: FooterContext;
  viewport?: FooterViewport;
};

export default function FooterPreview({ values, context: initialContext = 'home', viewport: initialViewport = 'desktop' }: Props) {
  const frame = useRef<HTMLIFrameElement>(null);
  const [context, setContext] = useState<FooterContext>(initialContext);
  const [viewport, setViewport] = useState<FooterViewport>(initialViewport);

  function sendValues() {
    frame.current?.contentWindow?.postMessage({ type: 'ps-footer-preview-design', values }, location.origin);
  }

  useEffect(sendValues, [values, context]);

  return <section className="cs-footer-stage" aria-label="공용 푸터 실시간 미리보기">
    <div className="cs-footer-toolbar">
      <div className="cs-context-switch" aria-label="페이지 환경">
        {CONTEXTS.map((item) => <button key={item.value} type="button" className={context === item.value ? 'active' : ''} aria-pressed={context === item.value} onClick={() => setContext(item.value)}>{item.label}</button>)}
      </div>
      <div className="cs-viewport-switch" aria-label="화면 크기">
        <button type="button" className={viewport === 'desktop' ? 'active' : ''} aria-pressed={viewport === 'desktop'} onClick={() => setViewport('desktop')}>Desktop</button>
        <button type="button" className={viewport === 'mobile' ? 'active' : ''} aria-pressed={viewport === 'mobile'} onClick={() => setViewport('mobile')}>Mobile</button>
      </div>
    </div>
    <div className={`cs-footer-frame ${viewport}`}>
      <span className="cs-footer-badge">Shared footer</span>
      <iframe ref={frame} key={context} src={`/footer-preview.html?context=${context}`} sandbox="allow-scripts allow-same-origin" title={`${CONTEXTS.find((item) => item.value === context)?.label} 공용 푸터 미리보기`} onLoad={sendValues} />
    </div>
  </section>;
}
