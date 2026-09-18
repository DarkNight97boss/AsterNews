import 'server-only';
import { listRecords } from './records';
import type { ReadingPath } from './actions-paths';

export async function allPaths() { return listRecords<ReadingPath>('path', { status: 'approved', limit: 100 }); }
