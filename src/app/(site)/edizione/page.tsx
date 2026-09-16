import { redirect } from 'next/navigation';
export default function EditionToday() { redirect(`/edizione/${new Date().toISOString().slice(0, 10)}`); }
