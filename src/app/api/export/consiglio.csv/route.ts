import { listCards } from '@/lib/civic-data';
import { councilMatrix } from '@/lib/civic';

export const dynamic = 'force-dynamic';
export async function GET() {
  const dl = (await listCards('delibera')).filter((d) => d.fields.voti); const m = councilMatrix(dl.map((d) => ({ id: d.id, title: d.fields.numero ? `n. ${d.fields.numero}` : d.title, votes: d.fields.voti }))); const q = (v: string) => `"${v.replace(/"/g, '""')}"`;
  const csv = [['Consigliere', ...dl.map((d) => `${d.fields.numero ? 'Delibera ' + d.fields.numero + ' ' : ''}${d.title} (${d.fields.data ?? ''})`)].map(q).join(','), ...m.rows.map((r) => [r.name, ...r.votes].map(q).join(','))].join('\n');
  return new Response('﻿' + csv, { headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': 'attachment; filename="consiglio-voti.csv"' } });
}
