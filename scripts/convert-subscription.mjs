/**
 * 把「插件订阅 JSON」转换为洛雪（LX Music）自定义音源。
 *
 * 这类订阅（例如 https://music.cwo.cc.cd/api/subscription.json?source=cihedai.json）
 * 返回的是一组 BakaMusic / CCMusic 风格的 CommonJS 插件地址。本脚本会：
 *   1. 读取订阅 JSON（支持远程 URL 或本地文件）
 *   2. 下载每个插件脚本
 *   3. 按平台识别插件归属，并打包成符合洛雪协议的单一音源文件
 *
 * 产物依赖 scripts/lib/lx-plugin-runtime.js 提供的迷你运行时，
 * 用 lx.request 实现 axios、Buffer 等插件依赖。
 *
 * 用法：
 *   node scripts/convert-subscription.mjs "https://music.cwo.cc.cd/api/subscription.json?source=cihedai.json"
 *   node scripts/convert-subscription.mjs ./temp/sub-cihedai.json -o sources/转换/cihedai.js
 *   node scripts/convert-subscription.mjs <订阅> --proxy http://127.0.0.1:10808
 *   node scripts/convert-subscription.mjs <订阅> --split --all
 *
 * 常用参数：
 *   -o, --out <文件|目录>   输出路径；--split 时视为输出目录
 *   --name <名称>           生成的音源名称
 *   --proxy <地址>          下载用的 HTTP 代理
 *   --only <平台>           只转换指定平台，逗号分隔（wy,tx,kw,kg,mg）
 *   --all                   包含洛雪没有内置来源的平台（哔哩哔哩、汽水）
 *   --split                 每个平台单独输出一个音源文件
 *   --no-check              跳过生成后的沙箱初始化自检
 *   --dry-run               只打印转换计划
 */
import fs from 'node:fs/promises'
import path from 'node:path'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const RUNTIME_FILE = path.join(__dirname, 'lib/lx-plugin-runtime.js')
const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36'

/**
 * 平台识别规则。
 * extra=true 表示洛雪没有对应的内置音乐来源（官方仅支持 kw/kg/tx/wy/mg/local），
 * 默认不打包，需要 --all 才会包含。
 */
