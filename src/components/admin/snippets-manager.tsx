'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { deleteSnippetAction, saveSnippetAction } from '@/lib/actions-pages';
import type { Snippet } from '@/lib/models';
import { formatDate } from '@/lib/utils';
import { ActionButton } from '@/components/ui/action-button';
import { toast } from '@/components/ui/toaster';
import { BlockEditor } from './block-editor';

/** Blocchi riutilizzabili e sincronizzati: si inseriscono negli articoli e si aggiornano ovunque cambiando qui. */
export function SnippetsManager({ snippets }: { snippets: Snippet[] }) {
  const router = useRouter(); const [s, setS] = useState<Snippet | null>(null); const [pending, start] = useTransition();
  if (s) return (
    <>
      <div className="page-title"><div><h1>{s.id ? 'Modifica blocco' : 'Nuovo blocco riutilizzabile'}</h1><p>Compare in ogni articolo che lo usa, sempre nella versione più recente.</p></div><div className="actions"><button className="btn btn-ghost" onClick={() => setS(null)}>Annulla</button><button className="btn btn-primary" disabled={pending} onClick={() => start(async () => { const r = await saveSnippetAction(s); (r.ok ? toast.success : toast.error)(r.message ?? ''); if (r.ok) { setS(null); router.refresh(); } })}>Salva</button></div></div>
      <div className="panel"><div className="field"><label>Nome (interno)</label><input className="input" value={s.name} onChange={(e) => setS({ ...s, name: e.target.value })} placeholder="es. Disclaimer sanità, Box Chi siamo, Firma redazione" /></div><BlockEditor value={s.html} onChange={(h) => setS({ ...s, html: h })} /></div>
    </>
  );
  return (
    <>
      <div className="page-title"><div><h1>Blocchi riutilizzabili</h1><p>Riquadri, disclaimer e firme condivisi tra gli articoli: modifichi qui, cambia ovunque.</p></div><div className="actions"><button className="btn btn-primary" onClick={() => setS({ id: '', name: '', html: '<p></p>', updatedAt: '' })}>+ Nuovo blocco</button></div></div>
      <div className="table-wrap"><table className="table"><thead><tr><th>Nome</th><th>Anteprima</th><th>Aggiornato</th><th></th></tr></thead><tbody>
        {snippets.map((x) => <tr key={x.id}><td className="t-title"><a href="#" onClick={(e) => { e.preventDefault(); setS({ ...x }); }}>{x.name}</a></td><td className="help" style={{ maxWidth: 420 }}>{x.html.replace(/<[^>]+>/g, ' ').slice(0, 120)}</td><td className="help">{formatDate(x.updatedAt)}</td><td><div className="t-actions"><button className="icon-btn" onClick={() => setS({ ...x })}>✎</button><ActionButton className="icon-btn danger" confirm={`Eliminare «${x.name}»? Sparirà dagli articoli che lo usano.`} action={() => deleteSnippetAction(x.id)}>🗑</ActionButton></div></td></tr>)}
        {snippets.length === 0 && <tr><td colSpan={4} className="help">Nessun blocco. Nell&apos;editor, inserisci «Blocco riutilizzabile» per usarli.</td></tr>}
      </tbody></table></div>
    </>
  );
}
