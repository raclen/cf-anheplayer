/**
 * 洛雪音乐自定义音源运行环境模拟。
 *
 * 洛雪（LX Music）自定义源通过 globalThis.lx 提供的 API 与服务端通信：
 *   - on(EVENT_NAMES.request, handler) 注册取流等处理器
 *   - send(EVENT_NAMES.inited, { sources }) 上报初始化结果
 *   - request(url, options, callback) 发起 HTTP 请求
 *
 * 本文件只实现检测所需的最小 API 子集，供 scripts/check-sources.mjs 使用。
 */
import vm from 'node:vm'
import crypto from 'node:crypto'
import zlib from 'node:zlib'
import { promisify } from 'node:util'
import { AsyncLocalStorage } from 'node:async_hooks'

export const EVENT_NAMES = {
  request: 'request',
  inited: 'inited',
  updateAlert: 'updateAlert',
  log: 'log',
  downloadProgress: 'downloadProgress',
}

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36'

/**
 * 从音源头部注释解析 @name / @version 等元信息。
 * 洛雪会把解析结果放在 lx.currentScriptInfo 中，部分音源初始化时会直接读取（如 .version、.rawScript）。
 */
function parseScriptInfo(code) {
  const head = code.slice(0, 8000)
  const get = (key) => {
    const match = head.match(new RegExp(`@${key}[ \\t]+([^\\r\\n*]+)`))
    return match ? match[1].trim() : ''
  }
  return {
    name: get('name'),
    version: get('version'),
    author: get('author'),
    description: get('description'),
    homepage: get('homepage'),
    rawScript: code,
  }
}

/** 兼容洛雪回调签名 (err, resp, body) 的 HTTP 请求实现 */
function createRequest(onResponse) {
  return function request(url, options = {}, callback) {
    const cb = typeof options === 'function' ? options : callback
    const opts = typeof options === 'function' ? {} : options || {}
    if (typeof cb !== 'function') return { abort() {} }

    const controller = new AbortController()
    const timeout = Number(opts.timeout) > 0 ? Math.min(Number(opts.timeout), 60000) : 60000
    const timer = setTimeout(() => controller.abort(), timeout)
    timer.unref?.()

    // HTTP 请求头不区分大小写；直接展开对象会把 User-Agent 与默认值合并，
    // 这会改变 Flower / Grass 等音源声明的 lx-music 客户端标识。
    const headers = new Headers(opts.headers || {})
    if (!headers.has('user-agent')) headers.set('user-agent', USER_AGENT)
    const init = {
      method: (opts.method || 'GET').toUpperCase(),
      headers,
      redirect: opts.follow_max === 0 ? 'manual' : 'follow',
      signal: controller.signal,
    }

    if (opts.form) {
      init.body = new URLSearchParams(opts.form).toString()
      if (!headers.has('content-type')) headers.set('content-type', 'application/x-www-form-urlencoded')
    } else if (opts.formData) {
      const fd = new FormData()
      for (const [k, v] of Object.entries(opts.formData)) fd.append(k, v)
      init.body = fd
    } else if (opts.body != null) {
      init.body =
        typeof opts.body === 'string' || Buffer.isBuffer(opts.body)
          ? opts.body
          : JSON.stringify(opts.body)
      if (typeof opts.body === 'object' && !Buffer.isBuffer(opts.body)) {
        if (!headers.has('content-type')) headers.set('content-type', 'application/json')
      }
    }

    const endpoint = new URL(url)
    // 只记录域名，避免把路径、query 或请求头中的凭据写入公开结果。
    const requestHost = endpoint.host
    fetch(url, init)
      .then(async (res) => {
        const buf = Buffer.from(await res.arrayBuffer())
        const text = buf.toString('utf8')
        let body = text
        try {
          body = JSON.parse(text)
        } catch {
          /* 非 JSON 响应保持字符串；原始二进制通过 resp.raw 提供 */
        }
        const resp = {
          statusCode: res.status,
          statusMessage: res.statusText,
          headers: Object.fromEntries(res.headers.entries()),
          body,
          raw: buf,
          bytes: buf.length,
        }
        onResponse?.({ host: requestHost, statusCode: res.status })
        cb(null, resp, body)
      })
      .catch((err) => {
        onResponse?.({ host: requestHost, error: err.cause?.code || err.cause?.message || err.message })
        cb(err, null, null)
      })
      .finally(() => clearTimeout(timer))

    // 洛雪返回可直接调用的取消函数；保留 abort 属性兼容已有音源。
    const cancel = () => controller.abort()
    cancel.abort = cancel
    return cancel
  }
}

