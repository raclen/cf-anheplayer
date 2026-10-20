// GitHub 仓库与 Release 相关常量 + Windows 安装包元数据。
// 下载逻辑（Hero / Download 组件的客户端脚本）会读取这些匹配规则，
// 从 GitHub Releases API 动态定位最新安装包。
// 新增/调整安装包时，只改这里，无需动模板。

export const GITHUB_OWNER = "raclen";
export const GITHUB_REPO = "AnhePlayer";
export const GITHUB_REPO_URL = `https://github.com/${GITHUB_OWNER}/${GITHUB_REPO}`;
export const RELEASES_URL = `${GITHUB_REPO_URL}/releases`;
export const RELEASES_LATEST_URL = `${RELEASES_URL}/latest`;
export const LATEST_API = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/releases/latest`;
export const TAURI_URL = "https://v2.tauri.app/";

/** API 不可用（限流/断网）时的兜底版本与直链所基于的版本号。 */
export const FALLBACK_VERSION = "1.0.25";

export type IconKey = "windows";

export interface PlatformAsset {
  /** 唯一 id，也用作 DOM data-key */
  id: string;
  /** 展示名 */
  label: string;
  /** 类型/适用说明 */
  note: string;
  /** 是否为推荐首选 */
  recommended?: boolean;
  /** 在 Release assets 文件名中匹配的子串 */
  match: string;
  /** 兜底直链使用的完整文件名（版本号之前的 AnhePlayer_ 前缀之后部分） */
  file: string;
}

export interface OsGroup {
  label: string;
  icon: IconKey;
}

// 当前版本仅提供 Windows 10 / 11 安装包（NSIS .exe 与 MSI）。
export const OS_GROUP: OsGroup = { label: "Windows 10 / 11", icon: "windows" };

export const PLATFORMS: PlatformAsset[] = [
  {
    id: "win-setup",
    label: "安装版",
    note: "推荐 · .exe 一键安装",
    recommended: true,
    match: "x64-setup.exe",
    file: "x64-setup.exe",
  },
  {
    id: "win-msi",
    label: "MSI 安装包",
    note: "适合批量部署 · .msi",
    match: ".msi",
    file: "x64_en-US.msi",
  },
];

/** 构造某安装包在指定版本下的兜底直链（API 失败时使用）。 */
export function fallbackUrl(p: PlatformAsset, version = FALLBACK_VERSION): string {
  return `${GITHUB_REPO_URL}/releases/download/v${version}/AnhePlayer_${version}_${p.file}`;
}
