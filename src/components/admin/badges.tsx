import { ArticleStatus, STATUS_LABELS } from '@/lib/models';

const CLS: Record<string, string> = { published: 'badge-green', review: 'badge-amber', scheduled: 'badge-blue', draft: 'badge-gray', archived: 'badge-dark' };
export const statusBadgeClass = (s: string) => `badge ${CLS[s] ?? 'badge-gray'}`;
export function StatusBadge({ status }: { status: ArticleStatus }) {
  return <span className={statusBadgeClass(status)}>{STATUS_LABELS[status]}</span>;
}
