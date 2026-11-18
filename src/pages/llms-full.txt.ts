// /llms-full.txt —— 把整站可见文案拼成一份纯文本，供 AI 一次读取完整上下文。
// 数据全部来自构建期：功能、使用指南、问答、音源清单随源码与检测结果自动更新。
import type { APIRoute } from "astro";
import { getPcRelease, getMobileRelease, getDownloaderRelease } from "@/data/releases";
import { FEATURES } from "@/data/features";
import { MOBILE_FEATURES, MOBILE_GUIDE_STEPS } from "@/data/mobile";
import { DOWNLOADER_FEATURES, DOWNLOADER_GUIDE_STEPS } from "@/data/downloader";
import { PC_FAQ, MOBILE_FAQ, DOWNLOADER_FAQ, SOURCES_FAQ } from "@/data/faq";
import type { FaqItem } from "@/utils/seo";
import { siteBaseUrl } from "@/utils/url";
import statusJson from "@/data/sources-status.json";

const status = statusJson as any;

const faqBlock = (items: FaqItem[]) =>
  items.map((f) => `### ${f.q}\n${f.a}`).join("\n\n");

const featureBlock = (items: { title: string; desc: string }[]) =>
  items.map((f) => `- ${f.title}：${f.desc}`).join("\n");

const guideBlock = (items: { step: string; title: string; desc: string }[]) =>
  items.map((s) => `${s.step}. ${s.title}：${s.desc}`).join("\n");

export const GET: APIRoute = ({ site }) => {
  // 站点根地址取自 astro.config.mjs 的 site，去除末尾斜杠便于拼接
  const SITE = siteBaseUrl(site).replace(/\/$/, "");
  const pc = getPcRelease();
  const mobile = getMobileRelease();
  const downloader = getDownloaderRelease();

  const available = Array.isArray(status?.sources)
    ? status.sources
        .filter((s: any) => s.status === "available" || s.status === "partial")
        .map((s: any) => `- ${s.title}${s.author ? `（${s.author}）` : ""}：${s.status === "available" ? "可用" : "部分可用"}，通过 ${s.stats?.ok ?? 0}/${s.stats?.tested ?? 0} 个平台`)
        .join("\n")
    : "";

  const body = `# AnhePlayer 安禾播放器 · 完整站点内容

站点：${SITE}
说明：本文件是 AnhePlayer 官方站点的纯文本全文，供 AI 与大模型检索使用。内容与网页可见文案一致，随构建自动更新。

## 1. PC 桌面端（Windows）

页面：${SITE}/
定位：属于你自己的桌面音乐播放器。基于 Tauri v2 原生引擎，秒级冷启动、极低资源占用。
当前版本：v${pc.version}；下载量累计 ${pc.totalDownloads.toLocaleString()} 次。

功能：
${featureBlock(FEATURES)}

安装包：Windows 10 / 11 x64，提供 NSIS 安装版（.exe）与 MSI 安装包；本站提供国内高速镜像与 GitHub Releases 官方直链。

常见问题：
${faqBlock(PC_FAQ)}

## 2. 移动端（Android）

页面：${SITE}/mobile/
定位：遵循 Material 3 的掌上洛雪音乐播放器。基于 Kotlin、Jetpack Compose 与 Media3 播放内核。
当前版本：v${mobile.version}；下载量累计 ${mobile.totalDownloads.toLocaleString()} 次。
系统要求：Android 7.0+，提供 ARM64-v8a 与 armeabi-v7a 双安装包。

功能：
${featureBlock(MOBILE_FEATURES)}

使用步骤：
${guideBlock(MOBILE_GUIDE_STEPS)}

常见问题：
${faqBlock(MOBILE_FAQ)}

## 3. 风宝音乐下载器（Windows）

页面：${SITE}/downloader/
定位：极致轻巧的桌面音乐下载器。Go + 原生 Edge WebView2，单文件约 9.3MB，免安装。
当前版本：v${downloader.version}；下载量累计 ${downloader.totalDownloads.toLocaleString()} 次。

功能：
${featureBlock(DOWNLOADER_FEATURES)}

使用步骤：
${guideBlock(DOWNLOADER_GUIDE_STEPS)}

常见问题：
${faqBlock(DOWNLOADER_FAQ)}

## 4. 洛雪音源状态监测

页面：${SITE}/sources/
机制：GitHub Actions 每 4 小时加载全部自定义音源，用固定测试歌曲请求各平台播放地址，并校验返回地址能否真实拉流。
当前收录：${status?.summary?.total ?? 0} 个音源；完全可用 ${status?.summary?.available ?? 0} 个，部分可用 ${status?.summary?.partial ?? 0} 个，检测未通过 ${status?.summary?.unavailable ?? 0} 个。
平台通过率：${status?.summary?.platformsOk ?? 0}/${status?.summary?.platformsTested ?? 0}。
最近检测：${status?.generatedAt ?? "未知"}；下次预计：${status?.nextCheckAt ?? "未知"}。
公开接口：${SITE}/sources-status.json

当前可用音源：
${available || "暂无检测数据"}


常见问题：
${faqBlock(SOURCES_FAQ)}

## 5. 版权与免责

本项目所有代码均基于开源协议提供，仅供个人学习与音频技术交流。站点不提供任何音频内容，在线播放依赖于用户自行导入的第三方音源脚本，其可用性与合法性由使用者自行判断。
`;

  return new Response(body, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
};