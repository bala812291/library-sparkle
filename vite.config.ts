import { defineConfig } from "vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import tsConfigPaths from "vite-tsconfig-paths";
import { nitro } from "nitro/vite";

export default defineConfig({
  resolve: {
    alias: {
      "@": "/src",
    },
  },
  plugins: [
    tsConfigPaths(),
    tanstackStart({
      server: { entry: "server" },
    }),
    viteReact(),
    tailwindcss(),
    nitro({
      ...(process.env.NETLIFY || process.env.NITRO_PRESET === "netlify"
        ? { preset: "netlify" }
        : {
            preset: "cloudflare-module",
            cloudflare: {
              nodeCompat: true,
            },
          }),
    }),
  ],
});
