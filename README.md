# cf-anheplayer

AnhePlayer 官方宣传与下载页，从 `zone` 主站拆分出来，独立部署在 Cloudflare Pages。

- 线上地址：`https://anhe-player.loc.cc`
- 主站：`https://raclen.ee.cd`

页面包含功能介绍、界面截图、安装包下载与插件主题说明。下载版本与文件大小在浏览器端从 GitHub Releases API 动态获取，API 不可用时回退到 `src/data/platforms.ts` 中的版本号直链。

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
├── public/
│   ├── logo.png            站点图标
│   ├── og-image.png        社交分享图
│   └── robots.txt
├── src/
│   ├── assets/screenshots/ 界面截图（构建时由 Astro 优化）
│   ├── components/         页面区块组件
│   ├── data/               功能列表与安装包元数据
│   ├── layouts/            页面骨架与 meta 标签
│   ├── pages/index.astro   唯一页面
│   └── styles/global.css   全局样式
├── astro.config.mjs
└── package.json
```

## 维护提示

- 新增或调整安装包：只改 `src/data/platforms.ts` 的 `PLATFORMS` 与 `FALLBACK_VERSION`。
- 功能卡片文案：改 `src/data/features.ts`。
- 站点域名变化时，同步修改 `astro.config.mjs` 的 `site` 与 `public/robots.txt` 的 Sitemap 地址。
