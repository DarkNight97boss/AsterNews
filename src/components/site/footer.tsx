import Link from 'next/link';
import { getCategories, getSettings } from '@/lib/queries';
import { listPages } from '@/lib/repo-extra3';
import { DEFAULT_MENUS } from '@/lib/models';

export async function Footer() {
  const [s, cats, pages] = await Promise.all([getSettings(), getCategories(), listPages(true)]);
  const menus = { ...DEFAULT_MENUS, ...(s.menus ?? {}) };
  const footerLinks = menus.footer.length ? menus.footer.map((m) => ({ id: m.id, label: m.label, url: m.url })) : pages.map((p) => ({ id: p.id, label: p.title, url: `/${p.slug}` }));
  return (
    <footer className="site-footer">
      <div className="container">
        <div className="footer-grid">
          <div>
            <Link href="/" className="logo logo-sm">Aster<small>news</small></Link>
            <p style={{ marginTop: 12 }}>{s.description}</p>
            <p>{s.footerText}</p>
          </div>
          <div><h4>Sezioni</h4><ul>{cats.map((c) => <li key={c.id}><Link href={`/${c.slug}`}>{c.name}</Link></li>)}</ul></div>
          <div><h4>Servizi</h4><ul><li><Link href="/notizie">Tutte le notizie</Link></li><li><Link href="/eventi">Cosa fare in città</Link></li><li><Link href="/zone">Zone</Link></li><li><Link href="/meteo">Meteo</Link></li><li><Link href="/segnalazioni">Segnalazioni</Link></li><li><Link href="/video">Video</Link></li><li><Link href="/foto">Foto</Link></li><li><a href="/feed.xml">Feed RSS</a></li><li><Link href="/cerca">Cerca</Link></li><li><Link href="#newsletter">Newsletter</Link></li><li><Link href="/login">Area redazione</Link></li></ul></div>
          <div><h4>Seguici</h4><ul>
            <li><a href={s.socials.facebook} target="_blank" rel="noopener">Facebook</a></li>
            <li><a href={s.socials.instagram} target="_blank" rel="noopener">Instagram</a></li>
            <li><a href={s.socials.x} target="_blank" rel="noopener">X</a></li>
            <li><a href={s.socials.youtube} target="_blank" rel="noopener">YouTube</a></li>
            <li><a href={s.socials.telegram} target="_blank" rel="noopener">Telegram</a></li>
          </ul></div>
        </div>
        <div className="footer-bottom">
          <span>© {new Date().getFullYear()} {s.siteName}. Tutti i diritti riservati.</span>
          <span>{footerLinks.length ? footerLinks.map((l, i) => <span key={l.id}>{i > 0 && ' · '}<Link href={l.url}>{l.label}</Link></span>) : 'Privacy · Cookie policy · Contatti · Pubblicità'}</span>
        </div>
      </div>
    </footer>
  );
}
