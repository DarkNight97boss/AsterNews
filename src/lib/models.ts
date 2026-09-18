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
  description?: string;
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
  title?: string;
  longBio?: string;
  socials?: Record<string, string>;
  totpEnabled?: boolean;
  hasPassword?: boolean;
  mustChangePassword?: boolean;
  lastLogin?: string | null;
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
  focusKeyword?: string;
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
  seoScore?: number;
  seoReport?: string[];
  legacyUrl?: string;
  assignedTo?: string;
  deadline?: string | null;
  premium?: boolean;
  editionId?: string;
  faq?: { q: string; a: string }[];
  socialText?: string;
  deletedAt?: string | null;
  coauthorIds?: string[];
  byline?: string;
  extra?: ArticleExtra;
  publishedAt: string | null;
  scheduledAt: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Dati aggiuntivi dell'articolo (una colonna JSON, così le funzioni nuove non richiedono nuove colonne). */
export interface ArticleExtra { fields?: Record<string, string>; corrections?: { date: string; text: string }[]; showHistory?: boolean; template?: string; titleB?: string; abStats?: { a: number; b: number; ca: number; cb: number; winner?: 'a' | 'b' }; audioUrl?: string; audioDuration?: number; lang?: string; translationOf?: string; translations?: Record<string, string>; stage?: number; deskId?: string; slots?: { homeFrom?: string; homeTo?: string; socialAt?: string; newsletterAt?: string }; wordsTarget?: number; circle?: string; aiUsed?: string[]; hideBlackBox?: boolean; embargoUntil?: string; sources?: { name: string; contact: string; note: string; verified: boolean }[]; podcast?: { chapters?: { time: string; title: string }[]; episode?: number }; label?: { kind?: ArticleKindLabel; onSite?: boolean; docs?: number }; conflict?: string; verification?: { state: VerificationState; note?: string; at?: string }; openQuestions?: string[]; signature?: { hash: string; sig: string; at: string }; titles?: { home?: string; social?: string; newsletter?: string }; expiring?: { text: string; date: string; done?: boolean; reminded?: boolean }[]; abandoned?: { why: string; at: string }; certainty?: { show?: boolean; map: { s: string; level: 1 | 2 | 3 }[] } }
export type ArticleKindLabel = 'cronaca' | 'analisi' | 'opinione' | 'inchiesta' | 'comunicato' | 'intervista' | 'satira';
export type VerificationState = 'confirmed' | 'developing' | 'unverified' | 'denied';
export interface TrustSettings { funding?: { label: string; percent: number; note?: string }[]; fundingYear?: string; commitments?: { text: string; state: 'kept' | 'progress' | 'missed'; note?: string }[]; disclosures?: Record<string, string>; replyEnabled?: boolean }
export interface CustomField { key: string; label: string; type: 'text' | 'number' | 'date' | 'url' | 'rating' | 'select'; options?: string }
export interface Snippet { id: string; name: string; html: string; updatedAt: string }
export interface Desk { id: string; name: string; categoryIds: string[]; userIds: string[] }
export interface WorkflowRule { id: string; name: string; enabled: boolean; if: { categoryId?: string; format?: ArticleFormat; tagId?: string; zoneId?: string; hasVideo?: boolean; titleContains?: string }; then: { featured?: boolean; breaking?: boolean; premium?: boolean; tagId?: string; kicker?: string; social?: string[] } }
export interface WorkflowSettings { desks: Desk[]; steps: string[]; rules: WorkflowRule[] }
export const DEFAULT_WORKFLOW: WorkflowSettings = { desks: [], steps: [], rules: [] };
export interface HomeBlock { id: string; type: 'latest' | 'category' | 'tag' | 'zone' | 'format' | 'events' | 'mostread' | 'newsletter' | 'html'; title: string; sourceId: string; layout: 'grid4' | 'grid3' | 'grid2' | 'list' | 'band'; count: number; html?: string }
export interface ThemeVersion { id: string; at: string; label: string; theme: ThemeSettings }
export interface PageExtra { brand?: string; countdownAt?: string; countdownLabel?: string; feedTagId?: string; feedCount?: number; ctaLabel?: string; ctaUrl?: string }
export interface TagFollow { id: string; tagId: string; email: string; readerId: string; token: string; createdAt: string }
export interface Ticket { id: string; eventId: string; name: string; email: string; qty: number; code: string; status: 'pending' | 'paid'; amount: number; createdAt: string; usedAt: string | null }
export interface AdOrder { id: string; adId: string; company: string; email: string; amount: number; days: number; status: 'pending' | 'paid'; createdAt: string }
export interface CircleInvite { token: string; circleId: string; maxUses: number; uses: number; revoked: boolean; createdAt: string }
export interface WebhookConfig { id: string; url: string; secret: string; events: string[]; enabled: boolean }
export interface Contact { id: string; name: string; role: string; org: string; phone: string; email: string; notes: string; tags: string; createdBy: string; updatedAt: string }
export interface Comment {
  id: string;
  articleId: string;
  authorName: string;
  email: string;
  body: string;
  status: CommentStatus;
  createdAt: string;
  readerId?: string;
  parentId?: string;
  flags?: number;
  votes?: number;
  staff?: boolean;
  priority?: number;
  aiNote?: string;
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
  provider?: string;
  path?: string;
  width?: number;
  height?: number;
  variants?: Record<string, string>;
  focalX?: number;
  focalY?: number;
  folder?: string; tags?: string; credit?: string; license?: string; rightsUntil?: string; hash?: string; exclusive?: boolean; lat?: number; lon?: number; deletedAt?: string | null;
}

