'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTransition } from 'react';
import { dismissOnboardingAction } from '@/lib/actions-system';

export type OnboardingStep = { done: boolean; label: string; href: string; hint: string };

/** Guida ai primi passi (stile WordPress "Benvenuto"): sparisce quando tutto è fatto o viene chiusa. */
export function OnboardingCard({ steps }: { steps: OnboardingStep[] }) {
  const router = useRouter(); const [pending, start] = useTransition();
  const done = steps.filter((s) => s.done).length;
  return (
    <div className="panel onboarding">
      <div className="panel-title">Primi passi · {done}/{steps.length} completati <button className="btn btn-ghost btn-sm" disabled={pending} onClick={() => start(async () => { await dismissOnboardingAction(); router.refresh(); })}>Nascondi</button></div>
      <div className="onboarding-bar"><span style={{ width: `${(done / steps.length) * 100}%` }} /></div>
      <ul className="onboarding-list">{steps.map((s) => <li key={s.label} className={s.done ? 'done' : ''}><span>{s.done ? '✅' : '⬜️'}</span><div><Link href={s.href}><b>{s.label}</b></Link><div className="help">{s.hint}</div></div></li>)}</ul>
    </div>
  );
}
