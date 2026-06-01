import { afterEach, describe, expect, it, vi } from "vitest";
import type { AuthUser } from "../features/auth/auth.types";
import {
  getCachedUser,
  getStoredToken,
  hasStoredToken,
  removeCachedUser,
  removeStoredToken,
  clearPrivateApiCache,
  setCachedUser,
  setStoredToken,
  syncTokenToServiceWorker
} from "./auth-storage";

const user: AuthUser = {
  id: "user-1",
  name: "Sakuin User",
  email: "user@sakuin.test",
  safeBalanceLimit: "50000.00"
};

afterEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
  delete window.AndroidWidgetBridge;
  Object.defineProperty(navigator, "serviceWorker", {
    configurable: true,
    value: undefined
  });
});

describe("auth-storage", () => {
  it("menyimpan dan menghapus token auth", () => {
    expect(hasStoredToken()).toBe(false);

    setStoredToken("token-123");

    expect(getStoredToken()).toBe("token-123");
    expect(hasStoredToken()).toBe(true);

    removeStoredToken();

    expect(getStoredToken()).toBeNull();
    expect(hasStoredToken()).toBe(false);
  });

  it("menghapus seluruh private API cache ketika token dihapus", () => {
    localStorage.setItem("api_cache:user-a:/api/summary", "{}");
    localStorage.setItem("api_cache:/api/summary", "{}");
    localStorage.setItem("unrelated", "keep");

    clearPrivateApiCache();

    expect(localStorage.getItem("api_cache:user-a:/api/summary")).toBeNull();
    expect(localStorage.getItem("api_cache:/api/summary")).toBeNull();
    expect(localStorage.getItem("unrelated")).toBe("keep");
  });

  it("menyimpan, membaca, dan menghapus cached user", () => {
    setCachedUser(user);

    expect(getCachedUser()).toEqual(user);

    removeCachedUser();

    expect(getCachedUser()).toBeNull();
  });

  it("mengembalikan null ketika cached user rusak", () => {
    localStorage.setItem("sakuin_cached_user", "{invalid-json");

    expect(getCachedUser()).toBeNull();
  });

  it("menyinkronkan token ke service worker controller", () => {
    const postMessage = vi.fn();

    Object.defineProperty(navigator, "serviceWorker", {
      configurable: true,
      value: {
        controller: {
          postMessage
        }
      }
    });

    syncTokenToServiceWorker("token-abc");

    const expectedApiBaseUrl = import.meta.env.VITE_API_BASE_URL || "https://sakuin-api.vercel.app";

    expect(postMessage).toHaveBeenCalledWith({
      type: "SET_TOKEN",
      token: "token-abc",
      apiBaseUrl: expectedApiBaseUrl
    });
  });

  it("menyinkronkan token ke Android widget bridge", () => {
    const saveConfig = vi.fn();

    window.AndroidWidgetBridge = {
      saveConfig
    };

    syncTokenToServiceWorker("token-widget");

    const expectedApiBaseUrl = import.meta.env.VITE_API_BASE_URL || "https://sakuin-api.vercel.app";

    expect(saveConfig).toHaveBeenCalledWith(
      "token-widget",
      expectedApiBaseUrl
    );
  });
});