export interface Subscriber {
  id: string;
  email: string;
  createdAt: string;
  status?: 'pending' | 'confirmed' | 'unsubscribed';
  token?: string;
  confirmedAt?: string | null;
  source?: string;
}

export interface Session { id: string; userId: string; kind: 'staff' | 'reader'; createdAt: string; lastSeen: string; expiresAt: string; userAgent: string; ip: string; revoked: boolean }
export interface Revision { id: string; articleId: string; userId: string; note: string; data: Article; createdAt: string }
export interface ArticleNote { id: string; articleId: string; userId: string; kind: 'note' | 'changes' | 'system' | 'reader'; body: string; resolved: boolean; createdAt: string; quote?: string }
export interface Reader { id: string; email: string; name: string; verified: boolean; premium: boolean; premiumUntil: string | null; stripeCustomer: string; banned: boolean; createdAt: string; lastLogin: string | null; provider?: string; avatar?: string; prefs?: ReaderPrefs }
export interface ReaderPrefs { zones?: string[]; tags?: string[]; categories?: string[]; public?: boolean; circles?: string[] }
export interface Redirect { id: string; fromPath: string; toPath: string; code: number; hits: number; createdAt: string }
export interface NotFoundEntry { path: string; hits: number; referer: string; firstSeen: string; lastSeen: string }
export interface Edition { id: string; slug: string; name: string; domain: string; tagline: string; zoneId: string; categoryIds: string[]; theme: Partial<import('./themes').ThemeSettings>; logo: string; active: boolean; createdAt: string }
export interface ErrorEntry { id: string; digest: string; message: string; stack: string; path: string; count: number; firstSeen: string; lastSeen: string }
export interface Poll { id: string; articleId: string; question: string; options: string[]; votes: number[]; createdAt: string }
export interface NewsletterSend { id: string; subject: string; kind: string; recipients: number; sentAt: string; status: string; message: string; listId?: string; opens?: number; clicks?: number }
export type NewsletterBlock = { id: string; type: 'header' | 'text' | 'articles' | 'image' | 'button' | 'divider' | 'events' | 'weather'; text?: string; title?: string; url?: string; image?: string; filter?: { categoryId?: string; zoneId?: string; tagId?: string; limit?: number; hours?: number; featured?: boolean }; layout?: 'list' | 'cards' };
export interface Newsletter { id: string; slug: string; name: string; description: string; kind: 'digest' | 'zone' | 'tag' | 'category' | 'manual'; config: { categoryId?: string; zoneId?: string; tagId?: string; hours?: number; subject?: string }; blocks: NewsletterBlock[]; schedule: { hour: number; days: number[]; enabled: boolean }; enabled: boolean; isDefault: boolean; createdAt: string }
export type SocialNetwork = 'facebook' | 'telegram' | 'x' | 'webhook';
export interface SocialPost { id: string; articleId: string; network: SocialNetwork; status: 'queued' | 'sent' | 'failed' | 'cancelled'; text: string; image: string; url: string; scheduledAt: string | null; sentAt: string | null; result: string; createdBy: string; createdAt: string }
export interface Ad { id: string; slot: string; name: string; type: 'image' | 'html' | 'adsense'; image: string; url: string; html: string; label: string; startAt: string | null; endAt: string | null; weight: number; impressions: number; clicks: number; active: boolean; createdAt: string }
export type ListingKind = 'annuncio' | 'necrologio';
export interface Listing { id: string; kind: ListingKind; title: string; body: string; image: string; category: string; price: string; contactName: string; contactEmail: string; contactPhone: string; zoneId: string; status: 'pending' | 'published' | 'rejected' | 'expired'; paid: boolean; amount: number; expiresAt: string | null; readerId: string; createdAt: string; publishedAt: string | null; extra: Record<string, string> }
export interface Page { id: string; slug: string; title: string; content: string; excerpt: string; status: 'draft' | 'published'; template: 'standard' | 'landing' | 'wide'; coverImage: string; seo: SeoMeta; showInMenu: boolean; menuOrder: number; authorId: string; createdAt: string; updatedAt: string; extra?: PageExtra }
export interface MenuItem { id: string; label: string; url: string; children?: MenuItem[] }
export interface MenusSettings { header: MenuItem[]; footer: MenuItem[]; useCustomHeader: boolean }
export interface DonationsSettings { enabled: boolean; title: string; text: string; amounts: number[]; thanks: string }
export interface ApiSettings { enabled: boolean; requireKey: boolean; rateLimitPerMinute: number }
export interface RolesSettings { overrides: Partial<Record<Role, string[]>> }
export interface OnboardingSettings { dismissed: boolean }
export interface PerformanceSettings { psiApiKey: string; frequency: 'off' | 'daily' | 'weekly'; desktop: boolean; threshold: number; pages: string; alerts: boolean }
export interface PageSpeedOpportunity { id: string; title: string; displayValue: string; savingsKb: number; savingsMs: number; items: string[] }
export interface PageSpeedRun { id: string; url: string; strategy: 'mobile' | 'desktop'; performance: number; accessibility: number; bestPractices: number; seo: number; lcp: number; cls: number; tbt: number; fcp: number; si: number; opportunities: PageSpeedOpportunity[]; createdAt: string }
export const DEFAULT_PERFORMANCE: PerformanceSettings = { psiApiKey: '', frequency: 'weekly', desktop: true, threshold: 90, pages: '', alerts: true };
export interface Donation { id: string; amount: number; name: string; email: string; message: string; status: 'pending' | 'paid' | 'failed'; readerId: string; createdAt: string; paidAt: string | null }
export interface ApiKey { id: string; name: string; prefix: string; scopes: string[]; active: boolean; calls: number; lastUsed: string | null; createdBy: string; createdAt: string }
export interface BrokenLink { id: string; articleId: string; url: string; status: number; error: string; checkedAt: string; fixed: boolean }
export interface Notification { id: string; userId: string; kind: string; text: string; url: string; read: boolean; createdAt: string }
export const DEFAULT_MENUS: MenusSettings = { header: [], footer: [], useCustomHeader: false };
export const DEFAULT_DONATIONS: DonationsSettings = { enabled: false, title: 'Sostieni il giornalismo locale', text: 'Con un piccolo contributo aiuti la redazione a restare libera e indipendente.', amounts: [3, 5, 10, 25], thanks: 'Grazie di cuore! Il tuo sostegno fa la differenza.' };
export const DEFAULT_API: ApiSettings = { enabled: true, requireKey: false, rateLimitPerMinute: 120 };
export const AD_SLOTS: { id: string; name: string; size: string }[] = [{ id: 'home_top', name: 'Home – sopra l\'apertura', size: '970×250 / 728×90' }, { id: 'sidebar_300', name: 'Colonna destra', size: '300×250' }, { id: 'article_inline', name: 'Dentro l\'articolo (dopo il 3° paragrafo)', size: '728×90 / 300×250' }, { id: 'article_bottom', name: 'Fine articolo', size: '728×90' }, { id: 'newsletter', name: 'Newsletter', size: '600×150' }];
export const LISTING_CATEGORIES = ['Casa e immobili', 'Auto e moto', 'Lavoro', 'Oggetti e arredo', 'Animali', 'Servizi', 'Corsi e lezioni', 'Altro'];
export interface BackupEntry { id: string; createdAt: string; size: number; url: string; note: string }
export interface HitRow { day: string; hour: number; path: string; articleId: string; source: string; count: number; readMs: number }

