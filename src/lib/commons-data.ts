import 'server-only';
import { listRecords, type Rec } from './records';
import { COMMUNITY, publicData } from './community';

/** Contributi approvati, già ripuliti dai campi privati (nome, email, gettoni): è l'unica porta da cui le pagine pubbliche li leggono. */
export async function approvedOf(kind: string, opts: { ref?: string; withDone?: boolean; limit?: number } = {}): Promise<Rec<Record<string, string>>[]> { const def = COMMUNITY[kind]; const list = await listRecords<Record<string, string>>(kind, { ref: opts.ref, status: opts.withDone ? ['approved', 'done'] : 'approved', limit: opts.limit ?? 200 }); return def ? list.map((r) => ({ ...r, data: publicData(def, r.data) })) : list; }
