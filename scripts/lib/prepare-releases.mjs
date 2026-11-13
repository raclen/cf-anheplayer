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

// GitHub Actions 会自动注入 GITHUB_TOKEN；Cloudflare Pages 也可在环境变量里配置。
// 带 token 时匿名限流（60 次/小时/IP）不再生效，避免构建环境共用出口 IP 导致统计长期停在旧值。
const GITHUB_TOKEN = process.env.GITHUB_TOKEN || process.env.GH_TOKEN || "";
const USER_AGENT = "AnhePlayerReleaseSync/1.0";
const TIMEOUT_MS = 10000;
const MAX_PAGES = 10;

// 更新器附属文件（签名文件、latest.json 等）不计入用户可见的下载次数
function isUpdaterArtifact(name) {
  return !name || name.endsWith(".sig") || name.endsWith(".json");
}

async function fetchRepoReleases(owner, repo) {
  const headers = {
    "User-Agent": USER_AGENT,
    Accept: "application/vnd.github+json",
  };
  if (GITHUB_TOKEN) {
    headers.Authorization = `Bearer ${GITHUB_TOKEN}`;
  }

  const releases = [];
  for (let page = 1; page <= MAX_PAGES; page++) {
    const url = `https://api.github.com/repos/${owner}/${repo}/releases?per_page=100&page=${page}`;
    const res = await fetch(url, {
      headers,
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!res.ok) {
      throw new Error(`GitHub API HTTP ${res.status}`);
    }
    const data = await res.json();
    if (!Array.isArray(data) || data.length === 0) break;
    releases.push(...data);
    // 不足一页说明已经取完
    if (data.length < 100) break;
  }
  return releases;
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
    ...existing,
    // 放在展开之后，确保 updatedAt 真正反映最后一次数据变更时间
    updatedAt: new Date().toISOString(),
  };

  for (const [key, config] of Object.entries(REPOS)) {
    try {
      console.log(`[releases] 正在同步 ${config.owner}/${config.repo} releases...`);
      const releases = await fetchRepoReleases(config.owner, config.repo);
      if (!Array.isArray(releases) || releases.length === 0) {
        console.warn(`[releases] ${config.repo} 返回空 releases 列表，使用旧缓存`);
        continue;
      }

      // 汇总历史所有正式版本的安装包下载量；更新器附属文件单独统计，不对外展示
      let totalDownloads = 0;
      let updaterDownloads = 0;
      for (const rel of releases) {
        if (!Array.isArray(rel.assets)) continue;
        for (const asset of rel.assets) {
          const count = asset.download_count || 0;
          if (isUpdaterArtifact(asset.name)) {
            updaterDownloads += count;
          } else {
            totalDownloads += count;
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
      console.log(
        `[releases] ${key} 同步成功: ${tag}, 全版本安装包累计下载量: ${totalDownloads}（更新器附属文件 ${updaterDownloads} 次未计入）, assets 数量: ${assets.length}`
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
      }
    }
  }

  // 只有实际数据变化时才重写文件，避免 updatedAt 每轮构建都产生无意义改动
  const comparable = (value) =>
    value ? JSON.stringify({ ...value, updatedAt: "" }) : "";
  if (!existing || comparable(result) !== comparable(existing)) {
    await fs.writeFile(cachePath, JSON.stringify(result, null, 2), "utf8");
    console.log(`[releases] 已写入最新 Release 缓存: ${cachePath}`);
  } else {
    console.log("[releases] Release 数据无变化，保留现有缓存");
  }
}
