import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const BACKEND = process.env.DMP_BACKEND || "http://localhost:8000";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: true,
    proxy: {
      "/api": { target: BACKEND, changeOrigin: true },
      "/data.json": { target: BACKEND, changeOrigin: true },
    },
  },
});
