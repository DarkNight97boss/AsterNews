import type { Metadata } from 'next';
import { ReaderRecoverForm } from '../recover-forms';

export const metadata: Metadata = { title: 'Recupera password', robots: { index: false } };
export default function ReaderRecoverPage() { return <ReaderRecoverForm />; }
