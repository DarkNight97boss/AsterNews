'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { all, isRemote, isServerless, metaGet, seedDemo } from './db';
import { isInstalled, markInstalled } from './install';
import * as repo from './repo';
import * as x from './repo-extra';
import { buildSeed } from './seed';
import { hashPassword, passwordStrength } from './security';
import { startSession } from './auth';
import { DEFAULT_ANALYTICS, DEFAULT_NEWSLETTER, DEFAULT_PUSH, DEFAULT_STORAGE, SiteSettings, User } from './models';
import { sendMail } from './mailer';
import { slugify, uid } from './utils';
import type { ActionResult } from './actions';

export interface SetupInfo { installed: boolean; remote: boolean; serverless: boolean; latencyMs: number; dbError: string; existing: { articles: number; users: number; seeded: boolean }; envSiteUrl: string; hasMailEnv: boolean; hasBlob: boolean; hasSupabaseStorage: boolean }
export interface SetupPayload {
  site: { siteName: string; tagline: string; description: string; siteUrl: string; city: string; lat: number; lon: number; language: string };
  admin: { name: string; email: string; password: string; existingUserId?: string };
  theme: string;
  content: 'demo' | 'empty' | 'keep';
  services: { mailProvider: 'none' | 'resend' | 'brevo'; mailApiKey: string; mailFrom: string; mailFromName: string; analytics: boolean; push: boolean; storage: 'auto' | 'supabase' | 'vercel-blob' | 'db' };
}

export async function getSetupInfoAction(): Promise<SetupInfo> {
  let latencyMs = -1; let dbError = ''; let articles = 0; let users = 0; let seeded = false;
  try {
    const t0 = Date.now(); await all('SELECT 1'); latencyMs = Date.now() - t0;
    articles = await repo.countArticles({}); users = (await repo.listUsers()).length; seeded = !!(await metaGet('seeded'));
  } catch (e) { dbError = (e as Error).message; }
  return { installed: await isInstalled().catch(() => false), remote: isRemote(), serverless: isServerless(), latencyMs, dbError, existing: { articles, users, seeded }, envSiteUrl: process.env.NEXT_PUBLIC_SITE_URL && !process.env.NEXT_PUBLIC_SITE_URL.includes('[SENSITIVE]') ? process.env.NEXT_PUBLIC_SITE_URL : '', hasMailEnv: !!(process.env.RESEND_API_KEY || process.env.BREVO_API_KEY), hasBlob: !!process.env.BLOB_READ_WRITE_TOKEN, hasSupabaseStorage: !!(process.env.SUPABASE_URL && (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY)) };
}

export async function testMailAction(provider: 'resend' | 'brevo', apiKey: string, from: string, to: string): Promise<ActionResult> {
  const r = await sendMail({ to, subject: 'ASTER News: prova email', html: '<p>La configurazione email funziona.</p>', text: 'La configurazione email funziona.' }, { ...DEFAULT_NEWSLETTER, provider, apiKey, fromEmail: from });
  return r.ok ? { ok: true, message: `Email di prova inviata a ${to}.` } : { ok: false, message: r.error };
}

/** Completa l'installazione: impostazioni, amministratore con password, tema, contenuti, servizi. Poi accede e va in redazione. */
export async function installAction(p: SetupPayload): Promise<ActionResult> {
  if (await isInstalled()) return { ok: false, message: 'Il sito risulta già installato.' };
  if (!p.site.siteName.trim()) return { ok: false, message: 'Il nome della testata è obbligatorio.' };
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(p.admin.email.trim())) return { ok: false, message: 'Email amministratore non valida.' };
  const st = passwordStrength(p.admin.password); if (!st.ok) return { ok: false, message: st.message };
  const seed = buildSeed();
  const existingArticles = await repo.countArticles({});
  if (p.content === 'demo' && existingArticles === 0) await seedDemo();
  if (p.content === 'empty' && existingArticles === 0) {
    const stmts = repo.seedStatements({ ...seed, articles: [], comments: [], media: [], subscribers: [], activity: [], events: [], reports: [], users: [] });
    await repo.batchRaw(stmts);
  }
  // Impostazioni
  const base: SiteSettings = (await repo.getSettingsRow()) ?? seed.settings;
  const s: SiteSettings = {
    ...base, siteName: p.site.siteName.trim(), tagline: p.site.tagline.trim() || base.tagline, description: p.site.description.trim() || base.description, language: p.site.language || 'it',
    theme: { preset: p.theme || 'today' }, weatherCity: p.site.city || base.weatherCity, weatherLat: p.site.lat || base.weatherLat, weatherLon: p.site.lon || base.weatherLon,
    ticker: p.content === 'demo' ? base.ticker : [], homeSections: p.content === 'keep' ? base.homeSections : base.homeSections,
    newsletter: { ...DEFAULT_NEWSLETTER, provider: p.services.mailProvider, apiKey: p.services.mailApiKey, fromEmail: p.services.mailFrom, fromName: p.services.mailFromName || p.site.siteName.trim() },
    analytics: { ...DEFAULT_ANALYTICS, enabled: p.services.analytics }, push: { ...DEFAULT_PUSH, enabled: p.services.push }, storage: { ...DEFAULT_STORAGE, provider: p.services.storage },
  };
  await repo.saveSettingsRow(s);
  if (p.site.siteUrl.trim()) { const { metaSet } = await import('./db'); const { setSiteUrlOverride } = await import('./site-url'); const u = p.site.siteUrl.trim().replace(/\/+$/, ''); await metaSet('site_url', u); setSiteUrlOverride(u); }
  // Amministratore
  const email = p.admin.email.trim().toLowerCase();
  let admin = await repo.findUserByEmail(email);
  if (!admin && p.admin.existingUserId) admin = await repo.findUser(p.admin.existingUserId);
  const user: User = admin ? { ...admin, name: p.admin.name.trim() || admin.name, email, role: 'admin', active: true } : { id: uid('u'), name: p.admin.name.trim() || 'Amministratore', email, role: 'admin', avatar: `https://picsum.photos/seed/${slugify(p.admin.name || 'admin')}/200/200`, bio: '', active: true, createdAt: new Date().toISOString() };
  await repo.upsertUser(user);
  await x.setPassword(user.id, hashPassword(p.admin.password), false);
  await markInstalled();
  await repo.insertActivity({ id: uid('ac'), userId: user.id, action: 'ha completato l\'installazione di', target: s.siteName, createdAt: new Date().toISOString() });
  await startSession(user.id, 'staff');
  revalidatePath('/', 'layout');
  redirect('/admin?benvenuto=1');
}
