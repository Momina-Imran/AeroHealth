// Service Worker for Aura BreatheWell PWA
const CACHE_NAME = 'breathewell-v1.0.0';
const STATIC_CACHE_NAME = 'breathewell-static-v1.0.0';
const DYNAMIC_CACHE_NAME = 'breathewell-dynamic-v1.0.0';

// Files to cache for offline functionality
const STATIC_FILES = [
    '/',
    '/index.html',
    '/dashboard.html',
    '/profile.html',
    '/settings.html',
    '/auth.html',
    '/onboarding.html',
    '/styles/main.css',
    '/styles/auth.css',
    '/styles/responsive.css',
    '/js/app.js',
    '/js/auth.js',
    '/js/breathing.js',
    '/js/analytics.js',
    '/js/firebase-config.js',
    '/manifest.json',
    // External dependencies
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css',
    'https://cdn.jsdelivr.net/npm/chart.js'
];

// API endpoints to cache
const API_ENDPOINTS = [
    'https://api.openweathermap.org/data/2.5/weather',
    'https://api.openweathermap.org/data/2.5/air_pollution'
];

// Install event - cache static files
self.addEventListener('install', (event) => {
    console.log('[ServiceWorker] Install');
    
    event.waitUntil(
        Promise.all([
            // Cache static files
            caches.open(STATIC_CACHE_NAME).then((cache) => {
                console.log('[ServiceWorker] Caching static files');
                return cache.addAll(STATIC_FILES.map(url => new Request(url, {
                    credentials: 'same-origin'
                })));
            }),
            
            // Force activation
            self.skipWaiting()
        ]).catch((error) => {
            console.error('[ServiceWorker] Install failed:', error);
        })
    );
});

// Activate event - clean old caches
self.addEventListener('activate', (event) => {
    console.log('[ServiceWorker] Activate');
    
    event.waitUntil(
        Promise.all([
            // Clean old caches
            caches.keys().then((cacheNames) => {
                return Promise.all(
                    cacheNames.map((cacheName) => {
                        if (cacheName !== STATIC_CACHE_NAME && 
                            cacheName !== DYNAMIC_CACHE_NAME &&
                            cacheName.startsWith('breathewell-')) {
                            console.log('[ServiceWorker] Deleting old cache:', cacheName);
                            return caches.delete(cacheName);
                        }
                    })
                );
            }),
            
            // Claim all clients
            self.clients.claim()
        ])
    );
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
    const request = event.request;
    const url = new URL(request.url);
    
    // Skip non-GET requests
    if (request.method !== 'GET') {
        return;
    }
    
    // Skip chrome-extension and other non-http(s) requests
    if (!url.protocol.startsWith('http')) {
        return;
    }
    
    // Handle different types of requests
    if (isStaticAsset(request)) {
        event.respondWith(handleStaticAsset(request));
    } else if (isAPIRequest(request)) {
        event.respondWith(handleAPIRequest(request));
    } else if (isNavigationRequest(request)) {
        event.respondWith(handleNavigationRequest(request));
    } else {
        event.respondWith(handleDynamicRequest(request));
    }
});

// Check if request is for static asset
function isStaticAsset(request) {
    const url = new URL(request.url);
    return STATIC_FILES.some(file => url.pathname === file || url.href === file);
}

// Check if request is for API
function isAPIRequest(request) {
    const url = new URL(request.url);
    return API_ENDPOINTS.some(endpoint => request.url.startsWith(endpoint));
}

// Check if request is navigation
function isNavigationRequest(request) {
    return request.mode === 'navigate';
}

// Handle static assets - cache first
async function handleStaticAsset(request) {
    try {
        const cache = await caches.open(STATIC_CACHE_NAME);
        const cachedResponse = await cache.match(request);
        
        if (cachedResponse) {
            // Return cached version and update in background
            updateCacheInBackground(request, cache);
            return cachedResponse;
        }
        
        // Fetch from network and cache
        const networkResponse = await fetch(request);
        if (networkResponse.ok) {
            cache.put(request, networkResponse.clone());
        }
        return networkResponse;
        
    } catch (error) {
        console.error('[ServiceWorker] Static asset fetch failed:', error);
        return caches.match('/index.html'); // Fallback to offline page
    }
}

