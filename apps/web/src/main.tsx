import React from "react";
import ReactDOM from "react-dom/client";
import { App } from "./app/App";
import { registerServiceWorker } from "./lib/pwa";
import "./index.css";

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