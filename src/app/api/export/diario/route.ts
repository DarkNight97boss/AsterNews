import { getCurrentReader } from '@/lib/auth';
import { listRecords } from '@/lib/records';
import { findArticle } from '@/lib/repo';

/** Il diario delle letture del lettore collegato, in CSV: suo, lo porta via quando vuole. */
export async function GET() {
  const reader = await getCurrentReader(); if (!reader) return new Response('Accedi prima.', { status: 401 });
  const reads = await listRecords('read', { owner: reader.id, limit: 5000 }); const rows = ['data;titolo;id'];
  for (const r of reads) { const a = await findArticle(r.ref); if (a) rows.push(`${r.createdAt.slice(0, 10)};"${a.title.replace(/"/g, '""')}";${a.id}`); }
  return new Response('﻿' + rows.join('\n'), { headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': 'attachment; filename="diario-letture.csv"' } });
}