// Handle API requests - network first with cache fallback
async function handleAPIRequest(request) {
    try {
        const cache = await caches.open(DYNAMIC_CACHE_NAME);
        
        // Try network first
        try {
            const networkResponse = await fetch(request);
            if (networkResponse.ok) {
                // Cache successful responses
                cache.put(request, networkResponse.clone());
                return networkResponse;
            }
        } catch (networkError) {
            console.log('[ServiceWorker] Network failed for API request:', networkError);
        }
        
        // Fallback to cache
        const cachedResponse = await cache.match(request);
        if (cachedResponse) {
            // Add offline indicator to response
            const modifiedResponse = addOfflineHeader(cachedResponse);
            return modifiedResponse;
        }
        
        // Return offline response
        return createOfflineAPIResponse(request);
        
    } catch (error) {
        console.error('[ServiceWorker] API request failed:', error);
        return createOfflineAPIResponse(request);
    }
}

// Handle navigation requests
async function handleNavigationRequest(request) {
    try {
        // Try network first
        const networkResponse = await fetch(request);
        return networkResponse;
        
    } catch (error) {
        console.log('[ServiceWorker] Network failed for navigation:', error);
        
        // Return cached page or offline fallback
        const cache = await caches.open(STATIC_CACHE_NAME);
        const cachedResponse = await cache.match(request.url);
        
        if (cachedResponse) {
            return cachedResponse;
        }
        
        // Fallback to index.html for SPA routing
        return cache.match('/index.html');
    }
}

// Handle other dynamic requests
async function handleDynamicRequest(request) {
    try {
        const cache = await caches.open(DYNAMIC_CACHE_NAME);
        
        // Try network first
        try {
            const networkResponse = await fetch(request);
            if (networkResponse.ok) {
                cache.put(request, networkResponse.clone());
            }
            return networkResponse;
        } catch (networkError) {
            // Fallback to cache
            const cachedResponse = await cache.match(request);
            if (cachedResponse) {
                return cachedResponse;
            }
            throw networkError;
        }
        
    } catch (error) {
        console.error('[ServiceWorker] Dynamic request failed:', error);
        
        // Return generic offline response
        return new Response('Offline - content not available', {
            status: 503,
            statusText: 'Service Unavailable',
            headers: { 'Content-Type': 'text/plain' }
        });
    }
}

// Update cache in background
async function updateCacheInBackground(request, cache) {
    try {
        const networkResponse = await fetch(request);
        if (networkResponse.ok) {
            cache.put(request, networkResponse.clone());
        }
    } catch (error) {
        // Silently fail background updates
        console.log('[ServiceWorker] Background update failed:', error);
    }
}

// Add offline header to cached response
function addOfflineHeader(response) {
    const headers = new Headers(response.headers);
    headers.set('X-Served-From-Cache', 'true');
    headers.set('X-Offline-Mode', 'true');
    
    return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: headers
    });
}

// Create offline API response
function createOfflineAPIResponse(request) {
    const url = new URL(request.url);
    
    // Weather API offline response
    if (url.pathname.includes('weather')) {
        return new Response(JSON.stringify({
            error: 'offline',
            message: 'Weather data unavailable offline',
            offline: true
        }), {
            status: 503,
            headers: { 'Content-Type': 'application/json' }
        });
    }
    
    // Air pollution API offline response
    if (url.pathname.includes('air_pollution')) {
        return new Response(JSON.stringify({
            error: 'offline',
            message: 'Air quality data unavailable offline',
            offline: true
        }), {
            status: 503,
            headers: { 'Content-Type': 'application/json' }
        });
    }
    
    // Generic offline response
    return new Response(JSON.stringify({
        error: 'offline',
        message: 'API unavailable offline',
        offline: true
    }), {
        status: 503,
        headers: { 'Content-Type': 'application/json' }
    });
}

