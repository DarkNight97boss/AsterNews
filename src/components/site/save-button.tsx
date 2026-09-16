'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { toggleBookmarkAction } from '@/lib/actions-readers';
import { toast } from '@/components/ui/toaster';

/** Salva / leggi dopo per i lettori registrati. */
export function SaveButton({ articleId, saved, loggedIn }: { articleId: string; saved: boolean; loggedIn: boolean }) {
  const [on, setOn] = useState(saved); const [busy, setBusy] = useState(false); const pathname = usePathname();
  if (!loggedIn) return <Link href={`/account?redirect=${encodeURIComponent(pathname || '/')}`} className="save-btn" title="Accedi per salvare">🔖 Salva</Link>;
  return <button type="button" className={`save-btn ${on ? 'on' : ''}`} disabled={busy} onClick={async () => { setBusy(true); const r = await toggleBookmarkAction(articleId); setBusy(false); if (r.ok) { setOn(!!r.saved); toast.info(r.message ?? ''); } else toast.error(r.message ?? ''); }}>{on ? '🔖 Salvato' : '🔖 Salva'}</button>;
}
