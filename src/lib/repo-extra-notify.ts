import 'server-only';
import { listUsers } from './repo';
import { insertNotification } from './repo-extra3';
import { rolePermissions } from './permissions';
import { User } from './models';
import { uid } from './utils';

/** Notifica in-app a tutti i redattori che possono pubblicare (tranne chi ha compiuto l'azione). */
export async function notifyPublishers(from: User, text: string, url: string): Promise<void> {
  for (const u of await listUsers()) { if (u.id === from.id || !u.active || !rolePermissions(u.role).includes('article.publish')) continue; await insertNotification({ id: uid('nf'), userId: u.id, kind: 'review', text, url, read: false, createdAt: new Date().toISOString() }); }
}
