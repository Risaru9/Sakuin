import { useEffect, useState } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider } from "react-router-dom";
import { App as CapApp } from "@capacitor/app";
import { Browser } from "@capacitor/browser";
import { Capacitor } from "@capacitor/core";
import { LocalNotifications } from "@capacitor/local-notifications";
import { PwaUpdatePrompt } from "../components/pwa/PwaUpdatePrompt";
import { SakuNotificationsRunner } from "../components/pwa/SakuNotificationsRunner";
import { ApkUpdatePrompt } from "../components/pwa/ApkUpdatePrompt";
import { TransactionReminderRunner } from "../components/pwa/TransactionReminderRunner";
import { ToastProvider } from "../components/toast/ToastProvider";
import { SakuLoadingScreen } from "../components/saku";
import { AuthProvider } from "../features/auth/auth-context";
import { queryClient } from "../lib/query-client";
import {
  setStoredToken,
  setCachedUser,
  syncTokenToServiceWorker
} from "../lib/auth-storage";
import type { AuthUser } from "../features/auth/auth.types";
import { router } from "./router";

type PwaUpdateEvent = CustomEvent<ServiceWorkerRegistration>;

function isInternalRoute(route: unknown): route is string {
  return typeof route === "string" && route.startsWith("/") && !route.startsWith("//");
}

