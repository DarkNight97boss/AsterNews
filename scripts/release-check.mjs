/**
 * Controllo pre-rilascio: tipi, test unitari e di integrazione, test end-to-end in ambiente isolato.
 * Scrive l'esito in data/release-check.json, letto dalla pagina Redazione → Rilascio.
 *   npm run release:check            (tutto)
 *   npm run release:check -- --fast  (senza end-to-end)
 */
import { execSync, spawnSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';

const fast = process.argv.includes('--fast');
const ANSI = new RegExp(String.fromCharCode(27) + '\\[[0-9;]*m', 'g');
const steps = [['Controllo dei tipi', 'npx tsc --noEmit -p .'], ['Test unitari e di integrazione', 'npx vitest run'], ...(fast ? [] : [['Test end-to-end (ambiente isolato)', 'npm run e2e:isolated']])];
const results = []; let ok = true;
for (const [name, cmd] of steps) {
  const t0 = Date.now(); process.stdout.write(`> ${name}... `);
  const r = spawnSync(cmd, { shell: true, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  const passed = r.status === 0; ok = ok && passed; const out = `${r.stdout ?? ''}${r.stderr ?? ''}`.replace(ANSI, '');
  const summary = (out.match(/Tests\s+.*|\d+ passed.*|\d+ failed.*/g) ?? []).slice(-2).join(' · ') || (passed ? 'ok' : out.trim().split('\n').slice(-3).join(' '));
  console.log(passed ? `ok (${Math.round((Date.now() - t0) / 1000)}s)` : 'FALLITO'); if (!passed) console.log(out.split('\n').slice(-25).join('\n'));
  results.push({ name, ok: passed, seconds: Math.round((Date.now() - t0) / 1000), summary: summary.slice(0, 300) });
}
let commit = ''; try { commit = execSync('git rev-parse --short HEAD', { encoding: 'utf8' }).trim(); } catch { /* fuori da git */ }
mkdirSync('data', { recursive: true });
writeFileSync('data/release-check.json', JSON.stringify({ at: new Date().toISOString(), commit, ok, fast, results }, null, 2));
console.log(ok ? '\nPronto per il rilascio.' : '\nNon rilasciare: correggi gli errori sopra.'); process.exit(ok ? 0 : 1);
