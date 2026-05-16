export function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) {
    return;
  }

  if (!import.meta.env.PROD) {
    return;
  }

  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/sw.js", {
        scope: "/"
      })
      .catch((error: unknown) => {
        console.error("Gagal register service worker:", error);
      });
  });
}
