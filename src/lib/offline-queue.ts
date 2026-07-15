'use client';

/*
 * A tiny IndexedDB-backed queue for attendance writes made while offline.
 * Church halls often have poor signal, so a register taken offline must not be
 * lost. Each queued item is an intended attendance state; on reconnect we replay
 * them against Supabase. Items are keyed by (meeting_id, occurrence_date,
 * person_id) so re-toggling the same person before sync just overwrites.
 */

export type QueuedAttendance = {
  key: string; // `${meetingId}|${date}|${personId}`
  meetingId: string;
  occurrenceDate: string; // YYYY-MM-DD
  personId: string;
  present: boolean;
  queuedAt: number;
};

const DB_NAME = 'tamfam';
const STORE = 'attendance-queue';

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: 'key' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export function attendanceKey(meetingId: string, date: string, personId: string): string {
  return `${meetingId}|${date}|${personId}`;
}

export async function enqueueAttendance(item: Omit<QueuedAttendance, 'key' | 'queuedAt'>): Promise<void> {
  const db = await openDb();
  const record: QueuedAttendance = {
    ...item,
    key: attendanceKey(item.meetingId, item.occurrenceDate, item.personId),
    queuedAt: Date.now(),
  };
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).put(record);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();

  // Ask for a background sync so writes flush even if the tab is closed.
  if ('serviceWorker' in navigator && 'SyncManager' in window) {
    try {
      const reg = await navigator.serviceWorker.ready;
      await (reg as ServiceWorkerRegistration & { sync: { register(tag: string): Promise<void> } }).sync.register(
        'tamfam-attendance-sync',
      );
    } catch {
      /* Background Sync unsupported; the app flushes on the next 'online' event. */
    }
  }
}

export async function readQueue(): Promise<QueuedAttendance[]> {
  const db = await openDb();
  const items = await new Promise<QueuedAttendance[]>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly');
    const req = tx.objectStore(STORE).getAll();
    req.onsuccess = () => resolve(req.result as QueuedAttendance[]);
    req.onerror = () => reject(req.error);
  });
  db.close();
  return items;
}

export async function dequeue(key: string): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).delete(key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}
