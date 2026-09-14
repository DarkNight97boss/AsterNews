/**
 * Sistema di temi: preset + personalizzazioni. Il motore (dati, rotte, CMS) è unico;
 * il tema decide colori, font, stile dell'header, layout della home e stile delle card.
 */
export type HeaderStyle = 'today' | 'centered' | 'classic' | 'fanpage';
export type HomeLayout = 'today' | 'grid' | 'magazine' | 'fanpage';
export type Skin = 'default' | 'fanpage';
export type CardStyle = 'flat' | 'boxed';
export type FontKey = 'serif' | 'sans' | 'display' | 'condensed';

export interface ThemePreset {
  id: string;
  name: string;
  description: string;
  brand: string;
  brandDark: string;
  accent: string;
  highlight: string;
  headFont: FontKey;
  bodyFont: FontKey;
  headerStyle: HeaderStyle;
  homeLayout: HomeLayout;
  cardStyle: CardStyle;
  radius: number;
  pageBg: 'white' | 'paper';
  swatch: string[];
}

export interface ThemeSettings {
  preset: string;
  brand?: string;
  accent?: string;
  headFont?: FontKey;
  bodyFont?: FontKey;
  headerStyle?: HeaderStyle;
  homeLayout?: HomeLayout;
  cardStyle?: CardStyle;
  radius?: number;
}

export type ResolvedTheme = Omit<ThemePreset, 'swatch' | 'description'> & { presetId: string; skin: Skin };

export const FONT_LABELS: Record<FontKey, string> = { serif: 'Serif editoriale (Source Serif)', sans: 'Sans moderno (Inter)', display: 'Serif classico (Playfair Display)', condensed: 'Condensato bold (Oswald)' };
export const HEADER_LABELS: Record<HeaderStyle, string> = { today: 'Testata colorata con firme (Today)', fanpage: 'Testata nera con logo slab e barra menu (Fanpage)', centered: 'Barra scura con logo centrato', classic: 'Testata bianca da quotidiano' };
export const HOME_LABELS: Record<HomeLayout, string> = { today: 'Apertura + Dalle città + Dossier', fanpage: 'Card Fanpage: hero scuro, Flash, Ultime notizie, blocchi tema', grid: 'Griglia con foto grandi e orari', magazine: 'Magazine a mosaico' };
export const CARD_LABELS: Record<CardStyle, string> = { flat: 'Piatte con filetti', boxed: 'Riquadri con ombra' };

export const THEMES: ThemePreset[] = [
  { id: 'today', name: 'Today', description: 'Testata blu, titoli serif, occhielli rossi. Il tema di riferimento ispirato a Citynews.', brand: '#22418f', brandDark: '#182f6b', accent: '#d7262d', highlight: '#f2e600', headFont: 'serif', bodyFont: 'sans', headerStyle: 'today', homeLayout: 'today', cardStyle: 'flat', radius: 0, pageBg: 'white', swatch: ['#22418f', '#d7262d', '#f2e600', '#ffffff'] },
  { id: 'fanpage', name: 'Fanpage', description: 'Replica di Fanpage.it: cornice scura, logo slab centrato, barra menu con città, hero in card nera, Flash, Ultime notizie con orari arancio, blocchi tema, articolo a due colonne.', brand: '#1b1b1b', brandDark: '#111111', accent: '#ff4a1a', highlight: '#ffd500', headFont: 'sans', bodyFont: 'sans', headerStyle: 'fanpage', homeLayout: 'fanpage', cardStyle: 'boxed', radius: 12, pageBg: 'paper', swatch: ['#1b1b1b', '#ff4a1a', '#ffffff', '#f0f0f0'] },
  { id: 'quotidiano', name: 'Quotidiano', description: 'Testata bianca centrata, serif classico Playfair, filetti neri: l’aspetto di un giornale di carta.', brand: '#111111', brandDark: '#000000', accent: '#9b1b1b', highlight: '#e9d8a6', headFont: 'display', bodyFont: 'serif', headerStyle: 'classic', homeLayout: 'today', cardStyle: 'flat', radius: 0, pageBg: 'white', swatch: ['#111111', '#9b1b1b', '#e9d8a6', '#ffffff'] },
  { id: 'magazine', name: 'Magazine', description: 'Viola profondo e corallo, foto grandi, mosaico in home, card con ombra: per un taglio da rivista.', brand: '#3b1e6e', brandDark: '#2a1550', accent: '#ff5a5f', highlight: '#ffd166', headFont: 'condensed', bodyFont: 'sans', headerStyle: 'centered', homeLayout: 'magazine', cardStyle: 'boxed', radius: 14, pageBg: 'paper', swatch: ['#3b1e6e', '#ff5a5f', '#ffd166', '#f3f3f3'] },
  { id: 'verde', name: 'Territorio', description: 'Verde bosco e ocra, serif editoriale, header classico: adatto a testate locali e ambientali.', brand: '#1f5a3a', brandDark: '#143d27', accent: '#c46a1a', highlight: '#f2c94c', headFont: 'serif', bodyFont: 'sans', headerStyle: 'today', homeLayout: 'grid', cardStyle: 'flat', radius: 4, pageBg: 'white', swatch: ['#1f5a3a', '#c46a1a', '#f2c94c', '#ffffff'] },
  { id: 'minimal', name: 'Minimal', description: 'Bianco e nero, font sans, nessun colore se non per le dirette: sobrio e velocissimo da leggere.', brand: '#000000', brandDark: '#000000', accent: '#000000', highlight: '#e5e5e5', headFont: 'sans', bodyFont: 'sans', headerStyle: 'classic', homeLayout: 'grid', cardStyle: 'flat', radius: 0, pageBg: 'white', swatch: ['#000000', '#444444', '#e5e5e5', '#ffffff'] },
];

