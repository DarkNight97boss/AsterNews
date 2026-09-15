import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getSetupInfoAction } from '@/lib/actions-setup';
import { THEMES } from '@/lib/themes';
import { SetupWizard } from './setup-wizard';
import '../admin/admin.scss';

export const metadata: Metadata = { title: 'Installazione', robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

export default async function SetupPage() {
  const info = await getSetupInfoAction();
  if (info.installed) redirect('/admin');
  const themes = THEMES.map((t) => ({ id: t.id, name: t.name, description: t.description, swatch: t.swatch }));
  return <SetupWizard info={info} themes={themes} />;
}
