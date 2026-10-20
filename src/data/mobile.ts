// 安禾播放器移动端 (AnhePlayer-Mobile) 常量与元数据配置

export const MOBILE_OWNER = "raclen";
export const MOBILE_REPO = "AnhePlayer-Mobile";
export const MOBILE_REPO_URL = `https://github.com/${MOBILE_OWNER}/${MOBILE_REPO}`;
export const MOBILE_RELEASES_URL = `${MOBILE_REPO_URL}/releases`;
export const MOBILE_RELEASES_LATEST_URL = `${MOBILE_RELEASES_URL}/latest`;
export const MOBILE_LATEST_API = `https://api.github.com/repos/${MOBILE_OWNER}/${MOBILE_REPO}/releases/latest`;

/** API 不可用时的兜底版本与下载直链 */
export const MOBILE_FALLBACK_VERSION = "2.0.3";
export const MOBILE_FALLBACK_FILE = `AnhePlayer-${MOBILE_FALLBACK_VERSION}-core-arm64-v8a-release-203.apk`;
export const MOBILE_FALLBACK_URL = `${MOBILE_REPO_URL}/releases/download/v${MOBILE_FALLBACK_VERSION}/${MOBILE_FALLBACK_FILE}`;

export interface MobileFeature {
  icon: string;
  title: string;
  desc: string;
}

export const MOBILE_FEATURES: MobileFeature[] = [
  {
    icon: "design",
    title: "Material 3 灵动画境",
    desc: "遵循 Google Material 3 规范打造，精致动态配色随系统主题呼吸流转，支持深色沉浸、横竖屏自适应与 Android Auto 车载系统。",
  },
  {
    icon: "quickjs",
    title: "洛雪 QuickJS 音源内核",
    desc: "内置 QuickJS 原生脚本引擎与移动端兼容层，开箱即用内置音源，亦可一键导入任意 .js 洛雪自定义音源脚本。",
  },
  {
    icon: "search",
    title: "多源聚合秒搜",
    desc: "一键在酷狗、网易云、QQ 音乐、酷我四大主流曲库之间无缝切换，列表文字秒出，专辑封面与歌手头像异步丝滑上屏。",
  },
  {
    icon: "equalizer",
    title: "专业 AutoEQ 10 档音效",
    desc: "集成基于 AutoEQ FixedBandEQ 科学测算的 10 组硬件级预设曲线，图形化多段均衡器、立体声拓宽与音调倍速精准微调。",
  },
  {
    icon: "library",
    title: "纯净本地媒体库",
    desc: "全面兼容 MP3、FLAC、OGG、AAC 等无损格式，优先提取音频内嵌高清封面与嵌入歌词，多播放队列断点自动续播。",
  },
  {
    icon: "download",
    title: "无损独立下载管理",
    desc: "播放音质与下载音质独立配置，最高可达 Hi-Res（FLAC 24bit），任务完成后直接以标准标签保存到公共音乐目录。",
  },
];

export const MOBILE_GUIDE_STEPS = [
  {
    step: "01",
    title: "导入或使用内置洛雪音源",
    desc: "应用已内置优质测试音源，打开即可听歌；如需使用自定义脚本，点击搜索页右上角音源图标或进入「设置 → 洛雪音源」，选择任意 .js 音源文件导入。",
  },
  {
    step: "02",
    title: "多源搜索与品质切换",
    desc: "在顶部搜索栏输入歌名或歌手，点击下方标签可在各大音乐平台间即时切换；长按或在设置中选择播放与下载音质（128k / 320k / FLAC / Hi-Res）。",
  },
  {
    step: "03",
    title: "开启专属大师音效",
    desc: "进入播放器页面点击「音效」或在设置中开启均衡器，在「流行低音」「清亮人声」「录音室」等 10 款预设曲线间随意切换，享受澎湃听感。",
  },
];
