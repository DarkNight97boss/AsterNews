'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';
import { Category } from '@/lib/models';
import { ThemeToggle } from './theme-toggle';

export interface OpinionTeaser { title: string; url: string; author: string; avatar: string }
interface Props { categories: Category[]; opinions: OpinionTeaser[]; liveLink: string | null; isLoggedIn: boolean; today: string; subscribeUrl: string; siteName: string }

const STATIC_NAMES: Record<string, string> = { notizie: 'Notizie', cerca: 'Cerca', tag: 'Argomenti', autore: 'Firme' };

export function SiteHeader({ categories, opinions, liveLink, isLoggedIn, today, subscribeUrl, siteName }: Props) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [q, setQ] = useState('');
  const router = useRouter();
  const pathname = usePathname();
  const first = pathname.split('/')[1] ?? '';
  const isHome = pathname === '/';
  const sectionName = STATIC_NAMES[first] ?? categories.find((c) => c.slug === first)?.name ?? '';
  const menu = categories.filter((c) => c.showInMenu);
  const mainMenu = [{ slug: 'notizie', name: 'Notizie' }, ...menu.filter((c) => c.kind !== 'standard' || ['life', 'vision'].includes(c.slug))];
  const submit = (e: React.FormEvent) => { e.preventDefault(); if (q.trim()) { router.push(`/cerca?q=${encodeURIComponent(q)}`); setSearchOpen(false); } };

  return (
    <>
      <div className="topbar">
        <div className="container">
          <span className="date">{today}</span>
          <div className="tools">
            <ThemeToggle />
            <a className="btn btn-blue btn-sm" href={subscribeUrl || '#newsletter'}>Abbonati</a>
            {isLoggedIn ? <Link className="tool" href="/admin" title="Redazione">⚙</Link> : <Link className="tool" href="/login" title="Accedi">👤</Link>}
          </div>
        </div>
      </div>

      {isHome ? (
        <header className="site-header">
          <div className="container">
            <div className="brand-col">
              <div className="brand-row">
                <Link href="/" className="logo" aria-label={siteName}>Aster<small>news</small></Link>
                <button className="burger burger-mobile" onClick={() => setMenuOpen(true)} aria-label="Menu">☰</button>
              </div>
              <nav className="main-nav">
                {mainMenu.map((c) => <Link key={c.slug} href={`/${c.slug}`}>{c.name}</Link>)}
                <div className="nav-tools">
                  <button onClick={() => setMenuOpen(true)} aria-label="Tutte le sezioni">☰</button>
                  <button onClick={() => setSearchOpen((v) => !v)} aria-label="Cerca">⌕</button>
                </div>
              </nav>
            </div>
            {opinions.length > 0 && (
              <div className="opinion-strip">
                {opinions.slice(0, 2).map((o) => (
                  <div key={o.url} className="opinion-box">
                    <div><h4><Link href={o.url}>{o.title}</Link></h4><Link className="op-author" href={o.url}>{o.author}</Link></div>
                    <img src={o.avatar} alt={o.author} />
                  </div>
                ))}
              </div>
            )}
          </div>
        </header>
      ) : (
        <header className="header-compact">
          <div className="container">
            <button className="burger" onClick={() => setMenuOpen(true)} aria-label="Menu">☰</button>
            <Link href="/" className="logo logo-sm" aria-label={siteName}>Aster<small>news</small></Link>
            {sectionName && <span className="section-name">{sectionName}</span>}
            <button className="search-btn" onClick={() => setSearchOpen((v) => !v)} aria-label="Cerca">⌕</button>
          </div>
        </header>
      )}

      {searchOpen && (
        <div className="search-bar"><div className="container">
          <form onSubmit={submit}><input className="input" placeholder={`Cerca su ${siteName}...`} value={q} onChange={(e) => setQ(e.target.value)} autoFocus /><button className="btn btn-dark" type="submit">Cerca</button></form>
        </div></div>
      )}

      {menuOpen && (
        <div className="drawer" onClick={() => setMenuOpen(false)}>
          <div className="drawer-panel" onClick={(e) => e.stopPropagation()}>
            <div className="drawer-head"><span className="logo logo-sm" style={{ color: 'var(--ink)' }}>Aster<small>news</small></span><button className="btn btn-ghost btn-icon" onClick={() => setMenuOpen(false)} aria-label="Chiudi">✕</button></div>
            {liveLink && <Link href={liveLink} onClick={() => setMenuOpen(false)} style={{ color: 'var(--red)' }}>● Diretta</Link>}
            <div className="drawer-group">Sezioni</div>
            <Link href="/notizie" onClick={() => setMenuOpen(false)}>Tutte le notizie</Link>
            {categories.map((c) => <Link key={c.id} href={`/${c.slug}`} onClick={() => setMenuOpen(false)}>{c.name}</Link>)}
            <div className="drawer-group">Servizi</div>
            <Link href="/cerca" onClick={() => setMenuOpen(false)}>Cerca</Link>
            <Link href="#newsletter" onClick={() => setMenuOpen(false)}>Newsletter</Link>
            <Link href={isLoggedIn ? '/admin' : '/login'} onClick={() => setMenuOpen(false)}>{isLoggedIn ? 'Redazione' : 'Accedi'}</Link>
          </div>
        </div>
      )}
    </>
  );
}
