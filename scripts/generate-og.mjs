// 生成 1200×630 的社交分享图（Open Graph / Twitter Card）与 180×180 的 apple-touch-icon。
// 产物直接提交到 public/，无需在 CI 中执行；修改文案或配色后重新运行 `node scripts/generate-og.mjs`。
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

const root = process.cwd();
const logoSrc = path.join(root, "public", "logo.png");
const logoBase64 = fs.readFileSync(logoSrc).toString("base64");

// 注意：librsvg 不支持逗号分隔的 font-family 回退列表，必须只写单一字族；
// 仅支持简体中文的 Noto Sans SC 可直接命中，避免中文落到衬线默认字体。
const FONT = "Noto Sans SC";

/** 站点配色（与 src/styles/global.css 的色块变量保持接近） */
const PALETTES = {
  lime: { block: "#dceeb1", accent: "#6f8f1f" },
  mint: { block: "#c8e6cd", accent: "#1f6b38" },
  coral: { block: "#f3c9b6", accent: "#a24f28" },
  lilac: { block: "#c5b0f4", accent: "#503190" },
  cream: { block: "#f4ecd6", accent: "#8a6a1d" },
};

const escapeXml = (value) =>
  String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");

// 中文按全角、ASCII 按半角估算文字宽度，用于自动排版和收缩字号
const textWidth = (text, size) =>
  [...text].reduce((w, ch) => w + (/[\u0000-ÿ]/.test(ch) ? size * 0.56 : size), 0);

/** 单行自适应字号 + 位置：过宽时将文字整体右移，避免压到左侧 Logo 卡片 */
const fitLine = ({ text, x, maxX, baseSize, minSize = 40 }) => {
  const available = maxX - x;
  let size = baseSize;
  while (size > minSize && textWidth(text, size) > available) size -= 2;
  const width = Math.min(textWidth(text, size), available);
  return { size, x: Math.min(x, Math.max(120, maxX - width)) };
};

const maxX = 1120;
const leftX = 500;

const svgTemplate = ({ eyebrow, titleLines, subtitleLines, palette, footer }) => {
  const { block, accent } = PALETTES[palette];
  const titleSize = Math.min(
    ...titleLines.map((line) => fitLine({ text: line, x: leftX, maxX, baseSize: 62 }).size),
  );
  const titleStartY = titleLines.length > 1 ? 298 : 330;
  const title = titleLines
    .map((line, i) => `<tspan x="${leftX}" dy="${i === 0 ? 0 : titleSize + 12}">${escapeXml(line)}</tspan>`)
    .join("");
  const subtitleTop = titleStartY + (titleLines.length - 1) * (titleSize + 12) + 62;
  const subtitle = subtitleLines
    .map((line, i) => `<tspan x="${leftX}" dy="${i === 0 ? 0 : 40}">${escapeXml(line)}</tspan>`)
    .join("");
  const footerLines = footer
    .map((line, i) => `<tspan x="80" dy="${i === 0 ? 0 : 34}">${escapeXml(line)}</tspan>`)
    .join("");

  return `<svg width="1200" height="630" viewBox="0 0 1200 630" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1200" y2="630" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="#ffffff"/>
      <stop offset="1" stop-color="#fafaf7"/>
    </linearGradient>
    <linearGradient id="glow" x1="700" y1="80" x2="1120" y2="560" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="${block}"/>
      <stop offset="1" stop-color="${block}" stop-opacity="0.35"/>
    </linearGradient>
    <clipPath id="card">
      <rect x="80" y="125" width="360" height="360" rx="84"/>
    </clipPath>
  </defs>

  <rect width="1200" height="630" fill="url(#bg)"/>
  <circle cx="980" cy="300" r="260" fill="url(#glow)"/>

  <!-- 左侧 Logo 卡片 -->
  <g clip-path="url(#card)">
    <rect x="80" y="125" width="360" height="360" rx="84" fill="#ffffff"/>
    <image x="140" y="185" width="240" height="240" href="data:image/png;base64,${logoBase64}"/>
  </g>
  <rect x="80" y="125" width="360" height="360" rx="84" fill="none" stroke="#ffffff" stroke-opacity="0.7" stroke-width="4"/>

  <!-- 右侧文案 -->
  <g>
    <rect x="${leftX}" y="72" width="44" height="44" rx="12" fill="${accent}" opacity="0.16"/>
    <text x="${leftX + 56}" y="106" font-family="${FONT}" font-size="28" font-weight="600" fill="#111111">AnhePlayer 安禾播放器</text>
    <rect x="${leftX}" y="140" width="${eyebrow.length * 22 + 44}" height="44" rx="22" fill="${block}"/>
    <text x="${leftX + (eyebrow.length * 22 + 44) / 2}" y="170" text-anchor="middle" font-family="${FONT}" font-size="22" font-weight="600" fill="#111111">${escapeXml(eyebrow)}</text>
  </g>

  <g fill="#0b0b0f" font-family="${FONT}" font-size="${titleSize}" font-weight="700" letter-spacing="-1">
    <text x="${leftX}" y="${titleStartY}">${title}</text>
  </g>

  <g fill="#5a5a5a" font-family="${FONT}" font-size="28" font-weight="400">
    <text x="${leftX}" y="${subtitleTop}">${subtitle}</text>
  </g>

  <g fill="#8a8a8a" font-family="${FONT}" font-size="23" font-weight="500">
    <text x="80" y="560">${footerLines}</text>
  </g>
</svg>`;
};

