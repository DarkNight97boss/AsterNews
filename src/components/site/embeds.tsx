'use client';

import { useEffect } from 'react';

declare global { interface Window { instgrm?: { Embeds: { process: () => void } }; twttr?: { widgets: { load: () => void } } } }

function load(src: string, id: string): Promise<void> {
  return new Promise((res) => { if (document.getElementById(id)) { res(); return; } const s = document.createElement('script'); s.id = id; s.src = src; s.async = true; s.onload = () => res(); document.body.appendChild(s); });
}
/** Carica gli script di Instagram, X e TikTok solo quando l'articolo contiene i relativi embed (dopo il consenso cookie, se richiesto). */
export function Embeds({ instagram, twitter, tiktok }: { instagram: boolean; twitter: boolean; tiktok: boolean }) {
  useEffect(() => {
    const consent = document.cookie.includes('cookie_consent=all') || !document.cookie.includes('cookie_consent=');
    if (!consent) return;
    if (instagram) load('https://www.instagram.com/embed.js', 'ig-embed').then(() => window.instgrm?.Embeds.process());
    if (twitter) load('https://platform.twitter.com/widgets.js', 'tw-embed').then(() => window.twttr?.widgets.load());
    if (tiktok) load('https://www.tiktok.com/embed.js', 'tt-embed');
  }, [instagram, twitter, tiktok]);
  return null;
}
