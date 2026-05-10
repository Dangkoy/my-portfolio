/**
 * Service Worker for DKCS Portfolio
 * Provides offline support and advanced caching strategies
 */

const CACHE_VERSION = 'v1.0.0';
const CACHE_NAME = `dkcs-portfolio-${CACHE_VERSION}`;

// Core assets to cache on install
const CORE_ASSETS = [
    '/',
    '/index.html',
    '/new-styles.css',
    '/manifest.json'
];

// Install event - cache core assets
self.addEventListener('install', event => {
    console.log('Service Worker installing...');
    
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('Caching core assets');
                return cache.addAll(CORE_ASSETS);
            })
            .then(() => self.skipWaiting())
            .catch(error => console.error('Installation failed:', error))
    );
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
    console.log('Service Worker activating...');
    
    event.waitUntil(
        caches.keys()
            .then(cacheNames => {
                return Promise.all(
                    cacheNames
                        .filter(cacheName => cacheName !== CACHE_NAME)
                        .map(cacheName => {
                            console.log('Deleting old cache:', cacheName);
                            return caches.delete(cacheName);
                        })
                );
            })
            .then(() => self.clients.claim())
    );
});

// Fetch event - implement caching strategies
self.addEventListener('fetch', event => {
    const { request } = event;
    const url = new URL(request.url);
    
    // Skip non-GET requests
    if (request.method !== 'GET') {
        return;
    }
    
    // Handle API requests (Network First)
    if (url.pathname.includes('/api/')) {
        event.respondWith(networkFirst(request));
        return;
    }
    
    // Handle images (Cache First)
    if (request.destination === 'image') {
        event.respondWith(cacheFirst(request));
        return;
    }
    
    // Handle CSS, JS, fonts (Cache First)
    if (/\.(css|js|woff|woff2|ttf|otf|eot)$/i.test(url.pathname)) {
        event.respondWith(cacheFirst(request));
        return;
    }
    
    // Handle HTML (Network First)
    if (request.destination === 'document' || request.mode === 'navigate') {
        event.respondWith(networkFirst(request));
        return;
    }
    
    // Default strategy (Network First)
    event.respondWith(networkFirst(request));
});

/**
 * Network First strategy
 * Try network first, fall back to cache if offline
 */
async function networkFirst(request) {
    try {
        const response = await fetch(request);
        
        // Cache successful responses
        if (response.ok) {
            const cache = await caches.open(CACHE_NAME);
            cache.put(request, response.clone());
        }
        
        return response;
    } catch (error) {
        console.log('Network request failed, using cache:', request.url);
        
        // Fall back to cache
        const cachedResponse = await caches.match(request);
        if (cachedResponse) {
            return cachedResponse;
        }
        
        // Return offline page if available
        return caches.match('/offline.html') || 
            new Response('Offline - Content not available', {
                status: 503,
                statusText: 'Service Unavailable',
                headers: new Headers({
                    'Content-Type': 'text/plain'
                })
            });
    }
}

/**
 * Cache First strategy
 * Try cache first, fall back to network
 */
async function cacheFirst(request) {
    try {
        const cachedResponse = await caches.match(request);
        
        if (cachedResponse) {
            // Update cache in background
            fetch(request)
                .then(response => {
                    if (response.ok) {
                        const cache = caches.open(CACHE_NAME);
                        cache.then(c => c.put(request, response));
                    }
                })
                .catch(() => {}); // Silently fail network update
            
            return cachedResponse;
        }
        
        // Not in cache, fetch from network
        const response = await fetch(request);
        
        if (response.ok) {
            const cache = await caches.open(CACHE_NAME);
            cache.put(request, response.clone());
        }
        
        return response;
    } catch (error) {
        console.error('Cache First failed:', error);
        return new Response('Resource not available offline', {
            status: 503,
            statusText: 'Service Unavailable'
        });
    }
}

/**
 * Handle background sync for form submissions (future enhancement)
 */
self.addEventListener('sync', event => {
    if (event.tag === 'sync-portfolio') {
        event.waitUntil(syncPortfolioData());
    }
});

async function syncPortfolioData() {
    try {
        // Implement data sync logic here
        console.log('Syncing portfolio data...');
    } catch (error) {
        console.error('Sync failed:', error);
        throw error;
    }
}

/**
 * Handle push notifications (future enhancement)
 */
self.addEventListener('push', event => {
    if (event.data) {
        const data = event.data.json();
        
        const options = {
            body: data.message || 'New update available',
            icon: '/icon-192.png',
            badge: '/icon-192.png',
            tag: 'portfolio-notification',
            requireInteraction: true
        };
        
        event.waitUntil(
            self.registration.showNotification('Portfolio Update', options)
        );
    }
});

/**
 * Handle notification clicks
 */
self.addEventListener('notificationclick', event => {
    event.notification.close();
    
    event.waitUntil(
        clients.matchAll({ type: 'window' })
            .then(clientList => {
                // Focus existing window or open new one
                for (let client of clientList) {
                    if (client.url === '/' && 'focus' in client) {
                        return client.focus();
                    }
                }
                if (clients.openWindow) {
                    return clients.openWindow('/');
                }
            })
    );
});

console.log('Service Worker loaded');
