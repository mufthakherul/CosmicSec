import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { App } from "./App";
import "./index.css";

const queryClient = new QueryClient();

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>,
);

// ---------------------------------------------------------------------------
// PWA Service Worker Registration (Phase U.1)
// ---------------------------------------------------------------------------
if ("serviceWorker" in navigator && import.meta.env.PROD) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/service-worker.js", { scope: "/" })
      .then((registration) => {
        console.info("[SW] Registered:", registration.scope);
        registration.addEventListener("updatefound", () => {
          const newSW = registration.installing;
          if (!newSW) return;
          newSW.addEventListener("statechange", () => {
            if (newSW.state === "installed" && navigator.serviceWorker.controller) {
              window.dispatchEvent(new CustomEvent("cosmicsec:sw-update-available"));
            }
          });
        });
      })
      .catch((err) => console.warn("[SW] Registration failed:", err));
  });
}
