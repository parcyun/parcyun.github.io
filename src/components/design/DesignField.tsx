import { useEffect, useState } from 'react';
import type { ResolvedDesignValue } from '../../lib/studioDesign';

export type DesignFieldDefinition = {
  key: string;
  label: string;
  kind: 'text' | 'number-unit' | 'color' | 'select' | 'opacity' | 'toggle';
  units?: readonly string[];
  options?: readonly { value: string; label: string }[];
  min?: number;
  max?: number;
  step?: number;
};

type Props = {
  definition: DesignFieldDefinition;
  resolved: ResolvedDesignValue;
  computedValue?: string;
  savedValue?: string;
  onChange: (value: string) => void;
  onReset: () => void;
};

const HEX = /^#[0-9A-F]{6}$/i;
const DIMENSION = /^(-?\d*\.?\d+)\s*(px|rem|em|%|vh|vw)?$/i;

function provenance(savedValue?: string, computedValue?: string) {
  const parts = [];
  if (savedValue) parts.push(`저장됨 ${savedValue}`);
  if (computedValue) parts.push(`현재 ${computedValue}`);
  return parts.length ? parts.join(' · ') : '기본 스타일 사용 중';
}

export default function DesignField({ definition, resolved, computedValue, savedValue, onChange, onReset }: Props) {
  const { key, label, kind } = definition;
  const parsed = resolved.value.match(DIMENSION);
  const units = definition.units || ['px', 'rem', 'em', '%'];
  const [colorDraft, setColorDraft] = useState(resolved.value);
  const value = kind === 'color' ? colorDraft : resolved.value;
  useEffect(() => { setColorDraft(resolved.value); }, [resolved.value]);

  function commitColor(next: string) {
    const normalized = next.trim().toUpperCase();
    setColorDraft(normalized);
    if (!normalized || HEX.test(normalized)) onChange(normalized);
  }

  return <div className={`ds-field ds-field-${kind}`} data-source={resolved.source}>
    <div className="ds-field-label"><label htmlFor={`ds-${key}`}>{label}</label><button type="button" onClick={onReset} title={`${label} 재정의 지우기`} aria-label={`${label} 재정의 지우기`}>↺</button></div>
    {kind === 'color' && <div className="ds-color-control">
      <span className={`ds-swatch ${HEX.test(value) ? '' : 'empty'}`} aria-hidden="true">
        {HEX.test(value) && <input type="color" tabIndex={-1} value={value} onChange={(event) => { setColorDraft(event.target.value.toUpperCase()); onChange(event.target.value.toUpperCase()); }} />}
      </span>
      <div><span className="ds-input-prefix">HEX</span><input id={`ds-${key}`} type="text" value={value} onChange={(event) => setColorDraft(event.target.value)} onBlur={() => commitColor(value)} aria-describedby={`ds-${key}-meta`} /></div>
    </div>}
    {kind === 'number-unit' && <div className="ds-number-unit">
      <input id={`ds-${key}`} type="number" value={parsed?.[1] || ''} step={definition.step || .5} onChange={(event) => onChange(event.target.value ? `${event.target.value}${parsed?.[2] || units[0]}` : '')} />
      <select aria-label={`${label} 단위`} value={parsed?.[2] || units[0]} onChange={(event) => onChange(parsed?.[1] ? `${parsed[1]}${event.target.value}` : '')}>{units.map((unit) => <option key={unit}>{unit}</option>)}</select>
    </div>}
    {kind === 'select' && <select id={`ds-${key}`} value={resolved.value} onChange={(event) => onChange(event.target.value)}><option value="">기본값</option>{definition.options?.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select>}
    {kind === 'text' && <input id={`ds-${key}`} type="text" value={resolved.value} onChange={(event) => onChange(event.target.value)} />}
    {kind === 'toggle' && <label className="ds-toggle"><input id={`ds-${key}`} type="checkbox" checked={resolved.value !== 'hidden'} onChange={(event) => onChange(event.target.checked ? '' : 'hidden')} /><span>{resolved.value === 'hidden' ? '숨김' : '표시'}</span></label>}
    {kind === 'opacity' && <div className="ds-opacity"><input id={`ds-${key}`} type="range" min="0" max="1" step="0.05" value={resolved.value || '1'} onChange={(event) => onChange(event.target.value)} /><input aria-label={`${label} 값`} type="number" min="0" max="1" step="0.05" value={resolved.value || '1'} onChange={(event) => onChange(event.target.value)} /></div>}
    <small id={`ds-${key}-meta`} className="ds-provenance">{provenance(savedValue, computedValue)}</small>
  </div>;
}
