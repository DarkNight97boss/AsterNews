'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ReactNode, useState } from 'react';
import { logoutAction } from '@/lib/actions';
import { ROLE_LABELS, User } from '@/lib/models';
import { Permission } from '@/lib/permissions';

interface Props { user: User; permissions: Permission[]; reviewCount: number; pendingComments: number; children: ReactNode }

export function AdminShell({ user, permissions, reviewCount, pendingComments, children }: Props) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const can = (p: Permission) => permissions.includes(p);
  const A = ({ href, exact, children }: { href: string; exact?: boolean; children: ReactNode }) => (
    <Link href={href} className={(exact ? pathname === href : pathname.startsWith(href)) ? 'active' : undefined} onClick={() => setOpen(false)}>{children}</Link>
  );
  return (
    <div className="admin">
      <aside className={`admin-sidebar ${open ? 'open' : ''}`}>
        <div className="brand"><Link href="/admin" className="logo">Aster<span>news</span></Link><span className="brand-sub">Redazione · CMS</span></div>
        <nav>
          <A href="/admin" exact><span className="ico">▦</span> Dashboard</A>
          <div className="nav-group">Contenuti</div>
          <A href="/admin/articoli"><span className="ico">✎</span> Articoli {reviewCount > 0 && <span className="pill">{reviewCount}</span>}</A>
          <A href="/admin/articoli/nuovo"><span className="ico">＋</span> Nuovo articolo</A>
          {can('category.manage') && <A href="/admin/categorie"><span className="ico">☰</span> Categorie</A>}
          {can('tag.manage') && <A href="/admin/tag"><span className="ico">#</span> Tag</A>}
          <A href="/admin/media"><span className="ico">▣</span> Media</A>
          {can('comment.moderate') && (
            <>
              <div className="nav-group">Community</div>
              <A href="/admin/commenti"><span className="ico">💬</span> Commenti {pendingComments > 0 && <span className="pill">{pendingComments}</span>}</A>
              <A href="/admin/newsletter"><span className="ico">✉</span> Newsletter</A>
            </>
          )}
          {(can('user.manage') || can('settings.manage')) && (
            <>
              <div className="nav-group">Sistema</div>
              {can('user.manage') && <A href="/admin/utenti"><span className="ico">👥</span> Utenti e ruoli</A>}
              {can('settings.manage') && <A href="/admin/impostazioni"><span className="ico">⚙</span> Impostazioni</A>}
            </>
          )}
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
          <Link href="/admin/articoli/nuovo" className="btn btn-primary btn-sm">+ Nuovo articolo</Link>
        </div>
        <div className="admin-content">{children}</div>
      </div>
    </div>
  );
}
