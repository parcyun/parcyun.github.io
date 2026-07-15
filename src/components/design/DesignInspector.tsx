import { useMemo, useState } from 'react';
import { resolveDesignValue } from '../../lib/studioDesign';
import type { DesignValue } from '../../lib/studioDesign';
import DesignField from './DesignField';
import type { DesignFieldDefinition } from './DesignField';

const DEFINITIONS: Record<string, DesignFieldDefinition> = {
  visibility: { key: 'visibility', label: 'Visibility', kind: 'toggle', offValue: 'hidden' },
  display: { key: 'display', label: 'Visibility', kind: 'toggle', offValue: 'none' },
  fontFamily: { key: 'fontFamily', label: 'Family', kind: 'select', options: [{ value: 'Montserrat', label: 'Montserrat' }, { value: 'Pretendard Variable', label: 'Pretendard' }, { value: 'serif', label: 'Serif' }] },
  fontSize: { key: 'fontSize', label: 'Size', kind: 'number-unit' },
  fontWeight: { key: 'fontWeight', label: 'Weight', kind: 'select', options: ['300', '400', '500', '600', '700'].map((value) => ({ value, label: value })) },
  lineHeight: { key: 'lineHeight', label: 'Line height', kind: 'text' },
  letterSpacing: { key: 'letterSpacing', label: 'Letter spacing', kind: 'number-unit' },
  textAlign: { key: 'textAlign', label: 'Align', kind: 'select', options: ['left', 'center', 'right'].map((value) => ({ value, label: value })) },
  color: { key: 'color', label: 'Text color', kind: 'color' },
  backgroundColor: { key: 'backgroundColor', label: 'Background', kind: 'color' },
  borderColor: { key: 'borderColor', label: 'Color', kind: 'color' },
  borderWidth: { key: 'borderWidth', label: 'Width', kind: 'number-unit' },
  borderStyle: { key: 'borderStyle', label: 'Style', kind: 'select', options: ['solid', 'dashed', 'dotted', 'none'].map((value) => ({ value, label: value })) },
  padding: { key: 'padding', label: 'Padding', kind: 'text' },
  margin: { key: 'margin', label: 'Margin', kind: 'text' },
  borderRadius: { key: 'borderRadius', label: 'Radius', kind: 'number-unit', units: ['px', 'rem', '%'] },
  opacity: { key: 'opacity', label: 'Opacity', kind: 'opacity', min: 0, max: 1, step: .05 },
};

const SECTIONS = [
  { id: 'text', label: 'Text', fields: ['visibility', 'display'] },
  { id: 'typography', label: 'Typography', fields: ['fontFamily', 'fontSize', 'fontWeight', 'lineHeight', 'letterSpacing', 'textAlign', 'color'] },
  { id: 'fill', label: 'Fill', fields: ['backgroundColor'] },
  { id: 'stroke', label: 'Stroke', fields: ['borderColor', 'borderWidth', 'borderStyle'] },
  { id: 'layout', label: 'Layout', fields: ['padding', 'margin', 'borderRadius'] },
  { id: 'opacity', label: 'Opacity', fields: ['opacity'] },
] as const;

export type InspectorSelection = { label: string; designKey: string; tag?: string; legacy?: boolean };
type Props = {
  selected: InspectorSelection;
  draft: DesignValue;
  saved: DesignValue;
  computed: DesignValue;
  defaults?: DesignValue;
  history: DesignValue[];
  busy?: boolean;
  applicableFields?: readonly string[];
  onChange: (key: string, value: string) => void;
  onUndo: () => void;
  onReset: (key?: string) => void;
  onSave: () => void;
};

export default function DesignInspector({ selected, draft, saved, computed, defaults = {}, history, busy = false, applicableFields, onChange, onUndo, onReset, onSave }: Props) {
  const allowed = useMemo(() => new Set(applicableFields || Object.keys(DEFINITIONS)), [applicableFields]);
  const [open, setOpen] = useState<Record<string, boolean>>({ text: true, typography: true, fill: true, stroke: true, layout: true, opacity: true });
  const dirty = JSON.stringify(draft) !== JSON.stringify(saved);
  return <div className="ds-inspector" aria-busy={busy}>
    <header className="ds-object-head"><div><small>{selected.tag || 'COMPONENT'} · {selected.legacy ? 'LEGACY' : 'STABLE'}</small><strong>{selected.label}</strong><code>{selected.designKey}</code></div>{dirty && <span className="ds-dirty">변경됨</span>}</header>
    <div className="ds-actions" role="toolbar" aria-label="디자인 편집 작업">
      <button type="button" onClick={onUndo} disabled={busy || history.length < 2} title="마지막 변경 취소">실행 취소</button>
      <button type="button" onClick={() => onReset()} disabled={busy} title="저장된 재정의 초기화">초기화</button>
      <button type="button" className="primary" onClick={onSave} disabled={busy || !dirty}>{busy ? '저장 중…' : '저장'}</button>
    </div>
    {SECTIONS.map((section) => {
      const fields = section.fields.filter((key) => allowed.has(key));
      if (!fields.length) return null;
      const expanded = open[section.id] !== false;
      return <section className="ds-section" key={section.id}>
        <button type="button" className="ds-section-head" aria-expanded={expanded} onClick={() => setOpen((current) => ({ ...current, [section.id]: !expanded }))}><span>{section.label}</span><span>{expanded ? '−' : '+'}</span></button>
        {expanded && <div className="ds-section-fields">{fields.map((key) => {
          const definition = DEFINITIONS[key];
          const resolved = resolveDesignValue(key, draft, saved, computed, defaults);
          return <DesignField key={key} definition={definition} resolved={resolved} draftValue={draft[key]} computedValue={computed[key]} savedValue={saved[key]} defaultValue={defaults[key]} onChange={(value) => onChange(key, value)} onReset={() => onReset(key)} />;
        })}</div>}
      </section>;
    })}
  </div>;
}
