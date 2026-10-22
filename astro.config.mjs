// @ts-check
import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";
import path from "path";
import { fileURLToPath } from "url";
import { prepareSources } from "./scripts/lib/prepare-sources.mjs";
import { prepareReleases } from "./scripts/lib/prepare-releases.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// 构建/开发前准备公共音源与 GitHub Release 最新元数据
const prepareBuildDataIntegration = {
  name: "prepare-build-data",
  hooks: {
    "astro:config:setup": async ({ command }) => {
      if (command !== "dev" && command !== "build") return;
      await Promise.all([
        prepareSources(__dirname),
        prepareReleases(__dirname),
      ]);
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
  integrations: [prepareBuildDataIntegration, sitemap()],
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
