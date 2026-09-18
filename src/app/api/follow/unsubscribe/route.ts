import { deleteFollowByToken } from '@/lib/repo-extra3';
export const dynamic = 'force-dynamic';
export async function GET(req: Request) {
  const t = new URL(req.url).searchParams.get('t') ?? ''; const ok = t ? await deleteFollowByToken(t) : false;
  return new Response(`<!doctype html><html lang="it"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Argomento</title><body style="font-family:system-ui;max-width:480px;margin:80px auto;padding:0 20px;text-align:center"><h1>${ok ? 'Fatto' : 'Link non valido'}</h1><p>${ok ? 'Non riceverai più email su questo argomento.' : 'Il link è scaduto o già usato.'}</p><p><a href="/">Torna al sito</a></p></body></html>`, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
}
