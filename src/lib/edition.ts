import 'server-only';
import { headers } from 'next/headers';
import { cache } from 'react';
import { Edition } from './models';
import { findEditionByDomain, findEditionBySlug } from './repo-extra';

/**
 * Edizione (multi-testata): stessa installazione, più siti. L'edizione viene scelta dal dominio della richiesta
 * (Impostazioni → Edizioni) oppure, in sviluppo, dal parametro cookie/header X-Edition. Nessuna edizione = sito principale.
 */
export const currentEdition = cache(async (): Promise<Edition | null> => {
  try {
    const h = await headers();
    const host = (h.get('x-forwarded-host') ?? h.get('host') ?? '').split(':')[0].toLowerCase();
    const forced = h.get('x-edition');
    if (forced) return (await findEditionBySlug(forced)) ?? null;
    if (!host || host === 'localhost') return null;
    return (await findEditionByDomain(host)) ?? (await findEditionByDomain(host.replace(/^www\./, ''))) ?? null;
  } catch { return null; }
});
/** Filtro da applicare alle liste pubbliche per l'edizione corrente. */
export async function editionFilter(): Promise<{ zoneId?: string; editionId?: string; categoryIds?: string[] }> {
  const e = await currentEdition();
  if (!e) return {};
  return { zoneId: e.zoneId || undefined, editionId: e.id, categoryIds: e.categoryIds.length ? e.categoryIds : undefined };
}
