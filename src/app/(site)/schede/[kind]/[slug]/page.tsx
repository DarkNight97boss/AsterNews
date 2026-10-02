import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { CARD_KINDS, cardId } from '@/lib/civic';
import { findCard } from '@/lib/civic-data';
import { CardView } from '@/components/site/card-view';

export const dynamic = 'force-dynamic';
export async function generateMetadata({ params }: PageProps<'/schede/[kind]/[slug]'>): Promise<Metadata> { const { kind, slug } = await params; const c = await findCard(cardId(kind, slug)); return c ? { title: `${c.title} · ${CARD_KINDS[kind]?.name ?? ''}`, description: (c.fields.oggetto || c.fields.chi_era || c.fields.opera || c.fields.spiegazione || c.body.replace(/<[^>]+>/g, ' ')).slice(0, 160) } : {}; }
export default async function CardPage({ params }: PageProps<'/schede/[kind]/[slug]'>) { const { kind, slug } = await params; if (!CARD_KINDS[kind]) notFound(); const card = await findCard(cardId(kind, slug)); if (!card) notFound(); return <div className="account" style={{ maxWidth: 800 }}><div className="account-card trust-page"><CardView card={card} /></div></div>; }
