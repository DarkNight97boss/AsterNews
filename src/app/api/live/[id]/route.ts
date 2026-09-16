import { findArticle } from '@/lib/repo';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

/** Diretta testuale in tempo reale (Server-Sent Events): invia gli aggiornamenti appena la redazione li pubblica. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params; const enc = new TextEncoder();
  let last = ''; let closed = false;
  const stream = new ReadableStream({
    async start(ctrl) {
      const send = (event: string, data: unknown) => ctrl.enqueue(enc.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
      const t0 = Date.now();
      while (!closed && Date.now() - t0 < 270_000) {
        try {
          const a = await findArticle(id);
          if (!a || a.status !== 'published') { send('end', {}); break; }
          const sig = a.updatedAt + ':' + a.liveUpdates.length + ':' + a.liveActive;
          if (sig !== last) { last = sig; send('update', { active: a.liveActive, updates: [...a.liveUpdates].sort((x, y) => y.time.localeCompare(x.time)), title: a.title }); }
          if (!a.liveActive) { send('end', {}); break; }
        } catch { /* riprova al giro successivo */ }
        ctrl.enqueue(enc.encode(': ping\n\n'));
        await new Promise((r) => setTimeout(r, 4000));
      }
      ctrl.close();
    },
    cancel() { closed = true; },
  });
  return new Response(stream, { headers: { 'Content-Type': 'text/event-stream; charset=utf-8', 'Cache-Control': 'no-cache, no-transform', Connection: 'keep-alive', 'X-Accel-Buffering': 'no' } });
}
