import { Routes } from '@angular/router';
import { authGuard, permissionGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./features/auth/login.component').then((m) => m.LoginComponent),
  },
  {
    path: 'admin',
    canActivate: [authGuard],
    loadComponent: () => import('./features/admin/layout/admin-layout.component').then((m) => m.AdminLayoutComponent),
    children: [
      { path: '', loadComponent: () => import('./features/admin/dashboard/dashboard.component').then((m) => m.DashboardComponent) },
      { path: 'articoli', loadComponent: () => import('./features/admin/articles/articles-list.component').then((m) => m.ArticlesListComponent) },
      { path: 'articoli/nuovo', loadComponent: () => import('./features/admin/editor/article-editor.component').then((m) => m.ArticleEditorComponent) },
      { path: 'articoli/:id', loadComponent: () => import('./features/admin/editor/article-editor.component').then((m) => m.ArticleEditorComponent) },
      { path: 'categorie', canActivate: [permissionGuard('category.manage')], loadComponent: () => import('./features/admin/categories/categories.component').then((m) => m.CategoriesComponent) },
      { path: 'tag', canActivate: [permissionGuard('tag.manage')], loadComponent: () => import('./features/admin/tags/tags.component').then((m) => m.TagsComponent) },
      { path: 'media', loadComponent: () => import('./features/admin/media/media.component').then((m) => m.MediaComponent) },
      { path: 'commenti', canActivate: [permissionGuard('comment.moderate')], loadComponent: () => import('./features/admin/comments/comments.component').then((m) => m.CommentsComponent) },
      { path: 'newsletter', canActivate: [permissionGuard('comment.moderate')], loadComponent: () => import('./features/admin/settings/newsletter.component').then((m) => m.NewsletterComponent) },
      { path: 'utenti', canActivate: [permissionGuard('user.manage')], loadComponent: () => import('./features/admin/users/users.component').then((m) => m.UsersComponent) },
      { path: 'impostazioni', canActivate: [permissionGuard('settings.manage')], loadComponent: () => import('./features/admin/settings/settings.component').then((m) => m.SettingsComponent) },
    ],
  },
  {
    path: '',
    loadComponent: () => import('./features/public/layout/public-layout.component').then((m) => m.PublicLayoutComponent),
    children: [
      { path: '', loadComponent: () => import('./features/public/home/home.component').then((m) => m.HomeComponent) },
      { path: 'notizie', loadComponent: () => import('./features/public/archive/archive.component').then((m) => m.ArchiveComponent) },
      { path: 'cerca', loadComponent: () => import('./features/public/search/search.component').then((m) => m.SearchComponent) },
      { path: 'tag/:slug', loadComponent: () => import('./features/public/tag/tag.component').then((m) => m.TagComponent) },
      { path: 'autore/:id', loadComponent: () => import('./features/public/author/author.component').then((m) => m.AuthorComponent) },
      { path: '404', loadComponent: () => import('./features/public/not-found/not-found.component').then((m) => m.NotFoundComponent) },
      { path: ':categorySlug', loadComponent: () => import('./features/public/category/category.component').then((m) => m.CategoryComponent) },
      { path: ':categorySlug/:articleSlug', loadComponent: () => import('./features/public/article/article.component').then((m) => m.ArticleComponent) },
      { path: '**', loadComponent: () => import('./features/public/not-found/not-found.component').then((m) => m.NotFoundComponent) },
    ],
  },
];
