import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getSetupInfoAction } from '@/lib/actions-setup';
import { isInstalled } from '@/lib/install';
import { THEMES } from '@/lib/themes';
import { SetupWizard } from './setup-wizard';
import '../admin/admin.scss';

export const metadata: Metadata = { title: 'Installazione', robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

export default async function SetupPage() {
  // Il setup esiste solo finché il sito non è installato (o è disattivato): dopo, l'azione risponde solo agli amministratori
  if (process.env.SETUP_DISABLED || (await isInstalled().catch(() => false))) redirect('/admin');
  const info = await getSetupInfoAction();
  const themes = THEMES.map((t) => ({ id: t.id, name: t.name, description: t.description, swatch: t.swatch }));
  return <SetupWizard info={info} themes={themes} />;
}
