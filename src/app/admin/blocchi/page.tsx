import { redirect } from 'next/navigation';
import { SnippetsManager } from '@/components/admin/snippets-manager';
import { requireUser } from '@/lib/auth';
import { listSnippets } from '@/lib/repo-extra3';

export default async function SnippetsPage() {
  const me = await requireUser(); if (!['admin', 'editor'].includes(me.role)) redirect('/admin');
  return <SnippetsManager snippets={await listSnippets()} />;
}
