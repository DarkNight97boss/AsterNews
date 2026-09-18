import { redirect } from 'next/navigation';
import { SnippetsManager } from '@/components/admin/snippets-manager';
import { requireUser } from '@/lib/auth';
import { listSnippets } from '@/lib/repo-extra3';
import { listRecords } from '@/lib/records';

export default async function SnippetsPage() {
  const me = await requireUser(); if (!['admin', 'editor'].includes(me.role)) redirect('/admin');
  const [snippets, history] = await Promise.all([listSnippets(), listRecords<{ html: string; by: string; at: string }>('snippet-history', { limit: 30 })]);
  return <><SnippetsManager snippets={snippets} />{history.length > 0 && <div className="panel"><div className="panel-title">Storico dei paragrafi condivisi</div><p className="help">Ogni modifica a un blocco cambia tutti gli articoli che lo usano: qui restano le versioni precedenti.</p>{history.map((h) => <details key={h.id} className="snippet-history"><summary>{snippets.find((x) => x.id === h.ref)?.name ?? h.ref} · versione sostituita il {new Date(h.createdAt).toLocaleString('it-IT', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })} da {h.data.by}</summary><div className="help" dangerouslySetInnerHTML={{ __html: h.data.html }} /></details>)}</div>}</>;
}
