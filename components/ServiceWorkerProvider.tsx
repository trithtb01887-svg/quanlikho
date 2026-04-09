"use client";

import { useEffect, useState } from "react";

export function ServiceWorkerRegistration() {
  const [isRegistered, setIsRegistered] = useState(false);
  const [isUpdateAvailable, setIsUpdateAvailable] = useState(false);
  const [syncStatus, setSyncStatus] = useState<{
    isOnline: boolean;
    pendingCount: number;
    lastSync: string | null;
  }>({
    isOnline: true,
    pendingCount: 0,
    lastSync: null,
  });

  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
      return;
    }

    // Register service worker
    const registerSW = async () => {
      try {
        const registration = await navigator.serviceWorker.register("/sw.js", {
          scope: "/",
        });

        console.log("[SW] Service Worker registered:", registration.scope);

        // Check for updates
        registration.addEventListener("updatefound", () => {
          const newWorker = registration.installing;
          if (newWorker) {
            newWorker.addEventListener("statechange", () => {
              if (
                newWorker.state === "installed" &&
                navigator.serviceWorker.controller
              ) {
                setIsUpdateAvailable(true);
              }
            });
          }
        });

        // Listen for controller change (after update)
        navigator.serviceWorker.addEventListener("controllerchange", () => {
          window.location.reload();
        });

        setIsRegistered(true);
      } catch (error) {
        console.error("[SW] Service Worker registration failed:", error);
      }
    };

    registerSW();

    // Online/Offline status
    const handleOnline = () => {
      setSyncStatus((prev) => ({ ...prev, isOnline: true }));
    };

    const handleOffline = () => {
      setSyncStatus((prev) => ({ ...prev, isOnline: false }));
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    setSyncStatus((prev) => ({
      ...prev,
      isOnline: navigator.onLine,
    }));

    // Listen for sync messages from service worker
    const handleMessage = (event: MessageEvent) => {
      const { type, queueLength, synced, failed, message } = event.data || {};

      switch (type) {
        case "TRANSACTION_QUEUED":
          setSyncStatus((prev) => ({
            ...prev,
            pendingCount: queueLength,
          }));
          break;

        case "SYNC_COMPLETE":
          setSyncStatus((prev) => ({
            ...prev,
            pendingCount: prev.pendingCount - (synced || 0),
            lastSync: new Date().toISOString(),
          }));
          // Show notification
          if (typeof window !== "undefined" && "Notification" in window) {
            if (Notification.permission === "granted") {
              new Notification("Đồng bộ thành công", {
                body: message,
                icon: "/icons/icon-192x192.png",
              });
            }
          }
          break;

        case "QUEUE_STATUS":
          setSyncStatus((prev) => ({
            ...prev,
            pendingCount: queueLength,
          }));
          break;
      }
    };

    navigator.serviceWorker.addEventListener("message", handleMessage);

    // Check pending queue on mount
    navigator.serviceWorker.ready.then(() => {
      navigator.serviceWorker.controller?.postMessage({
        type: "GET_QUEUE_STATUS",
      });
    });

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      navigator.serviceWorker.removeEventListener("message", handleMessage);
    };
  }, []);

  // Apply update when available
  const applyUpdate = () => {
    if (!isUpdateAvailable) return;

    navigator.serviceWorker.ready.then((registration) => {
      if (registration.waiting) {
        registration.waiting.postMessage({ type: "SKIP_WAITING" });
      }
    });
  };

  // Manual sync trigger
  const triggerSync = () => {
    navigator.serviceWorker.ready.then((registration) => {
      // @ts-ignore - Background Sync API types not in standard TypeScript lib
      if ('sync' in registration) {
        (registration as any).sync?.register("sync-transactions").catch(() => {
          // Fallback to manual sync if Background Sync not supported
          navigator.serviceWorker.controller?.postMessage({
            type: "SYNC_NOW",
          });
        });
      } else {
        navigator.serviceWorker.controller?.postMessage({
          type: "SYNC_NOW",
        });
      }
    });
  };

  return {
    isRegistered,
    isUpdateAvailable,
    syncStatus,
    applyUpdate,
    triggerSync,
  };
}

// Hook for using service worker features
export function useServiceWorker() {
  const [isOnline, setIsOnline] = useState(true);
  const [pendingCount, setPendingCount] = useState(0);
  const [swRegistration, setSwRegistration] =
    useState<ServiceWorkerRegistration | null>(null);

  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
      return;
    }

    // Get registration
    navigator.serviceWorker.ready.then((registration) => {
      setSwRegistration(registration as any);
    });

    // Online/Offline
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    setIsOnline(navigator.onLine);

    // Listen for messages
    const handleMessage = (event: MessageEvent) => {
      const { type, queueLength } = event.data || {};

      if (type === "TRANSACTION_QUEUED" || type === "QUEUE_STATUS") {
        setPendingCount(queueLength);
      }
    };

    navigator.serviceWorker.addEventListener("message", handleMessage);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      navigator.serviceWorker.removeEventListener("message", handleMessage);
    };
  }, []);

  const syncNow = () => {
    navigator.serviceWorker.ready.then((registration) => {
      // @ts-ignore - Background Sync API types not in standard TypeScript lib
      if ('sync' in registration) {
        (registration as any).sync?.register("sync-transactions").catch(() => {
          navigator.serviceWorker.controller?.postMessage({
            type: "SYNC_NOW",
          });
        });
      } else {
        navigator.serviceWorker.controller?.postMessage({
          type: "SYNC_NOW",
        });
      }
    });
  };

  return {
    isOnline,
    pendingCount,
    swRegistration,
    syncNow,
  };
}

// Install PWA prompt component helper
export function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Check if already installed
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as any).standalone === true;
    setIsInstalled(isStandalone);

    // Listen for install prompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    // Listen for app installed
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setIsInstallable(false);
      setDeferredPrompt(null);
    };

    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  const installApp = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === "accepted") {
      setIsInstalled(true);
    }

    setDeferredPrompt(null);
    setIsInstallable(false);
  };

  return {
    isInstallable,
    isInstalled,
    installApp,
  };
}
