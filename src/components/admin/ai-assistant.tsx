'use client';

import { useEffect, useState, useTransition } from 'react';
import { aiAltTextAction, aiFactCheckAction, aiRewriteAction, aiStatusAction, aiSummaryAction, aiTagsAction, aiTitlesAction } from '@/lib/actions-ai';
import type { Article } from '@/lib/models';
import { toast } from '@/components/ui/toaster';

interface Props { article: Article; onPatch: (p: Partial<Article>) => void; onAddTag: (name: string) => void; categories: { id: string; name: string }[] }

export function AiAssistant({ article: a, onPatch, onAddTag, categories }: Props) {
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [pending, start] = useTransition();
  const [titles, setTitles] = useState<{ label: string; title: string }[]>([]);
  const [facts, setFacts] = useState<{ claim: string; note: string; severity: string }[]>([]);
  const [raw, setRaw] = useState(''); const [mode, setMode] = useState<'testata' | 'breve' | 'lungo' | 'semplice' | 'traduci'>('testata'); const [rewritten, setRewritten] = useState('');
  useEffect(() => { aiStatusAction().then(setEnabled); }, []);
  if (enabled === null) return null;
  if (!enabled) return <div className="panel"><div className="panel-title">Assistente AI</div><p className="help">Non attivo. Inserisci la chiave API in Impostazioni → Assistente AI per avere titoli, sommari, tag, alt text, riscritture e verifica dei fatti.</p></div>;
  const run = <T,>(fn: () => Promise<{ ok: boolean; message?: string; data?: T }>, then: (d: T) => void) => start(async () => { const r = await fn(); if (!r.ok || r.data === undefined) { toast.error(r.message ?? 'Errore'); return; } then(r.data); });
  return (
    <div className="panel ai-panel"><div className="panel-title">✨ Assistente AI {pending && <span className="help">sto lavorando…</span>}</div>
      <div className="ai-actions">
        <button className="btn btn-outline btn-sm" disabled={pending || !a.content} onClick={() => run(() => aiTitlesAction(a.title, a.content), setTitles)}>Titoli alternativi</button>
        <button className="btn btn-outline btn-sm" disabled={pending || !a.content} onClick={() => run(() => aiSummaryAction(a.title, a.content), (d) => { onPatch({ subtitle: a.subtitle || d.subtitle, excerpt: d.excerpt, seo: { ...a.seo, description: a.seo.description || d.seoDescription } }); toast.success('Sommario, estratto e meta description compilati.'); })}>Sommario ed estratto</button>
        <button className="btn btn-outline btn-sm" disabled={pending || !a.content} onClick={() => run(() => aiTagsAction(a.title, a.content), (d) => { d.tags.forEach((t) => onAddTag(t)); const cat = categories.find((c) => c.name.toLowerCase() === d.category.toLowerCase()); onPatch({ kicker: a.kicker || d.kicker, ...(cat && !a.categoryId ? { categoryId: cat.id } : {}) }); toast.success(`${d.tags.length} tag proposti.`); })}>Tag e occhiello</button>
        <button className="btn btn-outline btn-sm" disabled={pending || !a.coverImage} onClick={() => run(() => aiAltTextAction(a.coverImage, a.title), (alt) => { onPatch({ coverCaption: a.coverCaption || alt }); toast.success(`Alt proposto: ${alt}`); })}>Alt della copertina</button>
        <button className="btn btn-outline btn-sm" disabled={pending || !a.content} onClick={() => run(() => aiFactCheckAction(a.content), setFacts)}>Da verificare</button>
      </div>
      {titles.length > 0 && <ul className="ai-list">{titles.map((t) => <li key={t.label}><span className="badge badge-gray">{t.label}</span> {t.title} <button className="btn btn-ghost btn-sm" onClick={() => { onPatch({ title: t.title }); setTitles([]); }}>Usa</button></li>)}</ul>}
      {facts.length > 0 && <ul className="ai-list">{facts.map((f, i) => <li key={i}><span className={`badge ${f.severity === 'warn' ? 'badge-red' : 'badge-gray'}`}>{f.severity === 'warn' ? 'attenzione' : 'info'}</span> <b>«{f.claim}»</b> — {f.note}</li>)}</ul>}
      <details style={{ marginTop: 10 }}><summary className="help" style={{ cursor: 'pointer' }}>Riscrivi un comunicato o un testo grezzo nello stile della testata</summary>
        <textarea className="textarea" style={{ minHeight: 100, marginTop: 8 }} value={raw} onChange={(e) => setRaw(e.target.value)} placeholder="Incolla qui il comunicato stampa, gli appunti o il testo in altra lingua…" />
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 6, flexWrap: 'wrap' }}>
          <select className="select" style={{ width: 'auto' }} value={mode} onChange={(e) => setMode(e.target.value as typeof mode)}><option value="testata">Articolo nello stile della testata</option><option value="breve">Notizia breve</option><option value="lungo">Articolo ampio</option><option value="semplice">Italiano semplice</option><option value="traduci">Traduci in italiano</option></select>
          <button className="btn btn-dark btn-sm" disabled={pending || raw.trim().length < 40} onClick={() => run(() => aiRewriteAction(raw, mode), setRewritten)}>Riscrivi</button>
          {rewritten && <><button className="btn btn-primary btn-sm" onClick={() => { onPatch({ content: rewritten }); setRewritten(''); toast.success('Testo inserito nell\'articolo.'); }}>Sostituisci il testo</button><button className="btn btn-outline btn-sm" onClick={() => { onPatch({ content: a.content + '\n' + rewritten }); setRewritten(''); }}>Aggiungi in coda</button></>}
        </div>
        {rewritten && <div className="article-body ai-preview" dangerouslySetInnerHTML={{ __html: rewritten }} />}
      </details>
      <p className="help" style={{ marginTop: 8 }}>L&apos;assistente propone, il redattore decide: niente viene pubblicato senza conferma. I testi non vengono usati per addestrare modelli.</p>
    </div>
  );
}
