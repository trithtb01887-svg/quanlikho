/// <reference lib="webworker" />

declare const self: ServiceWorkerGlobalScope;

const CACHE_NAME = 'warehouse-app-v1';
const OFFLINE_URL = '/mobile/offline';
const STATIC_ASSETS = [
  '/',
  '/mobile',
  '/mobile/scan',
  '/mobile/goods-receipt',
  '/mobile/goods-issue',
  '/mobile/stocktake',
  '/manifest.json',
];

// API routes that should work offline with cached data
const CACHEABLE_API_PATTERNS = [
  /\/api\/products/,
  /\/api\/inventory/,
  /\/api\/stock/,
];

// API routes that should be queued when offline
const QUEUEABLE_API_PATTERNS = [
  /\/api\/goods-receipt/,
  /\/api\/goods-issue/,
  /\/api\/stocktake/,
];

// Install event - cache static assets
self.addEventListener('install', (event: ExtendableEvent) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Caching static assets');
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event: ExtendableEvent) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((cacheName) => cacheName.startsWith('warehouse-') && cacheName !== CACHE_NAME)
          .map((cacheName) => {
            console.log('[SW] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          })
      );
    })
  );
  self.clients.claim();
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event: FetchEvent) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Handle API requests
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(handleApiRequest(request));
    return;
  }

  // Handle static assets and pages
  event.respondWith(handleStaticRequest(request));
});

// Handle API requests with cache-first strategy for GET, queue for POST/PUT/DELETE
async function handleApiRequest(request: Request): Promise<Response> {
  const url = new URL(request.url);

  // GET requests - cache first, then network
  if (request.method === 'GET') {
    const cache = await caches.open(CACHE_NAME);
    const cachedResponse = await cache.match(request);

    if (cachedResponse) {
      // Return cached data and update cache in background
      fetchAndCache(request).catch(() => {});
      return cachedResponse;
    }

    try {
      const networkResponse = await fetch(request);
      if (networkResponse.ok) {
        cache.put(request, networkResponse.clone());
      }
      return networkResponse;
    } catch (error) {
      // Return offline fallback for specific endpoints
      return getOfflineFallback(url.pathname);
    }
  }

  // POST/PUT/DELETE requests - queue if offline
  if (navigator.onLine) {
    try {
      return await fetch(request);
    } catch (error) {
      return queueOfflineTransaction(request);
    }
  } else {
    return queueOfflineTransaction(request);
  }
}

// Handle static requests with network-first, cache fallback
async function handleStaticRequest(request: Request): Promise<Response> {
  const cache = await caches.open(CACHE_NAME);

  try {
    const networkResponse = await fetch(request);

    // Cache successful responses
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }

    return networkResponse;
  } catch (error) {
    // Try to return from cache
    const cachedResponse = await cache.match(request);

    if (cachedResponse) {
      return cachedResponse;
    }

    // Return offline page for navigation requests
    if (request.mode === 'navigate') {
      const offlinePage = await cache.match(OFFLINE_URL);
      if (offlinePage) {
        return offlinePage;
      }
    }

    return new Response('Offline', {
      status: 503,
      statusText: 'Service Unavailable',
    });
  }
}

// Fetch and update cache in background
async function fetchAndCache(request: Request): Promise<void> {
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, networkResponse);
    }
  } catch (error) {
    // Silently fail - we already have cached data
  }
}

