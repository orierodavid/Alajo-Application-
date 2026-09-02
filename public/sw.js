const CACHE_NAME = 'zeepay-shell-v3'

self.addEventListener('install', (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(
    keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
  )))
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(
    keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
  )).then(() => self.clients.claim()))
})

self.addEventListener('fetch', (event) => {
  // Authentication, navigation and financial application data must always
  // reach the network. Never serve stale HTML or dashboard state from a
  // service-worker cache.
  if (event.request.method !== 'GET') return
  event.respondWith(fetch(event.request))
})
