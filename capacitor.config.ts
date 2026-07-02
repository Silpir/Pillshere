import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "app.lovable.pillshere",
  appName: "Pillshere",
  // `bun run android:web` builds TanStack Start, then writes the static
  // Android shell that Capacitor requires at dist/client/index.html.
  webDir: "dist/client",
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