export function App() {
  const [waitingServiceWorkerRegistration, setWaitingServiceWorkerRegistration] =
    useState<ServiceWorkerRegistration | null>(null);
  const [showBootScreen, setShowBootScreen] = useState(true);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setShowBootScreen(false);
    }, 1100);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, []);

  useEffect(() => {
    function handlePwaUpdate(event: Event) {
      const updateEvent = event as PwaUpdateEvent;
      setWaitingServiceWorkerRegistration(updateEvent.detail);
    }

    window.addEventListener("sakuin:pwa-update", handlePwaUpdate);

    return () => {
      window.removeEventListener("sakuin:pwa-update", handlePwaUpdate);
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined" || !(window as any).Capacitor) {
      return;
    }

    /**
     * Handler untuk deep link yang datang dari Chrome Custom Tab setelah login Google.
     *
     * Flow:
     * 1. OAuthCallbackPage (di Chrome Custom Tab) → autentikasi ke API → dapat JWT
     * 2. OAuthCallbackPage redirect ke: com.sakuin.app://auth?token=JWT&user=BASE64
     * 3. Handler ini menerima event, simpan token ke WebView localStorage
     * 4. Tutup Chrome Custom Tab
     * 5. Navigasi ke dashboard
     *
     * PENTING: Chrome Custom Tab dan WebView memiliki storage TERPISAH.
     * Kita TIDAK bisa mengandalkan token yang disimpan di Custom Tab.
     * Kita harus menerima token via deep link dan menyimpannya di WebView.
     */
    const handleAppUrlOpen = async (event: { url: string }) => {
      try {
        const parsedUrl = new URL(event.url);

        // ─── FLOW BARU: com.sakuin.app://auth?token=JWT&user=BASE64 ──────────
        // OAuthCallbackPage sudah mengautentikasi ke API dan mengirim JWT Sakuin
        // (bukan Google id_token) via deep link ini.
        //
        // parsedUrl.host = "auth" untuk URL: com.sakuin.app://auth?...
        if (parsedUrl.host === "auth") {
          const token = parsedUrl.searchParams.get("token");
          const userBase64 = parsedUrl.searchParams.get("user");

          if (token) {
            // Decode user data dari base64 jika tersedia
            let user: AuthUser | null = null;
            if (userBase64) {
              try {
                user = JSON.parse(decodeURIComponent(atob(userBase64))) as AuthUser;
              } catch {
                // Jika decode gagal, tetap lanjutkan dengan token saja
                // AuthProvider akan fetch user dari API menggunakan token
              }
            }

            // Simpan token dan user ke WebView localStorage
            // PENTING: ini HARUS dilakukan sebelum Browser.close() dan navigate
            setStoredToken(token);
            if (user) {
              setCachedUser(user);
            }
            syncTokenToServiceWorker(token);

            // Tutup Chrome Custom Tab
            try {
              await Browser.close();
            } catch {
              // Ignore jika Browser.close() gagal (sudah tertutup, dsb)
            }

            // Navigasi ke dashboard dengan full page reload.
            // Full reload DIPERLUKAN agar AuthProvider membaca token baru dari
            // localStorage dan menginisialisasi isAuthenticated = true.
            // Tanpa reload, AuthContext masih dalam state isAuthenticated = false
            // dan ProtectedRoute akan redirect kembali ke /login.
            window.location.href = "/dashboard";
          }
          return;
        }

        // ─── FLOW LAMA (DEPRECATED) ─────────────────────────────────────────
        // com.sakuin.app://login?id_token=GOOGLE_TOKEN
        // Dipertahankan untuk backward compatibility saja
        if (parsedUrl.host === "email-import") {
          const status = parsedUrl.searchParams.get("status") ?? "connected";
          const message = parsedUrl.searchParams.get("message");
          const params = new URLSearchParams({
            emailImport: status
          });

          if (message) {
            params.set("message", message);
          }

          try {
            await Browser.close();
          } catch {
            // Ignore jika browser eksternal sudah tertutup.
          }

          // The Gmail card that reads this status lives in Profile > Otomasi.
          params.set("section", "automation");
          void router.navigate(`/profile?${params.toString()}`);
          window.dispatchEvent(new Event("sakuin:email-import-returned"));
          return;
        }

        if (parsedUrl.host === "login") {
          const idToken = parsedUrl.searchParams.get("id_token");
          if (idToken) {
            try {
              await Browser.close();
            } catch {
              // ignore
            }
            void router.navigate(`/login#id_token=${idToken}`);
          }
        }

      } catch (error) {
        console.error("Gagal memproses deep link URL:", error);
      }
    };


    const listenerPromise = CapApp.addListener("appUrlOpen", handleAppUrlOpen);

    return () => {
      void listenerPromise.then((handle) => handle.remove());
    };
  }, []);

  useEffect(() => {
    function consumeWidgetQuickAction() {
      const bridge = window.AndroidWidgetBridge;

      try {
        // APK 2.1: the quick-entry window, widget and native notifications ask for a page.
        const route = bridge?.consumePendingRoute?.();
        if (isInternalRoute(route)) {
          void router.navigate(route);
          return;
        }

        if (bridge?.consumePendingWidgetQuickAction?.()) {
          void router.navigate("/dashboard?widgetAction=quick");
        }
      } catch (error) {
        console.error("Gagal membuka Catat Cepat dari widget Android", error);
      }
    }

    consumeWidgetQuickAction();
    const retryTimer = window.setTimeout(consumeWidgetQuickAction, 700);
    window.addEventListener("sakuin:widget-quick-transaction", consumeWidgetQuickAction);
    window.addEventListener("sakuin:native-route", consumeWidgetQuickAction);
    window.addEventListener("focus", consumeWidgetQuickAction);

    return () => {
      window.clearTimeout(retryTimer);
      window.removeEventListener("sakuin:widget-quick-transaction", consumeWidgetQuickAction);
      window.removeEventListener("sakuin:native-route", consumeWidgetQuickAction);
      window.removeEventListener("focus", consumeWidgetQuickAction);
    };
  }, []);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) {
      return;
    }

    // Tapping a Saku notification (budget, bills) opens the page it is about.
    const listenerPromise = LocalNotifications.addListener("localNotificationActionPerformed", (action) => {
      const route: unknown = action.notification.extra?.route;

      if (isInternalRoute(route)) {
        void router.navigate(route);
      }
    });

    return () => {
      void listenerPromise.then((handle) => handle.remove());
    };
  }, []);

  return (
    <AuthProvider>
      <QueryClientProvider client={queryClient}>
        <ToastProvider>
          <RouterProvider router={router} />
          {showBootScreen ? <SakuLoadingScreen className="sakuin-boot-screen" overlay /> : null}
          <TransactionReminderRunner />
          <SakuNotificationsRunner />
          <ApkUpdatePrompt />

          <PwaUpdatePrompt
            registration={waitingServiceWorkerRegistration}
            onDismiss={() => setWaitingServiceWorkerRegistration(null)}
          />
        </ToastProvider>
      </QueryClientProvider>
    </AuthProvider>
  );
}
