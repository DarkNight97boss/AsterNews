import 'server-only';
import { cookies } from 'next/headers';
import { cache } from 'react';
import { getCurrentUser } from './auth';
import { can } from './permissions';
import { getSettings } from './queries';
import { currentEdition } from './edition';
import { ResolvedTheme, ThemeSettings, resolveTheme } from './themes';
import { activeSeason } from './personal';

export const PREVIEW_COOKIE = 'theme_preview';

/** Tema attivo: quello delle impostazioni, oppure l'anteprima scelta da un amministratore (cookie). */
export const getActiveTheme = cache(async (): Promise<{ theme: ResolvedTheme; preview: boolean }> => {
  const settings = await getSettings();
  const raw = (await cookies()).get(PREVIEW_COOKIE)?.value;
  if (raw) {
    const me = await getCurrentUser();
    if (me && can(me, 'settings.manage')) {
      try {
        const s = JSON.parse(raw) as ThemeSettings;
        return { theme: resolveTheme(s), preview: true };
      } catch { /* cookie non valido */ }
    }
  }
  const edition = await currentEdition();
  // Sito a stagioni: nel periodo indicato cambiano i colori, poi tutto torna com'era senza toccare il tema salvato
  const season = activeSeason(settings.personal?.seasons, new Date().toISOString()); const tint = (t: ResolvedTheme): ResolvedTheme => (season ? { ...t, ...(season.brand ? { brand: season.brand, brandDark: season.brand } : {}), ...(season.accent ? { accent: season.accent } : {}) } : t);
  return { theme: tint(resolveTheme(edition && Object.keys(edition.theme).length ? { ...settings.theme, ...edition.theme } as ThemeSettings : settings.theme)), preview: false };
});