export interface NewsletterSettings { provider: 'none' | 'resend' | 'brevo'; apiKey: string; fromEmail: string; fromName: string; digestEnabled: boolean; digestHour: number; doubleOptIn: boolean }
export interface StorageSettings { provider: 'auto' | 'supabase' | 'vercel-blob' | 'local' | 'db'; bucket: string; maxWidth: number; unsplashKey?: string; pexelsKey?: string }
export interface VideoSettings { provider: 'none' | 'cloudflare' | 'mux'; cfAccountId: string; cfApiToken: string; cfCustomerCode: string; muxTokenId: string; muxTokenSecret: string }
export const DEFAULT_VIDEO: VideoSettings = { provider: 'none', cfAccountId: '', cfApiToken: '', cfCustomerCode: '', muxTokenId: '', muxTokenSecret: '' };
export interface PaywallPlan { id: string; name: string; price: number; interval: 'month' | 'year' | 'once'; stripePriceId: string; description: string; highlight?: boolean; trialDays?: number }
export interface PaywallSettings { enabled: boolean; freeArticles: number; monthlyPrice: number; stripeSecretKey: string; stripePriceId: string; stripeWebhookSecret: string; plans?: PaywallPlan[]; paymentMethods?: string[] }
export interface GiftCode { id: string; code: string; email: string; months: number; message: string; fromReader: string; redeemedBy: string; createdAt: string; redeemedAt: string | null }
export interface QuizResult { id: string; quizId: string; articleId: string; who: string; name: string; score: number; total: number; createdAt: string }
export interface CommunitySettings { commentsRequireAccount: boolean; blockedWords: string; flagsToHide: number; registrationWallAfter?: number }
export interface MonitoringSettings { alertEmail: string; webhookUrl: string; slowQueryMs: number; sentryDsn: string }
export interface AnalyticsSettings { enabled: boolean; vercelAnalytics: boolean }
export interface PushSettings { enabled: boolean; autoBreaking: boolean }
export interface CacheSettings { enabled: boolean; seconds: number }
export interface SearchSettings { synonyms: string }
export interface BackupSettings { enabled: boolean; keep: number }
export interface SocialSettings { facebookPageId: string; facebookToken: string; telegramBotToken: string; telegramChatId: string; xApiKey: string; xApiSecret: string; xAccessToken: string; xAccessSecret: string; webhookUrl: string; autoNetworks: SocialNetwork[]; template: string; hashtagsFromTags: boolean }
export interface AuthSettings { googleClientId: string; googleClientSecret: string; facebookAppId: string; facebookAppSecret: string; magicLink: boolean; staffGoogleDomains?: string; microsoftTenantId?: string; microsoftClientId?: string; microsoftClientSecret?: string }
export interface AdsSettings { enabled: boolean; adsenseClient: string; autoAds: boolean; label: string; houseAdsOnly: boolean }
export interface ListingsSettings { enabled: boolean; priceAnnuncio: number; priceNecrologio: number; days: number; moderation: boolean; freeForReaders: boolean }
export interface AiSettings { enabled: boolean; apiKey: string; model: string; style: string; autoAltText: boolean; autoSummary: boolean; transcribeProvider?: 'none' | 'openai' | 'deepgram'; transcribeKey?: string; moderation?: boolean; ttsProvider?: 'none' | 'openai' | 'elevenlabs'; ttsKey?: string; ttsVoice?: string; ttsAuto?: boolean; embeddingsProvider?: 'none' | 'openai' | 'voyage'; embeddingsKey?: string; monthlyBudget?: number; priceIn?: number; priceOut?: number }
export interface UpdatesSettings { repo: string; channel: 'stable' | 'beta'; deployHookUrl: string; stagingHookUrl?: string; vercelToken?: string; vercelProjectId?: string }
export interface PrivacySettings { policyVersion: number; geoLookup: boolean; dpaNote: string }
export interface ExtensionsSettings { enabled: string[]; config: Record<string, Record<string, string>> }

