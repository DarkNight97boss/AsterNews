'use client';

import { useState, useTransition } from 'react';
import { subscribeAction } from '@/lib/actions';
import { toast } from '@/components/ui/toaster';

export function NewsletterForm() {
  const [email, setEmail] = useState('');
  const [pending, start] = useTransition();
  return (
    <form onSubmit={(e) => { e.preventDefault(); start(async () => { const r = await subscribeAction(email); (r.ok ? toast.success : toast.error)(r.message ?? ''); if (r.ok) setEmail(''); }); }}>
      <input className="input" type="email" placeholder="La tua email" value={email} onChange={(e) => setEmail(e.target.value)} required />
      <button className="btn btn-primary" type="submit" disabled={pending}>Iscriviti gratis</button>
    </form>
  );
}
