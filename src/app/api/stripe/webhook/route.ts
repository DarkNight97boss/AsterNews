import { NextResponse } from 'next/server';
import { createHmac, timingSafeEqual } from 'node:crypto';
import * as x from '@/lib/repo-extra';
import { getSettings } from '@/lib/queries';

export const dynamic = 'force-dynamic';

/** Verifica la firma Stripe (Stripe-Signature: t=...,v1=...) senza SDK. */
function verify(payload: string, header: string, secret: string): boolean {
  const parts = Object.fromEntries(header.split(',').map((p) => p.split('=') as [string, string]));
  if (!parts.t || !parts.v1) return false;
  const expected = createHmac('sha256', secret).update(`${parts.t}.${payload}`).digest('hex');
  const a = Buffer.from(expected); const b = Buffer.from(parts.v1);
  return a.length === b.length && timingSafeEqual(a, b) && Math.abs(Date.now() / 1000 - Number(parts.t)) < 600;
}

/** Eventi Stripe: attiva/disattiva l'abbonamento del lettore. */
export async function POST(req: Request) {
  const s = await getSettings();
  const secret = s.paywall?.stripeWebhookSecret || process.env.STRIPE_WEBHOOK_SECRET || '';
  const payload = await req.text();
  if (secret && !verify(payload, req.headers.get('stripe-signature') ?? '', secret)) return NextResponse.json({ error: 'Firma non valida' }, { status: 400 });
  const ev = JSON.parse(payload) as { type: string; data: { object: Record<string, unknown> } };
  const o = ev.data.object;
  try {
    if (ev.type === 'checkout.session.completed' && (o.metadata as { donation_id?: string })?.donation_id) {
      const { completeDonation } = await import('@/lib/fulfilment'); await completeDonation(String((o.metadata as { donation_id: string }).donation_id));
    } else if (ev.type === 'checkout.session.completed' && (o.metadata as { listing_id?: string })?.listing_id) {
      const { markListingPaid } = await import('@/lib/fulfilment'); await markListingPaid(String((o.metadata as { listing_id: string }).listing_id));
    } else if (ev.type === 'checkout.session.completed' && (o.metadata as { ad_order_id?: string })?.ad_order_id) {
      const { completeAdOrder } = await import('@/lib/fulfilment'); await completeAdOrder(String((o.metadata as { ad_order_id: string }).ad_order_id));
    } else if (ev.type === 'checkout.session.completed' && (o.metadata as { team_seats?: string })?.team_seats) {
      const { completeTeamOrder } = await import('@/lib/fulfilment'); await completeTeamOrder(o.metadata as { team_seats: string; team_months: string; team_email: string; team_company?: string });
    } else if (ev.type === 'checkout.session.completed' && (o.metadata as { ticket_id?: string })?.ticket_id) {
      const { completeTicket } = await import('@/lib/fulfilment'); await completeTicket(String((o.metadata as { ticket_id: string }).ticket_id));
    } else if (ev.type === 'checkout.session.completed' && (o.metadata as { gift_email?: string })?.gift_email) {
      const m = o.metadata as { gift_email: string; gift_months?: string; gift_message?: string; reader_id?: string }; const { createGiftCode } = await import('@/lib/fulfilment'); await createGiftCode(m.gift_email, Number(m.gift_months) || 1, m.gift_message ?? '', m.reader_id ?? '');
    } else if (ev.type === 'checkout.session.completed') {
      const readerId = String((o.metadata as { reader_id?: string })?.reader_id ?? o.client_reference_id ?? '');
      if (readerId) await x.updateReader(readerId, { premium: true, premiumUntil: null, stripeCustomer: String(o.customer ?? '') });
    } else if (ev.type === 'customer.subscription.updated' || ev.type === 'customer.subscription.deleted') {
      const r = await x.findReaderByStripeCustomer(String(o.customer ?? ''));
      if (r) {
        const status = String(o.status ?? ''); const end = o.current_period_end ? new Date(Number(o.current_period_end) * 1000).toISOString() : null;
        const active = ['active', 'trialing', 'past_due'].includes(status) && ev.type !== 'customer.subscription.deleted';
        await x.updateReader(r.id, { premium: active, premiumUntil: active ? end : new Date().toISOString() });
      }
    } else if (ev.type === 'invoice.payment_failed') {
      const r = await x.findReaderByStripeCustomer(String(o.customer ?? ''));
      if (r) await x.updateReader(r.id, { premiumUntil: new Date(Date.now() + 7 * 86400000).toISOString() });
    }
    return NextResponse.json({ received: true });
  } catch (e) { console.error('[stripe]', e); return NextResponse.json({ error: 'Errore' }, { status: 500 }); }
}