// Background sync for session data
self.addEventListener('sync', (event) => {
    console.log('[ServiceWorker] Background sync:', event.tag);
    
    if (event.tag === 'session-data-sync') {
        event.waitUntil(syncSessionData());
    } else if (event.tag === 'analytics-sync') {
        event.waitUntil(syncAnalyticsData());
    }
});

// Sync session data with Firebase when online
async function syncSessionData() {
    try {
        // Get pending session data from IndexedDB or localStorage
        const pendingSessions = JSON.parse(localStorage.getItem('pendingSessionSync') || '[]');
        
        if (pendingSessions.length === 0) return;
        
        // Sync with Firebase (when available)
        for (const session of pendingSessions) {
            try {
                // This would call Firebase API
                console.log('[ServiceWorker] Syncing session:', session.id);
                // await firebaseAPI.saveSession(session);
            } catch (error) {
                console.error('[ServiceWorker] Failed to sync session:', error);
                // Keep in queue for next sync
                continue;
            }
        }
        
        // Clear synced sessions
        localStorage.removeItem('pendingSessionSync');
        console.log('[ServiceWorker] Session data synced successfully');
        
    } catch (error) {
        console.error('[ServiceWorker] Session sync failed:', error);
    }
}

// Sync analytics data
async function syncAnalyticsData() {
    try {
        const pendingAnalytics = JSON.parse(localStorage.getItem('pendingAnalyticsSync') || '[]');
        
        if (pendingAnalytics.length === 0) return;
        
        for (const event of pendingAnalytics) {
            try {
                // This would call Firebase Analytics
                console.log('[ServiceWorker] Syncing analytics event:', event.name);
                // await firebaseAnalytics.logEvent(event.name, event.data);
            } catch (error) {
                console.error('[ServiceWorker] Failed to sync analytics:', error);
                continue;
            }
        }
        
        localStorage.removeItem('pendingAnalyticsSync');
        console.log('[ServiceWorker] Analytics data synced successfully');
        
    } catch (error) {
        console.error('[ServiceWorker] Analytics sync failed:', error);
    }
}

// Push notification handler
self.addEventListener('push', (event) => {
    console.log('[ServiceWorker] Push received');
    
    const options = {
        body: 'Time for your breathing session! 🧘‍♀️',
        icon: '/icons/icon-192x192.png',
        badge: '/icons/badge-72x72.png',
        vibrate: [100, 50, 100],
        data: {
            dateOfArrival: Date.now(),
            primaryKey: 1,
            url: '/?notification=daily-reminder'
        },
        actions: [
            {
                action: 'start-session',
                title: 'Start Session',
                icon: '/icons/action-start.png'
            },
            {
                action: 'dismiss',
                title: 'Later',
                icon: '/icons/action-dismiss.png'
            }
        ],
        requireInteraction: true,
        tag: 'breathing-reminder'
    };
    
    if (event.data) {
        try {
            const pushData = event.data.json();
            options.body = pushData.body || options.body;
            options.title = pushData.title || 'Aura BreatheWell';
            options.data = { ...options.data, ...pushData.data };
        } catch (error) {
            console.error('[ServiceWorker] Invalid push data:', error);
        }
    }
    
    event.waitUntil(
        self.registration.showNotification('Aura BreatheWell', options)
    );
});

// Notification click handler
self.addEventListener('notificationclick', (event) => {
    console.log('[ServiceWorker] Notification click:', event.action);
    
    event.notification.close();
    
    if (event.action === 'start-session') {
        // Open app and start session
        event.waitUntil(
            clients.openWindow('/?action=start-session')
        );
    } else if (event.action === 'dismiss') {
        // Just close notification
        return;
    } else {
        // Default action - open app
        event.waitUntil(
            clients.openWindow('/')
        );
    }
});

