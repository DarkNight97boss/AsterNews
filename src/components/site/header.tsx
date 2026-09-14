'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';
import { Category } from '@/lib/models';

interface Props { categories: Category[]; menuCategories: Category[]; liveLink: string | null; isLoggedIn: boolean; today: string; socials: Record<string, string> }

export function SiteHeader({ categories, menuCategories, liveLink, isLoggedIn, today, socials }: Props) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [q, setQ] = useState('');
  const router = useRouter();
  const pathname = usePathname();
  return (
    <>
      <div className="topbar">
        <div className="container">
          <span className="date">{today}</span>
          <div className="socials">
            <a href={socials.facebook} target="_blank" rel="noopener">Facebook</a>
            <a href={socials.instagram} target="_blank" rel="noopener">Instagram</a>
            <a href={socials.x} target="_blank" rel="noopener">X</a>
            <a href={socials.youtube} target="_blank" rel="noopener">YouTube</a>
            <a href={socials.telegram} target="_blank" rel="noopener">Telegram</a>
          </div>
          {isLoggedIn ? <Link href="/admin" style={{ fontWeight: 700 }}>⚙ Redazione</Link> : <Link href="/login" style={{ fontWeight: 700 }}>Accedi</Link>}
        </div>
      </div>
      <header className="site-header">
        <div className="container">
          <button className="btn btn-ghost btn-icon burger" onClick={() => setMenuOpen((v) => !v)} aria-label="Menu">☰</button>
          <Link href="/" className="logo">Aster<span>news</span></Link>
          <nav className="main-nav">
            {liveLink && <Link className="nav-live" href={liveLink}>Diretta</Link>}
            {menuCategories.map((c) => (
              <Link key={c.id} href={`/${c.slug}`} className={pathname.startsWith(`/${c.slug}`) ? 'active' : undefined}>{c.name}</Link>
            ))}
          </nav>
          <div className="header-actions">
            <button className="btn btn-ghost btn-icon" onClick={() => setSearchOpen((v) => !v)} aria-label="Cerca">🔍</button>
          </div>
        </div>
        {searchOpen && (
          <div className="search-bar">
            <div className="container">
              <form onSubmit={(e) => { e.preventDefault(); if (q.trim()) { router.push(`/cerca?q=${encodeURIComponent(q)}`); setSearchOpen(false); } }}>
                <input className="input" placeholder="Cerca su ASTER News..." value={q} onChange={(e) => setQ(e.target.value)} autoFocus />
                <button className="btn btn-dark" type="submit">Cerca</button>
              </form>
            </div>
          </div>
        )}
        <nav className={`mobile-nav ${menuOpen ? 'open' : ''}`}>
          {categories.map((c) => <Link key={c.id} href={`/${c.slug}`} onClick={() => setMenuOpen(false)}>{c.name}</Link>)}
          <Link href="/notizie" onClick={() => setMenuOpen(false)}>Tutte le notizie</Link>
        </nav>
      </header>
    </>
  );
}
