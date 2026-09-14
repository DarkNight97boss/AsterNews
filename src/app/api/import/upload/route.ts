import fs from 'node:fs';
import path from 'node:path';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { getCurrentUser } from '@/lib/auth';
import { can } from '@/lib/permissions';
import { IMPORT_DIR } from '@/lib/import-jobs';
import { uid } from '@/lib/utils';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

/** Upload in streaming del file WXR (corpo grezzo, non multipart): scrive su disco senza caricare tutto in memoria. */
export async function POST(req: Request) {
  const me = await getCurrentUser();
  if (!me || !can(me, 'settings.manage')) return Response.json({ ok: false, message: 'Non autorizzato' }, { status: 401 });
  if (!req.body) return Response.json({ ok: false, message: 'Nessun file' }, { status: 400 });
  fs.mkdirSync(IMPORT_DIR, { recursive: true });
  const name = `${uid('wxr')}.xml`;
  const target = path.join(IMPORT_DIR, name);
  await pipeline(Readable.fromWeb(req.body as never), fs.createWriteStream(target));
  const size = fs.statSync(target).size;
  const head = fs.readFileSync(target, { encoding: 'utf8', flag: 'r' }).slice(0, 4000);
  if (!head.includes('<rss') && !head.includes('<channel')) { fs.unlinkSync(target); return Response.json({ ok: false, message: "Il file non sembra un'esportazione WordPress (WXR)." }, { status: 400 }); }
  return Response.json({ ok: true, file: name, size });
}
