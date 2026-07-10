import { QueryClient } from "@tanstack/react-query";
import { createHashHistory, createRouter, RouterProvider } from "@tanstack/react-router";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { clearAndroidInteractionLocks, isCapacitorAndroid } from "./lib/platform";
import { routeTree } from "./routeTree.gen";
import "./styles.css";

if (isCapacitorAndroid()) {
  document.documentElement.classList.add("capacitor-android");
  window.addEventListener("pointerdown", clearAndroidInteractionLocks, true);
  window.addEventListener("touchstart", clearAndroidInteractionLocks, true);
  window.addEventListener("hashchange", () => requestAnimationFrame(clearAndroidInteractionLocks));
}

const queryClient = new QueryClient();
const router = createRouter({
  routeTree,
  context: { queryClient },
  history: createHashHistory(),
  scrollRestoration: !isCapacitorAndroid(),
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