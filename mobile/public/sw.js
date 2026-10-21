const VERSION = "v2";
const SHELL = `nsg-shell-${VERSION}`;
const DATA = `nsg-data-${VERSION}`;
const IMAGES = "nsg-images";
const SOUNDS = "nsg-sounds";
const PRECACHE = [
  "./",
  "./manifest.webmanifest",
  "./icon.svg",
  "./icon-192.png",
  "./icon-512.png",
  "./data/cards.json",
  "./data/codes.json",
  "./i18n/en/messages.ftl",
  "./i18n/en/ui.ftl",
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(SHELL).then((cache) => cache.addAll(PRECACHE)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  const keep = new Set([SHELL, DATA, IMAGES, SOUNDS]);
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => !keep.has(k)).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

async function networkFirst(request, cacheName, fallback) {
  const cache = await caches.open(cacheName);
  try {
    const response = await fetch(fallback ? new Request(request.url, { cache: "no-cache", credentials: "same-origin" }) : request);
    if (response.ok) cache.put(fallback ?? request, response.clone());
    return response;
  } catch {
    return (await cache.match(fallback ?? request)) ?? Response.error();
  }
}

async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const hit = await cache.match(request);
  if (hit) return hit;
  const response = await fetch(request);
  if (response.ok) cache.put(request, response.clone());
  return response;
}

async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const hit = await cache.match(request);
  const update = fetch(request)
    .then((response) => {
      if (response.ok) cache.put(request, response.clone());
      return response;
    })
    .catch(() => hit);
  return hit ?? update;
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.searchParams.has("check")) return;
  if (request.mode === "navigate") {
    event.respondWith(networkFirst(request, SHELL, new URL("./", self.registration.scope).href));
  } else if (url.hostname === "card-images.netrunnerdb.com") {
    event.respondWith(cacheFirst(request, IMAGES));
  } else if (url.origin === self.location.origin) {
    if (url.pathname.includes("/assets/")) event.respondWith(cacheFirst(request, SHELL));
    else if (url.pathname.includes("/sound/")) event.respondWith(cacheFirst(request, SOUNDS));
    else if (url.pathname.includes("/data/") || url.pathname.includes("/i18n/")) event.respondWith(staleWhileRevalidate(request, DATA));
    else event.respondWith(networkFirst(request, SHELL));
  }
});

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data?.json() ?? {};
  } catch {}
  event.waitUntil(
    self.registration.showNotification(data.title || "Your move", {
      body: data.body || "Your opponent is waiting for you.",
      tag: data.code ? `turn-${data.code}` : "turn",
      renotify: true,
      icon: new URL("./icon-192.png", self.registration.scope).href,
      data: { code: data.code },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const code = event.notification.data?.code;
  const url = new URL(code ? `./?game=${encodeURIComponent(code)}` : "./", self.registration.scope).href;
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(async (windows) => {
      const win = windows.find((w) => w.url.startsWith(self.registration.scope));
      if (!win) return self.clients.openWindow(url);
      if (win.url !== url) await win.navigate(url).catch(() => {});
      return win.focus();
    }),
  );
});
