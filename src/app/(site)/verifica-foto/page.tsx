import type { Metadata } from 'next';
import { PhotoVerify } from '@/components/site/photo-verify';

export const metadata: Metadata = { title: 'Verifica una foto', description: 'Hai una foto che dicono essere nostra? Controlla qui: calcoliamo l\'impronta nel tuo browser e diciamo se e quando l\'abbiamo pubblicata.' };
export default function PhotoVerifyPage() { return <div className="account" style={{ maxWidth: 680 }}><div className="account-card trust-page"><h1>Verifica una foto</h1><p className="lead">Ogni foto che carichiamo ha un&apos;impronta e una firma. Scegli il file (resta nel tuo browser: calcoliamo solo l&apos;impronta) oppure incolla l&apos;indirizzo dell&apos;immagine.</p><PhotoVerify /></div></div>; }
