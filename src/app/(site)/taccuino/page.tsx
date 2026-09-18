import type { Metadata } from 'next';
import { approvedOf } from '@/lib/commons-data';
import { ConfirmLog, ContributionForm } from '@/components/site/contribution-form';

export const metadata: Metadata = { title: 'Taccuino di quartiere', description: 'Il registro condiviso di lampioni, buche, aperture e chiusure, tenuto dai residenti e verificato a campione.' };
export const dynamic = 'force-dynamic';
export default async function LogPage({ searchParams }: PageProps<'/taccuino'>) {
  const what = String((await searchParams).cosa ?? ''); const all = await approvedOf('log', { limit: 300 }); const kinds = [...new Set(all.map((l) => l.data.what))]; const list = what ? all.filter((l) => l.data.what === what) : all;
  return <div className="account" style={{ maxWidth: 780 }}><div className="account-card trust-page"><h1>Taccuino di quartiere</h1><p className="lead">Le cose piccole che cambiano una via. Le annotano i residenti; la redazione ne verifica alcune sul posto, a campione, e le segna con ✔.</p><ContributionForm kind="log" />
    <p className="log-filter"><a href="/taccuino" aria-current={!what ? 'page' : undefined}>Tutto</a>{kinds.map((k) => <a key={k} href={`/taccuino?cosa=${encodeURIComponent(k)}`} aria-current={what === k ? 'page' : undefined}>{k}</a>)}</p>
    {list.length === 0 ? <p className="help">Il taccuino è ancora bianco.</p> : <ul className="trust-list">{list.map((l) => <li key={l.id}><time dateTime={l.createdAt}>{new Date(l.createdAt).toLocaleDateString('it-IT', { day: 'numeric', month: 'short' })}</time><div><b>{l.data.what}</b> · {l.data.where} {l.data.verified && <span className="verified" title="Verificato sul posto dalla redazione">✔ verificato</span>}<p>{l.data.text}</p><p className="help">{l.data.name || 'Un residente'} · <ConfirmLog id={l.id} count={Number(l.data.confirms ?? 0)} /></p></div></li>)}</ul>}</div></div>;
}
