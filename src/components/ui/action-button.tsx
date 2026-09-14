'use client';

import { useRouter } from 'next/navigation';
import { ReactNode, useTransition } from 'react';
import { ActionResult } from '@/lib/actions';
import { toast } from './toaster';

interface Props {
  action: () => Promise<ActionResult | void>;
  children: ReactNode;
  className?: string;
  title?: string;
  confirm?: string;
  onDone?: (r: ActionResult | void) => void;
  disabled?: boolean;
}

/** Bottone che invoca una server action, mostra un toast e aggiorna la pagina. */
export function ActionButton({ action, children, className = 'btn btn-outline btn-sm', title, confirm: confirmText, onDone, disabled }: Props) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      className={className}
      title={title}
      disabled={disabled || pending}
      onClick={() => {
        if (confirmText && !window.confirm(confirmText)) return;
        start(async () => {
          const r = await action();
          if (r && r.message) (r.ok ? toast.success : toast.error)(r.message);
          router.refresh();
          onDone?.(r);
        });
      }}
    >
      {children}
    </button>
  );
}
