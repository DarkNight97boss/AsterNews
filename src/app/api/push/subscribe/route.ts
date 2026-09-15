import { NextResponse } from 'next/server';
import { deletePushSubscription, insertPushSubscription } from '@/lib/repo-extra';
import { pushEnabled, vapidKeys } from '@/lib/push';
import { uid } from '@/lib/utils';

export const dynamic = 'force-dynamic';

/** Chiave pubblica VAPID per il browser. */
export async function GET() {
  if (!(await pushEnabled())) return NextResponse.json({ enabled: false });
  return NextResponse.json({ enabled: true, publicKey: (await vapidKeys()).publicKey });
}
/** Registra (o aggiorna) una sottoscrizione push. */
export async function POST(req: Request) {
  try {
    const b = await req.json() as { endpoint?: string; keys?: { p256dh: string; auth: string }; topics?: string[] };
    if (!b.endpoint || !b.keys?.p256dh || !b.keys?.auth) return NextResponse.json({ error: 'Sottoscrizione non valida' }, { status: 400 });
    await insertPushSubscription(uid('ps'), b.endpoint, b.keys, (b.topics ?? []).slice(0, 20));
    return NextResponse.json({ ok: true });
  } catch (e) { console.error('[push/subscribe]', e); return NextResponse.json({ error: 'Errore' }, { status: 500 }); }
}
export async function DELETE(req: Request) {
  const b = await req.json().catch(() => ({})) as { endpoint?: string };
  if (b.endpoint) await deletePushSubscription(b.endpoint);
  return NextResponse.json({ ok: true });
}
