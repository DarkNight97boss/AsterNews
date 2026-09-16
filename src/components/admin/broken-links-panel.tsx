'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTransition } from 'react';
import { markBrokenFixedAction, runLinkCheckAction } from '@/lib/actions-system';
import type { BrokenLink } from '@/lib/models';
import { formatDate } from '@/lib/utils';
import { ActionButton } from '@/components/ui/action-button';
import { toast } from '@/components/ui/toaster';

/** Link esterni rotti trovati dal controllo notturno (o avviato a mano). */
export function BrokenLinksPanel({ links, titles }: { links: BrokenLink[]; titles: Record<string, string> }) {
  const router = useRouter(); const [pending, start] = useTransition();
  return (
    <div className="panel" style={{ marginTop: 20 }}><div className="panel-title">Link rotti negli articoli ({links.length}) <button className="btn btn-outline btn-sm" disabled={pending} onClick={() => start(async () => { const r = await runLinkCheckAction(); toast.info(r.message ?? ''); router.refresh(); })}>{pending ? 'Controllo in corso…' : 'Controlla ora'}</button></div>
      <p className="help" style={{ marginBottom: 10 }}>Ogni notte vengono provati i link esterni degli articoli più recenti. Correggi il link nell&apos;articolo, poi segna come risolto.</p>
      {links.length === 0 ? <p className="help">Nessun link rotto rilevato.</p> : (
        <div className="table-wrap"><table className="table"><thead><tr><th>Articolo</th><th>Link</th><th>Errore</th><th>Controllato</th><th></th></tr></thead><tbody>
          {links.map((l) => <tr key={l.id}><td className="t-title"><Link href={`/admin/articoli/${l.articleId}`}>{titles[l.articleId] ?? l.articleId}</Link></td><td><a href={l.url} target="_blank" rel="noopener noreferrer" style={{ wordBreak: 'break-all', fontSize: 12 }}>{l.url}</a></td><td><span className="badge badge-red">{l.status || 'nessuna risposta'}</span> <span className="help">{l.error}</span></td><td className="help">{formatDate(l.checkedAt)}</td><td><ActionButton className="btn btn-ghost btn-sm" action={() => markBrokenFixedAction(l.id)}>Risolto</ActionButton></td></tr>)}
        </tbody></table></div>
      )}
    </div>
  );
}
