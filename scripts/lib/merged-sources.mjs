/**
 * 合并音源清单：从最新一轮检测结果里挑出「可用 / 部分可用」的音源，
 * 按通过平台数排序，去掉同名重复项，生成订阅 JSON 与纯链接列表。
 *
 * 重要：产物不是把多个 .js 脚本拼成一个文件。洛雪自定义音源一个文件
 * 只能注册一个音源，拼接会因重复声明、重复注册 handler 而报错或互相
 * 覆盖。真正的“合并”是播放器层面的兜底：按清单顺序逐个导入，开启
 * 播放失败自动换源，一个音源拿不到地址就试下一个。
 *
 * 去重规则：
 *   1. 只对 @name（脚本的 name 字段）完全相同的条目去重；共享后端
 *      域名、注明融合/二改来源的，不算相同，一律保留。
 *   2. 同名组内优先保留通过平台数多、通过率高的；同分时按下面的
 *      PREFER 显式指定（版本字符串无法可靠比较，写死选择并注明理由，
 *      避免日后某次检测波动悄悄换掉保留项）。
 */

import fs from "node:fs/promises";
import path from "node:path";

export const MERGED_SITE_BASE = "https://anhe-player.loc.cc";
export const REPO_RAW_BASE = "https://raw.githubusercontent.com/raclen/cf-anheplayer/main";

/**
 * 同名组内显式保留项。key 为去重后的 @name，value 为保留条目的 id。
 * - 星海音乐源：本地 v3.2.20（315819a926）与在线 v3.2.18（remote-xinghai）
 *   本轮平台结果完全相同（5/6，仅 QQ 未通过），留版本更新的本地快照，
 *   不随上游 latest.js 漂移。
 * - 全豆要[聚合音源]：在线 9.3（remote-qdy）与本地 v4.1（b63bd95c38）
 *   本轮平台结果相同（2/5），9.3 的后端域名是 v4.1 的超集
 *   （多 api.huibq.com、api.lingchuan.com），留 9.3。
 */
export const DEDUP_PREFER = {
  "星海音乐源": "315819a926",
  "全豆要[聚合音源]": "remote-qdy",
};

const DEDUP_REASONS = {
  "星海音乐源":
    "同名同作者，保留本地 v3.2.20：与在线 v3.2.18 本轮平台结果相同（5/6），版本更新且为仓库内快照。",
  "全豆要[聚合音源]":
    "同名同作者，保留在线 9.3 93特供版：与本地 v4.1 本轮平台结果相同（2/5），后端域名为 v4.1 的超集。",
};

