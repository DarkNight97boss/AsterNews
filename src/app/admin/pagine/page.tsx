import { redirect } from 'next/navigation';
import { PagesManager } from '@/components/admin/pages-manager';
import { requireUser } from '@/lib/auth';
import { getMedia } from '@/lib/queries';
import { listPages } from '@/lib/repo-extra3';

export default async function PagesAdmin() {
  const me = await requireUser(); if (!['admin', 'editor'].includes(me.role)) redirect('/admin');
  const [pages, media] = await Promise.all([listPages(false), getMedia(300)]);
  return <PagesManager pages={pages} meId={me.id} media={media} />;
}
