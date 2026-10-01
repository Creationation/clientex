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
    // Depuis que .env.local contient les cles du vrai projet Supabase, Vite les
    // injecterait aussi pendant les tests et db.ts basculerait sur la base du
    // client. On les vide ici : la suite teste l'adaptateur demo, jamais la
    // production.
    env: { VITE_SUPABASE_URL: "", VITE_SUPABASE_PUBLISHABLE_KEY: "" },
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
