import { getSettings } from '@/lib/queries';

/** «Sezione sostenuta da»: nome in testata, contratto pubblico, nessun potere sui contenuti. */
export async function SectionSponsor({ categoryId }: { categoryId: string }) {
  const sp = (await getSettings()).sponsors?.[categoryId]; if (!sp || (sp.until && sp.until < new Date().toISOString().slice(0, 10))) return null;
  return <p className="section-sponsor">{sp.logo && <img src={sp.logo} alt="" height={22} />}Sezione sostenuta da {sp.url ? <a href={sp.url} rel="noopener sponsored" target="_blank">{sp.name}</a> : <b>{sp.name}</b>} · <a href="/sponsor">cosa significa</a></p>;
}
