import { NextResponse } from 'next/server';
import { articleUrlWith, getCategories, getPublished, getSettings, search } from '@/lib/queries';
import { siteUrl } from '@/lib/site-url';

export const dynamic = 'force-dynamic';
/**
 * Bot Telegram per i lettori: /ultime, /cerca <parole>, /meteo, /start. Registra il webhook con
 * https://api.telegram.org/bot<TOKEN>/setWebhook?url=https://tuosito/api/bots/telegram&secret_token=<CRON_SECRET>
 * Usa il token del bot già impostato in Impostazioni → Social (Telegram).
 */
export async function POST(req: Request) {
  const s = await getSettings(); const token = s.social?.telegramBotToken || process.env.TELEGRAM_BOT_TOKEN || '';
  if (!token) return NextResponse.json({ ok: false });
  const secret = process.env.CRON_SECRET; if (secret && req.headers.get('x-telegram-bot-api-secret-token') !== secret) return NextResponse.json({ ok: false }, { status: 401 });
  const upd = await req.json().catch(() => ({})) as { message?: { chat: { id: number }; text?: string } };
  const chat = upd.message?.chat.id; const text = (upd.message?.text ?? '').trim(); if (!chat) return NextResponse.json({ ok: true });
  const base = siteUrl(); const cats = await getCategories(); let reply = '';
  if (text.startsWith('/adesso')) { if (s.personal?.ownerChatId && String(chat) === s.personal.ownerChatId) { const { parseNow } = await import('@/lib/personal'); const { addRecord, findRecord } = await import('@/lib/records'); const prev = (await findRecord<Record<string, string>>('now_main'))?.data ?? {}; const body = text.replace('/adesso', '').trim(); if (body) { await addRecord('now', { id: 'now_main', status: 'approved', data: { ...parseNow(body, prev), updatedAt: new Date().toISOString() } }); reply = `✅ Pagina «adesso» aggiornata: ${base}/adesso`; } else reply = 'Scrivi ad esempio: /adesso leggo: Il Gattopardo; ascolto: Paolo Conte'; } else reply = `Cosa succede adesso: ${base}/adesso\n(il tuo id chat è ${chat}: inseriscilo in Redazione → Sito personale per aggiornare la pagina da qui)`; }
  else if (text.startsWith('/cerca')) { const q = text.replace('/cerca', '').trim(); const r = q ? (await search(q, 5)).items : []; reply = r.length ? `🔎 Risultati per «${q}»:\n` + r.map((a) => `• ${a.title}\n${base}${articleUrlWith(a, cats)}`).join('\n') : 'Nessun risultato.'; }
  else if (text.startsWith('/meteo')) reply = `🌤 Meteo ${s.weatherCity}: ${base}/meteo`;
  else if (text.startsWith('/start') || text.startsWith('/aiuto') || text.startsWith('/help')) reply = `Ciao! Sono il bot di ${s.siteName}.\n/ultime – le ultime notizie\n/cerca parola – cerca nell'archivio\n/meteo – previsioni`;
  else { const arts = await getPublished(5); reply = '📰 Ultime notizie:\n' + arts.map((a) => `• ${a.title}\n${base}${articleUrlWith(a, cats)}`).join('\n'); }
  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ chat_id: chat, text: reply, disable_web_page_preview: false }) }).catch(() => {});
  return NextResponse.json({ ok: true });
}
