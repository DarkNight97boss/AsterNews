import { Article, Role, User } from './models';

export type Permission =
  | 'article.create' | 'article.edit.any' | 'article.publish' | 'article.delete'
  | 'category.manage' | 'tag.manage' | 'media.manage' | 'comment.moderate' | 'user.manage' | 'settings.manage';

const PERMISSIONS: Record<Role, Permission[]> = {
  admin: ['article.create', 'article.edit.any', 'article.publish', 'article.delete', 'category.manage', 'tag.manage', 'media.manage', 'comment.moderate', 'user.manage', 'settings.manage'],
  editor: ['article.create', 'article.edit.any', 'article.publish', 'article.delete', 'category.manage', 'tag.manage', 'media.manage', 'comment.moderate'],
  author: ['article.create', 'article.publish', 'tag.manage', 'media.manage'],
  contributor: ['article.create', 'media.manage'],
};

export const can = (u: User | null | undefined, p: Permission): boolean => !!u && PERMISSIONS[u.role].includes(p);
export const canEdit = (u: User | null | undefined, a: Article): boolean => can(u, 'article.edit.any') || a.authorId === u?.id;
export const canPublish = (u: User | null | undefined, a: Article): boolean => can(u, 'article.publish') && canEdit(u, a);
export const permissionsOf = (u: User): Permission[] => PERMISSIONS[u.role];
