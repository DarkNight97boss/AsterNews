import { getSettings } from '@/lib/queries';
import { DEFAULT_DONATIONS } from '@/lib/models';
import { DonateForm } from './donate-form';

/** Riquadro "Sostienici": compare in colonna e nella pagina /sostieni se le donazioni sono attive. */
export async function DonateWidget({ full = false }: { full?: boolean }) {
  const s = await getSettings(); const d = { ...DEFAULT_DONATIONS, ...(s.donations ?? {}) };
  if (!d.enabled) return null;
  return <div className={`donate-box ${full ? 'full' : ''}`}>{!full && <><h3>{d.title}</h3><p>{d.text}</p></>}<DonateForm amounts={d.amounts} full={full} /></div>;
}
