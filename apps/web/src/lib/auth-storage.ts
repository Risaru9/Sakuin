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