import { defineConfig } from "vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import { nitro } from "nitro/vite";
import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import tsConfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [
    tailwindcss(),
    tsConfigPaths({
      projects: ["./tsconfig.json"],
    }),
    tanstackStart({
      // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
      server: { entry: "server" },
    }),
    // Nitro plugin must be registered explicitly (TanStack Start no longer bundles it
    // automatically) — without this, `vite build` only emits the client bundle and no
    // .output/server directory is produced. node-server preset = plain Node runtime, which
    // is what Railway's Dockerfile runs via `node .output/server/index.mjs`.
    nitro({
      preset: "node-server",
    }),
    // react's vite plugin must come after start's vite plugin
    viteReact(),
  ],
});
