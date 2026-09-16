import { ContactsManager } from '@/components/admin/contacts-manager';
import { requireUser } from '@/lib/auth';
import { listContacts } from '@/lib/repo-extra3';

export default async function ContactsPage({ searchParams }: PageProps<'/admin/contatti'>) {
  const me = await requireUser(); const sp = await searchParams; const q = typeof sp.q === 'string' ? sp.q : '';
  return <ContactsManager contacts={await listContacts(q, 300)} query={q} meId={me.id} />;
}
