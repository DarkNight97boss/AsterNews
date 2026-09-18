import Link from 'next/link';
import { getCurrentReader } from '@/lib/auth';
import { getSettings } from '@/lib/queries';
import { findCircleInvite } from '@/lib/repo-extra3';
import { AcceptInvite } from '@/components/site/accept-invite';

export const metadata = { title: 'Invito', robots: { index: false } };
export const dynamic = 'force-dynamic';
export default async function InvitePage({ searchParams }: PageProps<'/account/invito'>) {
  const sp = await searchParams; const k = typeof sp.k === 'string' ? sp.k : ''; const [reader, inv, s] = await Promise.all([getCurrentReader(), k ? findCircleInvite(k) : Promise.resolve(undefined), getSettings()]);
  const valid = !!inv && !inv.revoked && inv.uses < inv.maxUses; const name = (s.circles ?? []).find((c) => c.id === inv?.circleId)?.name ?? '';
  return <div className="account" style={{ maxWidth: 520 }}><div className="account-card"><h1>{valid ? `Sei invitato nella cerchia «${name}»` : 'Invito non valido'}</h1>{!valid ? <p>Questa chiave è scaduta o è stata revocata. Chiedine una nuova a chi te l&apos;ha mandata.</p> : reader ? <AcceptInvite token={k} /> : <><p>Per entrare serve un account lettore: bastano un&apos;email e pochi secondi. Dopo l&apos;accesso torna su questo link.</p><Link className="btn btn-primary" href={`/account?redirect=${encodeURIComponent(`/account/invito?k=${k}`)}`}>Accedi o registrati</Link></>}</div></div>;
}
