/** 站点根地址工具：统一 canonical、结构化数据与 sitemap 使用的绝对地址形式。 */

/** astro.config.mjs 未配置 site 时的线上兜底域名 */
export const SITE_FALLBACK = "https://anhe-player.loc.cc";

/** 站点根地址（始终以 / 结尾），作为相对路径拼接基准 */
export function siteBaseUrl(site?: URL): string {
  const href = (site ?? new URL(SITE_FALLBACK)).href;
  return href.endsWith("/") ? href : `${href}/`;
}

/** 把站内相对路径（以 / 开头）转成绝对地址 */
export function absoluteUrl(site: URL | undefined, path: string): string {
  return new URL(path, siteBaseUrl(site)).href;
}