// Message handler for communication with main app
self.addEventListener('message', (event) => {
    console.log('[ServiceWorker] Message received:', event.data);
    
    if (event.data && event.data.type) {
        switch (event.data.type) {
            case 'SKIP_WAITING':
                self.skipWaiting();
                break;
                
            case 'GET_VERSION':
                event.ports[0].postMessage({ version: CACHE_NAME });
                break;
                
            case 'CACHE_SESSION':
                cacheSessionData(event.data.session);
                break;
                
            case 'SCHEDULE_SYNC':
                scheduleBackgroundSync(event.data.tag);
                break;
                
            default:
                console.log('[ServiceWorker] Unknown message type:', event.data.type);
        }
    }
});

// Cache session data for offline sync
async function cacheSessionData(session) {
    try {
        const pendingSessions = JSON.parse(localStorage.getItem('pendingSessionSync') || '[]');
        pendingSessions.push(session);
        localStorage.setItem('pendingSessionSync', JSON.stringify(pendingSessions));
        
        // Schedule background sync
        if ('serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype) {
            await self.registration.sync.register('session-data-sync');
        }
    } catch (error) {
        console.error('[ServiceWorker] Failed to cache session data:', error);
    }
}

// Schedule background sync
async function scheduleBackgroundSync(tag) {
    try {
        if ('sync' in self.registration) {
            await self.registration.sync.register(tag);
            console.log('[ServiceWorker] Background sync scheduled:', tag);
        }
    } catch (error) {
        console.error('[ServiceWorker] Failed to schedule sync:', error);
    }
}

// Periodic background sync (experimental)
self.addEventListener('periodicsync', (event) => {
    console.log('[ServiceWorker] Periodic sync:', event.tag);
    
    if (event.tag === 'daily-reminder') {
        event.waitUntil(showDailyReminder());
    }
});

// Show daily reminder notification
async function showDailyReminder() {
    try {
        // Check if user has enabled reminders
        const settings = JSON.parse(localStorage.getItem('appSettings') || '{}');
        if (!settings.dailyReminder) return;
        
        // Check if already practiced today
        const sessions = JSON.parse(localStorage.getItem('breathingSessions') || '[]');
        const today = new Date().toDateString();
        const todaySessions = sessions.filter(session => 
            new Date(session.date).toDateString() === today
        );
        
        if (todaySessions.length === 0) {
            await self.registration.showNotification('Daily Breathing Reminder', {
                body: 'You haven\'t practiced today. Take a moment to breathe! 🌱',
                icon: '/icons/icon-192x192.png',
                tag: 'daily-reminder',
                requireInteraction: false
            });
        }
    } catch (error) {
        console.error('[ServiceWorker] Daily reminder failed:', error);
    }
}

// Cache management utilities
async function cleanOldCaches() {
    const cacheWhitelist = [STATIC_CACHE_NAME, DYNAMIC_CACHE_NAME];
    const cacheNames = await caches.keys();
    
    return Promise.all(
        cacheNames.map((cacheName) => {
            if (!cacheWhitelist.includes(cacheName)) {
                console.log('[ServiceWorker] Deleting cache:', cacheName);
                return caches.delete(cacheName);
            }
        })
    );
}

// Get cache size for debugging
async function getCacheSize() {
    const cacheNames = await caches.keys();
    let totalSize = 0;
    
    for (const cacheName of cacheNames) {
        const cache = await caches.open(cacheName);
        const requests = await cache.keys();
        
        for (const request of requests) {
            const response = await cache.match(request);
            if (response) {
                const blob = await response.blob();
                totalSize += blob.size;
            }
        }
    }
    
    return totalSize;
}

// Error logging
function logError(error, context) {
    console.error(`[ServiceWorker] ${context}:`, error);
    
    // In a real app, you might want to send errors to an analytics service
    // analytics.logError(error, context);
}

console.log('[ServiceWorker] Script loaded');
