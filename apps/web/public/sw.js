const CACHE_VERSION = "sakuin-pwa-v9";
const STATIC_CACHE = `${CACHE_VERSION}-static`;
const RUNTIME_CACHE = `${CACHE_VERSION}-runtime`;

const APP_SHELL_URLS = [
  "/",
  "/offline.html",
  "/manifest.webmanifest",
  "/icons/sakuin-logo.png",
  "/icons/favicon-16.png",
  "/icons/favicon-32.png",
  "/icons/pwa-192.png",
  "/icons/pwa-512.png",
  "/icons/maskable-192.png",
  "/icons/maskable-512.png",
  "/widgets/sakuin-summary-template.json",
  "/icons/widget-hemat.svg",
  "/icons/widget-aman.svg",
  "/icons/widget-waspada.svg",
  "/icons/widget-boros.svg"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => cache.addAll(APP_SHELL_URLS))
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) =>
        Promise.all(
          cacheNames
            .filter((cacheName) => !cacheName.startsWith(CACHE_VERSION))
            .map((cacheName) => caches.delete(cacheName))
        )
      )
      .then(() => self.clients.claim())
  );
});

let apiBaseUrl = "";

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }

  if (event.data && event.data.type === "SET_TOKEN") {
    event.waitUntil(async function() {
      apiBaseUrl = event.data.apiBaseUrl || apiBaseUrl;
      const cache = await caches.open("sakuin-auth");
      if (event.data.token) {
        await cache.put(new Request("/token"), new Response(event.data.token));
        if (event.data.apiBaseUrl) {
          await cache.put(new Request("/api-url"), new Response(event.data.apiBaseUrl));
        }
      } else {
        await cache.delete(new Request("/token"));
        await cache.delete(new Request("/api-url"));
      }

      // Update widgets immediately when token changes
      await updateAllWidgets();
    }());
  }

  if (event.data && event.data.type === "UPDATE_WIDGET") {
    event.waitUntil(updateAllWidgets());
  }
});

self.addEventListener("push", (event) => {
  let payload = {
    title: "Review transaksi hari ini",
    body: "Ada transaksi yang belum dicatat? Cek 30 detik supaya dashboard tetap akurat.",
    icon: "/icons/pwa-192.png",
    badge: "/icons/maskable-192.png",
    tag: "sakuin-transaction-reminder",
    url: "/dashboard",
    actions: [
      {
        action: "open-review",
        title: "Review sekarang"
      },
      {
        action: "remind-later",
        title: "Nanti"
      }
    ]
  };

  if (event.data) {
    try {
      payload = {
        ...payload,
        ...event.data.json()
      };
    } catch {
      payload.body = event.data.text();
    }
  }

  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      icon: payload.icon,
      badge: payload.badge,
      tag: payload.tag,
      actions: payload.actions || [],
      data: {
        url: payload.url
      }
    })
  );
});

function isSameOriginRequest(request) {
  const url = new URL(request.url);
  return url.origin === self.location.origin;
}

function isStaticAsset(request) {
  const url = new URL(request.url);

  return (
    url.pathname.startsWith("/assets/") ||
    url.pathname.startsWith("/icons/") ||
    url.pathname === "/manifest.webmanifest"
  );
}

async function cacheFirst(request) {
  const cachedResponse = await caches.match(request);

  if (cachedResponse) {
    return cachedResponse;
  }

  const response = await fetch(request);

  if (response && response.ok) {
    const cache = await caches.open(RUNTIME_CACHE);
    cache.put(request, response.clone());
  }

  return response;
}

async function networkFirstNavigation(request) {
  try {
    const response = await fetch(request);

    if (response && response.ok) {
      const cache = await caches.open(RUNTIME_CACHE);
      cache.put("/", response.clone());
    }

    return response;
  } catch {
    const cachedPage = await caches.match("/");
    const offlinePage = await caches.match("/offline.html");

    return cachedPage || offlinePage;
  }
}

self.addEventListener("fetch", (event) => {
  const { request } = event;

  if (request.method !== "GET") {
    return;
  }

  const url = new URL(request.url);

  if (url.pathname === "/widgets/sakuin-summary-data.json") {
    event.respondWith(async function() {
      const data = await getWidgetData();
      return new Response(JSON.stringify(data), {
        headers: { "Content-Type": "application/json" }
      });
    }());
    return;
  }

  if (!isSameOriginRequest(request)) {
    return;
  }

  if (url.pathname === "/sw.js") {
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(networkFirstNavigation(request));
    return;
  }

  if (isStaticAsset(request)) {
    event.respondWith(cacheFirst(request));
  }
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  if (event.action === "remind-later") {
    return;
  }

  const targetUrl = event.notification.data?.url || "/dashboard";
  const urlToOpen = new URL(targetUrl, self.location.origin).href;

  event.waitUntil(
    clients
      .matchAll({
        type: "window",
        includeUncontrolled: true
      })
      .then((clientList) => {
        for (const client of clientList) {
          if ("focus" in client) {
            client.navigate(urlToOpen);
            return client.focus();
          }
        }

        return clients.openWindow(urlToOpen);
      })
  );
});

