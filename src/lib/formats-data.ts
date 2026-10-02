import 'server-only';
import { addRecord, listRecords } from './records';
import { radioScript } from './formats';
import { buildEpub } from './book';
import { publicContent } from './content-render';

/** La radio del mattino: cinque minuti di notizie con voce sintetica, salvati come episodio (anche nel feed podcast e nella segreteria telefonica). */
export async function makeRadio(): Promise<string> {
  const { aiSettings } = await import('./ai'); const s = await aiSettings(); if ((s.ttsProvider ?? 'none') === 'none' || !s.ttsKey) return ''; const today = new Date().toISOString().slice(0, 10); if ((await listRecords('radio', { limit: 1 }))[0]?.data.date === today) return '';
  const { getPublished, getSettings } = await import('./queries'); const { synthesize } = await import('./tts'); const { uploadRaw } = await import('./storage'); const site = await getSettings(); const arts = (await getPublished(8)).filter((a) => !a.premium);
  if (arts.length < 2) return ''; const text = radioScript(site.siteName, new Date().toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' }), arts.map((a) => ({ title: a.title, excerpt: a.excerpt || a.subtitle })));
  const buf = await synthesize(text); const url = await uploadRaw(buf, `audio/radio-${today}.mp3`, 'audio/mpeg'); await addRecord('radio', { id: `radio_${today}`, status: 'approved', data: { url, date: today, title: `Il notiziario del ${new Date().toLocaleDateString('it-IT', { day: 'numeric', month: 'long' })}`, words: text.split(' ').length } }); return 'radio del mattino registrata';
}
/** Edizione per e-reader: ogni lunedì l'EPUB della settimana agli iscritti, in allegato. */
export async function sendEreaderEdition(force = false): Promise<string> {
  if (!force && new Date().getDay() !== 1) return ''; const { mailConfigured, sendMail, mailLayout } = await import('./mailer'); if (!(await mailConfigured())) return ''; const subs = await listRecords<{ email: string; device: string }>('ereader', { status: 'approved', limit: 5000 }); if (!subs.length) return '';
  const { listArticles } = await import('./repo'); const { getSettings, getUsers } = await import('./queries'); const [site, users] = await Promise.all([getSettings(), getUsers()]); const from = new Date(Date.now() - 7 * 86_400_000).toISOString(); const arts = (await listArticles({ status: 'published', from }, 'published', 40)).filter((a) => !a.premium).reverse(); if (!arts.length) return '';
  const chapters = await Promise.all(arts.map(async (a) => ({ title: a.title, date: new Date(a.publishedAt!).toLocaleDateString('it-IT', { day: 'numeric', month: 'long' }), html: await publicContent(a.content) }))); const week = new Date().toISOString().slice(0, 10); const author = [...new Set(arts.map((a) => users.find((u) => u.id === a.authorId)?.name).filter(Boolean))].slice(0, 3).join(', ') || site.siteName;
  const epub = Buffer.from(buildEpub({ title: `${site.siteName} · settimana del ${week}`, author, id: `urn:aster:settimana:${week}`, date: new Date().toISOString() }, chapters)).toString('base64'); let sent = 0;
  for (const sub of subs) { const r = await sendMail({ to: sub.data.email, subject: `${site.siteName} · la settimana in un libro`, html: mailLayout(site.siteName, 'L\'edizione della settimana', `<p>In allegato ${arts.length} articoli della settimana, impaginati per il tuo ${sub.data.device}.</p>`), attachments: [{ filename: `${site.siteName.replace(/[^\w]+/g, '-')}-${week}.epub`, content: epub, type: 'application/epub+zip' }] }); if (r.ok) sent++; }
  return sent ? `${sent} edizioni e-reader inviate` : '';
}
export const latestRadio = async () => listRecords<{ url: string; date: string; title: string; words: number }>('radio', { limit: 30 });
export const listVignette = async () => listRecords<{ image: string; caption: string; articleId: string; author: string }>('vignetta', { limit: 100 });
