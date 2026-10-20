// 核心功能卡片数据（取自仓库 README 的功能模块与近期更新，精选 8 项）。
// icon 为图标 key，对应 Features.astro 中的 SVG 映射。

export interface Feature {
  icon: string;
  title: string;
  desc: string;
}

export const FEATURES: Feature[] = [
  {
    icon: "engine",
    title: "Tauri v2 轻量引擎",
    desc: "Rust 原生内核配合 Web Worker 插件沙箱，秒级冷启动，内存与 CPU 占用大幅降低。",
  },
  {
    icon: "puzzle",
    title: "洛雪插件音源",
    desc: "安装洛雪 .js 插件或远程订阅，自由扩展在线音源、多音质切换与音源重定向。",
  },
  {
    icon: "radar",
    title: "网易云个性化推荐",
    desc: "登录网易云账号，解锁私人雷达、每日推荐与私人漫游，推荐越听越懂你。",
  },
  {
    icon: "folder",
    title: "本地曲库管理",
    desc: "扫描本地文件夹，按单曲、歌手、专辑、文件夹分类整理，本地歌曲同样可写入封面与歌词。",
  },
  {
    icon: "queue",
    title: "播放与队列",
    desc: "播放队列、下一首播放、顺序/随机/单曲循环、倍速播放与音频输出设备选择。",
  },
  {
    icon: "palette",
    title: "主题随心换",
    desc: "内置浅色与纯黑主题，主题市场提供多套策展主题，也可导入 .mftheme 主题包。",
  },
  {
    icon: "download",
    title: "下载管理",
    desc: "自定义下载目录、默认音质、并发数量与文件命名格式，下载完成自动写入封面与歌词。",
  },
  {
    icon: "backup",
    title: "备份与迁移",
    desc: "支持本地文件备份、WebDAV 云备份恢复与旧版数据导入，换机也不丢歌单。",
  },
];
