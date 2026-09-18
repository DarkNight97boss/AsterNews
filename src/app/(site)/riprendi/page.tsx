import type { Metadata } from 'next';
import { ResumeForm } from '@/components/site/resume-form';

export const metadata: Metadata = { title: 'Riprendi da dove eri', description: 'Continua la lettura su un altro dispositivo con un codice di tre parole, senza account.', robots: { index: false } };
export default function ResumePage() { return <div className="account" style={{ maxWidth: 520 }}><div className="account-card trust-page"><h1>Riprendi da dove eri</h1><p className="lead">Hai iniziato a leggere sul telefono e vuoi finire al computer? In ogni articolo «📍 Continua altrove» ti dà tre parole: scrivile qui. Nessun account, nessuna email.</p><ResumeForm /></div></div>; }
