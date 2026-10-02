'use client';
import { useEffect, useState } from 'react';
import { muteTagAction } from '@/lib/actions-service';

const KEY = 'aster_muted';
const read = (): string[] => { try { return JSON.parse(localStorage.getItem(KEY) ?? '[]') as string[]; } catch { return []; } };
const write = (ids: string[]) => { try { localStorage.setItem(KEY, JSON.stringify(ids)); } catch { /* */ } };
/** Silenzia argomento: nasconde dalle liste le schede degli argomenti silenziati (nel browser e nel profilo). Nessuna richiesta in più, nessun tracciamento. */
export function MuteFilter({ serverMuted }: { serverMuted: string[] }) {
  useEffect(() => {
    const ids = [...new Set([...read(), ...serverMuted])]; if (serverMuted.length) write(ids); if (!ids.length) return;
    const apply = () => { document.querySelectorAll<HTMLElement>('[data-tags]').forEach((el) => { const t = (el.dataset.tags ?? '').split(' '); if (t.some((x) => ids.includes(x))) { el.hidden = true; el.dataset.muted = '1'; } }); };
    apply(); const mo = new MutationObserver(apply); mo.observe(document.body, { childList: true, subtree: true }); return () => mo.disconnect();
  }, [serverMuted]);
  return null;
}
export function MuteTag({ tagId, tagName }: { tagId: string; tagName: string }) {
  const [muted, setMuted] = useState(false); useEffect(() => { setMuted(read().includes(tagId)); }, [tagId]);
  const toggle = () => { const next = !muted; const ids = read(); write(next ? [...new Set([...ids, tagId])] : ids.filter((x) => x !== tagId)); setMuted(next); muteTagAction(tagId, next).catch(() => {}); };
  return <button type="button" className="btn btn-ghost btn-sm" onClick={toggle} title="Gli articoli su questo argomento spariscono dalle liste, per te">{muted ? `🔈 Riattiva «${tagName}»` : `🔇 Silenzia «${tagName}»`}</button>;
}
