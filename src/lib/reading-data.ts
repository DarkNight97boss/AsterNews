import 'server-only';
import { listRecords } from './records';
import { mindShift, topHighlights, type Stance } from './reading';

export async function highlightsFor(articleId: string) { return topHighlights((await listRecords<{ text: string }>('highlight', { ref: articleId, limit: 1500 })).map((r) => r.data.text)); }
export async function mindStats(articleId: string) { return mindShift((await listRecords<{ before: Stance; after: Stance }>('mind', { ref: articleId, limit: 5000 })).map((r) => r.data)); }
