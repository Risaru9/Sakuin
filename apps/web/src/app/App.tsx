import { useEffect, useState } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider } from "react-router-dom";
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
