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
    if (typeof window !== "undefined" && (window as any).Capacitor) {
      const handleAppUrlOpen = (event: { url: string }) => {
        try {
          const parsedUrl = new URL(event.url);
          const idToken = parsedUrl.searchParams.get("id_token");
          if (idToken) {
            // Close Chrome Custom Tab / Safari View Controller
            void Browser.close();
            
            // Navigate the internal router to login hash fragment
            void router.navigate(`/login#id_token=${idToken}`);
          }
        } catch (error) {
          console.error("Gagal memproses deep link URL:", error);
        }
      };

      const listenerPromise = CapApp.addListener("appUrlOpen", handleAppUrlOpen);

      return () => {
        void listenerPromise.then((handle) => handle.remove());
      };
    }
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
