import Link from 'next/link';
import { getCategories, getSettings } from '@/lib/queries';

export function Footer() {
  const s = getSettings();
  return (
    <footer className="site-footer">
      <div className="container">
        <div className="footer-grid">
          <div>
            <Link href="/" className="logo">Aster<span>news</span></Link>
            <p style={{ marginTop: 12 }}>{s.description}</p>
            <p>{s.footerText}</p>
          </div>
          <div><h4>Sezioni</h4><ul>{getCategories().map((c) => <li key={c.id}><Link href={`/${c.slug}`}>{c.name}</Link></li>)}</ul></div>
          <div><h4>Servizi</h4><ul><li><Link href="/notizie">Tutte le notizie</Link></li><li><Link href="/cerca">Cerca</Link></li><li><Link href="/login">Area redazione</Link></li></ul></div>
          <div><h4>Seguici</h4><ul>
            <li><a href={s.socials.facebook} target="_blank" rel="noopener">Facebook</a></li>
            <li><a href={s.socials.instagram} target="_blank" rel="noopener">Instagram</a></li>
            <li><a href={s.socials.x} target="_blank" rel="noopener">X</a></li>
            <li><a href={s.socials.youtube} target="_blank" rel="noopener">YouTube</a></li>
          </ul></div>
        </div>
        <div className="footer-bottom">
          <span>© {new Date().getFullYear()} {s.siteName}. Tutti i diritti riservati.</span>
          <span>Privacy · Cookie policy · Contatti · Pubblicità</span>
        </div>
      </div>
    </footer>
  );
}
