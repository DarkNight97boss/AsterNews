import 'server-only';
import { Ad, DEFAULT_ADS, AdsSettings } from './models';
import { getSettings } from './queries';
import { activeAdsForSlot } from './repo-extra2';

export async function adsSettings(): Promise<AdsSettings> { return { ...DEFAULT_ADS, ...((await getSettings()).ads ?? {}) }; }
/** Sceglie un annuncio attivo per lo slot, pesato (weight) e casuale. Null se nessuno o pubblicità disattivata. */
export async function pickAd(slot: string): Promise<{ ad: Ad | null; settings: AdsSettings }> {
  const settings = await adsSettings();
  if (!settings.enabled) return { ad: null, settings };
  const list = await activeAdsForSlot(slot);
  if (!list.length) return { ad: null, settings };
  const total = list.reduce((a, b) => a + Math.max(1, b.weight), 0);
  let r = Math.random() * total;
  for (const ad of list) { r -= Math.max(1, ad.weight); if (r <= 0) return { ad, settings }; }
  return { ad: list[list.length - 1], settings };
}
