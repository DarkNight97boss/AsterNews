export type Role = 'admin' | 'editor' | 'author' | 'contributor';
export type ArticleStatus = 'draft' | 'review' | 'scheduled' | 'published' | 'archived';
export type ArticleFormat = 'standard' | 'video' | 'gallery' | 'live';
export type CommentStatus = 'pending' | 'approved' | 'rejected' | 'spam';

export type CategoryKind = 'standard' | 'local' | 'opinion' | 'dossier';

export interface Category {
  id: string;
  slug: string;
  name: string;
  kind: CategoryKind;
  color: string;
  description: string;
  order: number;
  showInMenu: boolean;
  showOnHome: boolean;
}

export interface Tag {
  id: string;
  slug: string;
  name: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  avatar: string;
  bio: string;
  active: boolean;
  createdAt: string;
}

export interface LiveUpdate {
  id: string;
  time: string;
  title: string;
  body: string;
}

export interface SeoMeta {
  title: string;
  description: string;
  canonical: string;
  noIndex: boolean;
}

export interface Article {
  id: string;
  slug: string;
  kicker: string;
  title: string;
  subtitle: string;
  excerpt: string;
  content: string;
  coverImage: string;
  coverCaption: string;
  categoryId: string;
  tagIds: string[];
  authorId: string;
  zoneId: string;
  address: string;
  status: ArticleStatus;
  format: ArticleFormat;
  videoUrl: string;
  gallery: string[];
  liveUpdates: LiveUpdate[];
  liveActive: boolean;
  featured: boolean;
  breaking: boolean;
  sponsored: boolean;
  allowComments: boolean;
  seo: SeoMeta;
  views: number;
  publishedAt: string | null;
  scheduledAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Comment {
  id: string;
  articleId: string;
  authorName: string;
  email: string;
  body: string;
  status: CommentStatus;
  createdAt: string;
}

export interface MediaItem {
  id: string;
  name: string;
  url: string;
  alt: string;
  type: 'image' | 'video';
  size: number;
  uploadedBy: string;
  createdAt: string;
}

export interface Subscriber {
  id: string;
  email: string;
  createdAt: string;
}

export interface SiteSettings {
  siteName: string;
  tagline: string;
  description: string;
  ticker: string[];
  tickerEnabled: boolean;
  homeSections: string[];
  articlesPerPage: number;
  subscribeUrl: string;
  weatherCity: string;
  weatherLat: number;
  weatherLon: number;
  googleNewsUrl: string;
  socials: { facebook: string; instagram: string; x: string; youtube: string; telegram: string };
  footerText: string;
  commentsModeration: boolean;
}

export interface ActivityEntry {
  id: string;
  userId: string;
  action: string;
  target: string;
  createdAt: string;
}

export type ZoneKind = 'comune' | 'zona';
export interface Zone {
  id: string;
  slug: string;
  name: string;
  kind: ZoneKind;
}

export type EventType = 'concerti' | 'mostre' | 'teatro' | 'sagre' | 'cinema' | 'feste' | 'sport' | 'incontri' | 'bambini' | 'altro';
export type EventStatus = 'pending' | 'published' | 'archived';
export interface Event {
  id: string;
  slug: string;
  title: string;
  description: string;
  type: EventType;
  dateFrom: string;
  dateTo: string | null;
  timeInfo: string;
  place: string;
  address: string;
  zoneId: string;
  price: string;
  free: boolean;
  image: string;
  rating: number;
  status: EventStatus;
  submittedBy: string;
  createdAt: string;
}

export type ReportStatus = 'new' | 'progress' | 'published' | 'archived';
export interface Report {
  id: string;
  name: string;
  email: string;
  zoneId: string;
  subject: string;
  body: string;
  image: string;
  status: ReportStatus;
  reply: string;
  createdAt: string;
}

export interface Database {
  version: number;
  zones: Zone[];
  events: Event[];
  reports: Report[];
  categories: Category[];
  tags: Tag[];
  users: User[];
  articles: Article[];
  comments: Comment[];
  media: MediaItem[];
  subscribers: Subscriber[];
  settings: SiteSettings;
  activity: ActivityEntry[];
}

export const STATUS_LABELS: Record<ArticleStatus, string> = {
  draft: 'Bozza',
  review: 'In revisione',
  scheduled: 'Programmato',
  published: 'Pubblicato',
  archived: 'Archiviato',
};

export const FORMAT_LABELS: Record<ArticleFormat, string> = {
  standard: 'Articolo',
  video: 'Video',
  gallery: 'Fotogallery',
  live: 'Diretta',
};

export const ROLE_LABELS: Record<Role, string> = {
  admin: 'Amministratore',
  editor: 'Caporedattore',
  author: 'Redattore',
  contributor: 'Collaboratore',
};

export const COMMENT_STATUS_LABELS: Record<CommentStatus, string> = {
  pending: 'In attesa',
  approved: 'Approvato',
  rejected: 'Rifiutato',
  spam: 'Spam',
};

export const CATEGORY_KIND_LABELS: Record<CategoryKind, string> = {
  standard: 'Notizie',
  local: 'Dalle città (occhiello = città)',
  opinion: 'Opinioni (firma in evidenza)',
  dossier: 'Dossier (badge giallo)',
};

export const EVENT_TYPE_LABELS: Record<EventType, string> = {
  concerti: 'Concerti', mostre: 'Mostre', teatro: 'Teatri', sagre: 'Sagre', cinema: 'Cinema', feste: 'Disco & Feste', sport: 'Sport', incontri: 'Incontri', bambini: 'Bambini', altro: 'Altro',
};
export const EVENT_STATUS_LABELS: Record<EventStatus, string> = { pending: 'Da approvare', published: 'Pubblicato', archived: 'Archiviato' };
export const REPORT_STATUS_LABELS: Record<ReportStatus, string> = { new: 'Nuova', progress: 'In lavorazione', published: 'Pubblicata', archived: 'Archiviata' };
export const ZONE_KIND_LABELS: Record<ZoneKind, string> = { comune: 'Comune', zona: 'Zona / quartiere' };
