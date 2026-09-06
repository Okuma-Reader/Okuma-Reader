import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
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
