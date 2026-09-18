import type { Metadata } from 'next';
import { listRecords } from '@/lib/records';
import { ContributionForm } from '@/components/site/contribution-form';

export const metadata: Metadata = { title: 'Banca delle competenze', description: 'Lettori che mettono a disposizione ciò che sanno, per aiutare la redazione a capire.' };
export const dynamic = 'force-dynamic';
export default async function SkillsPage() {
  const all = await listRecords<{ field: string }>('skill', { status: ['approved', 'pending'], limit: 1000 }); const fields = [...new Set(all.map((s) => s.data.field.toLowerCase().trim()))].slice(0, 40);
  return <div className="account" style={{ maxWidth: 720 }}><div className="account-card trust-page"><h1>Banca delle competenze</h1><p className="lead">Quando scriviamo di un ponte ci serve un ingegnere, quando scriviamo di una bolletta ci serve chi le legge per mestiere. Forse sei tu.</p><p className="help">{all.length === 0 ? 'Sii il primo.' : `${all.length} lettori si sono già resi disponibili: ${fields.join(', ')}.`} I nomi non vengono mai pubblicati; ti citiamo solo se lo vuoi.</p><ContributionForm kind="skill" open /></div></div>;
}