/** 洛雪内置工具，覆盖音源常用的 buffer / crypto 方法 */
const utils = {
  buffer: {
    from: (...args) => Buffer.from(...args),
    bufToString: (buf, format) => Buffer.from(buf).toString(format || 'utf8'),
  },
  crypto: {
    md5: (value) => crypto.createHash('md5').update(value).digest('hex'),
    randomBytes: (size) => crypto.randomBytes(size),
    // 与洛雪官方 helper 保持一致：AES 使用默认 PKCS#7 padding，
    // RSA 左补零到 128 字节后进行无 padding 加密，而非 PKCS#1 分块。
    aesEncrypt: (buffer, mode = 'aes-128-cbc', key, iv) => {
      const cipher = crypto.createCipheriv(mode, key, iv || null)
      return Buffer.concat([cipher.update(Buffer.from(buffer)), cipher.final()])
    },
    rsaEncrypt: (buffer, key) => {
      const data = Buffer.from(buffer)
      return crypto.publicEncrypt(
        { key, padding: crypto.constants.RSA_NO_PADDING },
        Buffer.concat([Buffer.alloc(128 - data.length), data]),
      )
    },
  },
  zlib: {
    inflate: promisify(zlib.inflate),
    deflate: promisify(zlib.deflate),
  },
}

/**
 * 在隔离上下文中加载并初始化一个音源文件。
 * @param {string} file 音源脚本绝对路径
 * @param {{ initTimeout?: number, scriptTimeout?: number }} options
 */
export async function loadLxSource(file, options = {}) {
  const { readFile } = await import('node:fs/promises')
  const code = await readFile(file, 'utf8')
  return loadLxSourceCode(code, file, options)
}

/**
 * 在隔离上下文中加载并初始化一段音源代码（用于在线音源）。
 * @param {string} code 音源脚本内容
 * @param {string} filename 仅用于错误堆栈的展示名
 * @param {{ initTimeout?: number, scriptTimeout?: number }} options
 */
export async function loadLxSourceCode(code, filename = 'remote-source.js', options = {}) {
  const { initTimeout = 12000, scriptTimeout = 15000 } = options
  const handlers = new Map()
  const logs = []
  const requestContext = new AsyncLocalStorage()
  let inited = null
  let resolveInited
  const initedPromise = new Promise((resolve) => (resolveInited = resolve))

  function on(name, handler) {
    if (!handlers.has(name)) handlers.set(name, [])
    handlers.get(name).push(handler)
    return Promise.resolve()
  }

  function send(name, data) {
    if (name === EVENT_NAMES.inited) {
      inited = data
      resolveInited(data)
    } else if (name === EVENT_NAMES.log) {
      logs.push(data)
      if (logs.length > 50) logs.shift()
    }
    return Promise.resolve()
  }

  const lx = {
    version: '2.0.0',
    env: 'desktop',
    EVENT_NAMES,
    request: createRequest((result) => requestContext.getStore()?.push(result)),
    on,
    send,
    utils,
    currentScriptInfo: parseScriptInfo(code),
  }

  const noop = () => {}
  const consoleStub = {
    log: (...args) => logs.push(args.map(String).join(' ')),
    info: noop,
    warn: noop,
    error: noop,
    debug: noop,
    group: noop,
    groupEnd: noop,
    table: noop,
    time: noop,
    timeEnd: noop,
    trace: noop,
  }

  const sandbox = {
    lx,
    console: consoleStub,
    setTimeout,
    clearTimeout,
    setInterval,
    clearInterval,
    queueMicrotask,
    Buffer,
    URL,
    URLSearchParams,
    TextEncoder,
    TextDecoder,
    AbortController,
    AbortSignal,
    fetch,
    atob: globalThis.atob,
    btoa: globalThis.btoa,
    process: { env: {}, platform: process.platform, version: process.version },
  }
  sandbox.globalThis = sandbox
  sandbox.window = sandbox
  sandbox.self = sandbox

  let syncError = null
  try {
    vm.runInNewContext(code, sandbox, { filename, timeout: scriptTimeout })
  } catch (err) {
    syncError = err
  }

  let initError = null
  if (!syncError) {
    const timer = new Promise((resolve) => {
      const t = setTimeout(() => resolve(null), initTimeout)
      t.unref?.()
    })
    const result = await Promise.race([initedPromise, timer])
    if (!result) initError = `初始化超时（${Math.round(initTimeout / 1000)} 秒）`
    else if (result.status === false) initError = result.message || '音源自检返回 status=false'
    else if (!result.sources || !Object.keys(result.sources).length) initError = '音源未声明任何平台'
  } else {
    initError = String(syncError.message || syncError)
  }

  const handler = (handlers.get(EVENT_NAMES.request) || [])[0]
  const requestHandler = typeof handler === 'function'
    ? (data) => requestContext.run([], async () => {
        try {
          return await handler(data)
        } catch (error) {
          const detail = requestContext.getStore().findLast((item) => item.error || item.statusCode >= 400)
          if (!detail) throw error
          const reason = detail.error || `HTTP ${detail.statusCode}`
          const message = error?.message || '音源请求失败'
          throw new Error(`${message}；${reason}（${detail.host}）`, { cause: error })
        }
      })
    : null

  return {
    inited,
    initOk: !initError,
    initError,
    logs,
    handlers,
    requestHandler,
    sandbox,
  }
}

/** 带超时的 Promise 包装 */
export function withTimeout(promise, ms, message = '请求超时') {
  let timer
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      timer = setTimeout(() => reject(new Error(message)), ms)
      timer.unref?.()
    }),
  ]).finally(() => clearTimeout(timer))
}

export { USER_AGENT }
