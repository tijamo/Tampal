'use client';

import { createClient } from '@/lib/supabase/client';
import { readQueue, dequeue } from '@/lib/offline-queue';

let flushing = false;

/**
 * Replays any queued offline attendance writes against Supabase. Safe to call
 * repeatedly; a mutex prevents overlapping flushes. RLS still applies, so a
 * queued write only succeeds if the user is (still) an authorised recorder.
 */
export async function flushAttendanceQueue(): Promise<void> {
  if (flushing || !navigator.onLine) return;
  flushing = true;
  try {
    const items = await readQueue();
    if (items.length === 0) return;
    const supabase = createClient();

    for (const item of items) {
      const { error } = await supabase.from('attendance').upsert(
        {
          meeting_id: item.meetingId,
          occurrence_date: item.occurrenceDate,
          person_id: item.personId,
          present: item.present,
        },
        { onConflict: 'meeting_id,occurrence_date,person_id' },
      );
      // Drop the item only on success; leave it queued to retry on failure.
      if (!error) await dequeue(item.key);
    }
  } finally {
    flushing = false;
  }
}
