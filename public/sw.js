const CACHE_NAME = 'powerflex-fitness-v1';
const RUNTIME_CACHE = 'powerflex-runtime-v1';

// Assets that should be cached for offline use
const STATIC_CACHE_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon-192x192.png',
  '/icon-512x512.png',
  '/icon-96x96.png',
  // Add critical CSS and JS files
  '/assets/index.css',
  '/assets/index.js'
];

// Network-first API routes that shouldn't be cached
const NETWORK_FIRST_ROUTES = [
  '/api/',
  '/auth/v1/',
  '/rest/v1/'
];

// Cache-first static assets
const CACHE_FIRST_ROUTES = [
  '/icon-',
  '/assets/',
  '.png',
  '.jpg',
  '.svg',
  '.css',
  '.js'
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('📱 Service Worker: Installing PowerFlex PWA...');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('📦 Caching static assets');
        return cache.addAll(STATIC_CACHE_ASSETS);
      })
      .then(() => {
        console.log('✅ Service Worker: Installation complete');
        // Enable fullscreen and take over the page
        return self.clients.claim();
      })
      .then(() => {
        // Skip waiting to ensure immediate activation
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('❌ Service Worker: Installation failed', error);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('🔄 Service Worker: Activating...');
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            // Delete old cache versions
            if (cacheName !== CACHE_NAME && cacheName !== RUNTIME_CACHE) {
              console.log('🗑️ Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('✅ Service Worker: Activation complete');
        // Don't claim clients immediately to prevent fullscreen overlay
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('❌ Service Worker: Activation failed', error);
      })
  );
});

// Fetch event - implement caching strategies
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests and external requests
  if (request.method !== 'GET' || url.origin !== self.location.origin) {
    return;
  }

  // Handle fullscreen requests for PWA (removed to prevent overlay issues)
  // Fullscreen is now handled by the React components instead

  // Network-first for API routes
  if (NETWORK_FIRST_ROUTES.some(route => url.pathname.includes(route))) {
    event.respondWith(networkFirstStrategy(request));
    return;
  }

  // Cache-first for static assets
  if (CACHE_FIRST_ROUTES.some(route => url.pathname.includes(route))) {
    event.respondWith(cacheFirstStrategy(request));
    return;
  }

  // Stale-while-revalidate for HTML pages
  if (request.headers.get('accept')?.includes('text/html')) {
    event.respondWith(staleWhileRevalidateStrategy(request));
    return;
  }

  // Default to network
  event.respondWith(fetch(request));
});

// Network-first strategy
async function networkFirstStrategy(request) {
  const cache = await caches.open(RUNTIME_CACHE);
  
  try {
    const networkResponse = await fetch(request);
    
    // Cache successful responses
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.log('🌐 Network failed, trying cache:', request.url);
    const cachedResponse = await cache.match(request);
    return cachedResponse || new Response('Offline - No cached data available', {
      status: 503,
      statusText: 'Service Unavailable'
    });
  }
}

// Cache-first strategy
async function cacheFirstStrategy(request) {
  const cache = await caches.open(CACHE_NAME);
  
  try {
    const cachedResponse = await cache.match(request);
    
    if (cachedResponse) {
      // Update cache in background
      fetch(request).then((networkResponse) => {
        if (networkResponse.ok) {
          cache.put(request, networkResponse);
        }
      });
      
      return cachedResponse;
    }
    
    // Fallback to network
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.log('❌ Cache and network failed:', request.url);
    return new Response('Offline - Resource not available', {
      status: 503,
      statusText: 'Service Unavailable'
    });
  }
}

// Stale-while-revalidate strategy
async function staleWhileRevalidateStrategy(request) {
  const cache = await caches.open(RUNTIME_CACHE);
  const cachedResponse = await cache.match(request);
  
  // Always fetch fresh data in background
  const fetchPromise = fetch(request).then((networkResponse) => {
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  }).catch(() => null);
  
  // Return cached version immediately, wait for network if no cache
  if (cachedResponse) {
    return cachedResponse;
  }
  
  try {
    return await fetchPromise;
  } catch (error) {
    return new Response('Offline - No cached data available', {
      status: 503,
      statusText: 'Service Unavailable'
    });
  }
}

// Handle background sync for offline actions
self.addEventListener('sync', (event) => {
  console.log('🔄 Background sync:', event.tag);
  
  if (event.tag === 'sync-nutrition-data') {
    event.waitUntil(syncNutritionData());
  }
});

// Handle push notifications (future feature)
self.addEventListener('push', (event) => {
  console.log('📬 Push notification received:', event);
  
  const options = {
    body: event.data?.text() || 'New update from PowerFlex!',
    icon: '/icon-192x192.png',
    badge: '/icon-96x96.png',
    vibrate: [200, 100, 200],
    data: {
      url: '/',
      timestamp: Date.now()
    },
    actions: [
      {
        action: 'open',
        title: 'Open App'
      },
      {
        action: 'dismiss',
        title: 'Dismiss'
      }
    ]
  };
  
  event.waitUntil(
    self.registration.showNotification('PowerFlex Fitness', options)
  );
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  console.log('🔔 Notification clicked:', event.action);
  
  event.notification.close();
  
  if (event.action === 'open' || !event.action) {
    event.waitUntil(
      clients.openWindow(event.notification.data.url || '/')
    );
  }
});

// Sync nutrition data when back online
async function syncNutritionData() {
  try {
    console.log('🔄 Syncing nutrition data...');
    
    // Get offline data from IndexedDB
    const offlineData = await getOfflineData();
    
    if (offlineData.length > 0) {
      // Send to server
      for (const data of offlineData) {
        try {
          await fetch('/api/sync-nutrition', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
          });
        } catch (error) {
          console.error('Failed to sync data:', error);
        }
      }
      
      // Clear synced data
      await clearOfflineData();
    }
    
    console.log('✅ Nutrition data sync complete');
  } catch (error) {
    console.error('❌ Sync failed:', error);
  }
}

// IndexedDB helpers for offline storage (simplified)
async function getOfflineData() {
  // This would implement IndexedDB operations
  // For now, return empty array
  return [];
}

async function clearOfflineData() {
  // This would clear IndexedDB
  console.log('🗑️ Clearing offline data...');
}