import { QueryClient } from "@tanstack/react-query";
import { createHashHistory, createRouter, RouterProvider } from "@tanstack/react-router";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { routeTree } from "./routeTree.gen";
import "./styles.css";

function isAndroidWebView() {
  const win = window as unknown as {
    androidBridge?: unknown;
    Capacitor?: { getPlatform?: () => string; isNativePlatform?: () => boolean };
  };
  const ua = navigator.userAgent;

  return (
    win.androidBridge != null ||
    win.Capacitor?.getPlatform?.() === "android" ||
    (win.Capacitor?.isNativePlatform?.() === true && /Android/i.test(ua)) ||
    (/Android/i.test(ua) && /; wv\)|Version\/\d+(?:\.\d+)? Chrome\//i.test(ua))
  );
}

if (isAndroidWebView()) {
  document.documentElement.classList.add("capacitor-android");
}

const queryClient = new QueryClient();
const router = createRouter({
  routeTree,
  context: { queryClient },
  history: createHashHistory(),
  scrollRestoration: true,
  defaultPreloadStaleTime: 0,
});

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
);