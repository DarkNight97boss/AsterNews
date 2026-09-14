'use client';

import { useTransition } from 'react';
import { previewThemeAction } from '@/lib/actions';
import { CARD_LABELS, CardStyle, FONT_LABELS, FontKey, HEADER_LABELS, HOME_LABELS, HeaderStyle, HomeLayout, THEMES, ThemeSettings, presetById, resolveTheme } from '@/lib/themes';

export function ThemePicker({ value, onChange }: { value: ThemeSettings; onChange: (t: ThemeSettings) => void }) {
  const [pending, start] = useTransition();
  const t = resolveTheme(value);
  const preset = presetById(value.preset);
  const hasOverrides = Object.keys(value).some((k) => k !== 'preset' && value[k as keyof ThemeSettings] !== undefined);
  return (
    <>
      <div className="theme-grid">
        {THEMES.map((p) => (
          <button type="button" key={p.id} className={`theme-card ${value.preset === p.id ? 'selected' : ''}`} onClick={() => onChange({ preset: p.id })}>
            <div className="theme-swatch">{p.swatch.map((c, i) => <span key={i} style={{ background: c }} />)}</div>
            <div className="theme-name">{p.name} {value.preset === p.id && <span className="badge badge-green">Attivo</span>}</div>
            <div className="theme-desc">{p.description}</div>
            <div className="theme-tags"><span>{HEADER_LABELS[p.headerStyle].split(' (')[0]}</span><span>{FONT_LABELS[p.headFont].split(' (')[0]}</span><span>{CARD_LABELS[p.cardStyle]}</span></div>
          </button>
        ))}
      </div>
      <div className="panel" style={{ marginTop: 20 }}>
        <div className="panel-title">Personalizza «{preset.name}» {hasOverrides && <button type="button" className="btn btn-ghost btn-sm" onClick={() => onChange({ preset: value.preset })}>Ripristina il preset</button>}</div>
        <div className="form-row">
          <div className="field"><label>Colore principale (testata)</label><div style={{ display: 'flex', gap: 8 }}><input className="color-input" type="color" value={t.brand} onChange={(e) => onChange({ ...value, brand: e.target.value })} /><input className="input" value={t.brand} onChange={(e) => onChange({ ...value, brand: e.target.value })} /></div></div>
          <div className="field"><label>Colore accento (occhielli, badge)</label><div style={{ display: 'flex', gap: 8 }}><input className="color-input" type="color" value={t.accent} onChange={(e) => onChange({ ...value, accent: e.target.value })} /><input className="input" value={t.accent} onChange={(e) => onChange({ ...value, accent: e.target.value })} /></div></div>
        </div>
        <div className="form-row">
          <div className="field"><label>Font titoli</label><select className="select" value={t.headFont} onChange={(e) => onChange({ ...value, headFont: e.target.value as FontKey })}>{(Object.keys(FONT_LABELS) as FontKey[]).map((k) => <option key={k} value={k}>{FONT_LABELS[k]}</option>)}</select></div>
          <div className="field"><label>Font testo</label><select className="select" value={t.bodyFont} onChange={(e) => onChange({ ...value, bodyFont: e.target.value as FontKey })}>{(Object.keys(FONT_LABELS) as FontKey[]).map((k) => <option key={k} value={k}>{FONT_LABELS[k]}</option>)}</select></div>
        </div>
        <div className="form-row">
          <div className="field"><label>Stile testata</label><select className="select" value={t.headerStyle} onChange={(e) => onChange({ ...value, headerStyle: e.target.value as HeaderStyle })}>{(Object.keys(HEADER_LABELS) as HeaderStyle[]).map((k) => <option key={k} value={k}>{HEADER_LABELS[k]}</option>)}</select></div>
          <div className="field"><label>Layout home</label><select className="select" value={t.homeLayout} onChange={(e) => onChange({ ...value, homeLayout: e.target.value as HomeLayout })}>{(Object.keys(HOME_LABELS) as HomeLayout[]).map((k) => <option key={k} value={k}>{HOME_LABELS[k]}</option>)}</select></div>
          <div className="field"><label>Stile card</label><select className="select" value={t.cardStyle} onChange={(e) => onChange({ ...value, cardStyle: e.target.value as CardStyle })}>{(Object.keys(CARD_LABELS) as CardStyle[]).map((k) => <option key={k} value={k}>{CARD_LABELS[k]}</option>)}</select></div>
          <div className="field"><label>Angoli arrotondati (px)</label><input className="input" type="number" min={0} max={24} value={t.radius} onChange={(e) => onChange({ ...value, radius: Number(e.target.value) })} /></div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <button type="button" className="btn btn-outline" disabled={pending} onClick={() => start(() => previewThemeAction(value))}>👁 Anteprima sul sito</button>
          <span className="help">L&apos;anteprima è visibile solo a te per 30 minuti. Per renderla definitiva usa «Salva impostazioni» oppure «Applica» dalla barra gialla sul sito.</span>
        </div>
      </div>
    </>
  );
}
