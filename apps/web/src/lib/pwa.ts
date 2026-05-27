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

export type InstallPlatform = "ios" | "android" | "desktop" | "unknown";

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

export function getInstallPlatform(): InstallPlatform {
  if (typeof window === "undefined") {
    return "unknown";
  }

  const userAgent = window.navigator.userAgent.toLowerCase();

  if (/iphone|ipad|ipod/.test(userAgent)) {
    return "ios";
  }

  if (/android/.test(userAgent)) {
    return "android";
  }

  if (/windows|macintosh|linux|cros/.test(userAgent)) {
    return "desktop";
  }

  return "unknown";
}

export function isStandaloneMode() {
  if (typeof window === "undefined") {
    return false;
  }

  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    window.matchMedia("(display-mode: fullscreen)").matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

export function getManualInstallMessage() {
  const platform = getInstallPlatform();

  if (platform === "ios") {
    return "Untuk iPhone/iPad: buka Sakuin di Safari, tap tombol Share, lalu pilih Add to Home Screen.";
  }

  if (platform === "android") {
    return "Jika dialog install belum muncul, buka menu browser Chrome/Edge, lalu pilih Install app atau Add to Home screen.";
  }

  return "Jika dialog install belum muncul, buka menu browser, lalu pilih Install app atau Apps > Install this site as an app.";
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

export async function checkForServiceWorkerUpdate() {
  if (!("serviceWorker" in navigator)) {
    return;
  }

  const registration = await navigator.serviceWorker.getRegistration();
  await registration?.update();
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

    window.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") {
        void checkForServiceWorkerUpdate();
      }
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
