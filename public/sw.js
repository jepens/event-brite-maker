// Service Worker for Offline Check-in
const CACHE_NAME = 'event-checkin-v1';
const OFFLINE_CACHE = 'offline-checkin-v1';

// Resources to cache for offline functionality
const CACHE_URLS = [
  '/',
  '/admin/scanner',
  '/admin/registrations',
  '/static/js/qr-scanner.js',
  '/static/js/offline-manager.js'
];

// Install event - cache essential resources
self.addEventListener('install', (event) => {
  console.log('Service Worker: Installing...');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Service Worker: Caching essential resources');
        return cache.addAll(CACHE_URLS);
      })
      .then(() => {
        console.log('Service Worker: Installation complete');
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('Service Worker: Installation failed', error);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('Service Worker: Activating...');
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME && cacheName !== OFFLINE_CACHE) {
              console.log('Service Worker: Deleting old cache', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('Service Worker: Activation complete');
        return self.clients.claim();
      })
  );
});

// Fetch event - serve cached resources when offline
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Only handle GET requests
  if (request.method !== 'GET') {
    return;
  }
  
  // Handle API requests for check-in data
  if (url.pathname.includes('/api/checkin') || url.pathname.includes('/api/tickets')) {
    event.respondWith(handleApiRequest(request));
    return;
  }
  
  // Handle static resources
  if (url.pathname.startsWith('/static/') || url.pathname.startsWith('/admin/')) {
    event.respondWith(handleStaticRequest(request));
    return;
  }
  
  // Handle navigation requests
  if (request.mode === 'navigate') {
    event.respondWith(handleNavigationRequest(request));
    return;
  }
});

// Handle API requests with offline fallback
async function handleApiRequest(request) {
  try {
    // Try to fetch from network first
    const response = await fetch(request);
    
    // If successful, cache the response
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    
    return response;
  } catch (error) {
    console.log('Service Worker: Network failed, serving from cache', error);
    
    // Return cached response if available
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Return offline response for check-in endpoints
    if (request.url.includes('/api/checkin')) {
      return new Response(JSON.stringify({
        success: false,
        message: 'Offline mode - check-in will be synced when online',
        offline: true
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    throw error;
  }
}

// Handle static resource requests
async function handleStaticRequest(request) {
  try {
    // Try network first
    const response = await fetch(request);
    
    // Cache successful responses
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    
    return response;
  } catch (error) {
    // Return cached version if available
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    throw error;
  }
}

// Handle navigation requests
async function handleNavigationRequest(request) {
  try {
    // Try network first
    const response = await fetch(request);
    
    // Cache successful responses
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    
    return response;
  } catch (error) {
    // Return cached version if available
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Return offline page
    return caches.match('/offline.html');
  }
}

// Background sync for offline check-ins
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-offline-checkins') {
    console.log('Service Worker: Background sync triggered');
    event.waitUntil(syncOfflineCheckins());
  }
});

// Sync offline check-ins when online
async function syncOfflineCheckins() {
  try {
    // This will be implemented in the offline manager
    console.log('Service Worker: Syncing offline check-ins...');
    
    // Notify clients about sync
    const clients = await self.clients.matchAll();
    clients.forEach((client) => {
      client.postMessage({
        type: 'SYNC_OFFLINE_CHECKINS',
        timestamp: Date.now()
      });
    });
  } catch (error) {
    console.error('Service Worker: Sync failed', error);
  }
}

// Handle messages from main thread
self.addEventListener('message', (event) => {
  const { type, data } = event.data;
  
  switch (type) {
    case 'SKIP_WAITING':
      self.skipWaiting();
      break;
      
    case 'CACHE_CHECKIN_DATA':
      cacheCheckinData(data);
      break;
      
    case 'GET_CACHED_CHECKINS':
      getCachedCheckins(event.ports[0]);
      break;
      
    default:
      console.log('Service Worker: Unknown message type', type);
  }
});

// Cache check-in data for offline use
async function cacheCheckinData(data) {
  try {
    const cache = await caches.open(OFFLINE_CACHE);
    const response = new Response(JSON.stringify(data), {
      headers: { 'Content-Type': 'application/json' }
    });
    
    await cache.put(`/checkin-data/${data.id}`, response);
    console.log('Service Worker: Cached check-in data', data.id);
  } catch (error) {
    console.error('Service Worker: Failed to cache check-in data', error);
  }
}

// Get cached check-ins
async function getCachedCheckins(port) {
  try {
    const cache = await caches.open(OFFLINE_CACHE);
    const requests = await cache.keys();
    const checkinRequests = requests.filter(req => req.url.includes('/checkin-data/'));
    
    const checkins = await Promise.all(
      checkinRequests.map(async (request) => {
        const response = await cache.match(request);
        return response.json();
      })
    );
    
    port.postMessage({ type: 'CACHED_CHECKINS', data: checkins });
  } catch (error) {
    console.error('Service Worker: Failed to get cached check-ins', error);
    port.postMessage({ type: 'CACHED_CHECKINS_ERROR', error: error.message });
  }
} 