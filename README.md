# cf-anheplayer

AnhePlayer 全系列官方宣传与下载门户，从 `zone` 主站拆分出来，独立部署在 Cloudflare Pages。

- 线上地址：`https://anhe-player.loc.cc`
- 主站：`https://raclen.ee.cd`

门户涵盖安禾播放器系列三大产品与音源可用性监测中心：
1. **PC 桌面端**（`/`）：基于 Tauri v2 + React 的跨平台轻量无损音乐播放器。
2. **移动端**（`/mobile`）：基于 Android Compose + Media3 的高颜值 Material 3 随身听，内置 QuickJS 洛雪音源沙箱与 10 档 AutoEQ。
3. **风宝音乐下载器**（`/downloader`）：Go 1.26 + 原生 WebView2 单文件 9.3MB 极轻下载器，多源聚合检索，下载自动生成内嵌 500px 封面与滚动歌词的规范 MP3。
4. **洛雪音源状态监测**（`/sources`）：GitHub Actions 每 4 小时自动化测试所有自定义音源拉流健康度。

所有产品的下载版本与文件大小均在浏览器端实时从 GitHub Releases API 动态获取，API 限流时自动平滑回退到硬编码直链。

## 技术栈

- Astro 6（纯静态输出）
- 原生 CSS（`src/styles/global.css` 提供设计 token 与通用组件）
- Cloudflare Pages

## 本地开发

环境要求：Node.js 22+、pnpm 9+。

```bash
pnpm install
pnpm dev
```

默认访问 `http://localhost:4321`。

```bash
pnpm build     # 构建到 dist/
pnpm preview   # 预览构建产物
```

## 洛雪音源状态监测

`/sources` 页面展示每条洛雪自定义音源的可用性，每 4 小时自动更新一次。

- 音源文件放在 `sources/优质`、`sources/一般`，可用 `scripts/sync-sources.mjs` 从本地目录同步。
- 在线音源在 `sources/remote.json` 中维护（`url` 直链 + `mirror` 镜像），每轮检测会先下载最新脚本再测试。
- `scripts/check-sources.mjs` 在模拟的洛雪运行环境中加载音源，对每个平台请求固定测试歌曲的播放地址，并校验地址能否真实拉流。
- 结果同时写入 `src/data/sources-status.json`（构建时渲染页面）和 `public/sources-status.json`（线上 JSON 接口）。
- 每条音源卡片右侧的复制按钮：在线音源复制 `sources/remote.json` 里的原始链接，本地音源复制 GitHub raw 链接（需仓库公开且已推送），可直接粘贴到洛雪音源导入框。
- GitHub Actions（`.github/workflows/check-sources.yml`）每 4 小时执行一次并自动提交结果，Cloudflare Pages 随之重新构建。

```bash
# 从本地目录同步音源（--clean 会删除源目录中已不存在的旧文件）
node scripts/sync-sources.mjs "E:/gopeed downloads/音源 V261017/V261017" --clean

# 检测全部音源（本地 + 在线）
pnpm sources:check

# 只检测文件名或在线音源 ID 包含关键字的项目
node scripts/check-sources.mjs --only fish
```

在线音源清单示例（`sources/remote.json`）：

```json
[
  {
    "id": "example",
    "title": "示例音源",
    "category": "在线",
    "url": "https://raw.githubusercontent.com/user/repo/main/example/latest.js",
    "mirror": "https://ghproxy.net/raw.githubusercontent.com/user/repo/main/example/latest.js",
    "homepage": "https://github.com/user/repo"
  }
]
```

首次部署前，需要在仓库 **Settings → Actions → General → Workflow permissions** 中选择 **Read and write permissions**，否则定时任务无法提交检测结果。

## 部署到 Cloudflare Pages

在 Cloudflare Pages 中新建项目并连接本仓库，构建配置：

- Framework preset：`Astro`
- Build command：`pnpm build`
- Output directory：`dist`
- Root directory：`/`
- Node version：`22`

部署完成后，在项目的 **Custom domains** 中添加 `anhe-player.loc.cc`，并按提示配置 DNS。

## 目录结构

```text
cf-anheplayer/
├── .github/workflows/      音源定时检测任务
├── public/
│   ├── logo.png            站点图标
│   ├── og-image.png        社交分享图
│   ├── promo/              社区推广文的固定外链截图与正文（勿改文件名）
│   ├── robots.txt
│   └── sources-status.json 音源检测结果（供外部读取）
├── scripts/
│   ├── check-sources.mjs   音源可用性检测
│   ├── sync-sources.mjs    从本地目录同步音源
│   └── lib/lx-sandbox.mjs  洛雪运行环境模拟
├── sources/                洛雪自定义音源（优质 / 一般 / remote.json 在线清单）
├── src/
│   ├── assets/screenshots/ 界面截图（PC / 移动端 / 下载器，构建时由 Astro 优化）
│   ├── components/         页面区块组件（Nav, Hero, Features, FamilySection, Footer 等）
│   ├── data/               功能列表、安装包元数据（platforms, mobile, downloader）与检测结果
│   ├── layouts/            页面骨架与 meta 标签
│   ├── pages/
│   │   ├── index.astro      PC 桌面端宣传与下载页
│   │   ├── mobile.astro     移动端宣传与下载页
│   │   ├── downloader.astro 风宝音乐下载器宣传与下载页
│   │   └── sources.astro    音源状态页
│   └── styles/global.css   全局样式
├── astro.config.mjs
└── package.json
```

## 维护提示

- 新增或调整 PC 安装包：改 `src/data/platforms.ts` 的 `PLATFORMS` 与 `FALLBACK_VERSION`。
- 新增或调整移动端配置：改 `src/data/mobile.ts` 的版本、特性与直链。
- 新增或调整下载器配置：改 `src/data/downloader.ts` 的版本、特性与直链。
- PC 功能卡片文案：改 `src/data/features.ts`。
- 更新音源：把新文件放进 `sources/优质` 或 `sources/一般`，然后执行 `pnpm sources:check`；也可用 `scripts/sync-sources.mjs` 从本地目录整体同步。
- 新增在线音源：在 `sources/remote.json` 里追加 `{ id, title, url, mirror }` 条目即可，无需下载脚本。
- 调整测试歌曲：改 `scripts/check-sources.mjs` 顶部的 `TEST_SONGS`。
- 站点域名变化时，同步修改 `astro.config.mjs` 的 `site` 与 `public/robots.txt` 的 Sitemap 地址。
- 社区推广文在 `public/promo/article.md`，配图在同目录。文件名就是外链路径（`https://anhe-player.cc.cd/promo/文件名`），改名会让已发出的帖子裂图。
