import 'server-only';
import fs from 'node:fs';
import path from 'node:path';
import { Database } from './models';
import { buildSeed } from './seed';

const FILE = process.env.DB_PATH ?? path.join(process.cwd(), 'data', 'db.json');

type G = typeof globalThis & { __asterDb?: Database; __asterDbWarned?: boolean };
const g = globalThis as G;

function persist(): void {
  try {
    fs.mkdirSync(path.dirname(FILE), { recursive: true });
    fs.writeFileSync(FILE, JSON.stringify(g.__asterDb));
  } catch (e) {
    if (!g.__asterDbWarned) {
      g.__asterDbWarned = true;
      console.warn('[aster] impossibile scrivere il database su disco, uso la memoria:', (e as Error).message);
    }
  }
}

export function getDb(): Database {
  if (!g.__asterDb) {
    try {
      if (fs.existsSync(FILE)) {
        const parsed = JSON.parse(fs.readFileSync(FILE, 'utf8')) as Database;
        if (parsed.version === 4) g.__asterDb = parsed;
      }
    } catch {
      /* file corrotto: riparto dal seed */
    }
    if (!g.__asterDb) {
      g.__asterDb = buildSeed();
      persist();
    }
  }
  return g.__asterDb;
}

export function mutate(fn: (d: Database) => Partial<Database>): void {
  const d = getDb();
  g.__asterDb = { ...d, ...fn(d) };
  persist();
}

export function resetDb(): void {
  g.__asterDb = buildSeed();
  persist();
}
