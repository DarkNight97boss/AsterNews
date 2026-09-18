import { redirect } from 'next/navigation';
import { requireUser } from '@/lib/auth';
import { can } from '@/lib/permissions';
import { countRedirects } from '@/lib/repo-extra';
import { countPublished } from '@/lib/queries';

export const dynamic = 'force-dynamic';
/** Uscita pulita: tutto quello che serve per portare il sito altrove, senza chiedere il permesso a nessuno. */
export default async function ExitPage() {
  const me = await requireUser(); if (!can(me, 'settings.manage')) redirect('/admin'); const [n, r] = await Promise.all([countPublished({}), countRedirects()]);
  const Item = ({ href, title, text }: { href: string; title: string; text: string }) => <li><a className="btn btn-outline btn-sm" href={href}>{title}</a><p className="help">{text}</p></li>;
  return (
    <>
      <div className="page-title"><div><h1>Uscita pulita</h1><p>I contenuti sono tuoi. Se un giorno vorrai un altro sistema, da qui porti via tutto: {n} articoli, {r} redirect, immagini, lettori. La fiducia si costruisce rendendo facile andarsene.</p></div></div>
      <div className="admin-grid-2">
        <div className="panel"><div className="panel-title">1 · I contenuti</div><ul className="exit-list"><Item href="/api/backup/wxr" title="WordPress (WXR)" text="Il formato che importano WordPress, Ghost, Substack e quasi tutti gli altri: articoli, sezioni, tag, autori, date." /><Item href="/api/export/statico" title="Sito statico (ZIP)" text="Pagine HTML semplici più un file JSON: si apre senza server, va bene anche come archivio definitivo." /><Item href="/admin/backup" title="Backup completo (JSON)" text="Tutte le tabelle, comprese impostazioni, commenti, iscritti alla newsletter e lettori. Dalla pagina Backup." /><Item href={`/api/export/libro?dal=2000-01-01&formato=epub`} title="Libro (EPUB)" text="Gli ultimi articoli impaginati come un libro." /></ul></div>
        <div className="panel"><div className="panel-title">2 · Gli indirizzi, perché nessun link si rompa</div><p className="help">Scegli il formato del server di arrivo. Lo schema predefinito del nuovo indirizzo è <code>/%slug%/</code>; si cambia aggiungendo <code>&amp;schema=/%anno%/%mese%/%slug%/</code> (anche <code>%sezione%</code>).</p><ul className="exit-list"><Item href="/api/export/redirects?formato=wordpress" title="WordPress (plugin Redirection)" text="CSV da importare in Strumenti → Redirection." /><Item href="/api/export/redirects?formato=netlify" title="Netlify / Cloudflare Pages" text="File _redirects pronto." /><Item href="/api/export/redirects?formato=nginx" title="nginx" text="Regole rewrite … permanent." /><Item href="/api/export/redirects?formato=apache" title="Apache (.htaccess)" text="Righe Redirect 301." /><Item href="/api/export/redirects?formato=csv" title="CSV semplice" text="Due colonne, da → a, per qualunque altro sistema." /></ul></div>
      </div>
      <div className="panel"><div className="panel-title">3 · Le persone</div><p>Iscritti alla newsletter e lettori registrati si esportano in CSV dalle rispettive pagine (<a href="/admin/newsletter">Newsletter</a>, <a href="/admin/lettori">Lettori</a>). Le password non si possono esportare in chiaro, per fortuna: nel nuovo sistema i lettori useranno «password dimenticata». Ricordati di avvisarli prima: è un loro diritto sapere dove vanno i loro dati.</p></div>
    </>
  );
}
