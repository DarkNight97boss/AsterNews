import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="empty" style={{ padding: '80px 20px' }}>
      <div className="kicker">Errore 404</div>
      <h1 style={{ fontSize: 40, margin: '10px 0' }}>Pagina non trovata</h1>
      <p>La pagina che cerchi non esiste o è stata spostata.</p>
      <Link href="/" className="btn btn-dark">Torna alla home</Link>
    </div>
  );
}
