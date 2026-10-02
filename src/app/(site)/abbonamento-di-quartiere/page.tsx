import type { Metadata } from 'next';
import { NeighbourPlan } from '@/components/site/neighbour-plan';

export const metadata: Metadata = { title: 'Abbonamento di quartiere', description: 'Un gruppo di vicini condivide un abbonamento: una sola carta, un codice a testa.' };
export default function NeighbourPage() { return <div className="account" style={{ maxWidth: 640 }}><div className="account-card trust-page"><h1>Abbonamento di quartiere</h1><p className="lead">Nel condominio, nella via, nel gruppo del quartiere: uno paga per tutti, con lo sconto del gruppo, e ognuno riceve un codice personale. Nessuna password condivisa.</p><NeighbourPlan /></div></div>; }
