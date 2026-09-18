import { requireUser } from '@/lib/auth';
import { GUIDE } from '@/lib/guide';

export default async function GuidePage() {
  await requireUser();
  return (
    <>
      <div className="page-title"><div><h1>Guida della redazione</h1><p>Come funziona ogni area, in breve. Il «?» in alto a destra apre la voce giusta per la pagina in cui sei.</p></div><div className="actions"><a className="btn btn-outline" href="https://github.com/DarkNight97boss/AsterNews#readme" target="_blank" rel="noreferrer">Documentazione completa ↗</a><a className="btn btn-outline" href="https://github.com/DarkNight97boss/AsterNews/discussions" target="_blank" rel="noreferrer">Community e supporto ↗</a></div></div>
      <div className="guide">{GUIDE.map((g) => <section key={g.id} id={g.id} className="panel"><div className="panel-title">{g.title}</div><p>{g.text}</p><ol>{g.steps.map((s) => <li key={s}>{s}</li>)}</ol>{g.video && <a className="btn btn-ghost btn-sm" href={g.video} target="_blank" rel="noreferrer">▶ Video tutorial</a>}</section>)}</div>
    </>
  );
}
