// @ts-check
import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";
import path from "path";
import { fileURLToPath } from "url";
import { prepareSources } from "./scripts/lib/prepare-sources.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// 构建/开发前把音源脚本落到 public/sources/，让复制与下载链接走本站域名
const prepareSourcesIntegration = {
  name: "prepare-public-sources",
  hooks: {
    "astro:config:setup": async ({ command }) => {
      if (command !== "dev" && command !== "build") return;
      await prepareSources(__dirname);
    },
  },
};

// AnhePlayer 独立宣传页，部署到 Cloudflare Pages（anhe-player.loc.cc）。
export default defineConfig({
  site: "https://anhe-player.loc.cc",
  output: "static",
  devToolbar: {
    enabled: false,
  },
  integrations: [prepareSourcesIntegration, sitemap()],
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
