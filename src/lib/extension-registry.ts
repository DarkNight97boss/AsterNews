import 'server-only';
import registryLocal from '../../extensions/registry.json';

/** Registro delle estensioni: elenco pubblicato su GitHub (aggiornabile senza rilascio) con ripiego sul file locale. */
export interface RegistryEntry { id: string; name: string; description: string; version: string; author: string; source: string; bundled?: boolean; homepage?: string }
export async function fetchRegistry(): Promise<RegistryEntry[]> {
  try { const r = await fetch('https://raw.githubusercontent.com/DarkNight97boss/AsterNews/main/extensions/registry.json', { signal: AbortSignal.timeout(6000), next: { revalidate: 3600 } }); if (r.ok) { const j = await r.json(); if (Array.isArray(j.extensions)) return j.extensions as RegistryEntry[]; } } catch { /* ripiego locale */ }
  return (registryLocal as { extensions: RegistryEntry[] }).extensions;
}
