import { redirect } from 'next/navigation';
import { requireUser } from '@/lib/auth';
import { can } from '@/lib/permissions';
import { getTags } from '@/lib/queries';
import { listCards } from '@/lib/civic-data';
import { CardsManager } from '@/components/admin/cards-manager';

export const dynamic = 'force-dynamic';
export default async function CardsAdminPage() {
  const me = await requireUser(); if (!can(me, 'article.publish')) redirect('/admin'); const [cards, tags] = await Promise.all([listCards(), getTags()]);
  return <><div className="page-title"><div><h1>Schede</h1><p>Candidati, delibere, ordine del giorno, seggi, cantieri, bandi, ZTL, scuole, negozi, persone, toponimi, documenti, figure, fiumi, punti utili. Ogni scheda ha una pagina pubblica in <a href="/schede" target="_blank">/schede</a>, una linea del tempo e impegni con scadenza.</p></div></div><CardsManager cards={cards} tags={tags.map((t) => ({ id: t.id, name: t.name }))} /></>;
}
