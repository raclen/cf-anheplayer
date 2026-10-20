// @ts-check
import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// AnhePlayer 独立宣传页，部署到 Cloudflare Pages（anhe-player.loc.cc）。
export default defineConfig({
  site: "https://anhe-player.loc.cc",
  output: "static",
  devToolbar: {
    enabled: false,
  },
  integrations: [sitemap()],
  i18n: {
    locales: ["zh-CN"],
    defaultLocale: "zh-CN",
    routing: {
      prefixDefaultLocale: false,
    },
  },
  vite: {
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
  },
});
