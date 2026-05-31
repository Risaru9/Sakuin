import { useEffect, useState } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider } from "react-router-dom";
import { App as CapApp } from "@capacitor/app";
import { Browser } from "@capacitor/browser";
import { AppReleaseNotesPrompt } from "../components/pwa/AppReleaseNotesPrompt";
import { PwaUpdatePrompt } from "../components/pwa/PwaUpdatePrompt";
import { ApkUpdatePrompt } from "../components/pwa/ApkUpdatePrompt";
import { TransactionReminderRunner } from "../components/pwa/TransactionReminderRunner";
import { ToastProvider } from "../components/toast/ToastProvider";
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

export function App() {
  const [waitingServiceWorkerRegistration, setWaitingServiceWorkerRegistration] =
    useState<ServiceWorkerRegistration | null>(null);

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

  return (
    <AuthProvider>
      <QueryClientProvider client={queryClient}>
        <ToastProvider>
          <RouterProvider router={router} />
          <TransactionReminderRunner />
          <AppReleaseNotesPrompt />
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
