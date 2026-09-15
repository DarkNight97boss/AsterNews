import { redirect } from 'next/navigation';
import { NewsletterAdmin } from '@/components/admin/newsletter-admin';
import { requireUser } from '@/lib/auth';
import { can } from '@/lib/permissions';
import { getSettings } from '@/lib/queries';
import { listSubscribers } from '@/lib/repo';
import { countPushSubscriptions, listNewsletterSends } from '@/lib/repo-extra';
import { mailConfigured } from '@/lib/mailer';
import { DEFAULT_NEWSLETTER } from '@/lib/models';

export default async function NewsletterPage() {
  const me = await requireUser();
  if (!can(me, 'comment.moderate')) redirect('/admin');
  const [subs, sends, push, mailOk, s] = await Promise.all([listSubscribers(undefined, 5000), listNewsletterSends(20), countPushSubscriptions(), mailConfigured(), getSettings()]);
  const nl = { ...DEFAULT_NEWSLETTER, ...(s.newsletter ?? {}) };
  return <NewsletterAdmin subscribers={subs} sends={sends} pushCount={push} mailConfigured={mailOk} digest={{ enabled: nl.digestEnabled, hour: nl.digestHour, provider: nl.provider }} canSend={can(me, 'newsletter.send')} myEmail={me.email} />;
}
