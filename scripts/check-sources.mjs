/**
 * 洛雪音源可用性检测脚本。
 *
 * 对 sources/ 目录下的每个音源：
 *   1. 在模拟的洛雪环境中加载并初始化
 *   2. 逐个平台请求一首固定测试歌曲的播放地址
 *   3. 校验返回地址是否真的可以拉流
 * 结果写入 public/sources-status.json，供 /sources 页面展示。
 *
 * 用法：
 *   node scripts/check-sources.mjs
 *   node scripts/check-sources.mjs --only fish --concurrency 1
 */
import fs from 'node:fs/promises'
import path from 'node:path'
import crypto from 'node:crypto'
import { fileURLToPath } from 'node:url'
import { loadLxSourceCode, withTimeout, USER_AGENT } from './lib/lx-sandbox.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')

// 音源脚本内部可能抛出未处理的异步异常（例如上游域名解析失败），
// 单个音源的异常不应终止整轮检测。
process.on('unhandledRejection', (reason) => {
  console.warn(`[警告] 未处理的异步异常：${trimError(reason)}`)
})
process.on('uncaughtException', (error) => {
  console.warn(`[警告] 未捕获异常：${trimError(error)}`)
})

const args = process.argv.slice(2)
const getArg = (name, fallback) => {
  const i = args.indexOf(`--${name}`)
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback
}
const hasFlag = (name) => args.includes(`--${name}`)

const SOURCE_DIR = path.resolve(ROOT, getArg('dir', 'sources'))
const REMOTE_FILE = path.resolve(ROOT, getArg('remote', 'sources/remote.json'))
const OUT_FILE = path.resolve(ROOT, getArg('out', 'public/sources-status.json'))
const DATA_FILE = path.resolve(ROOT, getArg('data-out', 'src/data/sources-status.json'))
const CONCURRENCY = Math.max(1, Number(getArg('concurrency', '2')) || 2)
const PLATFORM_TIMEOUT = Math.max(5000, Number(getArg('platform-timeout', '20000')) || 20000)
const INIT_TIMEOUT = Math.max(5000, Number(getArg('init-timeout', '12000')) || 12000)
const VERIFY_STREAM = !hasFlag('no-verify')
const ONLY = getArg('only', '')
const INTERVAL_HOURS = 4
const HISTORY_LIMIT = 42 // 7 天 × 每天 6 次

/** 平台显示名 */
const PLATFORM_NAMES = {
  wy: '网易云',
  tx: 'QQ音乐',
  kw: '酷我',
  kg: '酷狗',
  mg: '咪咕',
  qs: '汽水',
  qsvip: 'QQ SVIP',
  bili: 'B 站',
  ytb: 'YouTube',
  xm: '喜马拉雅',
  local: '本地',
}

/**
 * 固定测试歌曲。每平台准备 1-2 首，任一拿到可用地址即视为该平台正常。
 * 歌曲 ID 于 2026-10-20 通过各平台公开搜索接口确认。
 */
const TEST_SONGS = {
  wy: [
    { songmid: 1357375695, id: 1357375695, name: '海阔天空', singer: 'Beyond', albumName: '乐与怒', interval: '05:25', source: 'wy' },
    { songmid: 347230, id: 347230, name: '海阔天空', singer: 'Beyond', albumName: '乐与怒', interval: '05:25', source: 'wy' },
  ],
  tx: [
    { songmid: '001yS0N33yPm1B', strMediaMid: '002MX8Ea4e5RDS', songId: '001yS0N33yPm1B', name: '海阔天空', singer: 'BEYOND', interval: '05:25', source: 'tx' },
    { songmid: '002rZjwv4ddzKt', strMediaMid: '002thQK83lEc2Q', songId: '002rZjwv4ddzKt', name: '海阔天空', singer: '信乐团', interval: '04:29', source: 'tx' },
  ],
  kw: [
    { songmid: 321946135, id: 321946135, hash: 'MUSIC_321946135', name: '海阔天空', singer: 'G.E.M.邓紫棋', interval: '04:23', source: 'kw' },
  ],
  kg: [
    { hash: 'C41E80A18D1448FA47086372999C7F43', FileHash: 'C41E80A18D1448FA47086372999C7F43', songmid: 3261014, id: 3261014, name: '海阔天空', singer: 'BEYOND', interval: '05:25', source: 'kg' },
    { hash: 'E5C40A31C3C16BA461F650035734C123', FileHash: 'E5C40A31C3C16BA461F650035734C123', songmid: 27359949, id: 27359949, name: '海阔天空', singer: 'BEYOND', interval: '05:25', source: 'kg' },
  ],
  mg: [
    { songmid: '6005752DXKE', copyrightId: '6005752DXKE', contentId: '600913000009337537', albumId: '1133556323', name: '海阔天空', singer: 'Beyond', interval: '05:25', source: 'mg' },
    { songmid: '1135162566', id: '1135162566', copyrightId: '6005752DXKE', albumId: '1133556323', name: '海阔天空', singer: 'Beyond', interval: '05:25', source: 'mg' },
  ],
}

