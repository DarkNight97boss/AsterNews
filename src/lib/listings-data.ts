import 'server-only';
import { DEFAULT_LISTINGS } from './models';
import { getSettings } from './queries';

export async function listingsSettings() { return { ...DEFAULT_LISTINGS, ...((await getSettings()).listings ?? {}) }; }
