'use client';

import { useEffect, useRef, useState } from 'react';

type SR = { lang: string; continuous: boolean; interimResults: boolean; start(): void; stop(): void; onresult: ((e: { resultIndex: number; results: { isFinal: boolean; 0: { transcript: string } }[] & { length: number } }) => void) | null; onend: (() => void) | null; onerror: (() => void) | null };
/** Dettatura vocale (riconoscimento del browser, in italiano): il testo dettato viene aggiunto in coda all'articolo, un paragrafo per pausa. */
export function DictateButton({ onText }: { onText: (paragraph: string) => void }) {
  const [on, setOn] = useState(false); const [supported, setSupported] = useState(false); const [interim, setInterim] = useState(''); const rec = useRef<SR | null>(null);
  useEffect(() => { const w = window as unknown as { SpeechRecognition?: new () => SR; webkitSpeechRecognition?: new () => SR }; setSupported(!!(w.SpeechRecognition || w.webkitSpeechRecognition)); return () => rec.current?.stop(); }, []);
  if (!supported) return null;
  const toggle = () => {
    if (on) { rec.current?.stop(); setOn(false); return; }
    const w = window as unknown as { SpeechRecognition?: new () => SR; webkitSpeechRecognition?: new () => SR }; const R = (w.SpeechRecognition || w.webkitSpeechRecognition)!; const r = new R(); r.lang = 'it-IT'; r.continuous = true; r.interimResults = true;
    r.onresult = (e) => { let tmp = ''; for (let i = e.resultIndex; i < e.results.length; i++) { const t = e.results[i][0].transcript.trim(); if (e.results[i].isFinal) { if (t) onText(t.charAt(0).toUpperCase() + t.slice(1) + (/[.!?]$/.test(t) ? '' : '.')); } else tmp += t + ' '; } setInterim(tmp); };
    r.onend = () => { setOn(false); setInterim(''); }; r.onerror = () => { setOn(false); };
    rec.current = r; r.start(); setOn(true);
  };
  return <><button type="button" className={`btn btn-sm ${on ? 'btn-danger' : 'btn-ghost'}`} onClick={toggle} title="Detta il testo: viene aggiunto in fondo all'articolo">{on ? '⏹ Ferma dettatura' : '🎙 Detta'}</button>{on && interim && <span className="help" style={{ fontStyle: 'italic' }}>{interim}</span>}</>;
}