const QUALITY_PRIORITY = ['128k', '320k', '192k', 'flac', 'flac24bit', 'hires', 'atmos', 'master']
const CATEGORY_ORDER = { 优质: 0, 一般: 1, 在线: 2 }

function parseMeta(code) {
  const head = code.slice(0, 8000)
  const get = (key) => {
    const match = head.match(new RegExp(`@${key}[ \\t]+([^\\r\\n*]+)`))
    return match ? match[1].trim() : null
  }
  return {
    name: get('name'),
    version: get('version'),
    author: get('author'),
    description: get('description'),
    homepage: get('homepage'),
    expire: get('expire'),
    support: (get('support') || '')
      .split(/[\s,，|/]+/)
      .map((item) => item.trim())
      .filter(Boolean),
  }
}

function pickQuality(sourceInfo) {
  const declared = Array.isArray(sourceInfo?.qualitys) ? sourceInfo.qualitys : []
  return QUALITY_PRIORITY.find((q) => declared.includes(q)) || declared[0] || '128k'
}

function cleanMusicInfo(song) {
  return Object.fromEntries(
    Object.entries(song).filter(([, value]) => value !== '' && value !== null && value !== undefined),
  )
}

async function verifyAudioUrl(url) {
  if (!/^https?:\/\//i.test(url)) return false
  try {
    const res = await fetch(url, {
      headers: { 'user-agent': USER_AGENT, range: 'bytes=0-2047' },
      redirect: 'follow',
      signal: AbortSignal.timeout(12000),
    })
    const contentType = res.headers.get('content-type') || ''
    try {
      await res.body?.cancel()
    } catch {
      /* 忽略取消流的异常 */
    }
    return (res.status === 200 || res.status === 206) && !contentType.includes('text/html')
  } catch {
    return false
  }
}

function urlHost(url) {
  try {
    const parsed = new URL(url)
    const pathname = parsed.pathname.length > 1 ? parsed.pathname.slice(0, 48) : ''
    return `${parsed.host}${pathname}${parsed.pathname.length > 48 ? '…' : ''}`
  } catch {
    return null
  }
}

function trimError(error) {
  const text = String((error && error.message) || error || '未知错误').replace(/\s+/g, ' ').trim()
  return text.length > 240 ? `${text.slice(0, 240)}…` : text
}

async function testPlatform(handler, sourceKey, quality, timeout) {
  const candidates = TEST_SONGS[sourceKey]
  if (!candidates || !candidates.length) {
    return { tested: false, ok: false, ms: null, error: null, urlHost: null }
  }

  let lastError = null
  let totalMs = 0

  for (const song of candidates) {
    const started = Date.now()
    try {
      const result = await withTimeout(
        Promise.resolve(
          handler({
            source: sourceKey,
            action: 'musicUrl',
            info: { type: quality, musicInfo: cleanMusicInfo(song) },
          }),
        ),
        timeout,
        `请求超时（${Math.round(timeout / 1000)} 秒）`,
      )
      const url = typeof result === 'string' ? result : result?.url
      if (!url || typeof url !== 'string') {
        lastError = '音源未返回播放地址'
        totalMs += Date.now() - started
        continue
      }
      const streamOk = VERIFY_STREAM ? await verifyAudioUrl(url) : true
      totalMs += Date.now() - started
      if (!streamOk) {
        lastError = '返回的播放地址无法拉流'
        continue
      }
      return { tested: true, ok: true, ms: totalMs, error: null, urlHost: urlHost(url) }
    } catch (error) {
      lastError = trimError(error)
      totalMs += Date.now() - started
    }
  }

  return { tested: true, ok: false, ms: totalMs, error: lastError || '测试失败', urlHost: null }
}

/** 下载在线音源脚本，直链失败时回退镜像 */
async function fetchRemoteSource(entry) {
  const urls = [entry.url, entry.mirror].filter(Boolean)
  let lastError = null

  for (const url of urls) {
    try {
      const res = await fetch(url, {
        headers: {
          'user-agent': USER_AGENT,
          accept: 'text/javascript,application/javascript,*/*',
        },
        redirect: 'follow',
        signal: AbortSignal.timeout(20000),
      })
      if (!res.ok) {
        lastError = `HTTP ${res.status}`
        continue
      }
      const text = await res.text()
      if (!text || text.trim().length < 50) {
        lastError = '返回内容为空'
        continue
      }
      return { code: text, url }
    } catch (error) {
      lastError = trimError(error)
    }
  }

  throw new Error(`在线音源下载失败：${lastError || '未知错误'}`)
}

async function checkOne(job) {
  const isRemote = job.type === 'remote'
  const relPath = isRemote ? job.entry.url : path.relative(SOURCE_DIR, job.file).split(path.sep).join('/')
  const category = isRemote
    ? job.entry.category || '在线'
    : relPath.includes('/')
      ? relPath.split('/')[0]
      : '未分类'
  const title = isRemote ? job.entry.title || job.entry.id : path.basename(job.file, '.js')
  const id = isRemote
    ? `remote-${job.entry.id}`
    : crypto.createHash('sha1').update(relPath).digest('hex').slice(0, 10)

  const startedAt = Date.now()
  let code = null
  let sourceUrl = isRemote ? job.entry.url : null
  let downloadError = null

  try {
    if (isRemote) {
      const remote = await fetchRemoteSource(job.entry)
      code = remote.code
      sourceUrl = remote.url
    } else {
      code = await fs.readFile(job.file, 'utf8')
    }
  } catch (error) {
    downloadError = trimError(error)
  }

  const meta = code ? parseMeta(code) : {}

  const record = {
    id,
    title,
    name: meta.name || title,
    category,
    file: relPath,
    sourceUrl: isRemote ? sourceUrl : null,
    originUrl: isRemote ? job.entry.url : null,
    remote: isRemote,
    version: meta.version || null,
    author: meta.author || null,
    description: meta.description || null,
    homepage: meta.homepage || (isRemote ? job.entry.homepage || null : null),
    expire: meta.expire || null,
    status: 'unavailable',
    initOk: false,
    initError: null,
    platforms: [],
    stats: { ok: 0, tested: 0, total: 0 },
    checkedAt: new Date().toISOString(),
    durationMs: 0,
  }

  if (downloadError) {
    record.initError = downloadError
    record.durationMs = Date.now() - startedAt
    return record
  }

  let loaded
  try {
    loaded = await loadLxSourceCode(code, sourceUrl || job.file, { initTimeout: INIT_TIMEOUT })
  } catch (error) {
    loaded = { initOk: false, initError: trimError(error), inited: null, requestHandler: null }
  }

  record.initOk = loaded.initOk
  record.initError = loaded.initError ? trimError(loaded.initError) : null

  const declared = new Set(meta.support)
  const initedSources = loaded.inited?.sources && typeof loaded.inited.sources === 'object' ? loaded.inited.sources : null
  const sourceKeys = initedSources ? Object.keys(initedSources) : [...declared]

  if (!record.initOk) {
    record.platforms = sourceKeys.map((key) => ({
      key,
      name: PLATFORM_NAMES[key] || key,
      declared: true,
      tested: false,
      ok: false,
      ms: null,
      error: null,
      urlHost: null,
    }))
    record.stats.total = record.platforms.length
    record.status = 'unavailable'
    record.durationMs = Date.now() - startedAt
    return record
  }

  if (typeof loaded.requestHandler !== 'function') {
    record.initOk = false
    record.initError = '音源未注册 request 处理器'
    record.status = 'unavailable'
    record.platforms = sourceKeys.map((key) => ({
      key,
      name: PLATFORM_NAMES[key] || key,
      declared: true,
      tested: false,
      ok: false,
      ms: null,
      error: null,
      urlHost: null,
    }))
    record.stats.total = record.platforms.length
    record.durationMs = Date.now() - startedAt
    return record
  }

  const platformResults = await Promise.all(
    sourceKeys.map(async (key) => {
      const quality = pickQuality(initedSources?.[key])
      const result = await testPlatform(loaded.requestHandler, key, quality, PLATFORM_TIMEOUT)
      return {
        key,
        name: PLATFORM_NAMES[key] || key,
        declared: true,
        tested: result.tested,
        ok: result.ok,
        ms: result.ms,
        error: result.error,
        urlHost: result.urlHost,
        quality,
      }
    }),
  )

  record.platforms = platformResults
  record.stats.total = platformResults.length
  record.stats.tested = platformResults.filter((p) => p.tested).length
  record.stats.ok = platformResults.filter((p) => p.ok).length

  if (record.stats.tested === 0) record.status = 'untested'
  else if (record.stats.ok === 0) record.status = 'unavailable'
  else if (record.stats.ok === record.stats.tested) record.status = 'available'
  else record.status = 'partial'

  record.durationMs = Date.now() - startedAt
  return record
}

async function walk(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true })
  const files = []
  for (const entry of entries) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) files.push(...(await walk(full)))
    else if (entry.isFile() && entry.name.endsWith('.js')) files.push(full)
  }
  return files
}

