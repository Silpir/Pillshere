import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "app.lovable.pillshere",
  appName: "Pillshere",
  // `bun run android:web` builds a static SPA bundle that Capacitor can copy.
  webDir: "dist/capacitor",
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