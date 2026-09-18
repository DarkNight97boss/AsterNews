/** Tipi di contributo dei lettori che passano dalla moderazione unica in /admin/partecipazione. `who` e `body` sono le chiavi dei dati da mostrare. */
export const PARTICIPATION_KINDS: { kind: string; label: string; who: string; body: string }[] = [
  { kind: 'response', label: 'Risposte lunghe agli articoli', who: 'name', body: 'text' },
  { kind: 'guestbook', label: 'Libro degli ospiti (messaggi scritti a mano)', who: 'name', body: 'image' },
];
