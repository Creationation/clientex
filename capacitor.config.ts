import type { CapacitorConfig } from "@capacitor/cli";

// Phase 1 : structure prete, build natif volontairement non lance.
// Quand le domaine de production sera actif :
//   npm i @capacitor/core @capacitor/cli @capacitor/android
//   npx cap add android && npx cap sync android
const config: CapacitorConfig = {
  appId: "at.delherren.app",
  appName: "DEL Herren",
  webDir: "dist",
  server: {
    url: "https://delherren.app",
    cleartext: true,
  },
};

export default config;
