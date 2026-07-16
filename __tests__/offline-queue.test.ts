import 'fake-indexeddb/auto';
import { attendanceKey, enqueueAttendance, readQueue, dequeue } from '@/lib/offline-queue';

// Each test uses its own meetingId so items from other tests in this file
// (the fake IndexedDB instance persists for the whole file) never collide.

describe('offline attendance queue', () => {
  it('keys are stable and independent of argument order elsewhere in the app', () => {
    expect(attendanceKey('m1', '2026-01-01', 'p1')).toBe('m1|2026-01-01|p1');
  });

  it('enqueues an item and reads it back', async () => {
    await enqueueAttendance({ meetingId: 'enqueue-test', occurrenceDate: '2026-01-01', personId: 'p1', present: true });
    const items = await readQueue();
    const item = items.find((i) => i.meetingId === 'enqueue-test');
    expect(item).toMatchObject({
      key: 'enqueue-test|2026-01-01|p1',
      occurrenceDate: '2026-01-01',
      personId: 'p1',
      present: true,
    });
  });

  it('re-queuing the same person/meeting/date overwrites rather than duplicating', async () => {
    const meetingId = 'overwrite-test';
    await enqueueAttendance({ meetingId, occurrenceDate: '2026-01-01', personId: 'p1', present: true });
    await enqueueAttendance({ meetingId, occurrenceDate: '2026-01-01', personId: 'p1', present: false });
    const items = await readQueue();
    const matches = items.filter((i) => i.meetingId === meetingId);
    expect(matches).toHaveLength(1);
    expect(matches[0].present).toBe(false);
  });

  it('dequeue removes only the matching item', async () => {
    const meetingId = 'dequeue-test';
    await enqueueAttendance({ meetingId, occurrenceDate: '2026-01-01', personId: 'p1', present: true });
    await enqueueAttendance({ meetingId, occurrenceDate: '2026-01-01', personId: 'p2', present: true });
    await dequeue(attendanceKey(meetingId, '2026-01-01', 'p1'));
    const items = await readQueue();
    const matches = items.filter((i) => i.meetingId === meetingId);
    expect(matches).toHaveLength(1);
    expect(matches[0].personId).toBe('p2');
  });
});
