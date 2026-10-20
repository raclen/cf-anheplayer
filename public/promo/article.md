发帖说明（这一段不要和正文一起复制）

- 图片外链采用 Cloudflare Pages 现已在线稳定托管的全球 CDN 直链（或国内高可用图床），各大社区发帖不防盗链、免二次上传。
- 移动端竖屏长截图已通过 HTML/BBCode 严格约束宽度为 260px，并排居中展示，避免在 PC 端过大刷屏。
- 网站域名已按要求统一设为：https://anhe-player.cc.cd
- Markdown 版适合 Linux.do、V2EX、NodeSeek、GitHub、Telegram、语雀等。
- BBCode 版适合吾爱破解、Discuz 类论坛。

========== Markdown 版 ==========

# 安禾播放器：电脑一台，手机一台，再加一个 9.3MB 的下载器

安禾播放器是一套完全开源、无任何广告、不收集用户隐私的轻量音乐套件。我们没有做一个臃肿沉重的“巨无霸”客户端，而是将它拆分为三个彼此独立、各司其职的小工具：

官方门户与全系列下载：https://anhe-player.cc.cd

| 使用场景 | 对应产品 | 适用平台 |
| --- | --- | --- |
| 电脑前专注听歌、管理庞大本地曲库 | 安禾播放器 PC 端 | Windows 10 / 11 |
| 出门随身听、车载中控无缝串流 | 安禾播放器移动端 | Android (ARM64) |
| 只想批量下载带高清封面与歌词的单曲 | 风宝音乐下载器 | Windows 单文件免安装 |

---

## 1. 桌面端 (PC)

基于 Tauri v2 + Rust 原生轻量内核，秒级冷启动，极低资源占用。

- **洛雪音源插件生态**：支持本地导入 `.js` 脚本或一键订阅远程链接，支持多音质无缝切换与播放故障自动换源
- **网易云深度联动**：登录网易云账号即可解锁私人雷达、每日推荐与私人漫游
- **本地曲库整理**：深度扫描本地目录，自动提取内嵌标签，支持按单曲、歌手、专辑整理
- **丰富播放控制**：智能播放队列、倍速播放、音频输出设备无缝切换；内置浅色/极夜主题与 `.mftheme` 主题市场
- **注**：为遵循开源合规，PC 端默认不内置音源，首次使用需在设置中导入洛雪脚本

<img src="https://img.meituan.net/content/1a7c6bc9cfc1c3f7dfa9a95d2a194cf0337799.png" width="720" alt="安禾播放器 PC 界面" />

- 介绍与安装：https://anhe-player.cc.cd/
- 源码仓库：https://github.com/raclen/AnhePlayer

---

## 2. 移动端 (Android)

基于 Kotlin + Jetpack Compose + Media3 构建，严格遵循 Material 3 设计美学，支持深色沉浸、横竖屏自适应与 Android Auto 车载系统。

- **开箱即用**：内置优质音源，安装即可搜索听歌；内置 QuickJS 原生脚本引擎，支持随时导入自定义洛雪音源
- **多源聚合快搜**：酷狗、网易云、QQ 音乐、酷我四大平台秒切
- **专业 AutoEQ 音效**：集成基于 AutoEQ 科学测算的 10 组硬件级预设曲线（流行、人声、监听等）
- **高保真随身管家**：支持 MP3、FLAC、OGG 等格式，下载最高支持 Hi-Res（FLAC 24bit）

<p align="center">
  <img src="https://img.meituan.net/content/b7b82e114a8b0c4da6b939030a9f3933729054.jpg" width="260" alt="安禾播放器移动端 - 沉浸播放与歌词" />
  &nbsp;&nbsp;&nbsp;&nbsp;
  <img src="https://cf-anheplayer.pages.dev/_astro/%E6%90%9C%E7%B4%A2%E9%A1%B5.IUO8jeDT_ZN3xNf.webp" width="260" alt="安禾播放器移动端 - 四平台搜索切换" />
</p>

- 介绍与 APK 下载：https://anhe-player.cc.cd/mobile
- 源码仓库：https://github.com/raclen/AnhePlayer-Mobile

---

## 3. 风宝音乐下载器 (Windows)

采用 Go 1.26 + Windows 原生 Edge WebView2 打造，告别臃肿的 Electron，单文件 `anhe-downloader.exe` 仅 9.3MB，双击即开。

- **多源聚合检索**：整合主流平台曲库，支持单源搜索与全网聚合去重检索，支持外部歌单链接一键批量解析
- **自研标准打标引擎**：下载自动生成标准 MP3，内嵌 500×500 高清 APIC 封面、USLT 歌词与 SYLT 滚动歌词，车载大屏完美识别
- **规避浏览器跨域**：本地后端模拟洛雪运行时，支持 1~5 线程高并发极速下载
- **Headless 后台模式**：支持以守护进程运行，方便开发者通过 API 或浏览器拓展集成

<img src="https://cf-anheplayer.pages.dev/_astro/home.CdpZtunG_190u4.webp" width="720" alt="风宝音乐下载器界面" />

- 介绍与 EXE 下载：https://anhe-player.cc.cd/downloader
- 源码仓库：https://github.com/raclen/anhe-downloader

---

## 4. 洛雪音源可用性实时监测

音源失效不用愁！项目部署了每 4 小时自动巡检机制，模拟真实运行时对各平台歌曲拉流校验，随时获取最新可用音源：

