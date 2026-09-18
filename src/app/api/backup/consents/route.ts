import { getCurrentUser } from '@/lib/auth';
import { can } from '@/lib/permissions';
import { listConsents } from '@/lib/repo-extra3';
export const dynamic = 'force-dynamic';
export async function GET() {
  const me = await getCurrentUser(); if (!me || !can(me, 'settings.manage')) return new Response('Non autorizzato', { status: 401 });
  const rows = await listConsents(50000);
  const csv = ['id;data;scelta;versione;ip_hash;dispositivo', ...rows.map((r) => [r.id, r.createdAt, r.choice, r.version, r.ipHash, r.ua.replace(/;/g, ',')].join(';'))].join('\n');
  return new Response('﻿' + csv, { headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': `attachment; filename="consensi-${new Date().toISOString().slice(0, 10)}.csv"` } });
}
