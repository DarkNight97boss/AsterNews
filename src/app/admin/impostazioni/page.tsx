import { redirect } from 'next/navigation';
import { SettingsForm } from '@/components/admin/settings-form';
import { requireUser } from '@/lib/auth';
import { can } from '@/lib/permissions';
import { getCategories, getSettings } from '@/lib/queries';

export default async function SettingsPage() {
  const me = await requireUser();
  if (!can(me, 'settings.manage')) redirect('/admin');
  const [s, categories] = await Promise.all([getSettings(), getCategories()]);
  const env = { mailEnv: !!(process.env.RESEND_API_KEY || process.env.BREVO_API_KEY), blob: !!process.env.BLOB_READ_WRITE_TOKEN, supabaseStorage: !!((process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL) && (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY)), cronSecret: !!process.env.CRON_SECRET, stripeEnv: !!process.env.STRIPE_SECRET_KEY };
  return <SettingsForm key={JSON.stringify(s)} initial={s} categories={categories} env={env} />;
}
