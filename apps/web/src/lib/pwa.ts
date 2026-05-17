type ServiceWorkerUpdateHandler = (
  registration: ServiceWorkerRegistration
) => void;

type RegisterServiceWorkerOptions = {
  onUpdate?: ServiceWorkerUpdateHandler;
};

let isReloadingForServiceWorkerUpdate = false;

export function activateWaitingServiceWorker(
  registration: ServiceWorkerRegistration
) {
  if (!registration.waiting) {
    window.location.reload();
    return;
  }

  registration.waiting.postMessage({
    type: "SKIP_WAITING"
  });
}

export function registerServiceWorker(
  options: RegisterServiceWorkerOptions = {}
) {
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
      .then((registration) => {
        if (registration.waiting) {
          options.onUpdate?.(registration);
        }

        registration.addEventListener("updatefound", () => {
          const installingWorker = registration.installing;

          if (!installingWorker) {
            return;
          }

          installingWorker.addEventListener("statechange", () => {
            const hasNewWorkerInstalled =
              installingWorker.state === "installed";

            const hasExistingController =
              Boolean(navigator.serviceWorker.controller);

            if (hasNewWorkerInstalled && hasExistingController) {
              options.onUpdate?.(registration);
            }
          });
        });
      })
      .catch((error: unknown) => {
        console.error("Gagal register service worker:", error);
      });

    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (isReloadingForServiceWorkerUpdate) {
        return;
      }

      isReloadingForServiceWorkerUpdate = true;
      window.location.reload();
    });
  });
}