'use client';

import { useMemo, useState } from 'react';
import { Article } from '@/lib/models';
import { SeoContext, analyze, optimizeArticle, restructureHtml, stripAutoLinks } from '@/lib/seo-engine';
import { toast } from '@/components/ui/toaster';

interface Props { article: Article; ctx: SeoContext; siteUrl: string; maxLinks: number; onPatch: (patch: Partial<Article>) => void; onAddTag: (name: string) => void }

export function scoreColor(s: number): string { return s >= 80 ? '#0b7a4b' : s >= 55 ? '#e67e00' : '#d7262d'; }

export function SeoAssistant({ article: a, ctx, siteUrl, maxLinks, onPatch, onAddTag }: Props) {
  const an = useMemo(() => analyze(a, ctx), [a, ctx]);
  const [showAll, setShowAll] = useState(false);
  const color = scoreColor(an.score);
  const problems = an.checks.filter((c) => c.status !== 'ok');
  const list = showAll ? an.checks : problems;
  const run = (opts: { fillMeta: boolean; links: boolean; overwriteSlug: boolean }) => {
    const r = optimizeArticle(a, ctx, { ...opts, maxLinks, fixImages: true, siteUrl });
    if (!r.changes.length) { toast.info('Niente da ottimizzare: l\'articolo è già a posto.'); return; }
    onPatch({ seo: r.article.seo, slug: r.article.slug, excerpt: r.article.excerpt, content: r.article.content });
    toast.success(`Ottimizzato: ${r.changes.join(', ')}.${r.added.length ? ' Link aggiunti: ' + r.added.map((l) => `«${l.anchor}»`).join(', ') : ''}`);
  };
  return (
    <div className="seo-assist">
      <div className="seo-head">
        <div className="seo-ring" style={{ ['--p' as string]: `${an.score}%`, ['--c' as string]: color }}><span>{an.score}</span></div>
        <div>
          <div className="seo-grade" style={{ color }}>{an.score >= 80 ? 'Ottimo' : an.score >= 55 ? 'Migliorabile' : 'Da ottimizzare'}</div>
          <div className="help">{an.words} parole · leggibilità {an.readability} · {an.internalLinks} link interni · {an.headings} sottotitoli</div>
        </div>
        <div className="seo-actions">
          <button type="button" className="btn btn-primary btn-sm" onClick={() => run({ fillMeta: true, links: true, overwriteSlug: false })}>✨ Ottimizza automaticamente</button>
          <button type="button" className="btn btn-outline btn-sm" onClick={() => run({ fillMeta: false, links: true, overwriteSlug: false })}>🔗 Aggiungi link interni</button>
          <button type="button" className="btn btn-outline btn-sm" onClick={() => { const r = restructureHtml(a.content, a.seo.focusKeyword ?? an.focusKeyword); if (!r.report.length) { toast.info('Il testo è già ben strutturato.'); return; } onPatch({ content: r.html }); toast.success(`Ristrutturato: ${r.report.join(', ')}.`); }}>¶ Ristruttura testo</button>
          {a.content.includes('class="auto-link"') && <button type="button" className="btn btn-ghost btn-sm" onClick={() => { onPatch({ content: stripAutoLinks(a.content) }); toast.info('Link automatici rimossi.'); }}>Rimuovi link automatici</button>}
        </div>
      </div>
      {a.seoReport && a.seoReport.length > 0 && (
        <details className="seo-report-box"><summary>Cosa ha fatto il sistema su questo articolo ({a.seoReport.length} interventi)</summary><ul className="seo-report">{a.seoReport.map((r, i) => <li key={i}>{r}</li>)}</ul></details>
      )}
      <div className="field" style={{ marginTop: 14 }}>
        <label>Parola chiave principale</label>
        <div style={{ display: 'flex', gap: 8 }}>
          <input className="input" value={a.seo.focusKeyword ?? ''} placeholder={an.focusKeyword || 'es. manovra 2027'} onChange={(e) => onPatch({ seo: { ...a.seo, focusKeyword: e.target.value } })} />
          {!a.seo.focusKeyword && an.focusKeyword && <button type="button" className="btn btn-outline btn-sm" onClick={() => onPatch({ seo: { ...a.seo, focusKeyword: an.focusKeyword } })}>Usa «{an.focusKeyword}»</button>}
        </div>
        {an.keywords.length > 0 && <div className="chips" style={{ marginTop: 6 }}>{an.keywords.slice(0, 6).map((k) => <button type="button" key={k} className="chip chip-btn" onClick={() => onPatch({ seo: { ...a.seo, focusKeyword: k } })}>{k}</button>)}</div>}
      </div>
      {an.suggestedTags.length > 0 && (
        <div className="field"><label>Tag suggeriti dal testo</label><div className="chips">{an.suggestedTags.map((t) => <button type="button" key={t.name} className="chip chip-btn" onClick={() => onAddTag(t.name)}>+ {t.name}{!t.id && <span className="help" style={{ marginLeft: 4 }}>(nuovo)</span>}</button>)}</div></div>
      )}
      <ul className="seo-checks">
        {list.map((c) => <li key={c.id} className={c.status}><span className="dot" />{c.label}{c.hint && <span className="help"> · {c.hint}</span>}</li>)}
        {problems.length === 0 && !showAll && <li className="ok"><span className="dot" />Tutti i controlli superati.</li>}
      </ul>
      <button type="button" className="btn btn-ghost btn-sm" onClick={() => setShowAll((v) => !v)}>{showAll ? 'Mostra solo i problemi' : `Mostra tutti i ${an.checks.length} controlli`}</button>
    </div>
  );
}