- 实时状态大盘：https://anhe-player.cc.cd/sources
- 自动化监测 JSON 接口：https://anhe-player.cc.cd/sources-status.json

---

## 使用提示

1. PC 端与下载器目前仅支持 Windows 10/11；移动端为 Android ARM64 APK。
2. 桌面端默认纯净，需先导入洛雪音源扩展；移动端已内置即用源。
3. 本套工具纯为个人技术交流与音频技术学习开发，请支持正版音乐。

========== BBCode 版 ==========

[b]安禾播放器：电脑一台，手机一台，再加一个 9.3MB 的下载器[/b]

安禾播放器是一套完全开源、无任何广告、不收集用户隐私的轻量音乐套件。我们没有做一个臃肿沉重的“巨无霸”客户端，而是将它拆分为三个彼此独立、各司其职的小工具：

官方门户与全系列下载：[url]https://anhe-player.cc.cd[/url]

电脑前专注听歌、管理庞大本地曲库：安禾播放器 PC 端（Windows 10 / 11）
出门随身听、车载中控无缝串流：安禾播放器移动端（Android ARM64）
只想批量下载带高清封面与歌词的单曲：风宝音乐下载器（Windows 单文件免安装）

[b]1. 桌面端 (PC)[/b]

基于 Tauri v2 + Rust 原生轻量内核，秒级冷启动，极低资源占用。

[*]洛雪音源插件生态：支持本地导入 .js 脚本或一键订阅远程链接，支持多音质切换与播放故障自动换源
[*]网易云深度联动：登录网易云账号即可解锁私人雷达、每日推荐与私人漫游
[*]本地曲库整理：深度扫描本地目录，自动提取内嵌标签，支持按单曲、歌手、专辑整理
[*]丰富播放控制：智能播放队列、倍速播放、音频输出设备无缝切换；内置浅色/极夜主题与 .mftheme 主题市场
[*][b]注：为遵循开源合规，PC 端默认不内置音源，首次使用需在设置中导入洛雪脚本[/b]

[img=720,488]https://img.meituan.net/content/1a7c6bc9cfc1c3f7dfa9a95d2a194cf0337799.png[/img]

介绍与安装：[url]https://anhe-player.cc.cd/[/url]
源码仓库：[url]https://github.com/raclen/AnhePlayer[/url]

[b]2. 移动端 (Android)[/b]

基于 Kotlin + Jetpack Compose + Media3 构建，严格遵循 Material 3 设计美学，支持深色沉浸、横竖屏自适应与 Android Auto 车载系统。

[*]开箱即用：内置优质音源，安装即可搜索听歌；内置 QuickJS 原生脚本引擎，支持随时导入自定义洛雪音源
[*]多源聚合快搜：酷狗、网易云、QQ 音乐、酷我四大平台秒切
[*]专业 AutoEQ 音效：集成基于 AutoEQ 科学测算的 10 组硬件级预设曲线（流行、人声、监听等）
[*]高保真随身管家：支持 MP3、FLAC、OGG 等格式，下载最高支持 Hi-Res（FLAC 24bit）

[align=center][img=260,564]https://img.meituan.net/content/b7b82e114a8b0c4da6b939030a9f3933729054.jpg[/img] [img=260,564]https://cf-anheplayer.pages.dev/_astro/%E6%90%9C%E7%B4%A2%E9%A1%B5.IUO8jeDT_ZN3xNf.webp[/img][/align]

介绍与 APK 下载：[url]https://anhe-player.cc.cd/mobile[/url]
源码仓库：[url]https://github.com/raclen/AnhePlayer-Mobile[/url]

[b]3. 风宝音乐下载器 (Windows)[/b]

采用 Go 1.26 + Windows 原生 Edge WebView2 打造，告别臃肿的 Electron，单文件 anhe-downloader.exe 仅 9.3MB，双击即开。

[*]多源聚合检索：整合主流平台曲库，支持单源搜索与全网聚合去重检索，支持外部歌单链接一键批量解析
[*]自研标准打标引擎：下载自动生成标准 MP3，内嵌 500×500 高清 APIC 封面、USLT 歌词与 SYLT 滚动歌词，车载大屏完美识别
[*]规避浏览器跨域：本地后端模拟洛雪运行时，支持 1~5 线程高并发极速下载
[*]Headless 后台模式：支持以守护进程运行，方便开发者通过 API 或浏览器拓展集成

[img=720,495]https://cf-anheplayer.pages.dev/_astro/home.CdpZtunG_190u4.webp[/img]

介绍与 EXE 下载：[url]https://anhe-player.cc.cd/downloader[/url]
源码仓库：[url]https://github.com/raclen/anhe-downloader[/url]

[b]4. 洛雪音源可用性实时监测[/b]

音源失效不用愁！项目部署了每 4 小时自动巡检机制，模拟真实运行时对各平台歌曲拉流校验，随时获取最新可用音源：

实时状态大盘：[url]https://anhe-player.cc.cd/sources[/url]
自动化监测 JSON 接口：[url]https://anhe-player.cc.cd/sources-status.json[/url]

[b]使用提示[/b]

[list=1]
[*]PC 端与下载器目前仅支持 Windows 10/11；移动端为 Android ARM64 APK。
[*]桌面端默认纯净，需先导入洛雪音源扩展；移动端已内置即用源。
[*]本套工具纯为个人技术交流与音频技术学习开发，请支持正版音乐。
[/list]
