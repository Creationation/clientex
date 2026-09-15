/// <reference types="vitest" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

export default defineConfig({
  server: { host: true, port: 5180 },
  plugins: [react()],
  resolve: { alias: { "@": path.resolve(__dirname, "./src") } },
  test: {
    // Tests unitaires du moteur de creneaux, des remises et du mode demo.
    // Pas de DOM : un localStorage minimal est fourni par src/test/setup.ts.
    environment: "node",
    setupFiles: ["src/test/setup.ts"],
    include: ["src/**/*.test.ts"],
  },
  build: {
    rollupOptions: {
      output: {
        // Le client Supabase n'est utile qu'une fois le backend branche :
        // on le sort du bundle principal pour que la landing charge vite.
        manualChunks: {
          react: ["react", "react-dom", "react-router-dom"],
          supabase: ["@supabase/supabase-js"],
        },
      },
    },
  },
});
