import type { Metadata } from 'next';
import { nowData } from '@/lib/actions-personal';
import { getSettings } from '@/lib/queries';

export const metadata: Metadata = { title: 'Adesso', description: 'Cosa sto leggendo, scrivendo, ascoltando in questo periodo.' };
export const dynamic = 'force-dynamic';
const ROWS: [string, string][] = [['place', '📍 Dove sono'], ['writing', '✍️ Sto scrivendo'], ['reading', '📖 Sto leggendo'], ['listening', '🎧 Sto ascoltando'], ['watching', '🎬 Sto guardando']];
export default async function NowPage() {
  const [now, s] = await Promise.all([nowData(), getSettings()]);
  return <div className="account" style={{ maxWidth: 620 }}><div className="account-card trust-page now-page"><h1>Adesso</h1>{!now ? <p className="help">Questa pagina non è ancora stata scritta.</p> : <><p className="help">Aggiornata il {new Date(now.updatedAt).toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' })}</p><dl>{ROWS.filter(([k]) => now[k]).map(([k, l]) => <div key={k}><dt>{l}</dt><dd>{now[k]}</dd></div>)}</dl>{now.note && <p className="lead">{now.note}</p>}</>}<p className="help">Una pagina «adesso» dice cosa occupa le giornate di chi scrive {s.siteName}: non è un profilo social, cambia quando cambia la vita.</p></div></div>;
}
