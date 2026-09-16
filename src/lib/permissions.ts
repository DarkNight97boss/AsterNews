import { Article, Role, User } from './models';

export type Permission =
  | 'article.create' | 'article.edit.any' | 'article.publish' | 'article.delete'
  | 'category.manage' | 'tag.manage' | 'media.manage' | 'comment.moderate' | 'user.manage' | 'settings.manage'
  | 'audit.view' | 'redirect.manage' | 'newsletter.send' | 'stats.view' | 'article.assign';

const PERMISSIONS: Record<Role, Permission[]> = {
  admin: ['article.create', 'article.edit.any', 'article.publish', 'article.delete', 'category.manage', 'tag.manage', 'media.manage', 'comment.moderate', 'user.manage', 'settings.manage', 'audit.view', 'redirect.manage', 'newsletter.send', 'stats.view', 'article.assign'],
  editor: ['article.create', 'article.edit.any', 'article.publish', 'article.delete', 'category.manage', 'tag.manage', 'media.manage', 'comment.moderate', 'audit.view', 'redirect.manage', 'newsletter.send', 'stats.view', 'article.assign'],
  author: ['article.create', 'article.publish', 'tag.manage', 'media.manage', 'stats.view'],
  contributor: ['article.create', 'media.manage'],
};

type G = typeof globalThis & { __asterPermOverrides?: Record<string, string[]> };
/** Permessi per ruolo personalizzati (Utenti e ruoli): l'amministratore ha sempre tutto. */
export function setPermissionOverrides(o: Record<string, string[]>): void { (globalThis as G).__asterPermOverrides = o; }
export const ALL_PERMISSIONS: Permission[] = PERMISSIONS.admin;
export const PERMISSION_LABELS: Record<Permission, string> = { 'article.create': 'Creare articoli', 'article.edit.any': 'Modificare articoli altrui', 'article.publish': 'Pubblicare', 'article.delete': 'Eliminare articoli', 'category.manage': 'Categorie e zone', 'tag.manage': 'Tag', 'media.manage': 'Media', 'comment.moderate': 'Commenti, lettori, segnalazioni', 'user.manage': 'Utenti e ruoli', 'settings.manage': 'Impostazioni e sistema', 'audit.view': 'Registro attività', 'redirect.manage': 'Redirect e link', 'newsletter.send': 'Newsletter e social', 'stats.view': 'Statistiche', 'article.assign': 'Assegnare articoli' };
export const rolePermissions = (role: Role): Permission[] => (role === 'admin' ? PERMISSIONS.admin : ((globalThis as G).__asterPermOverrides?.[role] as Permission[] | undefined) ?? PERMISSIONS[role]);
export const can = (u: User | null | undefined, p: Permission): boolean => !!u && rolePermissions(u.role).includes(p);
export const canEdit = (u: User | null | undefined, a: Article): boolean => can(u, 'article.edit.any') || a.authorId === u?.id;
export const canPublish = (u: User | null | undefined, a: Article): boolean => can(u, 'article.publish') && canEdit(u, a);
export const permissionsOf = (u: User): Permission[] => rolePermissions(u.role);
