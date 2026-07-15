'use client';

import { useTransition } from 'react';
import { Button } from '@/components/ui';
import { archiveMeeting } from '@/app/(app)/meetings/actions';

/** Removes (archives) a meeting after a simple confirm. History is preserved. */
export function ArchiveMeeting({ meetingId, title }: { meetingId: string; title: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <Button
      variant="secondary"
      disabled={pending}
      onClick={() => {
        if (confirm(`Remove “${title}”? Past attendance records are kept.`)) {
          startTransition(() => {
            void archiveMeeting(meetingId);
          });
        }
      }}
    >
      {pending ? 'Removing…' : 'Remove'}
    </Button>
  );
}
