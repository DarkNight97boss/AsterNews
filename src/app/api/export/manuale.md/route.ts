import { getCurrentUser } from '@/lib/auth';
import { manualMarkdown } from '@/lib/platform-data';

export const dynamic = 'force-dynamic';
export async function GET() { if (!(await getCurrentUser())) return new Response('Accedi prima.', { status: 401 }); return new Response(await manualMarkdown(), { headers: { 'Content-Type': 'text/markdown; charset=utf-8', 'Content-Disposition': 'attachment; filename="manuale.md"' } }); }
