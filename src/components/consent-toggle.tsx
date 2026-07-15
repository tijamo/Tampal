'use client';

import { useTransition } from 'react';
import * as Switch from '@radix-ui/react-switch';
import type { ConsentType } from '@/lib/supabase/types';
import { setConsent } from '@/app/(app)/people/actions';

/**
 * Accessible on/off consent switch. Persists each change as a new append-only
 * consent record via the server action, preserving the full history.
 */
export function ConsentToggle({
  personId,
  type,
  label,
  granted,
}: {
  personId: string;
  type: ConsentType;
  label: string;
  granted: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const id = `consent-${type}`;

  return (
    <div className="flex items-center justify-between gap-4 py-2">
      <label htmlFor={id} className="flex-1">
        {label}
      </label>
      <Switch.Root
        id={id}
        checked={granted}
        disabled={pending}
        onCheckedChange={(checked) =>
          startTransition(() => {
            void setConsent(personId, type, checked);
          })
        }
        className="relative h-7 w-12 rounded-full bg-slate-300 data-[state=checked]:bg-brand-700 disabled:opacity-60 dark:bg-slate-600"
      >
        <Switch.Thumb className="block h-6 w-6 translate-x-0.5 rounded-full bg-white transition-transform data-[state=checked]:translate-x-[22px]" />
      </Switch.Root>
      <span aria-hidden="true" className="w-14 text-right text-sm text-slate-600 dark:text-slate-400">
        {granted ? 'Given' : 'Not given'}
      </span>
    </div>
  );
}
