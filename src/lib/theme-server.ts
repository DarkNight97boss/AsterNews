import 'server-only';
import { cookies } from 'next/headers';
import { cache } from 'react';
import { getCurrentUser } from './auth';
import { can } from './permissions';
import { getSettings } from './queries';
import { ResolvedTheme, ThemeSettings, resolveTheme } from './themes';

export const PREVIEW_COOKIE = 'theme_preview';

/** Tema attivo: quello delle impostazioni, oppure l'anteprima scelta da un amministratore (cookie). */
export const getActiveTheme = cache(async (): Promise<{ theme: ResolvedTheme; preview: boolean }> => {
  const settings = getSettings();
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
  return { theme: resolveTheme(settings.theme), preview: false };
});