const PLATFORM_RULES = [
  { id: 'tx', title: 'QQ音乐', fallbackQualities: ['128k', '320k', 'flac'], pattern: /(^|[^a-z])qq([^a-z]|$)|qqmusic|腾讯音乐/i },
  { id: 'wy', title: '网易云音乐', fallbackQualities: ['128k', '320k', 'flac'], pattern: /(^|[^a-z])wy([^a-z]|$)|netease|wangyi|网易/i },
  { id: 'kw', title: '酷我音乐', fallbackQualities: ['128k', '320k', 'flac'], pattern: /(^|[^a-z])kw([^a-z]|$)|kuwo|酷我/i },
  { id: 'kg', title: '酷狗音乐', fallbackQualities: ['128k', '320k', 'flac'], pattern: /(^|[^a-z])kg([^a-z]|$)|kugou|酷狗/i },
  { id: 'mg', title: '咪咕音乐', fallbackQualities: ['128k', '320k', 'flac'], pattern: /(^|[^a-z])mg([^a-z]|$)|migu|咪咕/i },
  { id: 'bili', title: '哔哩哔哩', fallbackQualities: ['128k', '320k'], pattern: /bilibili|b站|哔哩|\/bili\//i, extra: true },
  { id: 'qishui', title: '汽水音乐', fallbackQualities: ['128k', '320k', 'flac'], pattern: /qishui|汽水|soda/i, extra: true },
  { id: 'joox', title: 'JOOX', fallbackQualities: ['128k', '320k'], pattern: /joox/i, extra: true },
  { id: 'xm', title: '喜马拉雅', fallbackQualities: ['128k'], pattern: /xmly|ximalaya|喜马拉雅/i, extra: true },
  { id: 'fanqie', title: '番茄听书', fallbackQualities: ['128k'], pattern: /fanqie|番茄/i, extra: true },
  { id: 'qimao', title: '七猫听书', fallbackQualities: ['128k'], pattern: /qimao|七猫/i, extra: true },
  { id: 'lrts', title: '懒人听书', fallbackQualities: ['128k'], pattern: /lrts|懒人/i, extra: true },
  { id: 'tingyou', title: '听友听书', fallbackQualities: ['128k'], pattern: /tingyou|听友/i, extra: true },
  { id: 'shuyinfm', title: '书音FM', fallbackQualities: ['128k'], pattern: /shuyinfm|书音/i, extra: true },
  { id: 'cctv', title: '央视听音', fallbackQualities: ['128k'], pattern: /cctv|央视/i, extra: true },
  { id: 'baijia', title: '百家讲坛', fallbackQualities: ['128k'], pattern: /baijiajiangtan|百家讲坛/i, extra: true },
  { id: 'xinwen', title: '新闻联播', fallbackQualities: ['128k'], pattern: /xinwenlianbo|新闻联播/i, extra: true },
]

/** 字段适配：把洛雪传给音源的 musicInfo 补齐成插件期望的字段 */
const FIELD_ADAPTERS = {
  wy: (info) => ({ ...info, id: info.id || info.songmid }),
  kw: (info) => ({ ...info, id: info.id || info.songmid }),
  kg: (info) => ({
    ...info,
    id: info.id || info.hash || info.songmid,
    sqhash: info.sqhash || info.hash,
  }),
  mg: (info) => ({ ...info, id: info.id || info.copyrightId || info.songmid }),
}

const args = process.argv.slice(2)
const getArg = (name, fallback = '') => {
  const index = args.indexOf(`--${name}`)
  if (index >= 0 && args[index + 1] && !args[index + 1].startsWith('--')) return args[index + 1]
  const shortIndex = args.indexOf(`-${name}`)
  if (shortIndex >= 0 && args[shortIndex + 1]) return args[shortIndex + 1]
  return fallback
}
const hasFlag = (name) => args.includes(`--${name}`)
const positional = args.filter((arg, index) => {
  if (arg.startsWith('-')) return false
  const prev = args[index - 1]
  return !(prev && (prev.startsWith('--') || prev === '-o'))
})

const input = positional[0]
const outArg = getArg('out', getArg('o', ''))
const customName = getArg('name', '')
const proxy = getArg('proxy', '')
const onlyList = getArg('only', '')
  .split(',')
  .map((item) => item.trim())
  .filter(Boolean)
const includeExtra = hasFlag('all')
const split = hasFlag('split')
const dryRun = hasFlag('dry-run')
const checkAfterBuild = !hasFlag('no-check')
const obfuscateOutput = hasFlag('obfuscate')

const VAR_XOR_KEY = 0x5a

/** 把用户变量（API Key 等）做异或 + Base64，避免明文出现在产物里 */
function encodeVariables(variables) {
  const bytes = Buffer.from(JSON.stringify(variables || {}), 'utf8')
  for (let i = 0; i < bytes.length; i += 1) bytes[i] ^= VAR_XOR_KEY
  return bytes.toString('base64')
}

/** 用 esbuild 压缩并混淆变量名；保留 /*! 开头的脚本信息注释 */
async function obfuscateSource(code) {
  let esbuild
  try {
    esbuild = await import('esbuild')
  } catch (error) {
    throw new Error('混淆需要 esbuild，请先执行：pnpm add -D esbuild')
  }
  const result = await esbuild.transform(code, {
    minify: true,
    target: 'es2020',
    legalComments: 'inline',
    charset: 'utf8',
  })
  return result.code
}

/**
 * 用户变量：部分插件的 API Key 通过 env.getUserVariables() 读取。
 * 支持 --var key=xxx（可重复）或 --vars "key=xxx,cookie=yyy"。
 */
const userVariables = {}
for (let i = 0; i < args.length; i += 1) {
  if (args[i] === '--var' || args[i] === '--vars') {
    const raw = args[i + 1] || ''
    raw
      .split(',')
      .map((pair) => pair.trim())
      .filter(Boolean)
      .forEach((pair) => {
        const index = pair.indexOf('=')
        if (index > 0) userVariables[pair.slice(0, index).trim()] = pair.slice(index + 1).trim()
      })
  }
}

if (!input) {
  console.error(
    [
      '用法：node scripts/convert-subscription.mjs <订阅URL或本地文件> [选项]',
      '',
      '  -o, --out <路径>    输出文件（--split 时为输出目录）',
      '  --name <名称>       音源名称',
      '  --proxy <地址>      下载代理，例如 http://127.0.0.1:10808',
      '  --only <平台>       只转换 wy,tx,kw,kg,mg 中的指定平台',
      '  --all               同时打包哔哩哔哩、汽水等洛雪无内置来源的平台',
      '  --var key=value     注入插件的用户变量（API Key 等），可重复或配合 --vars 使用',
      '  --obfuscate         压缩混淆产物，并隐藏 API Key 明文（需要 dev 依赖 esbuild）',
      '  --split             每个平台单独输出一个文件',
      '  --no-check          跳过生成后的沙箱初始化自检',
      '  --dry-run           只打印计划，不写文件',
    ].join('\n'),
  )
  process.exit(1)
}

function fail(message) {
  console.error(`✖ ${message}`)
  process.exit(1)
}

/** 远程/本地统一读取文本；远程失败或指定代理时回落到 curl */
async function readText(target) {
  const isUrl = /^https?:\/\//i.test(target)
  if (!isUrl) return fs.readFile(path.resolve(target), 'utf8')

  const viaCurl = () => {
    const curlArgs = ['-sSL', '--max-time', '60', '-A', USER_AGENT]
    if (proxy) curlArgs.push('-x', proxy)
    curlArgs.push(target)
    try {
      return execFileSync('curl', curlArgs, {
        encoding: 'utf8',
        maxBuffer: 64 * 1024 * 1024,
        windowsHide: true,
      })
    } catch (error) {
      throw new Error(`下载失败（curl）：${error.message}`)
    }
  }

  if (proxy) return viaCurl()

  try {
    const response = await fetch(target, {
      headers: { 'user-agent': USER_AGENT },
      redirect: 'follow',
      signal: AbortSignal.timeout(40000),
    })
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    return await response.text()
  } catch (error) {
    console.warn(`  · 直连失败（${error.message}），改用 curl 重试`)
    return viaCurl()
  }
}

/** 从订阅 JSON 中提取插件列表 */
function parseSubscription(raw, label) {
  let data
  try {
    data = JSON.parse(raw)
  } catch (error) {
    throw new Error(`${label} 不是合法 JSON：${error.message}`)
  }

  const list = Array.isArray(data)
    ? data
    : Array.isArray(data?.plugins)
      ? data.plugins
      : Array.isArray(data?.sources)
        ? data.sources
        : Array.isArray(data?.data?.plugins)
          ? data.data.plugins
          : null
  if (!list) throw new Error('订阅 JSON 中找不到 plugins / sources 数组')

  return list
    .map((item) => ({
      name: String(item.name || item.title || '').trim(),
      url: String(item.url || item.src || item.sourceUrl || '').trim(),
      version: String(item.version || '').trim(),
    }))
    .filter((item) => item.url)
}

/** 按插件名与地址识别平台 */
function detectPlatform(plugin) {
  const fileName = (() => {
    try {
      const pathname = new URL(plugin.url).pathname
      return pathname.split('/').pop() || ''
    } catch {
      return plugin.url
    }
  })()
  const haystack = `${fileName} ${plugin.name}`
  const matched = PLATFORM_RULES.find((rule) => rule.pattern.test(haystack))
  return matched || null
}

function slugify(value) {
  return String(value)
    .trim()
    .replace(/[\\/:*?"<>|]/g, '')
    .replace(/\s+/g, '-')
    .slice(0, 60) || 'lx-source'
}

/** 订阅地址的默认名称：优先取 source 参数，其次取文件名 */
function defaultName(target) {
  try {
    const url = new URL(target)
    const source = url.searchParams.get('source')
    if (source) return source.replace(/\.json$/i, '')
    const base = url.pathname.split('/').pop() || ''
    return base.replace(/\.json$/i, '') || 'subscription'
  } catch {
    const base = path.basename(target)
    return base.replace(/\.json$/i, '') || 'subscription'
  }
}

function buildMeta({ name, description, version, author, homepage }) {
  const clean = (value) => String(value || '').replace(/[\r\n]+/g, ' ').trim()
  const lines = ['/*!']
  lines.push(` * @name ${clean(name)}`)
  lines.push(` * @description ${clean(description)}`)
  lines.push(` * @version ${clean(version)}`)
  lines.push(` * @author ${clean(author)}`)
  if (homepage) lines.push(` * @homepage ${clean(homepage)}`)
  lines.push(' */')
  return lines.join('\n')
}

/**
 * 生成一个洛雪音源文件的内容。
 * @param {{ id: string, title: string, fallbackQualities: string[], plugin: object }[]} platforms
 */
function buildSourceFile(platforms, options) {
  const { runtime, meta, sourceUrl, variables = {}, protectVariables = false } = options

  const platformEntries = platforms
    .map(
      (item) =>
        `    ${JSON.stringify(item.id)}: { title: ${JSON.stringify(item.title)}, fallbackQualities: ${JSON.stringify(item.fallbackQualities)} },`,
    )
    .join('\n')

  const adapterStatements = platforms
    .map((item) => {
      const adapter = FIELD_ADAPTERS[item.id]
      if (!adapter) return ''
      return `  __ADAPTERS[${JSON.stringify(item.id)}] = ${adapter.toString()};`
    })
    .filter(Boolean)
    .join('\n')

  const pluginBlocks = platforms
    .map(
      (item) => `  __PLUGINS[${JSON.stringify(item.id)}] = __loadPlugin(function (module, exports, require) {
/* ===== ${item.plugin.name || item.title} (${item.plugin.url}) ===== */
${item.plugin.code}
}, ${JSON.stringify(item.title)});`,
    )
    .join('\n\n')

  return `${meta}
// 由 scripts/convert-subscription.mjs 自动生成，请勿手工修改。
// 订阅来源：${sourceUrl || '本地文件'}

(function () {
  'use strict';

  const lx = typeof globalThis !== 'undefined' ? globalThis.lx : null;
  if (!lx) return;
  const EVENT_NAMES = lx.EVENT_NAMES;

  // ===== 用户变量：插件通过 env.getUserVariables() 读取 =====
  function __decodeVars(payload) {
    const binary = typeof atob === 'function' ? atob(payload) : '';
    let text = '';
    for (let i = 0; i < binary.length; i += 1) {
      text += String.fromCharCode(binary.charCodeAt(i) ^ ${VAR_XOR_KEY});
    }
    const bytes = new Uint8Array(text.length);
    for (let i = 0; i < text.length; i += 1) bytes[i] = text.charCodeAt(i);
    return JSON.parse(typeof TextDecoder !== 'undefined' ? new TextDecoder().decode(bytes) : text);
  }
  // ${protectVariables ? '已编码：API Key 等不会以明文出现' : '明文写入，需要时可用 --var key=xxx 生成'}
  const __USER_VARIABLES = ${protectVariables ? `__decodeVars(${JSON.stringify(encodeVariables(variables))})` : JSON.stringify(variables)};
  const env = {
    getUserVariables: function () {
      return __USER_VARIABLES;
    },
  };

${runtime}

  const __require = __createPluginRuntime(lx);

  // 部分插件会在加载时自行注册洛雪事件（例如只接受自己的 source），
  // 这会抢走打包层的 request 回调，所以加载期间临时屏蔽 on/send。
  function __loadPlugin(factory, label) {
    const module = { exports: {} };
    const realLx = globalThis.lx;
    let patched = false;
    try {
      const stub = Object.create(realLx || null);
      stub.on = function () {};
      stub.send = function () {};
      globalThis.lx = stub;
      patched = globalThis.lx === stub;
    } catch (error) {
      patched = false;
    }
    try {
      factory(module, module.exports, __require);
    } catch (error) {
      console.error('[打包音源] ' + label + ' 加载失败：' + (error && error.message ? error.message : error));
    } finally {
      if (patched) globalThis.lx = realLx;
    }
    return module.exports || {};
  }

  const __PLUGINS = {};
  const __ADAPTERS = {};
  const __QUALITY_ORDER = ['128k', '192k', '320k', 'flac', 'flac24bit', 'hires', 'atmos', 'master'];
  const __PLATFORM_DEFS = {
${platformEntries}
  };

${adapterStatements}

${pluginBlocks}

  // 洛雪官方仅接受这四个音质值
  const __LX_QUALITYS = ['128k', '320k', 'flac', 'flac24bit'];

  function __pickQualitys(plugin, fallback) {
    const declared = plugin && Array.isArray(plugin.supportedQualities) ? plugin.supportedQualities : [];
    const usable = declared.filter((quality) => __LX_QUALITYS.indexOf(quality) >= 0);
    if (usable.length) return usable;
    const fallbackUsable = (fallback || []).filter((quality) => __LX_QUALITYS.indexOf(quality) >= 0);
    return fallbackUsable.length ? fallbackUsable : ['128k'];
  }

  function __resolveQuality(plugin, requested) {
    const declared = plugin && Array.isArray(plugin.supportedQualities) ? plugin.supportedQualities : [];
    if (!declared.length || declared.indexOf(requested) >= 0) return requested;
    const index = __QUALITY_ORDER.indexOf(requested);
    if (index < 0) return declared[0];
    for (let i = index; i >= 0; i -= 1) {
      if (declared.indexOf(__QUALITY_ORDER[i]) >= 0) return __QUALITY_ORDER[i];
    }
    for (let i = index + 1; i < __QUALITY_ORDER.length; i += 1) {
      if (declared.indexOf(__QUALITY_ORDER[i]) >= 0) return __QUALITY_ORDER[i];
    }
    return declared[0];
  }

  function __getPlugin(source) {
    const plugin = __PLUGINS[source];
    if (!plugin || typeof plugin.getMediaSource !== 'function') return null;
    return plugin;
  }

  lx.on(EVENT_NAMES.request, function (payload) {
    if (!payload) return Promise.reject(new Error('请求参数为空'));
    const action = payload.action;
    const source = payload.source;
    const info = payload.info || {};

    if (action !== 'musicUrl') {
      return Promise.reject(new Error('不支持的 action：' + action));
    }
    const plugin = __getPlugin(source);
    if (!plugin) return Promise.reject(new Error('不支持的音源平台：' + source));
    if (!info.musicInfo) return Promise.reject(new Error('缺少 musicInfo 参数'));

    const adapter = __ADAPTERS[source];
    const musicInfo = adapter ? adapter(info.musicInfo) : info.musicInfo;
    const quality = __resolveQuality(plugin, info.type || '128k');

    return Promise.resolve()
      .then(function () {
        return plugin.getMediaSource(musicInfo, quality);
      })
      .then(function (result) {
        if (typeof result === 'string' && result) return result;
        if (result && typeof result.url === 'string' && result.url) return result.url;
        throw new Error('插件未返回播放地址');
      });
  });

  const sources = {};
  Object.keys(__PLUGINS).forEach(function (id) {
    const plugin = __getPlugin(id);
    if (!plugin) return;
    const def = __PLATFORM_DEFS[id];
    if (!def) return;
    sources[id] = {
      name: def.title,
      type: 'music',
      actions: ['musicUrl'],
      qualitys: __pickQualitys(plugin, def.fallbackQualities),
    };
  });

  if (!Object.keys(sources).length) {
    lx.send(EVENT_NAMES.inited, { status: false, message: '打包音源没有可用的平台' });
    return;
  }

  lx.send(EVENT_NAMES.inited, {
    status: true,
    openDevTools: false,
    sources: sources,
  });

  if (typeof console !== 'undefined' && console.log) {
    console.log('[打包音源] 已加载 ' + Object.keys(sources).length + ' 个平台：' + Object.keys(sources).join(', '));
  }
})();
`
}

async function main() {
  const subscriptionLabel = /^https?:\/\//i.test(input) ? input : path.resolve(input)
  console.log(`♪ 读取订阅：${subscriptionLabel}`)
  const raw = await readText(input)
  const plugins = parseSubscription(raw, subscriptionLabel)
  if (!plugins.length) fail('订阅中没有可用的插件')

  console.log(`♪ 订阅包含 ${plugins.length} 个插件`)

  const selected = []
  const skipped = []

  for (const plugin of plugins) {
    const platform = detectPlatform(plugin)
    if (!platform) {
      skipped.push(`${plugin.name || plugin.url}（无法识别平台）`)
      continue
    }
    if (platform.extra && !includeExtra) {
      skipped.push(`${plugin.name || platform.title}（洛雪没有内置来源，加 --all 可强制打包）`)
      continue
    }
    if (onlyList.length && !onlyList.includes(platform.id)) {
      skipped.push(`${plugin.name || platform.title}（--only 未选中）`)
      continue
    }
    if (selected.some((item) => item.id === platform.id)) {
      skipped.push(`${plugin.name || platform.title}（平台重复，保留第一个）`)
      continue
    }
    selected.push({ ...platform, plugin })
  }

  if (!selected.length) fail('没有可转换的插件（检查 --only / --all 参数）')

  console.log(`♪ 将转换：${selected.map((item) => item.title).join('、')}`)
  for (const item of skipped) console.log(`  · 跳过 ${item}`)

  if (dryRun) {
    selected.forEach((item) => console.log(`  - ${item.id} ← ${item.plugin.url}`))
    console.log('（--dry-run，不写文件）')
    return
  }

  console.log('♪ 下载插件脚本…')
  for (const item of selected) {
    const code = await readText(item.plugin.url)
    if (!code || code.trim().length < 50) fail(`插件内容为空：${item.plugin.url}`)
    item.plugin.code = code
    console.log(`  · ${item.title} ← ${item.plugin.url}（${(code.length / 1024).toFixed(1)} KB）`)
  }

  const runtime = await fs.readFile(RUNTIME_FILE, 'utf8')
  const name = customName || `${defaultName(input)} 聚合音源`
  const version = new Date().toISOString().slice(0, 10)
  const description = `从插件订阅转换：${selected.map((item) => item.title).join(' / ')}`
  const homepage = /^https?:\/\//i.test(input) ? input : ''

  const baseDir = outArg
    ? split
      ? path.resolve(outArg)
      : path.dirname(path.resolve(outArg))
    : path.join(ROOT, 'sources/转换')
  await fs.mkdir(baseDir, { recursive: true })

  const outputs = []

  if (split) {
    for (const item of selected) {
      const file = path.join(baseDir, `${slugify(name)}-${item.id}.js`)
      let content = buildSourceFile([item], {
        runtime,
        meta: buildMeta({
          name: `${name}（${item.title}）`,
          description: `${item.title}：${description}`,
          version,
          author: 'convert-subscription.mjs',
          homepage: item.plugin.url,
        }),
        sourceUrl: item.plugin.url,
        variables: userVariables,
        protectVariables: obfuscateOutput,
      })
      if (obfuscateOutput) content = await obfuscateSource(content)
      await fs.writeFile(file, content, 'utf8')
      outputs.push({ file, platforms: [item.id] })
    }
  } else {
    const file = outArg ? path.resolve(outArg) : path.join(baseDir, `${slugify(name)}.js`)
    let content = buildSourceFile(selected, {
      runtime,
      meta: buildMeta({
        name,
        description,
        version,
        author: 'convert-subscription.mjs',
        homepage,
      }),
      sourceUrl: homepage || input,
      variables: userVariables,
      protectVariables: obfuscateOutput,
    })
    if (obfuscateOutput) content = await obfuscateSource(content)
    await fs.writeFile(file, content, 'utf8')
    outputs.push({ file, platforms: selected.map((item) => item.id) })
  }

  for (const output of outputs) {
    const stat = await fs.stat(output.file)
    console.log(`✔ 已生成 ${path.relative(ROOT, output.file)}（${(stat.size / 1024).toFixed(1)} KB，${output.platforms.join('/')}）`)
  }

  if (checkAfterBuild) {
    const { loadLxSourceCode } = await import('./lib/lx-sandbox.mjs')
    console.log('♪ 沙箱自检中…')
    for (const output of outputs) {
      const code = await fs.readFile(output.file, 'utf8')
      const loaded = await loadLxSourceCode(code, output.file, { initTimeout: 15000 })
      if (!loaded.initOk) {
        console.error(`✖ ${path.relative(ROOT, output.file)} 初始化失败：${loaded.initError}`)
        continue
      }
      const platforms = Object.keys(loaded.inited?.sources || {})
      console.log(`✔ ${path.relative(ROOT, output.file)} 初始化通过（${platforms.join('/')}）`)
      if (loaded.logs.length) {
        loaded.logs.slice(-3).forEach((line) => console.log(`  · ${line}`))
      }
    }
  }

  console.log('♪ 完成。把生成的文件导入洛雪「自定义音源」即可。')
}

main().catch((error) => {
  console.error(`✖ 转换失败：${error.stack || error.message || error}`)
  process.exit(1)
})
