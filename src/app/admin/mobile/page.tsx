import { requireUser } from '@/lib/auth';
import { MobileUpload } from '@/components/admin/mobile-upload';

export const metadata = { title: 'Invia dal telefono' };
/** Pagina leggera per il telefono: scatta o scegli foto, geolocalizza, carica e apri subito «Scrivi». */
export default async function MobilePage() { await requireUser(); return <MobileUpload />; }