async function runPool(items, limit, worker) {
  const results = new Array(items.length)
  let cursor = 0
  const runners = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (true) {
      const index = cursor++
      if (index >= items.length) return
      results[index] = await worker(items[index], index)
    }
  })
  await Promise.all(runners)
  return results
}

async function readRemoteEntries() {
  try {
    const raw = await fs.readFile(REMOTE_FILE, 'utf8')
    const data = JSON.parse(raw)
    const list = Array.isArray(data) ? data : data.sources
    if (!Array.isArray(list)) {
      console.warn(`在线音源清单格式不正确：${path.relative(ROOT, REMOTE_FILE)}`)
      return []
    }
    return list
      .filter((entry) => entry && typeof entry.url === 'string' && entry.url.trim())
      .map((entry, index) => ({
        ...entry,
        id: entry.id || crypto.createHash('sha1').update(entry.url).digest('hex').slice(0, 10),
        title: entry.title || entry.id || `在线音源 ${index + 1}`,
        category: entry.category || '在线',
      }))
  } catch (error) {
    if (error.code !== 'ENOENT') console.warn(`读取在线音源清单失败：${trimError(error)}`)
    return []
  }
}

async function readPrevious() {
  try {
    const raw = await fs.readFile(OUT_FILE, 'utf8')
    const data = JSON.parse(raw)
    return new Map((data.sources || []).map((item) => [item.id, item]))
  } catch {
    return new Map()
  }
}

