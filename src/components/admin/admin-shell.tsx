'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ReactNode, useState } from 'react';
import { logoutAction } from '@/lib/actions-auth';
import { ROLE_LABELS, User } from '@/lib/models';
import { Permission } from '@/lib/permissions';
import { NotificationsBell } from './notifications-bell';
import { guideFor } from '@/lib/guide';
import { NAV, arrangeNav, vocabularyOf, type AdaptSettings, type NavItem } from '@/lib/admin-nav';
import { trackNavAction } from '@/lib/actions-system';
import { useEffect } from 'react';

interface Props { adapt: AdaptSettings; solo: boolean; used: string[]; mature: boolean; user: User; permissions: Permission[]; unread: number; reviewCount: number; pendingComments: number; pendingEvents: number; newReports: number; children: ReactNode }

export function AdminShell({ adapt, solo, used, mature, user, permissions, unread, reviewCount, pendingComments, pendingEvents, newReports, children }: Props) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const can = (p: Permission) => permissions.includes(p);
  const [showMore, setShowMore] = useState(false);
  useEffect(() => { trackNavAction(pathname).catch(() => {}); }, [pathname]);
  const allowed = NAV.filter((n) => (!n.perm || can(n.perm)) && (!n.editorOnly || user.role === 'admin' || user.role === 'editor'));
  const { main, more } = arrangeNav(allowed, adapt, { solo, used, mature }); const voc = vocabularyOf(adapt);
  const pills: Record<string, number> = { review: reviewCount, comments: pendingComments, events: pendingEvents, reports: newReports };
  const A = ({ href, exact, children }: { href: string; exact?: boolean; children: ReactNode }) => (
    <Link href={href} prefetch={false} className={(exact ? pathname === href : pathname.startsWith(href)) ? 'active' : undefined} onClick={() => setOpen(false)}>{children}</Link>
  );
  const item = (n: NavItem) => <A key={n.href} href={n.href}><span className="ico">{n.icon}</span> {n.label} {n.pill && pills[n.pill] > 0 && <span className="pill">{pills[n.pill]}</span>}</A>;
  return (
    <div className="admin">
      <aside className={`admin-sidebar ${open ? 'open' : ''}`}>
        <div className="brand"><Link href="/admin" className="logo">Aster<span>news</span></Link><span className="brand-sub">{solo ? 'Il tuo spazio' : 'Redazione'} · CMS</span></div>
        <nav>
          <A href="/admin" exact><span className="ico">▦</span> Dashboard</A>
          {(['Contenuti', 'Territorio', 'Community', 'Sistema', 'Account'] as const).map((g) => { const list = main.filter((x) => x.group === g); if (!list.length) return null; return <div key={g}><div className="nav-group">{g}</div>{list.map(item)}</div>; })}
          {more.length > 0 && <><button type="button" className="nav-more" onClick={() => setShowMore(!showMore)} aria-expanded={showMore}>{showMore ? '▾' : '▸'} Altro <span className="pill pill-gray">{more.length}</span></button>{showMore && <div className="nav-more-list">{more.map(item)}<Link href="/admin/adatta" className="nav-hint" onClick={() => setOpen(false)}>Perché sono qui? Adatta il CMS →</Link></div>}</>}
          <div className="nav-group">Sito</div>
          <Link href="/"><span className="ico">↗</span> Vai al sito</Link>
        </nav>
        <div className="sidebar-user">
          <img src={user.avatar} alt={user.name} />
          <div><div className="u-name">{user.name}</div><div className="u-role">{ROLE_LABELS[user.role]}</div></div>
          <form action={logoutAction}><button type="submit" title="Esci">⏻</button></form>
        </div>
      </aside>
      {open && <div className="modal-backdrop" style={{ zIndex: 250 }} onClick={() => setOpen(false)} />}
      <div className="admin-main">
        <div className="admin-topbar">
          <button className="btn btn-ghost btn-icon burger-admin" onClick={() => setOpen(true)}>☰</button>
          <span className="crumb">ASTER News / <b>Redazione</b></span>
          <span className="spacer" />
          <Link href={`/admin/guida#${guideFor(pathname).id}`} className="btn btn-ghost btn-icon" title={`Guida: ${guideFor(pathname).title}`}>?</Link>
          <NotificationsBell initialUnread={unread} />
          <Link href="/admin/scrivi" className="btn btn-primary btn-sm">✨ {voc.write}</Link>
        </div>
        <div className="admin-content">{children}</div>
      </div>
    </div>
  );
}
