/** Tipi di contributo dei lettori che passano dalla moderazione unica in /admin/partecipazione. `who` e `body` sono le chiavi dei dati da mostrare. */
export const PARTICIPATION_KINDS: { kind: string; label: string; who: string; body: string }[] = [
  { kind: 'response', label: 'Risposte lunghe agli articoli', who: 'name', body: 'text' },
  { kind: 'guestbook', label: 'Libro degli ospiti (messaggi scritti a mano)', who: 'name', body: 'image' },
  { kind: 'log', label: 'Taccuino di quartiere', who: 'name', body: 'text' },
  { kind: 'council', label: 'Domande al Comune', who: 'name', body: 'text' },
  { kind: 'board', label: 'Bacheca (smarriti, trovati, passaggi)', who: 'contact', body: 'text' },
  { kind: 'photo', label: 'Archivio fotografico', who: 'name', body: 'image' },
  { kind: 'memory', label: 'Ricordi sui necrologi', who: 'name', body: 'text' },
  { kind: 'translation', label: 'Traduzioni volontarie', who: 'name', body: 'text' },
  { kind: 'skill', label: 'Banca delle competenze (mai pubblicata: «Pubblica» = accetta in rubrica)', who: 'name', body: 'about' },
];
