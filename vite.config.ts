/// <reference types="vitest" />
// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - tanstackStart, viteReact, tailwindcss, tsConfigPaths, nitro (build-only using cloudflare as a default target),
//     componentTagger (dev-only), VITE_* env injection, @ path alias, React/TanStack dedupe,
//     error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

const vercelOutputDir = ".vercel/output";

export default defineConfig({
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
  nitro: {
    preset: "vercel",
    output: {
      dir: vercelOutputDir,
      publicDir: `${vercelOutputDir}/static`,
      serverDir: `${vercelOutputDir}/functions/__server.func`,
    },
    externals: {
      external: ["ws", "https", "node:https", "http", "node:http", "stream", "node:stream", "zlib", "node:zlib", "url", "node:url"]
    },
    sourceMap: false
  },
  vite: {
    build: {
      rollupOptions: {
        external: [/^(node:)?(http|https|zlib|stream|url|events|crypto|tls|net|dns)$/]
      }
    },
    ssr: {
      external: ["ws"]
    },
    // @ts-ignore
    test: {
      exclude: ["node_modules/**", "dist/**", "tests/e2e/**"],
    },
  },
});
