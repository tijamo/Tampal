'use client';

import { useEffect, useState } from 'react';
import { Button } from './ui';

const DISMISS_KEY = 'tamfam-install-dismissed';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

/**
 * Nudges users to install the PWA. Chrome/Edge/Android fire
 * `beforeinstallprompt`, which we capture and trigger from our own button
 * (browsers hide their default UI once you call preventDefault()). iOS
 * Safari has no such event or API — "Add to Home Screen" is Share-sheet
 * only, so we show instructions instead when running there outside
 * standalone mode. Dismissal is remembered in localStorage either way.
 */
export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showIosTip, setShowIosTip] = useState(false);
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    if (localStorage.getItem(DISMISS_KEY)) return;

    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;
    if (isStandalone) return;

    setDismissed(false);

    const onBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener('beforeinstallprompt', onBeforeInstall);

    const isIos = /iphone|ipad|ipod/i.test(window.navigator.userAgent);
    if (isIos) setShowIosTip(true);

    return () => window.removeEventListener('beforeinstallprompt', onBeforeInstall);
  }, []);

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, '1');
    setDismissed(true);
  };

  const install = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    dismiss();
  };

  if (dismissed || (!deferredPrompt && !showIosTip)) return null;

  return (
    <div
      role="status"
      className="fixed inset-x-0 bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-50 mx-auto flex w-[min(26rem,92vw)] items-start gap-3 rounded-lg border border-slate-200 bg-white p-3 shadow-lg sm:bottom-4 dark:border-slate-700 dark:bg-slate-900"
    >
      <p className="flex-1 text-sm">
        {deferredPrompt
          ? 'Install TamFam on this device for quick, offline-ready access.'
          : 'Install TamFam: tap the Share icon, then "Add to Home Screen".'}
      </p>
      <div className="flex shrink-0 flex-col gap-2">
        {deferredPrompt && (
          <Button variant="primary" className="px-3 py-1.5 text-sm" onClick={install}>
            Install
          </Button>
        )}
        <Button variant="secondary" className="px-3 py-1.5 text-sm" onClick={dismiss}>
          Dismiss
        </Button>
      </div>
    </div>
  );
}