import type { ThemeSettings } from './themes';
import type { SeoSettings } from './seo-engine';

export interface SiteSettings {
  theme: ThemeSettings;
  seo?: SeoSettings;
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
  newsletter?: NewsletterSettings;
  storage?: StorageSettings;
  paywall?: PaywallSettings;
  community?: CommunitySettings;
  monitoring?: MonitoringSettings;
  analytics?: AnalyticsSettings;
  push?: PushSettings;
  cache?: CacheSettings;
  search?: SearchSettings;
  backup?: BackupSettings;
  language?: string;
  social?: SocialSettings;
  auth?: AuthSettings;
  ads?: AdsSettings;
  listings?: ListingsSettings;
  ai?: AiSettings;
  updates?: UpdatesSettings;
  extensions?: ExtensionsSettings;
  menus?: MenusSettings;
  donations?: DonationsSettings;
  api?: ApiSettings;
  roles?: RolesSettings;
  onboarding?: OnboardingSettings;
  performance?: PerformanceSettings;
  customFields?: Record<string, CustomField[]>;
  workflow?: WorkflowSettings;
  video?: VideoSettings;
  webhooks?: WebhookConfig[];
  homeBlocks?: HomeBlock[];
  privacy?: PrivacySettings;
  maintenance?: { enabled: boolean; message: string };
  briefing?: { enabled: boolean; hour: number; feeds: string; count: number };
  adSales?: { enabled: boolean; prices: Record<string, number>; note: string };
  adapt?: import('./admin-nav').AdaptSettings;
  circles?: { id: string; name: string }[];
  trust?: TrustSettings;
  themeVersions?: ThemeVersion[];
  editionUsers?: Record<string, string[]>;
}

