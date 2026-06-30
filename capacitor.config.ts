import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "app.lovable.prozume",
  appName: "Prozume",
  // TanStack Start writes its prerendered client bundle to .output/public.
  // Run `bun run build` before `npx cap sync android`.
  webDir: ".output/public",
  android: {
    allowMixedContent: false,
  },
  plugins: {
    LocalNotifications: {
      smallIcon: "ic_stat_pill",
      iconColor: "#3b82f6",
    },
  },
};

export default config;