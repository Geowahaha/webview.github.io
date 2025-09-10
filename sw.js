/**
 * TradeMaster AI Pro - Service Worker
 * Provides offline functionality and performance optimization
 */

const CACHE_NAME = 'trademaster-ai-pro-v1.0.0';
const CACHE_URLS = [
    '/',
    '/index.html',
    '/css/styles.css',
    '/js/config.js',
    '/js/utils.js',
    '/js/ctrader-sdk.js',
    '/js/ai-assistant.js',
    '/js/chart.js',
    '/js/trading.js',
    '/js/voice.js',
    '/js/main.js',
    '/assets/favicon.ico',
    // External CDN resources
    'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap',
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css',
    'https://cdn.jsdelivr.net/npm/chart.js',
    'https://cdn.jsdelivr.net/npm/@spotware-web-team/sdk@latest/dist/index.js'
];

// Install event - cache resources
self.addEventListener('install', (event) => {
    console.log('[ServiceWorker] Install');
    
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('[ServiceWorker] Caching app shell');
                return cache.addAll(CACHE_URLS.map(url => {
                    // Handle relative URLs
                    if (url.startsWith('/')) {
                        return new Request(url, { cache: 'reload' });
                    }
                    return url;
                }));
            })
            .then(() => {
                console.log('[ServiceWorker] App shell cached');
                self.skipWaiting();
            })
            .catch((error) => {
                console.error('[ServiceWorker] Cache failed:', error);
            })
    );
});

// Activate event - clean old caches
self.addEventListener('activate', (event) => {
    console.log('[ServiceWorker] Activate');
    
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('[ServiceWorker] Removing old cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => {
            console.log('[ServiceWorker] Cache cleanup complete');
            self.clients.claim();
        })
    );
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
    // Skip non-GET requests
    if (event.request.method !== 'GET') {
        return;
    }
    
    // Skip cross-origin requests for external APIs
    if (!event.request.url.startsWith(self.location.origin) && 
        !event.request.url.includes('googleapis.com') &&
        !event.request.url.includes('cdnjs.cloudflare.com') &&
        !event.request.url.includes('cdn.jsdelivr.net')) {
        return;
    }
    
    event.respondWith(
        caches.match(event.request)
            .then((response) => {
                // Cache hit - return response
                if (response) {
                    console.log('[ServiceWorker] From cache:', event.request.url);
                    return response;
                }
                
                // Clone the request
                const fetchRequest = event.request.clone();
                
                return fetch(fetchRequest).then((response) => {
                    // Check if valid response
                    if (!response || response.status !== 200 || response.type !== 'basic') {
                        return response;
                    }
                    
                    // Clone the response
                    const responseToCache = response.clone();
                    
                    // Add to cache
                    caches.open(CACHE_NAME)
                        .then((cache) => {
                            cache.put(event.request, responseToCache);
                        });
                    
                    console.log('[ServiceWorker] From network:', event.request.url);
                    return response;
                }).catch((error) => {
                    console.error('[ServiceWorker] Fetch failed:', error);
                    
                    // Return offline fallback for HTML requests
                    if (event.request.headers.get('accept').includes('text/html')) {
                        return caches.match('/index.html');
                    }
                });
            })
    );
});

// Handle background sync for offline trading
self.addEventListener('sync', (event) => {
    console.log('[ServiceWorker] Background sync:', event.tag);
    
    if (event.tag === 'sync-trades') {
        event.waitUntil(syncTrades());
    }
});

// Handle push notifications
self.addEventListener('push', (event) => {
    console.log('[ServiceWorker] Push received:', event);
    
    const options = {
        body: event.data ? event.data.text() : 'TradeMaster AI Pro notification',
        icon: '/assets/favicon.ico',
        badge: '/assets/favicon.ico',
        vibrate: [200, 100, 200],
        data: {
            dateOfArrival: Date.now(),
            primaryKey: 1
        },
        actions: [
            {
                action: 'open',
                title: 'Open App',
                icon: '/assets/favicon.ico'
            },
            {
                action: 'close',
                title: 'Close'
            }
        ]
    };
    
    event.waitUntil(
        self.registration.showNotification('TradeMaster AI Pro', options)
    );
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
    console.log('[ServiceWorker] Notification click:', event);
    
    event.notification.close();
    
    if (event.action === 'open') {
        event.waitUntil(
            clients.openWindow('/')
        );
    }
});

// Sync offline trades when connection restored
async function syncTrades() {
    try {
        const cache = await caches.open('offline-trades');
        const requests = await cache.keys();
        
        for (const request of requests) {
            try {
                // Attempt to send cached trade requests
                const response = await fetch(request);
                if (response.ok) {
                    await cache.delete(request);
                    console.log('[ServiceWorker] Synced offline trade:', request.url);
                }
            } catch (error) {
                console.error('[ServiceWorker] Failed to sync trade:', error);
            }
        }
    } catch (error) {
        console.error('[ServiceWorker] Sync failed:', error);
    }
}

// Message handling for communication with main thread
self.addEventListener('message', (event) => {
    console.log('[ServiceWorker] Message received:', event.data);
    
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
    
    if (event.data && event.data.type === 'CACHE_UPDATE') {
        // Force cache update
        caches.delete(CACHE_NAME).then(() => {
            console.log('[ServiceWorker] Cache cleared for update');
        });
    }
});

console.log('[ServiceWorker] Service Worker registered successfully');