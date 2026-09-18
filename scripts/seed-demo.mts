/** Inserisce i dati dimostrativi (stessi del setup guidato) in un database vuoto: usato dai test end-to-end e per ambienti di prova. */
const db = await import('../src/lib/db');
await db.seedDemo();
await db.metaSet('installed', '1');
await db.closeDb();
console.log('Dati demo inseriti.');
