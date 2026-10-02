import { redirect } from 'next/navigation';
import { requireUser } from '@/lib/auth';
import { manualMarkdown } from '@/lib/platform-data';

export const dynamic = 'force-dynamic';
/** Manuale autogenerato: ogni pagina, ogni contributo, ogni scheda, letti dal codice. */
export default async function ManualPage({ searchParams }: PageProps<'/admin/manuale'>) {
  await requireUser(); const sp = await searchParams; const md = await manualMarkdown(); if (sp.md !== undefined) redirect(`/api/export/manuale.md`);
  const inline = (t: string) => t.split(/(\*\*[^*]+\*\*|`[^`]+`)/).map((p, i) => (p.startsWith('**') ? <b key={i}>{p.slice(2, -2)}</b> : p.startsWith('`') ? <code key={i}>{p.slice(1, -1)}</code> : p));
  const blocks: React.ReactNode[] = []; let list: string[] = []; const flush = () => { if (list.length) { blocks.push(<ul key={blocks.length}>{list.map((l, i) => <li key={i}>{inline(l)}</li>)}</ul>); list = []; } };
  for (const line of md.split('\n')) { if (line.startsWith('- ')) { list.push(line.slice(2)); continue; } flush(); if (line.startsWith('### ')) blocks.push(<h3 key={blocks.length}>{line.slice(4)}</h3>); else if (line.startsWith('## ')) blocks.push(<h2 key={blocks.length}>{line.slice(3)}</h2>); else if (line.startsWith('# ')) blocks.push(<h1 key={blocks.length}>{line.slice(2)}</h1>); else if (line.trim()) blocks.push(<p key={blocks.length}>{inline(line)}</p>); } flush();
  return <div className="panel manual"><p className="help"><a href="/api/export/manuale.md">Scarica in Markdown</a></p>{blocks}</div>;
}
