// ZeePay no longer uses a service worker. This file intentionally exists only
// to retire any registrations left by older deployments.
self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting())
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    Promise.all([
      self.registration.unregister(),
      caches.keys().then((keys) => Promise.all(keys.map((key) => caches.delete(key)))),
    ]).then(() => self.clients.matchAll({ type: 'window' }))
      .then((clients) => clients.forEach((client) => client.navigate(client.url)))
  )
})

self.addEventListener('fetch', (event) => {
  // Never intercept requests while the legacy worker is being retired.
})
