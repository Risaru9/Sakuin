import React from "react";
import ReactDOM from "react-dom/client";
import { App } from "./app/App";
import {
  registerServiceWorker,
  setupInstallPromptCapture
} from "./lib/pwa";
import { syncTokenToServiceWorker } from "./lib/auth-storage";
import "./index.css";

setupInstallPromptCapture();

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

registerServiceWorker({
  onUpdate: (registration) => {
    window.dispatchEvent(
      new CustomEvent<ServiceWorkerRegistration>("sakuin:pwa-update", {
        detail: registration
      })
    );
  }
});

// Sync token to Service Worker on load
syncTokenToServiceWorker();