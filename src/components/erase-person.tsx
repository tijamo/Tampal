'use client';

import { useState, useTransition } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { Button } from '@/components/ui';

/**
 * Right-to-erasure control with an accessible confirmation dialog (Radix handles
 * focus trapping/restore). Requires typing the person's name to confirm, since
 * erasure is irreversible. `action` is a pre-bound Server Action (e.g.
 * `erasePerson.bind(null, personId)` or `eraseSelf`), shared between the
 * admin-erases-someone-else and self-service erasure flows.
 */
export function ErasePerson({
  personName,
  action,
  description,
  triggerLabel = 'Erase this person’s data',
}: {
  personName: string;
  action: () => Promise<void>;
  description: string;
  triggerLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [pending, startTransition] = useTransition();
  const matches = confirmText.trim() === personName.trim();

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <Button variant="danger">{triggerLabel}</Button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50" />
        <Dialog.Content className="fixed left-1/2 top-1/2 w-[min(28rem,92vw)] -translate-x-1/2 -translate-y-1/2 rounded-lg bg-white p-6 shadow-xl focus:outline-none dark:bg-slate-900">
          <Dialog.Title className="text-lg font-bold">Erase personal data</Dialog.Title>
          <Dialog.Description className="mt-2 text-sm text-slate-600 dark:text-slate-400">
            {description}
          </Dialog.Description>
          <div className="mt-4 flex flex-col gap-1">
            <label htmlFor="confirm-name" className="text-sm font-medium">
              Type &ldquo;{personName}&rdquo; to confirm
            </label>
            <input
              id="confirm-name"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              className="min-h-touch rounded-md border border-slate-400 px-3 py-2 dark:border-slate-600 dark:bg-slate-950"
            />
          </div>
          <div className="mt-6 flex justify-end gap-3">
            <Dialog.Close asChild>
              <Button variant="secondary">Cancel</Button>
            </Dialog.Close>
            <Button
              variant="danger"
              disabled={!matches || pending}
              onClick={() =>
                startTransition(() => {
                  void action();
                })
              }
            >
              {pending ? 'Erasing…' : 'Erase permanently'}
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
