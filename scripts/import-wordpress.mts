/**
 * Importazione WordPress dal computer di chi amministra il sito, direttamente nel database (Supabase/Postgres).
 * Adatta ad archivi enormi (centinaia di migliaia di articoli): il file WXR è letto in streaming e scritto a lotti.
 *
 *   npm run import:wp -- --file export.xml [--status keep|draft|review] [--no-optimize] [--overwrite]
 *   npm run import:wp -- --url https://www.vecchiosito.it [--max 100000]
 *
 * Nel file .env.local deve esserci DATABASE_URL (o POSTGRES_URL) di Supabase.
 */
process.env.NEXT_RUNTIME = 'nodejs';
const args = new Map<string, string>();
for (let i = 2; i < process.argv.length; i++) { const a = process.argv[i]; if (a.startsWith('--')) { const v = process.argv[i + 1] && !process.argv[i + 1].startsWith('--') ? process.argv[++i] : 'true'; args.set(a.slice(2), v); } }
const file = args.get('file'); const url = args.get('url');
if (!file && !url) { console.error('Usa --file export.xml oppure --url https://sito'); process.exit(1); }
const { IMPORT_DIR, createJob, runJobInBackground } = await import('../src/lib/import-jobs');
const repo = await import('../src/lib/repo');
const fs = await import('node:fs'); const path = await import('node:path');
let fileName: string | undefined;
if (file) { fs.mkdirSync(IMPORT_DIR, { recursive: true }); fileName = path.basename(file); fs.copyFileSync(file, path.join(IMPORT_DIR, fileName)); }
const admin = (await repo.listUsers()).find((u) => u.role === 'admin');
const job = await createJob({ source: file ? 'wxr' : 'rest', file: fileName, url, maxPosts: Number(args.get('max') ?? 1000000), optimize: args.get('no-optimize') !== 'true', statusMode: (args.get('status') as 'keep' | 'draft' | 'review') ?? 'keep', categoryMap: {}, overwrite: args.get('overwrite') === 'true', downloadMedia: args.get('download-media') === 'true' }, admin?.id ?? 'u_admin');
console.log('Job', job.id, 'avviato.');
runJobInBackground(job.id);
const t0 = Date.now();
for (;;) {
  await new Promise((r) => setTimeout(r, 2000));
  const j = await repo.findJob(job.id);
  if (!j) break;
  const rate = j.processed / Math.max(1, (Date.now() - t0) / 1000);
  process.stdout.write(`\r${j.status}: ${j.processed}/${j.total || '?'} elaborati, ${j.imported} importati, ${j.skipped} saltati (${rate.toFixed(0)}/s) ${j.message}      `);
  if (j.status === 'done' || j.status === 'failed' || j.status === 'cancelled') { console.log('\n' + j.message); if (j.errors.length) console.log('Errori (ultimi):', j.errors.slice(-10).join('\n')); await (await import('../src/lib/db')).closeDb(); process.exit(j.status === 'done' ? 0 : 1); }
}