async function main() {
  const startedAt = Date.now()
  let files = await walk(SOURCE_DIR).catch(() => [])
  let remoteEntries = await readRemoteEntries()

  if (ONLY) {
    const keyword = ONLY.toLowerCase()
    files = files.filter((file) => file.toLowerCase().includes(keyword))
    remoteEntries = remoteEntries.filter((entry) =>
      `${entry.id} ${entry.title} ${entry.url}`.toLowerCase().includes(keyword),
    )
  }

  files.sort()
  const jobs = [
    ...files.map((file) => ({ type: 'local', file })),
    ...remoteEntries.map((entry) => ({ type: 'remote', entry })),
  ]

  if (!jobs.length) {
    console.error(`未找到任何音源（本地目录 ${SOURCE_DIR}，在线清单 ${REMOTE_FILE}）`)
    process.exit(1)
  }

  console.log(
    `开始检测 ${jobs.length} 个音源（本地 ${files.length} + 在线 ${remoteEntries.length}，` +
      `并发 ${CONCURRENCY}，单平台超时 ${PLATFORM_TIMEOUT}ms）…`,
  )

  const previous = await readPrevious()
  const checkedAt = new Date().toISOString()
  let finished = 0

  const records = await runPool(jobs, CONCURRENCY, async (job) => {
    let record
    try {
      record = await checkOne(job)
    } catch (error) {
      const isRemote = job.type === 'remote'
      const relPath = isRemote ? job.entry.url : path.relative(SOURCE_DIR, job.file).split(path.sep).join('/')
      const fallbackTitle = isRemote ? job.entry.title || job.entry.id : path.basename(job.file, '.js')
      record = {
        id: isRemote
          ? `remote-${job.entry.id}`
          : crypto.createHash('sha1').update(relPath).digest('hex').slice(0, 10),
        title: fallbackTitle,
        name: fallbackTitle,
        category: isRemote ? job.entry.category || '在线' : relPath.split('/')[0] || '未分类',
        file: relPath,
        sourceUrl: isRemote ? job.entry.url : null,
        originUrl: isRemote ? job.entry.url : null,
        remote: isRemote,
        status: 'unavailable',
        initOk: false,
        initError: trimError(error),
        platforms: [],
        stats: { ok: 0, tested: 0, total: 0 },
        checkedAt,
        durationMs: 0,
      }
    }

    const history = previous.get(record.id)?.history || []
    record.history = [
      ...history,
      { at: checkedAt, status: record.status, ok: record.stats.ok, tested: record.stats.tested },
    ].slice(-HISTORY_LIMIT)

    finished += 1
    const flag = { available: '✅', partial: '🟡', unavailable: '❌', untested: '⚪' }[record.status] || '⚪'
    const detail = record.platforms
      .filter((p) => p.tested)
      .map((p) => `${p.key}:${p.ok ? 'ok' : 'fail'}`)
      .join(' ')
    console.log(
      `[${String(finished).padStart(2)}/${jobs.length}] ${flag} ${record.category}/${record.title} ` +
        `(${record.stats.ok}/${record.stats.tested}) ${detail}${record.initError ? ` | ${record.initError}` : ''}`,
    )
    return record
  })

  records.sort(
    (a, b) =>
      (CATEGORY_ORDER[a.category] ?? 9) - (CATEGORY_ORDER[b.category] ?? 9) ||
      a.title.localeCompare(b.title, 'zh-CN'),
  )

  const summary = {
    total: records.length,
    available: records.filter((r) => r.status === 'available').length,
    partial: records.filter((r) => r.status === 'partial').length,
    unavailable: records.filter((r) => r.status === 'unavailable').length,
    untested: records.filter((r) => r.status === 'untested').length,
    platformsOk: records.reduce((sum, r) => sum + r.stats.ok, 0),
    platformsTested: records.reduce((sum, r) => sum + r.stats.tested, 0),
  }

  const payload = {
    schemaVersion: 1,
    generatedAt: checkedAt,
    nextCheckAt: new Date(Date.now() + INTERVAL_HOURS * 3600 * 1000).toISOString(),
    intervalHours: INTERVAL_HOURS,
    runner: process.env.GITHUB_ACTIONS ? 'github-actions' : 'local',
    durationMs: Date.now() - startedAt,
    summary,
    sources: records,
  }

  if (hasFlag('dry')) {
    console.log(JSON.stringify(payload, null, 2))
    return
  }

  const serialized = `${JSON.stringify(payload, null, 2)}\n`
  for (const target of [OUT_FILE, DATA_FILE]) {
    await fs.mkdir(path.dirname(target), { recursive: true })
    await fs.writeFile(target, serialized, 'utf8')
  }

  console.log(
    `\n检测完成：共 ${summary.total} 个音源，可用 ${summary.available}，部分可用 ${summary.partial}，` +
      `不可用 ${summary.unavailable}，未检测 ${summary.untested}。` +
      `平台通过 ${summary.platformsOk}/${summary.platformsTested}。`,
  )
  console.log(
    `结果已写入 ${path.relative(ROOT, OUT_FILE)} 与 ${path.relative(ROOT, DATA_FILE)}` +
      `（耗时 ${(payload.durationMs / 1000).toFixed(1)} 秒）`,
  )
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('检测脚本异常退出：', error)
    process.exit(1)
  })
