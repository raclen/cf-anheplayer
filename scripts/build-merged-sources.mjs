/**
 * 生成合并音源清单（public/merged-sources.json 与 merged-sources.txt）。
 * 数据来源：src/data/sources-status.json（最新一轮检测结果）+
 * sources/remote.json（在线音源的镜像 / 原始地址回退）。
 *
 * 用法：node scripts/build-merged-sources.mjs [--site https://anhe-player.loc.cc]
 * 构建时由 astro.config.mjs 的构建准备集成自动调用，无需手动执行。
 */
import { writeMergedSources } from "./lib/merged-sources.mjs";

const args = process.argv.slice(2);
const siteIndex = args.indexOf("--site");
const site = siteIndex >= 0 && args[siteIndex + 1] ? args[siteIndex + 1] : undefined;

const merged = await writeMergedSources(process.cwd(), site ? { site } : {});
console.log(
  `♪ 合并音源：检测 ${merged.totalChecked} 条，通过 ${merged.totalPassing} 条，去重后保留 ${merged.included} 条` +
    (merged.removedDuplicates.length
      ? `（去掉同名重复 ${merged.removedDuplicates.map((item) => item.name).join("、")}）`
      : ""),
);
console.log("✔ 已生成 public/merged-sources.json 与 public/merged-sources.txt");