export const DEFAULT_THEME: ThemeSettings = { preset: 'today' };

export function presetById(id: string): ThemePreset {
  return THEMES.find((t) => t.id === id) ?? THEMES[0];
}

export function resolveTheme(s: ThemeSettings | undefined): ResolvedTheme {
  const p = presetById(s?.preset ?? 'today');
  const hex = (v: string | undefined, fallback: string) => (v && /^#[0-9a-fA-F]{6}$/.test(v) ? v : fallback);
  return {
    presetId: p.id, id: p.id, name: p.name,
    brand: hex(s?.brand, p.brand), brandDark: s?.brand && /^#[0-9a-fA-F]{6}$/.test(s.brand) ? darken(s.brand) : p.brandDark,
    accent: hex(s?.accent, p.accent), highlight: p.highlight,
    headFont: s?.headFont ?? p.headFont, bodyFont: s?.bodyFont ?? p.bodyFont,
    headerStyle: s?.headerStyle ?? p.headerStyle, homeLayout: s?.homeLayout ?? p.homeLayout, cardStyle: s?.cardStyle ?? p.cardStyle,
    radius: typeof s?.radius === 'number' ? Math.max(0, Math.min(24, s.radius)) : p.radius, pageBg: p.pageBg,
    skin: (s?.homeLayout ?? p.homeLayout) === 'fanpage' ? 'fanpage' : 'default',
  };
}

function darken(hex: string): string {
  const n = parseInt(hex.slice(1), 16);
  const f = (c: number) => Math.max(0, Math.round(c * 0.72));
  const r = f((n >> 16) & 255), g = f((n >> 8) & 255), b = f(n & 255);
  return `#${[r, g, b].map((c) => c.toString(16).padStart(2, '0')).join('')}`;
}

export const SLAB_FONT = "var(--font-slab, 'Roboto Slab'), Georgia, serif";
const FONT_VARS: Record<FontKey, string> = {
  serif: "var(--font-serif-src, 'Source Serif 4'), Georgia, serif",
  sans: "var(--font-inter, 'Inter'), system-ui, sans-serif",
  display: "var(--font-playfair, 'Playfair Display'), Georgia, serif",
  condensed: "var(--font-oswald, 'Oswald'), 'Arial Narrow', sans-serif",
};

/** CSS inline con le variabili del tema: sovrascrive i token di globals.scss. */
export function themeCss(t: ResolvedTheme): string {
  const bg = t.pageBg === 'paper' ? '--bg: #f3f3f3; --panel: #ffffff; --paper: #e9e9e9;' : '';
  const bgDark = t.pageBg === 'paper' ? '--bg: #121212; --panel: #1e1e1e; --paper: #1a1a1a;' : '';
  return `:root{--blue:${t.brand};--blue-dark:${t.brandDark};--red:${t.accent};--red-dark:${t.brandDark};--yellow:${t.highlight};--font-serif:${FONT_VARS[t.headFont]};--font:${FONT_VARS[t.bodyFont]};--font-head:${FONT_VARS[t.headFont]};--radius-card:${t.radius}px;${bg}}
html[data-theme='dark']{${bgDark}}`;
}
