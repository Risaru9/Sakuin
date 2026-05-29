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

export function syncTokenToServiceWorker(token?: string | null) {
  if (typeof navigator !== "undefined" && "serviceWorker" in navigator) {
    const finalToken = token !== undefined ? token : getStoredToken();
    const apiBaseUrl = import.meta.env.VITE_API_BASE_URL;

    if (navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({
        type: "SET_TOKEN",
        token: finalToken,
        apiBaseUrl
      });
    }
  }
}