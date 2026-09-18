import { redirect } from 'next/navigation';
import { requireUser } from '@/lib/auth';
import { can } from '@/lib/permissions';
import { getSettings } from '@/lib/queries';
import { consentStats } from '@/lib/repo-extra3';
import { PrivacyForm } from '@/components/admin/privacy-form';

export default async function PrivacyPage() {
  const me = await requireUser(); if (!can(me, 'settings.manage')) redirect('/admin');
  const [s, st] = await Promise.all([getSettings(), consentStats()]);
  return (
    <>
      <div className="page-title"><div><h1>Privacy e consensi</h1><p>Registro dei consensi cookie (chi ha scelto cosa e quando, senza dati identificativi), versione dell&apos;informativa e strumenti GDPR.</p></div><div className="actions"><a className="btn btn-outline" href="/api/backup/consents">Esporta registro CSV</a></div></div>
      <div className="stats"><div className="stat" style={{ ['--stat-color' as string]: '#0b7a4b' }}><div className="stat-label">Accettano tutto (30 gg)</div><div className="stat-value">{st.all}</div></div><div className="stat" style={{ ['--stat-color' as string]: '#8a8a8a' }}><div className="stat-label">Solo necessari (30 gg)</div><div className="stat-value">{st.necessary}</div></div><div className="stat" style={{ ['--stat-color' as string]: '#1f4e9c' }}><div className="stat-label">Totale registrati</div><div className="stat-value">{st.total}</div></div></div>
      <div className="admin-grid-2">
        <PrivacyForm version={s.privacy?.policyVersion ?? 1} geo={s.privacy?.geoLookup ?? true} dpa={s.privacy?.dpaNote ?? ''} />
        <div className="panel"><div className="panel-title">Strumenti GDPR già attivi</div><ul className="activity"><li><span>📤</span><div><b>Esportazione dati lettore</b>: dal proprio account (Account → Esporta i miei dati).</div></li><li><span>🗑</span><div><b>Cancellazione account</b>: dal proprio account, con anonimizzazione dei commenti.</div></li><li><span>🍪</span><div><b>Consensi per categoria</b>: gli script di pubblicità e misurazione esterna si caricano solo con «Accetta»; le statistiche interne non usano cookie.</div></li><li><span>📄</span><div><b>DPA</b> (accordo sul trattamento con i fornitori: Vercel, Supabase, Stripe, Resend/Brevo): annota qui riferimenti e date di firma.</div></li></ul></div>
      </div>
    </>
  );
}
