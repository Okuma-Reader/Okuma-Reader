import { defineConfig } from "astro/config";

const base = process.env.OKUMA_DEMO_BASE ?? "/";

export default defineConfig({
  base,
  vite: {
    // Workspace packages ship TypeScript source with extensionless relative
    // imports. Force Vite to transform them in SSR instead of handing off to
    // Node's native ESM resolver (which fails without .js/.ts extensions).
    ssr: {
      noExternal: [/^@okuma-reader\//],
    },
    server: {
      fs: {
        allow: ["../.."],
      },
    },
  },
});
