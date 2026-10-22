import fs from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";

const REPOS = {
  pc: {
    owner: "raclen",
    repo: "AnhePlayer",
    defaultVersion: "1.0.30",
  },
  mobile: {
    owner: "raclen",
    repo: "AnhePlayer-Mobile",
    defaultVersion: "2.0.4",
  },
  downloader: {
    owner: "raclen",
    repo: "anhe-downloader",
    defaultVersion: "1.4.0",
  },
};

const USER_AGENT = "Mozilla/5.0 (compatible; AnhePlayerReleaseSync/1.0)";
const TIMEOUT_MS = 10000;

async function fetchRepoReleases(owner, repo) {
  const url = `https://api.github.com/repos/${owner}/${repo}/releases?per_page=100`;
  const res = await fetch(url, {
    headers: { "User-Agent": USER_AGENT },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!res.ok) {
    throw new Error(`GitHub API HTTP ${res.status}`);
  }
  return await res.json();
}

export async function prepareReleases(root) {
  const cachePath = path.join(root, "src", "data", "releases-cache.json");
  let existing = null;
  if (existsSync(cachePath)) {
    try {
      existing = JSON.parse(await fs.readFile(cachePath, "utf8"));
    } catch {
      existing = null;
    }
  }

  const result = {
    updatedAt: new Date().toISOString(),
    ...existing,
  };

  let hasUpdate = false;

  for (const [key, config] of Object.entries(REPOS)) {
    try {
      console.log(`[releases] 正在同步 ${config.owner}/${config.repo} releases...`);
      const releases = await fetchRepoReleases(config.owner, config.repo);
      if (!Array.isArray(releases) || releases.length === 0) {
        console.warn(`[releases] ${config.repo} 返回空 releases 列表，使用旧缓存`);
        continue;
      }

      // 计算历史所有 releases 的总下载量
      let totalDownloads = 0;
      for (const rel of releases) {
        if (Array.isArray(rel.assets)) {
          for (const asset of rel.assets) {
            totalDownloads += asset.download_count || 0;
          }
        }
      }

      // 获取最新非 draft 的 release（优先非 prerelease）
      const latestRelease =
        releases.find((r) => !r.draft && !r.prerelease) ||
        releases.find((r) => !r.draft) ||
        releases[0];

      const tag = latestRelease.tag_name || `v${config.defaultVersion}`;
      const version = tag.replace(/^v/, "");

      const assets = (latestRelease.assets || []).map((a) => ({
        name: a.name,
        size: a.size,
        downloadUrl: a.browser_download_url,
        downloadCount: a.download_count,
      }));

      result[key] = {
        repo: `${config.owner}/${config.repo}`,
        tag,
        version,
        publishedAt: latestRelease.published_at || latestRelease.created_at,
        totalDownloads,
        assets,
      };
      hasUpdate = true;
      console.log(
        `[releases] ${key} 同步成功: ${tag}, 累计下载量: ${totalDownloads}, assets 数量: ${assets.length}`
      );
    } catch (err) {
      console.warn(
        `[releases] 同步 ${config.repo} 失败 (${err.message})，保留现有缓存或使用默认值`
      );
      if (!result[key]) {
        result[key] = {
          repo: `${config.owner}/${config.repo}`,
          tag: `v${config.defaultVersion}`,
          version: config.defaultVersion,
          totalDownloads: 0,
          assets: [],
        };
        hasUpdate = true;
      }
    }
  }

  if (hasUpdate || !existing) {
    await fs.writeFile(cachePath, JSON.stringify(result, null, 2), "utf8");
    console.log(`[releases] 已写入最新 Release 缓存: ${cachePath}`);
  }
}