export const normalizeSourceName = (value) =>
  String(value || "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();

const encodeRepoPath = (file) => String(file).split("/").map(encodeURIComponent).join("/");

/** 解析一条检测结果为合并清单条目；无法解析出本站地址时返回 null。 */
export function toMergedEntry(entry, remoteList, site) {
  const remoteById = new Map(
    (Array.isArray(remoteList) ? remoteList : []).map((item) => [item.id, item]),
  );
  const name = String(entry?.name || entry?.title || "").trim();
  if (!name) return null;

  const stats = entry?.stats || {};
  const ok = Number(stats.ok ?? 0);
  const tested = Number(stats.tested ?? 0);
  const platforms = Array.isArray(entry?.platforms) ? entry.platforms : [];
  const passed = platforms.filter((p) => p?.tested && p?.ok).map((p) => p.key);
  const failed = platforms.filter((p) => p?.tested && !p?.ok).map((p) => p.key);

  let urlPath = "";
  let fallbackUrl = "";
  if (entry?.remote) {
    const remoteId = String(entry.id || "").replace(/^remote-/, "");
    const meta = remoteById.get(remoteId);
    urlPath = `/sources/remote/${encodeURIComponent(remoteId)}.js`;
    fallbackUrl = meta?.mirror || meta?.url || entry?.sourceUrl || entry?.originUrl || "";
  } else {
    if (!entry?.id) return null;
    urlPath = `/sources/${encodeURIComponent(entry.id)}.js`;
    fallbackUrl = entry?.file
      ? `${REPO_RAW_BASE}/sources/${encodeRepoPath(entry.file)}`
      : "";
  }
  if (!urlPath) return null;

  return {
    id: String(entry.id || ""),
    name,
    title: String(entry?.title || name),
    version: entry?.version ? String(entry.version) : "",
    author: entry?.author ? String(entry.author) : "",
    category: entry?.category ? String(entry.category) : "",
    status: String(entry?.status || ""),
    passed: `${ok}/${tested}`,
    platformsPassed: passed,
    platformsFailed: failed,
    path: urlPath,
    url: `${String(site || MERGED_SITE_BASE).replace(/\/$/, "")}${urlPath}`,
    fallbackUrl,
  };
}

/** 从检测结果构建合并清单（纯函数，便于测试与页面构建期复用）。 */
export function buildMergedSources(status, remoteList, options = {}) {
  const site = options.site || MERGED_SITE_BASE;
  const all = Array.isArray(status?.sources) ? status.sources : [];
  const passing = all.filter((entry) => entry?.status === "available" || entry?.status === "partial");

  const byName = new Map();
  for (const entry of passing) {
    const key = normalizeSourceName(entry?.name || entry?.title);
    if (!key) continue;
    if (!byName.has(key)) byName.set(key, []);
    byName.get(key).push(entry);
  }

  const removedDuplicates = [];
  const kept = [];
  for (const [key, group] of byName) {
    if (group.length === 1) {
      kept.push(group[0]);
      continue;
    }
    const displayName = String(group[0]?.name || group[0]?.title || "").trim();
    const preferredId = DEDUP_PREFER[displayName];
    const sorted = [...group].sort((a, b) => {
      const okDiff = Number(b?.stats?.ok ?? 0) - Number(a?.stats?.ok ?? 0);
      if (okDiff) return okDiff;
      const ratio = (e) => {
        const tested = Number(e?.stats?.tested ?? 0);
        return tested ? Number(e?.stats?.ok ?? 0) / tested : 0;
      };
      return ratio(b) - ratio(a);
    });
    const winner =
      (preferredId && group.find((entry) => String(entry?.id) === preferredId)) || sorted[0];
    kept.push(winner);
    for (const entry of group) {
      if (entry === winner) continue;
      const removed = toMergedEntry(entry, remoteList, site);
      removedDuplicates.push({
        id: String(entry?.id || ""),
        name: displayName,
        version: entry?.version ? String(entry.version) : "",
        url: removed?.url || "",
        keptId: String(winner?.id || ""),
        reason: DEDUP_REASONS[displayName] || "同名重复，只保留通过数 / 通过率更高的一项。",
      });
    }
    void key;
  }

  const sources = kept
    .map((entry) => ({ entry, merged: toMergedEntry(entry, remoteList, site) }))
    .filter(({ merged }) => merged)
    .sort((a, b) => {
      const okDiff = Number(b.entry?.stats?.ok ?? 0) - Number(a.entry?.stats?.ok ?? 0);
      if (okDiff) return okDiff;
      const ratio = (e) => {
        const tested = Number(e?.stats?.tested ?? 0);
        return tested ? Number(e?.stats?.ok ?? 0) / tested : 0;
      };
      const ratioDiff = ratio(b.entry) - ratio(a.entry);
      if (ratioDiff) return ratioDiff;
      return String(a.merged.title).localeCompare(String(b.merged.title), "zh-CN");
    })
    .map(({ merged }) => merged);

  return {
    schemaVersion: 1,
    generatedAt: status?.generatedAt || null,
    site: String(site).replace(/\/$/, ""),
    totalChecked: all.length,
    totalPassing: passing.length,
    included: sources.length,
    removedDuplicates,
    usage:
      "本文件不是一个可直接导入洛雪 / AnhePlayer 的 .js 音源脚本。把多个脚本拼成一个 .js 会因重复声明与重复注册而报错或互相覆盖。正确用法：支持订阅清单的客户端填入本 JSON 的地址；标准客户端按 sources 里 url 的顺序逐个在线导入，并开启播放失败自动换源，播放器会在多个已导入音源之间兜底，这才是运行时的“合并”。",
    sources,
  };
}

export const mergedSourcesToText = (merged) =>
  merged.sources.map((entry) => entry.url).join("\n") + (merged.sources.length ? "\n" : "");

/** 读取检测结果并把合并清单写入 public/，供构建产物与公开接口使用。 */
export async function writeMergedSources(root, options = {}) {
  const readJson = async (relPath) => {
    try {
      return JSON.parse(await fs.readFile(path.resolve(root, relPath), "utf8"));
    } catch {
      return null;
    }
  };
  const status = (await readJson("src/data/sources-status.json")) || { sources: [], generatedAt: null };
  const remoteList = (await readJson("sources/remote.json")) || [];
  const merged = buildMergedSources(status, remoteList, options);
  const outDir = path.resolve(root, "public");
  await fs.mkdir(outDir, { recursive: true });
  await fs.writeFile(
    path.join(outDir, "merged-sources.json"),
    `${JSON.stringify(merged, null, 2)}\n`,
    "utf8",
  );
  await fs.writeFile(path.join(outDir, "merged-sources.txt"), mergedSourcesToText(merged), "utf8");
  return merged;
}
