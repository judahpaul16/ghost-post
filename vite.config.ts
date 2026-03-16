import { defineConfig } from "vite";
import { crx } from "@crxjs/vite-plugin";
import react from "@vitejs/plugin-react";
import { resolve } from "path";
import manifest from "./manifest.json";

export default defineConfig({
  plugins: [react(), crx({ manifest })],
  resolve: {
    alias: {
      "@": resolve(__dirname, "src"),
    },
  },
  build: {
    rollupOptions: {
      input: {
        "hn-results": resolve(__dirname, "src/hn-results/index.html"),
        "headcount": resolve(__dirname, "src/headcount/index.html"),
      },
    },
  },
  server: {
    port: 5174,
    strictPort: true,
    hmr: {
      port: 5174,
    },
    cors: true,
  },
});
