import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // In dev, the Express backend runs on :5000 — the frontend talks to it
    // through this proxy, so no API URL is needed in dev either.
    proxy: {
      "/api": "http://localhost:5000",
    },
  },
});
