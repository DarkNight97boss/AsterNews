import 'server-only';
import { cookies } from 'next/headers';
import { cache } from 'react';
import { getCurrentUser } from './auth';
import { can } from './permissions';
import { getSettings } from './queries';
import { currentEdition } from './edition';
import { ResolvedTheme, ThemeSettings, resolveTheme } from './themes';

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
  return { theme: resolveTheme(edition && Object.keys(edition.theme).length ? { ...settings.theme, ...edition.theme } as ThemeSettings : settings.theme), preview: false };
});