const PAGES = [
  {
    file: "og-image.png",
    eyebrow: "官方下载站",
    titleLines: ["开源免费的音乐播放器", "支持洛雪插件音源"],
    subtitleLines: ["Windows 桌面端 · Android 移动端", "轻量下载器 · 音源可用性监测"],
    palette: "mint",
    footer: ["anhe-player.loc.cc", "开源 · 无广告 · 不上传个人数据"],
  },
  {
    file: "og/pc.png",
    eyebrow: "PC 桌面端",
    titleLines: ["AnhePlayer", "桌面音乐播放器"],
    subtitleLines: ["Tauri v2 原生引擎 · 洛雪插件音源", "本地曲库 · 网易云推荐 · 主题定制"],
    palette: "mint",
    footer: ["anhe-player.loc.cc", "Windows 10 / 11 · 免费开源"],
  },
  {
    file: "og/mobile.png",
    eyebrow: "Android 移动端",
    titleLines: ["AnhePlayer 移动端", "掌上洛雪音乐播放器"],
    subtitleLines: ["Material 3 设计 · QuickJS 音源内核", "多源聚合搜索 · 10 档 AutoEQ 音效"],
    palette: "lilac",
    footer: ["anhe-player.loc.cc/mobile/", "Android 7.0+ · 64/32 位双包"],
  },
  {
    file: "og/downloader.png",
    eyebrow: "Windows 下载器",
    titleLines: ["风宝音乐下载器", "单文件 9.3MB 免安装"],
    subtitleLines: ["四源聚合检索 · MP3 规范打标", "内嵌 500px 封面与滚动歌词"],
    palette: "coral",
    footer: ["anhe-player.loc.cc/downloader/", "Windows 10 / 11 · 开源免费"],
  },
  {
    file: "og/sources.png",
    eyebrow: "音源状态监测",
    titleLines: ["洛雪音源", "可用性实时监测"],
    subtitleLines: ["每 4 小时自动拉流校验", "网易云 · QQ 音乐 · 酷狗 · 酷我 · 咪咕"],
    palette: "cream",
    footer: ["anhe-player.loc.cc/sources/", "自动检测 · 公开 JSON 接口"],
  },
];

const main = async () => {
  for (const page of PAGES) {
    const out = path.join(root, "public", page.file);
    fs.mkdirSync(path.dirname(out), { recursive: true });
    const buffer = await sharp(Buffer.from(svgTemplate(page))).png({ compressionLevel: 9 }).toBuffer();
    fs.writeFileSync(out, buffer);
    console.log(`[og] ${path.relative(root, out)} ${buffer.length} bytes`);
  }

  // apple-touch-icon：iOS 添加到主屏时使用
  const iconBuffer = await sharp(logoSrc)
    .resize(180, 180, { fit: "contain", background: { r: 255, g: 255, b: 255, alpha: 0 } })
    .png()
    .toBuffer();
  fs.writeFileSync(path.join(root, "public", "apple-touch-icon.png"), iconBuffer);
  console.log(`[icon] public/apple-touch-icon.png ${iconBuffer.length} bytes`);
};

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});