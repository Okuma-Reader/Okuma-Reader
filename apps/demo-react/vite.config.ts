import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const base = process.env.OKUMA_DEMO_BASE ?? "/";

export default defineConfig({
  base,
  plugins: [react()],
  server: {
    port: 4323,
    fs: {
      // Monorepo packages + shared demo fixtures
      allow: ["../.."],
    },
  },
  preview: {
    port: 4323,
  },
});
