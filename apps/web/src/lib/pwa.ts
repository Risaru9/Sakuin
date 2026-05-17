export type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{
    outcome: "accepted" | "dismissed";
    platform: string;
  }>;
};

type ServiceWorkerUpdateHandler = (
  registration: ServiceWorkerRegistration
) => void;

type RegisterServiceWorkerOptions = {
  onUpdate?: ServiceWorkerUpdateHandler;
};

type InstallPromptListener = (
  event: BeforeInstallPromptEvent | null
) => void;

let deferredInstallPrompt: BeforeInstallPromptEvent | null = null;
let hasSetupInstallPromptCapture = false;
let isReloadingForServiceWorkerUpdate = false;

const installPromptListeners = new Set<InstallPromptListener>();

function notifyInstallPromptListeners() {
  for (const listener of installPromptListeners) {
    listener(deferredInstallPrompt);
  }
}

export function setupInstallPromptCapture() {
  if (hasSetupInstallPromptCapture) {
    return;
  }

  if (typeof window === "undefined") {
    return;
  }

  hasSetupInstallPromptCapture = true;

  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();

    deferredInstallPrompt = event as BeforeInstallPromptEvent;
    notifyInstallPromptListeners();
  });

  window.addEventListener("appinstalled", () => {
    deferredInstallPrompt = null;
    notifyInstallPromptListeners();
  });
}

export function getDeferredInstallPrompt() {
  return deferredInstallPrompt;
}

export function clearDeferredInstallPrompt() {
  deferredInstallPrompt = null;
  notifyInstallPromptListeners();
}

export function subscribeToInstallPrompt(listener: InstallPromptListener) {
  installPromptListeners.add(listener);

  listener(deferredInstallPrompt);

  return () => {
    installPromptListeners.delete(listener);
  };
}

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