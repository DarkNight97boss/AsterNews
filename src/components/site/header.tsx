'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';
import { Category, EVENT_TYPE_LABELS, Zone } from '@/lib/models';
import type { HeaderStyle } from '@/lib/themes';
import { ThemeToggle } from './theme-toggle';

export interface OpinionTeaser { title: string; url: string; author: string; avatar: string }
export interface WeatherTeaser { icon: string; label: string; temp: number; city: string }
interface Props { categories: Category[]; zones: Zone[]; opinions: OpinionTeaser[]; weather: WeatherTeaser | null; liveLink: string | null; isLoggedIn: boolean; today: string; subscribeUrl: string; siteName: string; tagline: string; socials: Record<string, string>; headerStyle: HeaderStyle }

const STATIC_NAMES: Record<string, string> = { notizie: 'Notizie', cerca: 'Cerca', tag: 'Argomenti', autore: 'Firme', meteo: 'Meteo', eventi: 'Cosa fare in città', zone: 'Zone', segnalazioni: 'Segnalazioni', video: 'Video', foto: 'Foto' };

export function SiteHeader({ categories, zones, opinions, weather, liveLink, isLoggedIn, today, subscribeUrl, siteName, tagline, socials, headerStyle }: Props) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [q, setQ] = useState('');
  const router = useRouter();
  const pathname = usePathname();
  const first = pathname.split('/')[1] ?? '';
  const isHome = pathname === '/';
  const sectionName = STATIC_NAMES[first] ?? categories.find((c) => c.slug === first)?.name ?? '';
  const menu = categories.filter((c) => c.showInMenu);
  const mainMenu = [{ slug: 'notizie', name: 'Notizie' }, { slug: 'eventi', name: 'Cosa fare in città' }, { slug: 'zone', name: 'Zone' }, ...menu.filter((c) => c.kind === 'dossier' || c.kind === 'opinion')];
  const wideMenu = [{ slug: 'notizie', name: 'Ultime' }, ...menu.filter((c) => c.kind !== 'local'), { slug: 'eventi', name: 'Eventi' }, { slug: 'zone', name: 'Zone' }];
  const active = (slug: string) => (first === slug ? 'active' : undefined);
  const close = () => setMenuOpen(false);
  const submit = (e: React.FormEvent) => { e.preventDefault(); if (q.trim()) { router.push(`/cerca?q=${encodeURIComponent(q)}`); setSearchOpen(false); } };
  const Burger = ({ cls = 'burger' }: { cls?: string }) => <button className={cls} onClick={() => setMenuOpen((v) => !v)} aria-label="Tutte le sezioni">{menuOpen ? '✕' : '☰'}</button>;
  const Logo = ({ cls = 'logo' }: { cls?: string }) => <Link href="/" className={cls} aria-label={siteName}>Aster<small>news</small></Link>;

  return (
    <>
      <div className="topbar">
        <div className="container">
          <div className="date-wrap">
            <span className="date">{today}</span>
            {weather && <Link className="weather-pill" href="/meteo" title={`Il meteo a ${weather.city}`}><span className="w-icon">{weather.icon}</span><span className="w-temp">{weather.temp}°</span><span className="w-label">{weather.label}</span></Link>}
          </div>
          <div className="tools">
            <ThemeToggle />
            <a className="btn btn-blue btn-sm" href={subscribeUrl || '#newsletter'}>Abbonati</a>
            {isLoggedIn ? <Link className="tool" href="/admin" title="Redazione">⚙</Link> : <Link className="tool" href="/login" title="Accedi">👤</Link>}
          </div>
        </div>
      </div>

      {headerStyle === 'centered' && (
        <header className="header-centered">
          <div className="container hc-top">
            <div className="hc-socials"><a href={socials.facebook} target="_blank" rel="noopener">f</a><a href={socials.instagram} target="_blank" rel="noopener">◎</a><a href={socials.x} target="_blank" rel="noopener">𝕏</a><a href={socials.youtube} target="_blank" rel="noopener">▶</a></div>
            <Logo cls="logo logo-center" />
            <div className="hc-tools"><button className="search-btn" onClick={() => setSearchOpen((v) => !v)} aria-label="Cerca">⌕</button>{liveLink && <Link href={liveLink} className="nav-live">Diretta</Link>}</div>
          </div>
          <nav className="hc-nav"><div className="container">
            <Burger />
            {wideMenu.map((c) => <Link key={c.slug} href={`/${c.slug}`} className={active(c.slug)}>{c.name}</Link>)}
            <div className="hc-local">{categories.filter((c) => c.kind === 'local').map((c) => <Link key={c.id} href={`/${c.slug}`}>{c.name}</Link>)}</div>
          </div></nav>
        </header>
      )}

      {headerStyle === 'classic' && (
        <header className="header-classic">
          <div className="container hcl-mast"><Logo /><div className="tagline">{tagline}</div></div>
          <nav className="hcl-nav"><div className="container">
            <Burger />
            {wideMenu.map((c) => <Link key={c.slug} href={`/${c.slug}`} className={active(c.slug)}>{c.name}</Link>)}
            <button className="search-btn" onClick={() => setSearchOpen((v) => !v)} aria-label="Cerca">⌕</button>
          </div></nav>
        </header>
      )}

      {headerStyle === 'today' && (isHome ? (
        <header className="site-header">
          <div className="container">
            <div className="brand-col">
              <div className="brand-row"><Logo /><button className="burger burger-mobile" onClick={() => setMenuOpen(true)} aria-label="Menu">☰</button></div>
              <nav className="main-nav">
                {mainMenu.map((c) => <Link key={c.slug} href={`/${c.slug}`}>{c.name}</Link>)}
                <div className="nav-tools"><Burger /><button onClick={() => setSearchOpen((v) => !v)} aria-label="Cerca">⌕</button></div>
              </nav>
            </div>
            {opinions.length > 0 && (
              <div className="opinion-strip">
                {opinions.slice(0, 2).map((o) => (
                  <div key={o.url} className="opinion-box"><div><h4><Link href={o.url}>{o.title}</Link></h4><Link className="op-author" href={o.url}>{o.author}</Link></div><img src={o.avatar} alt={o.author} /></div>
                ))}
              </div>
            )}
          </div>
        </header>
      ) : (
        <header className="header-compact">
          <div className="container">
            <Burger />
            <Logo cls="logo logo-sm" />
            {sectionName && <span className="section-name">{sectionName}</span>}
            <button className="search-btn" onClick={() => setSearchOpen((v) => !v)} aria-label="Cerca">⌕</button>
          </div>
        </header>
      ))}

      {menuOpen && (
        <div className="mega">
          <div className="container mega-grid">
            <div><div className="mega-title">Ultime notizie</div><Link href="/notizie" onClick={close}>Ultime notizie</Link>{categories.filter((c) => c.kind === 'standard' || c.kind === 'dossier').map((c) => <Link key={c.id} href={`/${c.slug}`} onClick={close}>{c.name}</Link>)}<Link href="/meteo" onClick={close}>Meteo</Link></div>
            <div><div className="mega-title">Cosa fare in città</div><Link href="/eventi" onClick={close}>Tutti gli eventi</Link>{(Object.keys(EVENT_TYPE_LABELS) as (keyof typeof EVENT_TYPE_LABELS)[]).slice(0, 7).map((t) => <Link key={t} href={`/eventi?tipo=${t}`} onClick={close}>{EVENT_TYPE_LABELS[t]}</Link>)}<Link href="/eventi/segnala" onClick={close}>Segnala un evento</Link></div>
            <div><div className="mega-title">Zone</div>{categories.filter((c) => c.kind === 'local').map((c) => <Link key={c.id} href={`/${c.slug}`} onClick={close}>{c.name}</Link>)}{zones.slice(0, 8).map((z) => <Link key={z.id} href={`/zone/${z.slug}`} onClick={close}>{z.name}</Link>)}<Link href="/zone" onClick={close}><b>Tutte le zone →</b></Link></div>
            <div><div className="mega-title">Altre sezioni</div><Link href="/foto" onClick={close}>Foto</Link><Link href="/video" onClick={close}>Video</Link><Link href="/segnalazioni" onClick={close}>Segnalazioni</Link>{categories.filter((c) => c.kind === 'opinion').map((c) => <Link key={c.id} href={`/${c.slug}`} onClick={close}>{c.name}</Link>)}{liveLink && <Link href={liveLink} onClick={close} style={{ color: 'var(--red)' }}>● Diretta</Link>}<Link href="#newsletter" onClick={close}>Newsletter</Link><Link href={isLoggedIn ? '/admin' : '/login'} onClick={close}>{isLoggedIn ? 'Redazione' : 'Accedi'}</Link></div>
          </div>
        </div>
      )}

      {searchOpen && (
        <div className="search-bar"><div className="container">
          <form onSubmit={submit}><input className="input" placeholder={`Cerca su ${siteName}...`} value={q} onChange={(e) => setQ(e.target.value)} autoFocus /><button className="btn btn-dark" type="submit">Cerca</button></form>
        </div></div>
      )}
    </>
  );
}
