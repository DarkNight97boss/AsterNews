import 'server-only';
import type { Article, User } from './models';
import { DEFAULT_EXTENSIONS } from './models';
import { getSettings } from './queries';
import { EXTENSIONS } from '../extensions';

/**
 * Sistema di estensioni: ogni estensione è un modulo in `src/extensions/` che dichiara metadati, campi di configurazione
 * e hook. Le estensioni si attivano da Sistema → Estensioni; la configurazione è salvata nelle impostazioni.
 *
 * Hook disponibili:
 *  - beforeArticleSave(article, ctx) → può modificare l'articolo o lanciare un errore per bloccare il salvataggio
 *  - afterArticlePublish(article, ctx) → effetti collaterali alla pubblicazione (webhook, notifiche…)
 *  - filterContent(html, article) → trasforma l'HTML prima del salvataggio (firme, sostituzioni)
 *  - dailyJob(ctx) → eseguito dal cron giornaliero
 */
export interface ExtensionContext { user?: User; config: Record<string, string>; siteName: string; isNew: boolean; wasPublished: boolean }
export interface ExtensionField { key: string; label: string; type: 'text' | 'textarea' | 'url' | 'number' | 'select'; placeholder?: string; options?: string[]; help?: string }
export interface Extension {
  id: string; name: string; description: string; version: string; author?: string; fields?: ExtensionField[];
  beforeArticleSave?: (a: Article, ctx: ExtensionContext) => Promise<Article | void> | Article | void;
  afterArticlePublish?: (a: Article, ctx: ExtensionContext) => Promise<void> | void;
  filterContent?: (html: string, a: Article, ctx: ExtensionContext) => Promise<string> | string;
  dailyJob?: (ctx: ExtensionContext) => Promise<string> | string;
}

export async function enabledExtensions(): Promise<{ ext: Extension; config: Record<string, string> }[]> {
  const s = { ...DEFAULT_EXTENSIONS, ...((await getSettings()).extensions ?? {}) };
  return EXTENSIONS.filter((e) => s.enabled.includes(e.id)).map((ext) => ({ ext, config: s.config[ext.id] ?? {} }));
}
export function allExtensions(): Extension[] { return EXTENSIONS; }

export async function runBeforeSave(a: Article, meta: { user?: User; isNew: boolean; wasPublished: boolean }): Promise<Article> {
  const siteName = (await getSettings()).siteName; let cur = a;
  for (const { ext, config } of await enabledExtensions()) {
    const ctx: ExtensionContext = { ...meta, config, siteName };
    if (ext.filterContent) cur = { ...cur, content: await ext.filterContent(cur.content, cur, ctx) };
    if (ext.beforeArticleSave) { const r = await ext.beforeArticleSave(cur, ctx); if (r) cur = r; }
  }
  return cur;
}
export async function runAfterPublish(a: Article, meta: { user?: User; isNew: boolean; wasPublished: boolean }): Promise<void> {
  const siteName = (await getSettings()).siteName;
  for (const { ext, config } of await enabledExtensions()) { try { await ext.afterArticlePublish?.(a, { ...meta, config, siteName }); } catch (e) { console.error(`[estensione ${ext.id}]`, e); } }
}
export async function runDailyExtensions(): Promise<Record<string, string>> {
  const out: Record<string, string> = {}; const siteName = (await getSettings()).siteName;
  for (const { ext, config } of await enabledExtensions()) { if (!ext.dailyJob) continue; try { out[ext.id] = await ext.dailyJob({ config, siteName, isNew: false, wasPublished: false }); } catch (e) { out[ext.id] = 'errore: ' + (e as Error).message; } }
  return out;
}
