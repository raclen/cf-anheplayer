/**
 * 构建/开发前准备 public/sources/：
 *   1. 把仓库里的本地音源复制到 public/sources/，让复制与下载链接走本站域名
 *   2. 把 sources/remote.json 里的在线音源下载到 public/sources/remote/，
 *      避免用户在无法直连 raw.githubusercontent.com 的网络里拿到被墙的链接
 *
 * 对外文件名统一使用 ASCII 的 id（本地音源为 sha1(相对路径) 前 10 位，与检测脚本一致），
 * 避免中文、空格、括号等字符在 URL、CDN、音乐 App 里出现编码兼容问题；
 * 下载时的中文文件名由页面 download 属性提供。
 *
 * 远程下载失败时静默跳过，页面会回退到镜像或原始地址。
 */
import fs from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

// 转换产物与清单文件不对外提供
const SKIP_DIRS = new Set(["转换"]);
const REMOTE_TIMEOUT_MS = 15000;
const USER_AGENT = "Mozilla/5.0 (compatible; AnhePlayerSourceSync/1.0)";

const log = {
  info: (msg) => console.log(`[sources] ${msg}`),
  warn: (msg) => console.warn(`[sources] ${msg}`),
};

// 与 scripts/check-sources.mjs 保持一致：相对路径统一用 / 分隔后取 sha1 前 10 位
const sourceId = (relPath) => crypto.createHash("sha1").update(relPath).digest("hex").slice(0, 10);

/** 递归复制本地音源脚本（只复制 .js，文件名替换为 ASCII id） */
const copyLocalSources = async (srcRoot, destRoot) => {
  const walk = async (dir, rel) => {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const relPath = rel ? `${rel}/${entry.name}` : entry.name;
      if (entry.isDirectory()) {
        if (SKIP_DIRS.has(entry.name)) continue;
        await walk(path.join(dir, entry.name), relPath);
        continue;
      }
      if (!entry.isFile() || !entry.name.endsWith(".js")) continue;
      await fs.copyFile(path.join(dir, entry.name), path.join(destRoot, `${sourceId(relPath)}.js`));
    }
  };
  await walk(srcRoot, "");
};

/** 拉取远程脚本文本，非 2xx 或空内容视为失败 */
const fetchScript = async (url) => {
  const res = await fetch(url, {
    signal: AbortSignal.timeout(REMOTE_TIMEOUT_MS),
    headers: { "user-agent": USER_AGENT },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const text = await res.text();
  if (!text.trim()) throw new Error("内容为空");
  return text;
};

/** 下载全部在线音源到 public/sources/remote/<id>.js */
const downloadRemoteSources = async (srcRoot, destRoot) => {
  const remoteFile = path.join(srcRoot, "remote.json");
  if (!existsSync(remoteFile)) return;
  let list = [];
  try {
    list = JSON.parse(await fs.readFile(remoteFile, "utf8"));
  } catch (error) {
    log.warn(`读取 remote.json 失败：${error?.message || error}`);
    return;
  }
  if (!Array.isArray(list) || list.length === 0) return;

  await fs.mkdir(destRoot, { recursive: true });
  for (const item of list) {
    if (!item?.id || !item?.url) continue;
    const targets = [item.url, item.mirror].filter(Boolean);
    let saved = false;
    for (const url of targets) {
      try {
        const text = await fetchScript(url);
        await fs.writeFile(path.join(destRoot, `${item.id}.js`), text, "utf8");
        saved = true;
        break;
      } catch (error) {
        log.warn(`${item.id} 拉取失败（${url}）：${error?.message || error}`);
      }
    }
    if (!saved) log.warn(`${item.id} 所有地址均失败，页面将回退到在线链接`);
  }
};

export const prepareSources = async (root) => {
  const srcRoot = path.join(root, "sources");
  const destRoot = path.join(root, "public", "sources");
  if (!existsSync(srcRoot)) return;

  // 每次重建，避免已删除的音源残留在站点里
  await fs.rm(destRoot, { recursive: true, force: true });
  await fs.mkdir(destRoot, { recursive: true });

  await copyLocalSources(srcRoot, destRoot);
  await downloadRemoteSources(srcRoot, path.join(destRoot, "remote"));
};
