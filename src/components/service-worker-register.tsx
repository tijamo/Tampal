'use client';

import { useEffect } from 'react';
import { flushAttendanceQueue } from '@/lib/attendance-sync';

/**
 * Registers the service worker and wires up offline-queue flushing:
 *  - on regaining connectivity ('online')
 *  - when the SW's Background Sync fires and messages us to flush
 */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    navigator.serviceWorker.register('/sw.js').catch(() => {
      /* Registration failure is non-fatal; the app still works online. */
    });

    const onOnline = () => {
      void flushAttendanceQueue();
    };
    const onMessage = (event: MessageEvent) => {
      if (event.data?.type === 'flush-attendance-queue') void flushAttendanceQueue();
    };

    window.addEventListener('online', onOnline);
    navigator.serviceWorker.addEventListener('message', onMessage);

    // Attempt a flush on load in case items were queued in a previous session.
    if (navigator.onLine) void flushAttendanceQueue();

    return () => {
      window.removeEventListener('online', onOnline);
      navigator.serviceWorker.removeEventListener('message', onMessage);
    };
  }, []);

  return null;
}
