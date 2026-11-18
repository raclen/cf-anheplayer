// @ts-check
import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";
import fs from "node:fs";
import path from "path";
import { fileURLToPath } from "url";
import { prepareSources } from "./scripts/lib/prepare-sources.mjs";
import { prepareReleases } from "./scripts/lib/prepare-releases.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** 读取 JSON 文件，失败时返回 null（构建期文件尚未生成时不阻塞） */
const readJson = (relPath) => {
  try {
    return JSON.parse(fs.readFileSync(path.resolve(__dirname, relPath), "utf8"));
  } catch {
    return null;
  }
};

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
  trailingSlash: "always",
  devToolbar: {
    enabled: false,
  },
  integrations: [
    prepareBuildDataIntegration,
    sitemap({
      // 页面内容随时会因新版本发布而更新，最后修改时间优先取真实数据时间
      lastmod: new Date(),
      serialize(item) {
        const pathname = new URL(item.url).pathname;
        const releases = readJson("src/data/releases-cache.json");
        const parseDate = (value) => {
          const date = value ? new Date(value) : null;
          return date && !Number.isNaN(date.getTime()) ? date : null;
        };

        if (pathname === "/") {
          return {
            ...item,
            lastmod: parseDate(releases?.pc?.publishedAt) ?? item.lastmod,
            changefreq: "daily",
            priority: 1.0,
          };
        }
        if (pathname === "/downloader/") {
          return {
            ...item,
            lastmod: parseDate(releases?.downloader?.publishedAt) ?? item.lastmod,
            changefreq: "weekly",
            priority: 0.9,
          };
        }
        if (pathname === "/mobile/") {
          return {
            ...item,
            lastmod: parseDate(releases?.mobile?.publishedAt) ?? item.lastmod,
            changefreq: "weekly",
            priority: 0.9,
          };
        }
        // 音源状态页每 4 小时更新一次，取检测结果时间作为 lastmod
        const status = readJson("src/data/sources-status.json");
        return {
          ...item,
          lastmod: parseDate(status?.generatedAt) ?? item.lastmod,
          changefreq: "hourly",
          priority: 0.8,
        };
      },
    }),
  ],
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
