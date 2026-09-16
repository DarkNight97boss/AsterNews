'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ReactNode, useState } from 'react';
import { logoutAction } from '@/lib/actions-auth';
import { ROLE_LABELS, User } from '@/lib/models';
import { Permission } from '@/lib/permissions';
import { NotificationsBell } from './notifications-bell';

interface Props { user: User; permissions: Permission[]; unread: number; reviewCount: number; pendingComments: number; pendingEvents: number; newReports: number; children: ReactNode }

export function AdminShell({ user, permissions, unread, reviewCount, pendingComments, pendingEvents, newReports, children }: Props) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const can = (p: Permission) => permissions.includes(p);
  const A = ({ href, exact, children }: { href: string; exact?: boolean; children: ReactNode }) => (
    <Link href={href} prefetch={false} className={(exact ? pathname === href : pathname.startsWith(href)) ? 'active' : undefined} onClick={() => setOpen(false)}>{children}</Link>
  );
  return (
    <div className="admin">
      <aside className={`admin-sidebar ${open ? 'open' : ''}`}>
        <div className="brand"><Link href="/admin" className="logo">Aster<span>news</span></Link><span className="brand-sub">Redazione · CMS</span></div>
        <nav>
          <A href="/admin" exact><span className="ico">▦</span> Dashboard</A>
          <div className="nav-group">Contenuti</div>
          <A href="/admin/articoli"><span className="ico">✎</span> Articoli {reviewCount > 0 && <span className="pill">{reviewCount}</span>}</A>
          <A href="/admin/scrivi"><span className="ico">✨</span> Scrivi (semplice)</A>
          <A href="/admin/articoli/nuovo"><span className="ico">＋</span> Editor completo</A>
          <A href="/admin/calendario"><span className="ico">🗓</span> Calendario</A>
          <A href="/admin/contatti"><span className="ico">📇</span> Rubrica contatti</A>
          {can('stats.view') && <A href="/admin/statistiche"><span className="ico">📈</span> Statistiche</A>}
          {can('category.manage') && <A href="/admin/categorie"><span className="ico">☰</span> Categorie</A>}
          {can('tag.manage') && <A href="/admin/tag"><span className="ico">#</span> Tag</A>}
          <A href="/admin/media"><span className="ico">▣</span> Media</A>
          <A href="/admin/mobile"><span className="ico">📱</span> Invia dal telefono</A>
          {(user.role === 'admin' || user.role === 'editor') && <A href="/admin/pagine"><span className="ico">📄</span> Pagine</A>}
          {(user.role === 'admin' || user.role === 'editor') && <A href="/admin/blocchi"><span className="ico">♻️</span> Blocchi riutilizzabili</A>}
          {can('article.publish') && (
            <>
              <div className="nav-group">Città</div>
              <A href="/admin/eventi"><span className="ico">📅</span> Eventi {pendingEvents > 0 && <span className="pill">{pendingEvents}</span>}</A>
              {can('category.manage') && <A href="/admin/zone"><span className="ico">📍</span> Zone</A>}
              <A href="/admin/redazione"><span className="ico">🗂</span> Desk e flussi</A>
            </>
          )}
          {can('comment.moderate') && (
            <>
              <div className="nav-group">Community</div>
              <A href="/admin/commenti"><span className="ico">💬</span> Commenti {pendingComments > 0 && <span className="pill">{pendingComments}</span>}</A>
              <A href="/admin/segnalazioni"><span className="ico">🚧</span> Segnalazioni {newReports > 0 && <span className="pill">{newReports}</span>}</A>
              <A href="/admin/newsletter"><span className="ico">✉</span> Newsletter</A>
              <A href="/admin/social"><span className="ico">📣</span> Social</A>
              <A href="/admin/annunci"><span className="ico">📋</span> Annunci e necrologi</A>
              <A href="/admin/lettori"><span className="ico">🙋</span> Lettori e abbonati</A>
            </>
          )}
          {(can('user.manage') || can('settings.manage')) && (
            <>
              <div className="nav-group">Sistema</div>
              {can('user.manage') && <A href="/admin/utenti"><span className="ico">👥</span> Utenti e ruoli</A>}
              {can('settings.manage') && <A href="/admin/impostazioni"><span className="ico">⚙</span> Impostazioni</A>}
              {can('settings.manage') && <A href="/admin/menu"><span className="ico">🧭</span> Menu del sito</A>}
              {can('settings.manage') && <A href="/admin/api"><span className="ico">🔑</span> API pubblica</A>}
              {can('settings.manage') && <A href="/admin/donazioni"><span className="ico">❤️</span> Donazioni</A>}
              {can('settings.manage') && <A href="/admin/importa"><span className="ico">⬇</span> Importa da WordPress</A>}
              {can('redirect.manage') && <A href="/admin/redirect"><span className="ico">↪</span> Redirect e 404</A>}
              {can('settings.manage') && <A href="/admin/pubblicita"><span className="ico">💶</span> Pubblicità</A>}
              {can('settings.manage') && <A href="/admin/edizioni"><span className="ico">🏙</span> Edizioni</A>}
              {can('settings.manage') && <A href="/admin/estensioni"><span className="ico">🧩</span> Estensioni</A>}
              {can('settings.manage') && <A href="/admin/aggiornamenti"><span className="ico">⬆</span> Aggiornamenti</A>}
              {can('settings.manage') && <A href="/admin/backup"><span className="ico">💾</span> Backup</A>}
              {can('settings.manage') && <A href="/admin/errori"><span className="ico">🩺</span> Errori e salute</A>}
              {can('settings.manage') && <A href="/admin/prestazioni"><span className="ico">🚀</span> Prestazioni</A>}
              {can('audit.view') && <A href="/admin/attivita"><span className="ico">🗒</span> Registro attività</A>}
            </>
          )}
          <div className="nav-group">Account</div>
          <A href="/admin/profilo"><span className="ico">👤</span> Il mio profilo</A>
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
          <NotificationsBell initialUnread={unread} />
          <Link href="/admin/scrivi" className="btn btn-primary btn-sm">✨ Scrivi un articolo</Link>
        </div>
        <div className="admin-content">{children}</div>
      </div>
    </div>
  );
}
