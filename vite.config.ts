import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    dedupe: ["react", "react-dom", "react/jsx-runtime", "react/jsx-dev-runtime", "@tanstack/react-query", "@tanstack/query-core"],
  },
  build: {
    // Never emit source maps in production — they would expose original source.
    sourcemap: false,
    // Minify + mangle the output (esbuild is Vite's fast default).
    minify: "esbuild",
    // Split vendor code so no single readable blob, and better caching.
    rollupOptions: {
      output: {
        manualChunks: {
          "react-vendor": ["react", "react-dom", "react-router-dom"],
          "ui-vendor": ["framer-motion", "lucide-react"],
          "map-vendor": ["react-simple-maps", "d3-geo", "topojson-client"],
        },
      },
    },
  },
  esbuild: {
    // Strip console/debugger from PRODUCTION builds only (keep them in dev).
    drop: mode === "production" ? ["console", "debugger"] : [],
  },
}));