// Queue transaction for later sync
async function queueOfflineTransaction(request: Request): Promise<Response> {
  try {
    const body = await request.json();

    const transaction = {
      id: Date.now().toString(),
      method: request.method,
      url: request.url,
      body,
      timestamp: new Date().toISOString(),
      headers: Object.fromEntries(request.headers.entries()),
    };

    // Get existing queue from IndexedDB or localStorage
    const queueKey = 'offline_transaction_queue';
    const existingQueue = await getQueueFromStorage(queueKey);
    existingQueue.push(transaction);
    await saveQueueToStorage(queueKey, existingQueue);

    // Notify clients about queued transaction
    notifyClients({
      type: 'TRANSACTION_QUEUED',
      transaction: {
        id: transaction.id,
        method: transaction.method,
        url: transaction.url,
      },
      queueLength: existingQueue.length,
    });

    // Return success response
    return new Response(JSON.stringify({
      success: true,
      queued: true,
      transactionId: transaction.id,
      message: 'Transaction queued for sync when online',
    }), {
      status: 202,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({
      success: false,
      error: 'Failed to queue transaction',
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

// Get offline fallback data
async function getOfflineFallback(pathname: string): Promise<Response> {
  const fallbackData: Record<string, any> = {
    '/api/products': { products: [], total: 0, cached: true },
    '/api/inventory': { items: [], total: 0, cached: true },
    '/api/stock': { stock: [], cached: true },
  };

  const data = fallbackData[pathname] || { cached: true, data: null };

  return new Response(JSON.stringify(data), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'X-Offline-Cache': 'true',
    },
  });
}

// Storage helpers for queue
async function getQueueFromStorage(key: string): Promise<any[]> {
  if (typeof localStorage !== 'undefined') {
    try {
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }
  return [];
}

async function saveQueueToStorage(key: string, queue: any[]): Promise<void> {
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(key, JSON.stringify(queue));
  }
}

// Notify all clients about events
async function notifyClients(message: any): Promise<void> {
  const clients = await self.clients.matchAll({ type: 'window' });
  clients.forEach((client) => {
    client.postMessage(message);
  });
}

// Sync queued transactions when back online
self.addEventListener('online', async () => {
  console.log('[SW] Back online - syncing queued transactions');

  const queueKey = 'offline_transaction_queue';
  const queue = await getQueueFromStorage(queueKey);

  if (queue.length === 0) {
    return;
  }

  const synced: string[] = [];
  const failed: { id: string; error: string }[] = [];

  for (const transaction of queue) {
    try {
      const response = await fetch(transaction.url, {
        method: transaction.method,
        headers: transaction.headers,
        body: JSON.stringify(transaction.body),
      });

      if (response.ok) {
        synced.push(transaction.id);
      } else {
        failed.push({ id: transaction.id, error: `HTTP ${response.status}` });
      }
    } catch (error) {
      failed.push({ id: transaction.id, error: 'Network error' });
    }
  }

  // Update queue with only failed transactions
  const remainingQueue = queue.filter((t) => failed.find((f) => f.id === t.id));
  await saveQueueToStorage(queueKey, remainingQueue);

  // Notify clients about sync results
  notifyClients({
    type: 'SYNC_COMPLETE',
    synced: synced.length,
    failed: failed.length,
    message: `Đã đồng bộ ${synced.length} giao dịch${failed.length > 0 ? `, ${failed.length} thất bại` : ''}`,
  });

  console.log(`[SW] Sync complete: ${synced.length} synced, ${failed.length} failed`);
});

// Listen for messages from clients
self.addEventListener('message', (event: ExtendableMessageEvent) => {
  const { type, payload } = event.data || {};

  switch (type) {
    case 'SKIP_WAITING':
      self.skipWaiting();
      break;

    case 'SYNC_NOW':
      // Trigger manual sync
      if (navigator.onLine) {
        self.dispatchEvent(new Event('online'));
      }
      break;

    case 'GET_QUEUE_STATUS':
      getQueueFromStorage('offline_transaction_queue').then((queue) => {
        event.source?.postMessage({
          type: 'QUEUE_STATUS',
          queueLength: queue.length,
        });
      });
      break;

    case 'CLEAR_CACHE':
      caches.delete(CACHE_NAME).then(() => {
        event.source?.postMessage({
          type: 'CACHE_CLEARED',
        });
      });
      break;
  }
});

// Background sync (if supported)
// @ts-ignore - Background Sync API types not available in standard TypeScript lib
self.addEventListener('sync', (event: any) => {
  if (event.tag === 'sync-transactions') {
    event.waitUntil(syncQueuedTransactions());
  }
});

async function syncQueuedTransactions(): Promise<void> {
  const queueKey = 'offline_transaction_queue';
  const queue = await getQueueFromStorage(queueKey);

  if (queue.length === 0) {
    return;
  }

  for (const transaction of queue) {
    try {
      await fetch(transaction.url, {
        method: transaction.method,
        headers: transaction.headers,
        body: JSON.stringify(transaction.body),
      });
    } catch (error) {
      // Will retry on next sync
      console.error('[SW] Failed to sync transaction:', transaction.id);
    }
  }
}

// Periodic sync (if supported) - for stock updates
// @ts-ignore - Periodic Sync API types not available in standard TypeScript lib
self.addEventListener('periodicsync', (event: any) => {
  if (event.tag === 'stock-sync') {
    event.waitUntil(syncStockData());
  }
});

async function syncStockData(): Promise<void> {
  try {
    await fetch('/api/stock', { method: 'GET' });
    console.log('[SW] Periodic stock sync completed');
  } catch (error) {
    console.error('[SW] Periodic stock sync failed');
  }
}

// Push notifications (for future use)
self.addEventListener('push', (event: PushEvent) => {
  if (!event.data) {
    return;
  }

  const data = event.data.json();

  const options: NotificationOptions & { vibrate?: number[]; actions?: Array<{ action: string; title: string; icon?: string }> } = {
    body: data.body,
    icon: '/icons/icon-192x192.png',
    badge: '/icons/badge-72x72.png',
    vibrate: [100, 50, 100],
    data: data.data || {},
    actions: data.actions || [],
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// Notification click handler
self.addEventListener('notificationclick', (event: NotificationEvent) => {
  event.notification.close();

  const urlToOpen = event.notification.data?.url || '/mobile';

  event.waitUntil(
    self.clients.matchAll({ type: 'window' }).then((clientList) => {
      // Focus existing window or open new one
      for (const client of clientList) {
        if (client.url === urlToOpen && 'focus' in client) {
          return client.focus();
        }
      }
      return self.clients.openWindow(urlToOpen);
    })
  );
});

export {};
