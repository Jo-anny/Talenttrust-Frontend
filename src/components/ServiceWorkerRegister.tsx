'use client';

import { useEffect, useState } from 'react';

/**
 * ServiceWorkerRegister — registers the service worker in production and
 * shows an accessible "Update available — Reload" prompt when a new SW
 * version is waiting to activate.
 *
 * Behaviour:
 * - Registers `/sw.js` only when `process.env.NODE_ENV === 'production'`
 *   so the SW doesn't interfere with Hot Module Replacement during dev.
 * - Listens for `updatefound` → `statechange` to `installed` → detects a
 *   *waiting* worker (meaning an update is ready).
 * - Shows a banner with `role="alert"` and a "Reload" button that calls
 *   `waiting.postMessage('SKIP_WAITING')` + `window.location.reload()`.
 *
 * Accessibility:
 * - The banner uses `role="alert"` so screen readers announce it.
 * - The Reload button has a visible focus ring and an accessible name.
 * - The Dismiss button lets users dismiss the prompt with the keyboard.
 */
export default function ServiceWorkerRegister() {
  const [showUpdate, setShowUpdate] = useState(false);
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null);

  useEffect(() => {
    // Only register in production.
    if (process.env.NODE_ENV !== 'production') return;
    if (typeof window === 'undefined') return;
    if (!('serviceWorker' in navigator) || !navigator.serviceWorker) return;

    let registration: ServiceWorkerRegistration | undefined;
    let handleUpdateFound: (() => void) | undefined;
    let updateInterval: ReturnType<typeof setInterval> | undefined;
    let isDisposed = false;

    const handleControllerChange = () => {
      // The new SW has taken control — reload to pick up new assets.
      window.location.reload();
    };

    const checkForUpdates = () => {
      if (!registration) return;
      void registration.update().catch((error) => {
        console.error('Service worker update check failed', error);
      });
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') checkForUpdates();
    };

    navigator.serviceWorker
      .register('/sw.js')
      .then((reg) => {
        if (isDisposed) return;
        registration = reg;

        // Detect a new SW waiting on initial registration.
        if (reg.waiting) {
          setWaitingWorker(reg.waiting);
          setShowUpdate(true);
        }

        // Listen for future updates.
        handleUpdateFound = () => {
          const newWorker = reg.installing;
          if (!newWorker) return;

          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              // An update is ready and waiting.
              setWaitingWorker(newWorker);
              setShowUpdate(true);
            }
          });
        };
        reg.addEventListener('updatefound', handleUpdateFound);

        updateInterval = setInterval(checkForUpdates, 60 * 60 * 1000);
      })
      .catch((_err) => {
        // SW registration failed — fail silently in production.
      });

    // When the new SW takes control, reload the page.
    navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      isDisposed = true;
      navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (updateInterval !== undefined) clearInterval(updateInterval);
      if (registration && handleUpdateFound) {
        registration.removeEventListener('updatefound', handleUpdateFound);
      }
    };
  }, []);

  const handleReload = () => {
    if (waitingWorker) {
      waitingWorker.postMessage('SKIP_WAITING');
    }
    // The controllerchange listener will reload, but also reload as a
    // fallback in case the event doesn't fire.
    setTimeout(() => window.location.reload(), 100);
  };

  const handleDismiss = () => {
    setShowUpdate(false);
  };

  if (!showUpdate) return null;

  return (
    <div
      role="alert"
      className="sw-update"
    >
      <span className="small">
        Update available
      </span>
      <button
        type="button"
        onClick={handleReload}
        className="btn btn-primary btn-sm"
      >
        Reload
      </button>
      <button
        type="button"
        onClick={handleDismiss}
        aria-label="Dismiss update notification"
        className="btn btn-secondary btn-sm"
      >
        Later
      </button>
    </div>
  );
}
