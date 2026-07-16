import { flushAttendanceQueue } from '@/lib/attendance-sync';
import { readQueue, dequeue } from '@/lib/offline-queue';
import { createClient } from '@/lib/supabase/client';

jest.mock('@/lib/offline-queue');
jest.mock('@/lib/supabase/client');

const mockedReadQueue = readQueue as jest.MockedFunction<typeof readQueue>;
const mockedDequeue = dequeue as jest.MockedFunction<typeof dequeue>;
const mockedCreateClient = createClient as jest.MockedFunction<typeof createClient>;

function setOnline(online: boolean) {
  Object.defineProperty(navigator, 'onLine', { value: online, configurable: true });
}

function queuedItem(overrides: Partial<Awaited<ReturnType<typeof readQueue>>[number]> = {}) {
  return {
    key: 'm1|2026-01-01|p1',
    meetingId: 'm1',
    occurrenceDate: '2026-01-01',
    personId: 'p1',
    present: true,
    queuedAt: Date.now(),
    ...overrides,
  };
}

describe('flushAttendanceQueue', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setOnline(true);
  });

  it('does nothing when offline', async () => {
    setOnline(false);
    await flushAttendanceQueue();
    expect(mockedReadQueue).not.toHaveBeenCalled();
  });

  it('does nothing when the queue is empty', async () => {
    mockedReadQueue.mockResolvedValue([]);
    await flushAttendanceQueue();
    expect(mockedCreateClient).not.toHaveBeenCalled();
  });

  it('dequeues an item once it syncs successfully', async () => {
    mockedReadQueue.mockResolvedValue([queuedItem()]);
    const upsert = jest.fn().mockResolvedValue({ error: null });
    mockedCreateClient.mockReturnValue({ from: () => ({ upsert }) } as never);

    await flushAttendanceQueue();

    expect(upsert).toHaveBeenCalledWith(
      { meeting_id: 'm1', occurrence_date: '2026-01-01', person_id: 'p1', present: true },
      { onConflict: 'meeting_id,occurrence_date,person_id' },
    );
    expect(mockedDequeue).toHaveBeenCalledWith('m1|2026-01-01|p1');
  });

  it('leaves an item queued to retry when the write fails', async () => {
    mockedReadQueue.mockResolvedValue([queuedItem()]);
    const upsert = jest.fn().mockResolvedValue({ error: { message: 'network error' } });
    mockedCreateClient.mockReturnValue({ from: () => ({ upsert }) } as never);

    await flushAttendanceQueue();

    expect(mockedDequeue).not.toHaveBeenCalled();
  });
});