export const DEFAULT_NEWSLETTER: NewsletterSettings = { provider: 'none', apiKey: '', fromEmail: '', fromName: '', digestEnabled: false, digestHour: 7, doubleOptIn: true };
export const DEFAULT_STORAGE: StorageSettings = { provider: 'auto', bucket: 'media', maxWidth: 2000 };
export const DEFAULT_PAYWALL: PaywallSettings = { enabled: false, freeArticles: 5, monthlyPrice: 4.99, stripeSecretKey: '', stripePriceId: '', stripeWebhookSecret: '' };
export const DEFAULT_COMMUNITY: CommunitySettings = { commentsRequireAccount: false, blockedWords: '', flagsToHide: 3 };
export const DEFAULT_MONITORING: MonitoringSettings = { alertEmail: '', webhookUrl: '', slowQueryMs: 2000, sentryDsn: '' };
export const DEFAULT_ANALYTICS: AnalyticsSettings = { enabled: true, vercelAnalytics: false };
export const DEFAULT_PUSH: PushSettings = { enabled: true, autoBreaking: true };
export const DEFAULT_CACHE: CacheSettings = { enabled: true, seconds: 60 };
export const DEFAULT_SEARCH: SearchSettings = { synonyms: 'comune=municipio\nauto=automobile,macchina\nlavoro=occupazione\nscuola=istruzione\ncalcio=football' };
export const DEFAULT_BACKUP: BackupSettings = { enabled: false, keep: 7 };
export const DEFAULT_SOCIAL: SocialSettings = { facebookPageId: '', facebookToken: '', telegramBotToken: '', telegramChatId: '', xApiKey: '', xApiSecret: '', xAccessToken: '', xAccessSecret: '', webhookUrl: '', autoNetworks: [], template: '{kicker}: {title}\n{excerpt}\n{url}', hashtagsFromTags: true };
export const DEFAULT_AUTH: AuthSettings = { googleClientId: '', googleClientSecret: '', facebookAppId: '', facebookAppSecret: '', magicLink: true };
export const DEFAULT_ADS: AdsSettings = { enabled: true, adsenseClient: '', autoAds: false, label: 'Pubblicità', houseAdsOnly: false };
export const DEFAULT_LISTINGS: ListingsSettings = { enabled: true, priceAnnuncio: 9.9, priceNecrologio: 29, days: 30, moderation: true, freeForReaders: false };
export const DEFAULT_AI: AiSettings = { enabled: false, apiKey: '', model: 'claude-opus-5', style: 'Stile giornalistico italiano, chiaro e diretto, frasi brevi, nessuna enfasi pubblicitaria.', autoAltText: true, autoSummary: false };
export const DEFAULT_UPDATES: UpdatesSettings = { repo: 'DarkNight97boss/AsterNews', channel: 'stable', deployHookUrl: '' };
export const DEFAULT_EXTENSIONS: ExtensionsSettings = { enabled: [], config: {} };

export interface ActivityEntry {
  id: string;
  userId: string;
  action: string;
  target: string;
  createdAt: string;
  ip?: string;
  details?: string;
  articleId?: string;
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
  ticketPrice?: number;
  ticketsTotal?: number;
  ticketsSold?: number;
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
