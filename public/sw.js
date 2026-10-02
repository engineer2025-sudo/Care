// CareSphere service worker — private, same-origin offline app shell.
// Navigations are network-first; hashed assets are cache-first. No third-party
// requests or user-export downloads are cached by this worker.
const SHELL_CACHE = 'caresphere-shell-v2'
const ASSET_CACHE = 'caresphere-assets-v2'
const SHELL_URL = new URL('/', self.location.origin).href
const MAX_ASSETS = 80

self.addEventListener('install', event => {
  event.waitUntil(self.skipWaiting())
})

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys
        .filter(key => key.startsWith('caresphere-') && ![SHELL_CACHE, ASSET_CACHE].includes(key))
        .map(key => caches.delete(key))))
      .then(() => self.clients.claim()),
  )
})

async function cacheAsset(request, response) {
  if (!response.ok || response.type === 'opaque') return
  const cache = await caches.open(ASSET_CACHE)
  await cache.put(request, response.clone())
  const keys = await cache.keys()
  if (keys.length > MAX_ASSETS) {
    await Promise.all(keys.slice(0, keys.length - MAX_ASSETS).map(key => cache.delete(key)))
  }
}

self.addEventListener('fetch', event => {
  const request = event.request
  if (request.method !== 'GET') return

  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return

  if (request.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        const response = await fetch(request)
        if (response.ok) {
          const cache = await caches.open(SHELL_CACHE)
          await cache.put(SHELL_URL, response.clone())
        }
        return response
      } catch {
        const cache = await caches.open(SHELL_CACHE)
        return await cache.match(request.url) || await cache.match(SHELL_URL) || Response.error()
      }
    })())
    return
  }

  // Only application assets are eligible for offline caching. This avoids
  // retaining arbitrary same-origin query responses or personal exports.
  const isAppAsset = url.pathname.startsWith('/assets/') ||
    /^\/(?:icon-\d+\.png|manifest\.webmanifest)$/.test(url.pathname)
  if (!isAppAsset) return

  event.respondWith((async () => {
    const cache = await caches.open(ASSET_CACHE)
    const cached = await cache.match(request)
    if (cached) return cached
    const response = await fetch(request)
    await cacheAsset(request, response)
    return response
  })())
})
