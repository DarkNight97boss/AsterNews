/** Ripristina un backup JSON nel database indicato da DATABASE_URL (staging o produzione).
 *   DATABASE_URL=postgres://... npm run backup:restore -- --file backup.json */
import { readFile } from 'node:fs/promises';
const args = new Map<string, string>(); for (let i = 2; i < process.argv.length; i++) { const a = process.argv[i]; if (a.startsWith('--')) args.set(a.slice(2), process.argv[i + 1] ?? ''); }
const file = args.get('file'); if (!file) { console.error('Uso: --file backup.json'); process.exit(1); }
const { restoreBackup } = await import('../src/lib/backup'); const db = await import('../src/lib/db');
const data = await readFile(file);
const r = await restoreBackup(data); console.log(r);
await db.closeDb();
