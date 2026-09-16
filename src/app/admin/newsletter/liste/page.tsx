import { redirect } from 'next/navigation';
import { NewsletterLists } from '@/components/admin/newsletter-lists';
import { requireUser } from '@/lib/auth';
import { can } from '@/lib/permissions';
import { getCategories, getZones } from '@/lib/queries';
import { listNewsletterSends } from '@/lib/repo-extra';
import { listCounts, listNewsletters } from '@/lib/repo-extra2';
import { ensureDefaultList } from '@/lib/newsletters';
import { mailConfigured } from '@/lib/mailer';

export default async function NewsletterListsPage() {
  const me = await requireUser(); if (!can(me, 'newsletter.send')) redirect('/admin');
  await ensureDefaultList();
  const [lists, counts, sends, cats, zones, mailOk] = await Promise.all([listNewsletters(), listCounts(), listNewsletterSends(40), getCategories(), getZones(), mailConfigured()]);
  return <NewsletterLists lists={lists} counts={counts} sends={sends} categories={cats.map((c) => ({ id: c.id, name: c.name }))} zones={zones.map((z) => ({ id: z.id, name: z.name }))} mailConfigured={mailOk} myEmail={me.email} />;
}
