import { useEffect, useState } from 'react';
import { DESIGN_RESET, isDesignToggleChecked } from '../../lib/studioDesign';
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
  onValue?: string;
  offValue?: string;
};

type Props = {
  definition: DesignFieldDefinition;
  resolved: ResolvedDesignValue;
  computedValue?: string;
  savedValue?: string;
  defaultValue?: string;
  draftValue?: string;
  onChange: (value: string) => void;
  onReset: () => void;
};

const HEX = /^#[0-9A-F]{6}$/i;
const DIMENSION = /^(-?\d*\.?\d+)\s*(px|rem|em|%|vh|vw)?$/i;

function layer(value?: string) { return value && value !== DESIGN_RESET ? value : '—'; }
function provenance(draftValue?: string, savedValue?: string, computedValue?: string, defaultValue?: string) {
  return `편집 ${draftValue === DESIGN_RESET ? '초기화' : layer(draftValue)} · 저장 ${layer(savedValue)} · 계산 ${layer(computedValue)} · 기본 ${layer(defaultValue)}`;
}

export default function DesignField({ definition, resolved, draftValue, computedValue, savedValue, defaultValue, onChange, onReset }: Props) {
  const { key, label, kind } = definition;
  const parsed = resolved.value.match(DIMENSION);
  const units = definition.units || ['px', 'rem', 'em', '%'];
  const [colorDraft, setColorDraft] = useState(resolved.value);
  const [colorError, setColorError] = useState('');
  const value = kind === 'color' ? colorDraft : resolved.value;
  useEffect(() => { setColorDraft(resolved.value); setColorError(''); }, [resolved.value]);

  function commitColor(next: string) {
    const normalized = next.trim().toUpperCase();
    if (!normalized || HEX.test(normalized)) { setColorError(''); setColorDraft(normalized); onChange(normalized); return; }
    setColorError('올바른 6자리 HEX 색상을 입력하세요.');
    setColorDraft(resolved.value);
  }

  return <div className={`ds-field ds-field-${kind}`} data-source={resolved.source}>
    <div className="ds-field-label"><label htmlFor={`ds-${key}`}>{label}</label><button type="button" onClick={onReset} title={`${label} 재정의 지우기`} aria-label={`${label} 재정의 지우기`}>↺</button></div>
    {kind === 'color' && <div className="ds-color-control">
      <span className={`ds-swatch ${HEX.test(value) ? '' : 'empty'}`} aria-hidden="true">
        {HEX.test(value) && <input type="color" tabIndex={-1} value={value} onChange={(event) => { setColorError(''); setColorDraft(event.target.value.toUpperCase()); onChange(event.target.value.toUpperCase()); }} />}
      </span>
      <div><span className="ds-input-prefix">HEX</span><input id={`ds-${key}`} type="text" value={value} onChange={(event) => { setColorError(''); setColorDraft(event.target.value); }} onBlur={() => commitColor(value)} aria-invalid={!!colorError} aria-describedby={`${`ds-${key}-meta`} ${colorError ? `ds-${key}-error` : ''}`} /></div>
    </div>}
    {kind === 'number-unit' && <div className="ds-number-unit">
      <input id={`ds-${key}`} type="number" value={parsed?.[1] || ''} step={definition.step || .5} onChange={(event) => onChange(event.target.value ? `${event.target.value}${parsed?.[2] || units[0]}` : '')} />
      <select aria-label={`${label} 단위`} value={parsed?.[2] || units[0]} onChange={(event) => onChange(parsed?.[1] ? `${parsed[1]}${event.target.value}` : '')}>{units.map((unit) => <option key={unit}>{unit}</option>)}</select>
    </div>}
    {kind === 'select' && <select id={`ds-${key}`} value={resolved.value} onChange={(event) => onChange(event.target.value)}><option value="">기본값</option>{definition.options?.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select>}
    {kind === 'text' && <input id={`ds-${key}`} type="text" value={resolved.value} onChange={(event) => onChange(event.target.value)} />}
    {kind === 'toggle' && <label className="ds-toggle"><input id={`ds-${key}`} type="checkbox" checked={isDesignToggleChecked(resolved.value, definition.offValue || 'hidden')} onChange={(event) => onChange(event.target.checked ? (definition.onValue || 'visible') : (definition.offValue || 'hidden'))} /><span>{resolved.value === (definition.offValue || 'hidden') ? '숨김' : '표시'}</span></label>}
    {kind === 'opacity' && <div className="ds-opacity"><input id={`ds-${key}`} type="range" min="0" max="1" step="0.05" value={resolved.value || '1'} onChange={(event) => onChange(event.target.value)} /><input aria-label={`${label} 값`} type="number" min="0" max="1" step="0.05" value={resolved.value || '1'} onChange={(event) => onChange(event.target.value)} /></div>}
    <small id={`ds-${key}-meta`} className="ds-provenance">{provenance(draftValue, savedValue, computedValue, defaultValue)}</small>
    {colorError && <small id={`ds-${key}-error`} className="ds-field-error" role="alert">{colorError}</small>}
  </div>;
}
