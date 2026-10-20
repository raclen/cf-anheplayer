// 风宝音乐下载器 (anhe-downloader) 常量与元数据配置

export const DOWNLOADER_OWNER = "raclen";
export const DOWNLOADER_REPO = "anhe-downloader";
export const DOWNLOADER_REPO_URL = `https://github.com/${DOWNLOADER_OWNER}/${DOWNLOADER_REPO}`;
export const DOWNLOADER_RELEASES_URL = `${DOWNLOADER_REPO_URL}/releases`;
export const DOWNLOADER_RELEASES_LATEST_URL = `${DOWNLOADER_RELEASES_URL}/latest`;
export const DOWNLOADER_LATEST_API = `https://api.github.com/repos/${DOWNLOADER_OWNER}/${DOWNLOADER_REPO}/releases/latest`;

/** API 不可用时的兜底版本与下载直链 */
export const DOWNLOADER_FALLBACK_VERSION = "1.3.2";
export const DOWNLOADER_FALLBACK_FILE = "anhe-downloader.exe";
export const DOWNLOADER_FALLBACK_URL = `${DOWNLOADER_REPO_URL}/releases/download/v${DOWNLOADER_FALLBACK_VERSION}/${DOWNLOADER_FALLBACK_FILE}`;

export interface DownloaderFeature {
  icon: string;
  title: string;
  desc: string;
}

export const DOWNLOADER_FEATURES: DownloaderFeature[] = [
  {
    icon: "lightweight",
    title: "极小身材 · 9.3MB 单可执行文件",
    desc: "基于 Go 1.26 + Windows 原生 Edge WebView2 构建，单文件 exe 双击即开，无控制台黑框，告别上百兆的 Electron 依赖。",
  },
  {
    icon: "search",
    title: "多源聚合去重检索",
    desc: "集成 QQ 音乐、网易云、酷我、酷狗四大平台单源检索与全网聚合去重算法，支持歌单链接批量抓取与多曲目队列解析。",
  },
  {
    icon: "tag",
    title: "自研 ID3v2.3 规范内嵌",
    desc: "下载即得完整 MP3：自研标签引擎写入标准 ID3v2.3，内嵌 500×500 APIC 封面、USLT 歌词与 SYLT 滚动歌词，车载大屏与 Windows 完美识别。",
  },
  {
    icon: "sandbox",
    title: "洛雪沙箱 · 规避 CORS 限制",
    desc: "本地后端模拟 globalThis.lx 脚本环境，音源解析全在本地完成，不受浏览器跨域拦截，支持上传、持久化存储及一键恢复。",
  },
  {
    icon: "shield",
    title: "智能跨源兜底与防试听截断",
    desc: "多源串联兜底（酷我 → 酷狗 → 网易云），智能识别并自动剔除 VIP 短片头试听片段，确保下载到完整时长的无损/高码率音频。",
  },
  {
    icon: "headless",
    title: "并发流式传输与 Headless 模式",
    desc: "支持 1~5 并发线程下载、断点临时文件与原子重命名；支持传入 -headless 参数化身后台守护进程，供浏览器或远程客户端调用。",
  },
];

export const DOWNLOADER_GUIDE_STEPS = [
  {
    step: "01",
    title: "免安装双击运行",
    desc: "下载最新的 anhe-downloader.exe 存放到任意文件夹，双击即可唤起原生 WebView2 现代化操作窗口，无需繁琐安装流程。",
  },
  {
    step: "02",
    title: "搜索单曲或导入歌单",
    desc: "在主界面搜索框键入歌曲名检索，或在歌单导入面板粘贴各大音乐平台的外链歌单，一键批量解析并添加到待下载队列。",
  },
  {
    step: "03",
    title: "一键高速下载与自动打标",
    desc: "选择目标音质并启动下载，程序自动多线程拉流、抓取 500px 高清封面与滚动歌词，写入 ID3v2.3 标签生成单文件 MP3。",
  },
];
