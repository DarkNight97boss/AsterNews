/** La stessa impronta di `textHash` (trust.ts) calcolata nel browser: serve all'editor per accorgersi che il testo è cambiato dopo aver preparato le uscite. */
export async function canonicalHashClient(title: string, html: string): Promise<string> {
  const text = `${title.trim()}\n${html.replace(/<(script|style)[\s\S]*?<\/\1>/gi, '').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim()}`;
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text)); return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}
