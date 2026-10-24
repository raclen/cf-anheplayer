// 项目全平台 Release 缓存与国内加速下载辅助函数
import releasesCache from "./releases-cache.json";

export interface ReleaseAsset {
  name: string;
  size: number;
  downloadUrl: string;
  downloadCount: number;
}

export interface ReleaseItem {
  repo: string;
  tag: string;
  version: string;
  publishedAt?: string;
  totalDownloads: number;
  assets: ReleaseAsset[];
}

export interface ReleasesData {
  updatedAt: string;
  pc: ReleaseItem;
  mobile: ReleaseItem;
  downloader: ReleaseItem;
}

export const releasesData: ReleasesData = releasesCache as ReleasesData;

/** 国内高速下载代理服务基础地址 */
export const GH_MIRROR_BASE = "https://ghfast.top/";

/**
 * 将 GitHub Releases 下载直链转换为国内高速下载镜像直链
 */
export function getMirrorUrl(url: string, mirrorBase = GH_MIRROR_BASE): string {
  if (!url) return "";
  const cleanUrl = url.replace(/^https?:\/\/(ghfast\.top|ghproxy\.net|gh-proxy\.com)\//, "");
  return `${mirrorBase}${cleanUrl}`;
}

/**
 * 格式化文件字节大小
 */
export function fmtSize(bytes?: number): string {
  if (!bytes || bytes <= 0) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * 获取指定平台推荐文件的下载信息（包含直链与国内高速下载链接）
 */
export function getPcRelease() {
  const item = releasesData.pc;
  const setupAsset = item.assets.find((a) => a.name.includes("x64-setup.exe")) || item.assets[0];
  const msiAsset = item.assets.find((a) => a.name.includes(".msi")) || item.assets[1];

  return {
    ...item,
    setupAsset: setupAsset
      ? {
          ...setupAsset,
          mirrorUrl: getMirrorUrl(setupAsset.downloadUrl),
          formattedSize: fmtSize(setupAsset.size),
        }
      : null,
    msiAsset: msiAsset
      ? {
          ...msiAsset,
          mirrorUrl: getMirrorUrl(msiAsset.downloadUrl),
          formattedSize: fmtSize(msiAsset.size),
        }
      : null,
  };
}

export function getMobileRelease() {
  const item = releasesData.mobile;
  const apkAssets = item.assets.filter((a) => a.name.endsWith(".apk"));
  const apkAsset = apkAssets.find((a) => a.name.includes("arm64-v8a")) || apkAssets[0] || item.assets[0];
  const legacyAsset = apkAssets.find((a) => a.name.includes("armeabi-v7a")) || null;

  const withMirror = (asset: ReleaseAsset | null | undefined) =>
    asset
      ? {
          ...asset,
          mirrorUrl: getMirrorUrl(asset.downloadUrl),
          formattedSize: fmtSize(asset.size),
        }
      : null;

  return {
    ...item,
    apkAsset: withMirror(apkAsset),
    legacyAsset: withMirror(legacyAsset),
  };
}

export function getDownloaderRelease() {
  const item = releasesData.downloader;
  const exeAsset = item.assets.find((a) => a.name.endsWith(".exe")) || item.assets[0];

  return {
    ...item,
    exeAsset: exeAsset
      ? {
          ...exeAsset,
          mirrorUrl: getMirrorUrl(exeAsset.downloadUrl),
          formattedSize: fmtSize(exeAsset.size),
        }
      : null,
  };
}
