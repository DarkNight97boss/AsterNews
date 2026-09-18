import { fetchRegistry } from '@/lib/extension-registry';
import { allExtensions } from '@/lib/extensions';

/** Registro delle estensioni disponibili: quelle incluse si attivano dalla pagina, le esterne si installano copiando il file e ridistribuendo. */
export async function ExtensionRegistry({ enabled }: { enabled: string[] }) {
  const [reg, local] = await Promise.all([fetchRegistry(), Promise.resolve(allExtensions())]);
  const installed = new Set(local.map((e) => e.id));
  return (
    <div className="panel"><div className="panel-title">Registro estensioni <span className="help">({reg.length} disponibili)</span></div>
      <table className="table"><thead><tr><th>Estensione</th><th>Versione</th><th>Autore</th><th>Stato</th></tr></thead><tbody>
        {reg.map((e) => <tr key={e.id}><td className="t-title">{e.homepage ? <a href={e.homepage} target="_blank" rel="noreferrer">{e.name}</a> : e.name}<div className="t-sub">{e.description}</div></td><td>{e.version}</td><td>{e.author}</td><td>{installed.has(e.id) ? (enabled.includes(e.id) ? <span className="badge badge-green">attiva</span> : <span className="badge badge-gray">installata</span>) : <span className="help">Da installare: copia <code>{e.source.split('/').pop()}</code> in <code>src/extensions/</code>, registralo in <code>index.ts</code> e ridistribuisci (Aggiornamenti → Deploy).</span>}</td></tr>)}
      </tbody></table>
      <p className="help" style={{ marginTop: 8 }}>Il registro è un file JSON su GitHub (<code>extensions/registry.json</code>): per proporre un&apos;estensione basta una pull request.</p>
    </div>
  );
}
