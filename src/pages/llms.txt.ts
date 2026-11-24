// /llms.txt —— 面向大模型与 AI 搜索的站点索引（llms.txt 规范）。
// 内容全部取自构建期数据，版本号、下载量、音源状态不会过期。
import type { APIRoute } from "astro";
import { getPcRelease, getMobileRelease, getDownloaderRelease } from "@/data/releases";
import { PC_FAQ, MOBILE_FAQ, DOWNLOADER_FAQ, SOURCES_FAQ } from "@/data/faq";
import { GITHUB_REPO_URL } from "@/data/platforms";
import { MOBILE_REPO_URL } from "@/data/mobile";
import { DOWNLOADER_REPO_URL } from "@/data/downloader";
import { siteBaseUrl } from "@/utils/url";
import statusJson from "@/data/sources-status.json";

export const GET: APIRoute = ({ site }) => {
  // 站点根地址取自 astro.config.mjs 的 site，去除末尾斜杠便于拼接
  const SITE = siteBaseUrl(site).replace(/\/$/, "");

  const pc = getPcRelease();
  const mobile = getMobileRelease();
  const downloader = getDownloaderRelease();
  const status = statusJson as any;
  const updated = status?.generatedAt ? new Date(status.generatedAt).toISOString().slice(0, 10) : "未知";

  const body = `# AnhePlayer 安禾播放器

> AnhePlayer（安禾播放器）是一套开源、免费、无广告的 Windows / Android 音乐软件系列，包含桌面播放器、移动端播放器、轻量音乐下载器，以及一个洛雪音源可用性监测站点。全系列不收集用户听歌数据，音源由用户自行导入洛雪 .js 脚本。

## 产品
- [PC 桌面端（Windows）](${SITE}/)：Tauri v2 + Rust 原生内核的桌面音乐播放器，当前版本 v${pc.version}。支持洛雪插件音源、本地曲库、网易云私人雷达与主题市场。
- [移动端（Android）](${SITE}/mobile/)：Kotlin + Jetpack Compose + Media3 构建，当前版本 v${mobile.version}。内置 QuickJS 洛雪音源引擎、四平台聚合搜索、10 档 AutoEQ 音效，适配 Android 7.0+ 与 32 位设备。
- [风宝音乐下载器（Windows）](${SITE}/downloader/)：Go + 原生 WebView2 单文件 9.3MB 免安装下载器，当前版本 v${downloader.version}。四源聚合检索，MP3 自动写入 ID3v2.3 标签并内嵌 500×500 封面与滚动歌词。
- [洛雪音源状态监测](${SITE}/sources/)：每 4 小时自动检测自定义音源的拉流可用性，当前收录 ${status?.summary?.total ?? 0} 个音源，最近一次检测 ${updated}。

## 关键事实
- 授权与费用：全系列开源免费，无广告、无内购；PC 端代码仓库 ${GITHUB_REPO_URL}，移动端 ${MOBILE_REPO_URL}，下载器 ${DOWNLOADER_REPO_URL}。
- 运行平台：PC 端与下载器为 Windows 10 / 11 x64；移动端为 Android 7.0+（ARM64-v8a 与 armeabi-v7a 双包）。
- 音源机制：应用不内置任何音源，在线播放需用户自行导入洛雪（lx-music）格式的 .js 音源脚本；音源仅保存在本机。
- 数据与隐私：不上传个人数据，无需注册即可使用本地播放；网易云推荐为可选登录功能。
- 下载渠道：本站提供国内镜像与 GitHub Releases 官方直链，版本与文件大小随 Release 自动同步。
- 音源检测口径：检测只覆盖音源自身接口，不含播放器内置解析与跨源兜底，「检测未通过」不等于客户端无法播放。

## 文档与数据
- [站点地图](${SITE}/sitemap-index.xml)
- [音源可用性 JSON 接口](${SITE}/sources-status.json)：字段含 summary、sources[].status、platforms[]、history[]，可程序化读取。
- [合并音源订阅清单](${SITE}/merged-sources.json)：本轮检测通过、去重后的音源订阅 JSON；[链接列表](${SITE}/merged-sources.txt)：一行一个 .js 链接。两者随检测自动更新，不是拼接后的单个 .js 文件。
- [完整内容（含全部问答）](${SITE}/llms-full.txt)

## 常见问题
${PC_FAQ.map((f) => `- ${f.q}\n  ${f.a}`).join("\n")}
${MOBILE_FAQ.map((f) => `- ${f.q}\n  ${f.a}`).join("\n")}
${DOWNLOADER_FAQ.map((f) => `- ${f.q}\n  ${f.a}`).join("\n")}
${SOURCES_FAQ.map((f) => `- ${f.q}\n  ${f.a}`).join("\n")}
`;

  return new Response(body, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
};