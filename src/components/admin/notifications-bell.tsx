'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { markNotificationsReadAction, myNotificationsAction } from '@/lib/actions-system';
import type { Notification } from '@/lib/models';
import { timeAgo } from '@/lib/utils';
import { inQuietHours } from '@/lib/rhythm';

/** Campanella delle notifiche in redazione: assegnazioni, richieste di modifica, articoli in revisione. */
export function NotificationsBell({ initialUnread, quiet }: { initialUnread: number; quiet?: { from?: string; to?: string } }) {
  const [calm, setCalm] = useState(false); useEffect(() => { const check = () => setCalm(inQuietHours(quiet?.from, quiet?.to, new Date().toTimeString().slice(0, 5))); check(); const t = setInterval(check, 60_000); return () => clearInterval(t); }, [quiet?.from, quiet?.to]);
  const [open, setOpen] = useState(false); const [items, setItems] = useState<Notification[]>([]); const [unread, setUnread] = useState(initialUnread); const [emergencies, setEmergencies] = useState(0);
  useEffect(() => { const t = setInterval(async () => { const r = await myNotificationsAction(); setUnread(r.unread); setEmergencies(r.items.filter((i) => !i.read && i.kind === 'emergency').length); if (open) setItems(r.items); }, 60_000); return () => clearInterval(t); }, [open]);
  const toggle = async () => { const next = !open; setOpen(next); if (next) { const r = await myNotificationsAction(); setItems(r.items); setUnread(r.unread); } };
  return (
    <div className="bell-wrap">
      <button type="button" className="btn btn-ghost btn-icon" onClick={toggle} aria-label={calm ? 'Notifiche (orario di quiete)' : 'Notifiche'} title={calm ? `Orario di quiete fino alle ${quiet?.to}: passano solo le emergenze dichiarate` : undefined}>{calm ? '🌙' : '🔔'}{(calm ? emergencies : unread) > 0 && <span className="bell-count">{calm ? emergencies : unread}</span>}</button>
      {open && (
        <div className="bell-menu">
          <div className="bell-head"><b>Notifiche</b>{unread > 0 && <button type="button" className="btn btn-ghost btn-sm" onClick={async () => { await markNotificationsReadAction(); setUnread(0); setItems(items.map((i) => ({ ...i, read: true }))); }}>Segna tutte lette</button>}</div>
          {items.length === 0 && <p className="help" style={{ padding: 10 }}>Nessuna notifica.</p>}
          {items.map((n) => <Link key={n.id} href={n.url || '/admin'} className={`bell-item ${n.read ? '' : 'unread'}`} onClick={() => { markNotificationsReadAction(n.id); setOpen(false); }}><span>{n.kind === 'emergency' ? '🚨' : n.kind === 'assign' ? '📌' : n.kind === 'changes' ? '✏️' : n.kind === 'review' ? '⏳' : 'ℹ️'}</span><div>{n.text}<div className="help">{timeAgo(n.createdAt)}</div></div></Link>)}
        </div>
      )}
    </div>
  );
}