// --- PWA Custom Widgets API Helper & Event Listeners ---

async function getCachedToken() {
  try {
    const cache = await caches.open("sakuin-auth");
    const response = await cache.match(new Request("/token"));
    if (response) {
      return await response.text();
    }
  } catch (e) {
    console.error("Gagal membaca token dari cache:", e);
  }
  return null;
}

async function getCachedApiBaseUrl() {
  if (apiBaseUrl) return apiBaseUrl;
  try {
    const cache = await caches.open("sakuin-auth");
    const response = await cache.match(new Request("/api-url"));
    if (response) {
      apiBaseUrl = await response.text();
      return apiBaseUrl;
    }
  } catch (e) {
    console.error("Gagal membaca API URL dari cache:", e);
  }
  return "";
}

function formatRupiah(value) {
  const numberValue = Number(value ?? 0);
  if (Number.isNaN(numberValue)) {
    return "Rp 0";
  }
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0
  }).format(numberValue);
}

async function getWidgetData() {
  const token = await getCachedToken();
  const baseUrl = await getCachedApiBaseUrl();

  if (!token || !baseUrl) {
    return {
      incomeThisMonth: "Rp 0",
      expenseThisMonth: "Rp 0",
      statusMessage: "Silakan login di aplikasi Sakuin.",
      statusIconUrl: "https://sakuin-web.vercel.app/icons/widget-aman.svg"
    };
  }

  try {
    const response = await fetch(`${baseUrl}/api/summary`, {
      headers: {
        "Accept": "application/json",
        "Authorization": `Bearer ${token}`
      }
    });

    if (!response.ok) {
      throw new Error(`API returned status ${response.status}`);
    }

    const result = await response.json();
    if (result.success === false) {
      throw new Error(result.message || "Request failed");
    }

    const data = result.data;

    let statusMessage = "Pengeluaranmu masih aman.";
    let statusIconUrl = "https://sakuin-web.vercel.app/icons/widget-aman.svg";

    if (data.safeToSpend) {
      const sts = data.safeToSpend.status;
      const ratio = data.safeToSpend.expenseToIncomeRatio ?? 0;

      if (sts === "SAFE" && ratio < 40) {
        statusMessage = "Kamu hebat! Pengeluaranmu sangat hemat bulan ini.";
        statusIconUrl = "https://sakuin-web.vercel.app/icons/widget-hemat.svg";
      } else if (sts === "SAFE") {
        statusMessage = "Pengeluaranmu masih aman.";
        statusIconUrl = "https://sakuin-web.vercel.app/icons/widget-aman.svg";
      } else if (sts === "WATCH") {
        statusMessage = "Mulai hati-hati, pengeluaran naik.";
        statusIconUrl = "https://sakuin-web.vercel.app/icons/widget-waspada.svg";
      } else if (sts === "HOLD") {
        statusMessage = "Kamu sedang boros bulan ini.";
        statusIconUrl = "https://sakuin-web.vercel.app/icons/widget-boros.svg";
      }
    }

    return {
      incomeThisMonth: formatRupiah(data.incomeThisMonth),
      expenseThisMonth: formatRupiah(data.expenseThisMonth),
      statusMessage,
      statusIconUrl
    };
  } catch (error) {
    console.error("Gagal mengambil data widget dari API:", error);
    return {
      incomeThisMonth: "Rp 0",
      expenseThisMonth: "Rp 0",
      statusMessage: "Gagal menghubungkan ke server.",
      statusIconUrl: "https://sakuin-web.vercel.app/icons/widget-waspada.svg"
    };
  }
}

async function updateWidgetInstance(instanceId) {
  if (!self.widgets) return;
  try {
    const template = await fetch("/widgets/sakuin-summary-template.json").then((res) => res.json());
    const data = await getWidgetData();
    await self.widgets.updateByInstanceId(instanceId, {
      template,
      data
    });
  } catch (error) {
    console.error("Gagal memperbarui widget instance:", instanceId, error);
  }
}

async function updateAllWidgets() {
  if (!self.widgets) return;
  try {
    const widgets = await self.widgets.matchAll({});
    for (const widget of widgets) {
      await updateWidgetInstance(widget.id);
    }
  } catch (error) {
    console.error("Gagal memperbarui semua widget:", error);
  }
}

self.addEventListener("widgetinstall", (event) => {
  event.waitUntil(updateWidgetInstance(event.widget.id));
});

self.addEventListener("widgetuninstall", (event) => {
  // Tempat cleanup jika dibutuhkan
});

self.addEventListener("widgetclick", (event) => {
  if (event.action === "refresh") {
    event.waitUntil(updateWidgetInstance(event.widget.id));
  } else if (event.action === "open-app") {
    const targetUrl = "/dashboard";
    const urlToOpen = new URL(targetUrl, self.location.origin).href;

    event.waitUntil(
      clients
        .matchAll({
          type: "window",
          includeUncontrolled: true
        })
        .then((clientList) => {
          for (const client of clientList) {
            if ("focus" in client) {
              client.navigate(urlToOpen);
              return client.focus();
            }
          }

          return clients.openWindow(urlToOpen);
        })
    );
  }
});
