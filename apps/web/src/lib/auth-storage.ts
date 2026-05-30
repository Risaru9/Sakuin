const AUTH_TOKEN_KEY = "sakuin_auth_token";

export function getStoredToken() {
  return localStorage.getItem(AUTH_TOKEN_KEY);
}

export function setStoredToken(token: string) {
  localStorage.setItem(AUTH_TOKEN_KEY, token);
}

export function removeStoredToken() {
  localStorage.removeItem(AUTH_TOKEN_KEY);
}

export function hasStoredToken() {
  return Boolean(getStoredToken());
}

declare global {
  interface Window {
    AndroidWidgetBridge?: {
      saveConfig: (token: string | null, apiUrl: string) => void;
    };
  }
}

export function syncTokenToServiceWorker(token?: string | null) {
  const finalToken = token !== undefined ? token : getStoredToken();
  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || "https://sakuin-api.vercel.app";

  if (typeof navigator !== "undefined" && "serviceWorker" in navigator) {
    if (navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({
        type: "SET_TOKEN",
        token: finalToken,
        apiBaseUrl
      });
    }
  }

  if (typeof window !== "undefined" && window.AndroidWidgetBridge) {
    try {
      window.AndroidWidgetBridge.saveConfig(finalToken, apiBaseUrl);
    } catch (error) {
      console.error("Gagal menyinkronkan token ke widget Android", error);
    }
  }
}