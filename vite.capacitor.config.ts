import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import tsConfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  define: {
    "import.meta.env.VITE_CAPACITOR_PLATFORM": JSON.stringify("android"),
  },
  plugins: [react(), tailwindcss(), tsConfigPaths()],
  build: {
    outDir: "dist/capacitor",
    emptyOutDir: true,
  },
});