const CACHE = 'relaydeck-v2'

// App shell assets to cache on install
const PRECACHE = [
  '/',
  '/pda',
  '/dashboard',
  '/offline',
]

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(PRECACHE)).then(() => self.skipWaiting())
  )
})

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  )
})

self.addEventListener('fetch', e => {
  const { request } = e
  const url = new URL(request.url)

  // Never intercept non-GET requests (POST/PUT/DELETE) — iOS Safari drops
  // the request body when a service worker forwards these, causing API errors
  if (request.method !== 'GET') return

  // Never intercept Supabase API calls — always go network-first
  if (url.hostname.includes('supabase.co')) return

  // For navigation requests: try network, fall back to cached shell
  if (request.mode === 'navigate') {
    e.respondWith(
      fetch(request)
        .then(res => {
          const clone = res.clone()
          caches.open(CACHE).then(c => c.put(request, clone))
          return res
        })
        .catch(() => caches.match(request).then(r => r || caches.match('/')))
    )
    return
  }

  // For _next/static assets: cache-first (they're content-hashed)
  if (url.pathname.startsWith('/_next/static/')) {
    e.respondWith(
      caches.match(request).then(cached => {
        if (cached) return cached
        return fetch(request).then(res => {
          caches.open(CACHE).then(c => c.put(request, res.clone()))
          return res
        })
      })
    )
    return
  }

  // Everything else: network-first, silent fail
  e.respondWith(
    fetch(request).catch(() => caches.match(request))
  )
})
