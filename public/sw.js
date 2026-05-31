const CACHE_NAME = "workout-cache-v1"

const STATIC_ASSETS = ["/", "/sign-in", "/sign-up", "/manifest.json"]

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS)
    })
  )
  self.skipWaiting()
})

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    })
  )
  self.clients.claim()
})

self.addEventListener("fetch", (event) => {
  const { request } = event
  const url = new URL(request.url)

  if (url.origin !== self.location.origin) return

  if (request.method !== "GET") return

  if (
    url.pathname.startsWith("/_next/") ||
    url.pathname.startsWith("/static/")
  ) {
    event.respondWith(
      caches.match(request).then((cached) => {
        const fetchPromise = fetch(request).then((response) => {
          if (response.ok) {
            const clone = response.clone()
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone))
          }
          return response
        })
        return cached || fetchPromise
      })
    )
    return
  }

  if (url.pathname.startsWith("/api/")) return

  event.respondWith(
    fetch(request).catch(() => {
      return caches.match(request).then((cached) => {
        return cached || caches.match("/")
      })
    })
  )
})

self.addEventListener("push", (event) => {
  if (event.data) {
    try {
      const data = event.data.json()
      const options = {
        body: data.body,
        icon: "/icon-192x192.png",
        badge: "/icon-192x192.png",
        vibrate: [100, 50, 100],
        data: {
          dateOfArrival: Date.now(),
          url: data.url || "/",
        },
      }
      event.waitUntil(
        self.registration.showNotification(
          data.title || "Workout Tracker",
          options
        )
      )
    } catch {
      event.waitUntil(
        self.registration.showNotification("Workout Tracker", {
          body: event.data.text(),
          icon: "/icon-192x192.png",
        })
      )
    }
  }
})

self.addEventListener("notificationclick", (event) => {
  event.notification.close()
  const url = event.notification.data?.url || "/"
  event.waitUntil(
    self.clients.matchAll({ type: "window" }).then((clients) => {
      for (const client of clients) {
        if (client.url.includes(self.location.origin) && "focus" in client) {
          return client.focus()
        }
      }
      return self.clients.openWindow(url)
    })
  )
})
