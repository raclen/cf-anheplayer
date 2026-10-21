/* ------------------------------------------------------------------
 * 迷你运行时：为 BakaMusic / CCMusic 风格的 CommonJS 插件提供垫片。
 *
 * 这些插件原本运行在自带 axios/buffer/crypto-js 等依赖的宿主里，
 * 洛雪（LX Music）的沙箱只提供 globalThis.lx，因此这里用 lx.request
 * 实现一个最小可用的模块系统，覆盖插件「取播放地址」路径所需的 API。
 *
 * 注意：本文件会被 scripts/convert-subscription.mjs 原样嵌入生成产物，
 * 因此它只是一段普通脚本（定义函数），不能出现 import / export。
 * ------------------------------------------------------------------ */
function __createPluginRuntime(lx) {
  'use strict'

  const lxUtils = (lx && lx.utils) || {}
  const lxRequest = lx && typeof lx.request === 'function' ? lx.request : null
  const lxCrypto = lxUtils.crypto || null

  /* ================= 编码与字节工具 ================= */

  function normalizeEncoding(encoding) {
    const name = String(encoding || 'utf8').toLowerCase().replace(/[-_]/g, '')
    if (name === 'utf8' || name === 'utf') return 'utf8'
    if (name === 'ucs2' || name === 'utf16le' || name === 'utf16') return 'utf16le'
    if (name === 'latin1' || name === 'binary') return 'latin1'
    if (name === 'base64') return 'base64'
    if (name === 'hex') return 'hex'
    return 'utf8'
  }

  function utf8Encode(input) {
    const str = String(input)
    if (typeof TextEncoder !== 'undefined') return new TextEncoder().encode(str)
    const out = []
    for (let i = 0; i < str.length; i += 1) {
      let code = str.charCodeAt(i)
      if (code < 0x80) {
        out.push(code)
      } else if (code < 0x800) {
        out.push(0xc0 | (code >> 6), 0x80 | (code & 0x3f))
      } else if (code >= 0xd800 && code <= 0xdbff && i + 1 < str.length) {
        const low = str.charCodeAt((i += 1))
        const point = 0x10000 + ((code - 0xd800) << 10) + (low - 0xdc00)
        out.push(0xf0 | (point >> 18), 0x80 | ((point >> 12) & 0x3f), 0x80 | ((point >> 6) & 0x3f), 0x80 | (point & 0x3f))
      } else {
        out.push(0xe0 | (code >> 12), 0x80 | ((code >> 6) & 0x3f), 0x80 | (code & 0x3f))
      }
    }
    return Uint8Array.from(out)
  }

  function utf8Decode(bytes) {
    if (typeof TextDecoder !== 'undefined') return new TextDecoder('utf-8').decode(bytes)
    let out = ''
    for (let i = 0; i < bytes.length; i += 1) {
      const byte = bytes[i]
      if (byte < 0x80) out += String.fromCharCode(byte)
      else if (byte < 0xe0) out += String.fromCharCode(((byte & 0x1f) << 6) | (bytes[(i += 1)] & 0x3f))
      else if (byte < 0xf0) {
        out += String.fromCharCode(((byte & 0x0f) << 12) | ((bytes[(i += 1)] & 0x3f) << 6) | (bytes[(i += 1)] & 0x3f))
      } else {
        const point =
          ((byte & 0x07) << 18) |
          ((bytes[(i += 1)] & 0x3f) << 12) |
          ((bytes[(i += 1)] & 0x3f) << 6) |
          (bytes[(i += 1)] & 0x3f)
        out += String.fromCodePoint(point)
      }
    }
    return out
  }

  function latin1Encode(input) {
    const str = String(input)
    const out = new Uint8Array(str.length)
    for (let i = 0; i < str.length; i += 1) out[i] = str.charCodeAt(i) & 0xff
    return out
  }

  function latin1Decode(bytes) {
    let out = ''
    for (let i = 0; i < bytes.length; i += 0x8000) {
      out += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000))
    }
    return out
  }

  function utf16Encode(input) {
    const str = String(input)
    const out = new Uint8Array(str.length * 2)
    for (let i = 0; i < str.length; i += 1) {
      const code = str.charCodeAt(i)
      out[i * 2] = code & 0xff
      out[i * 2 + 1] = code >> 8
    }
    return out
  }

  function utf16Decode(bytes) {
    const length = Math.floor(bytes.length / 2)
    let out = ''
    for (let i = 0; i < length; i += 1) out += String.fromCharCode(bytes[i * 2] | (bytes[i * 2 + 1] << 8))
    return out
  }

  const BASE64_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'

  function base64Encode(bytes) {
    if (typeof btoa === 'function') {
      let binary = ''
      for (let i = 0; i < bytes.length; i += 0x8000) {
        binary += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000))
      }
      return btoa(binary)
    }
    let out = ''
    for (let i = 0; i < bytes.length; i += 3) {
      const a = bytes[i]
      const b = bytes[i + 1]
      const c = bytes[i + 2]
      const triple = (a << 16) | ((b || 0) << 8) | (c || 0)
      out += BASE64_CHARS[(triple >> 18) & 0x3f] + BASE64_CHARS[(triple >> 12) & 0x3f]
      out += i + 1 < bytes.length ? BASE64_CHARS[(triple >> 6) & 0x3f] : '='
      out += i + 2 < bytes.length ? BASE64_CHARS[triple & 0x3f] : '='
    }
    return out
  }

  function base64Decode(input) {
    const text = String(input || '').replace(/[^A-Za-z0-9+/=]/g, '')
    if (typeof atob === 'function') {
      try {
        return latin1Encode(atob(text))
      } catch (error) {
        /* 非法 base64 交给下面的手写实现兜底 */
      }
    }
    const out = []
    let buffer = 0
    let bits = 0
    for (let i = 0; i < text.length; i += 1) {
      const ch = text[i]
      if (ch === '=') break
      const value = BASE64_CHARS.indexOf(ch)
      if (value < 0) continue
      buffer = (buffer << 6) | value
      bits += 6
      if (bits >= 8) {
        bits -= 8
        out.push((buffer >> bits) & 0xff)
      }
    }
    return Uint8Array.from(out)
  }

  function hexEncode(bytes) {
    let out = ''
    for (let i = 0; i < bytes.length; i += 1) out += (bytes[i] < 16 ? '0' : '') + bytes[i].toString(16)
    return out
  }

  function hexDecode(input) {
    const text = String(input || '')
    const length = Math.floor(text.length / 2)
    const out = new Uint8Array(length)
    for (let i = 0; i < length; i += 1) out[i] = parseInt(text.substr(i * 2, 2), 16) || 0
    return out
  }

  function toBytes(value) {
    if (value == null) return new Uint8Array(0)
    if (typeof value === 'string') return utf8Encode(value)
    if (value instanceof ArrayBuffer) return new Uint8Array(value)
    if (value && value.__bytes) return value.__bytes
    if (value instanceof Uint8Array) return value
    if (Array.isArray(value)) return Uint8Array.from(value)
    return utf8Encode(String(value))
  }

  /* ================= Buffer 垫片 ================= */

  class Buf extends Uint8Array {
    toString(encoding, start, end) {
      const name = normalizeEncoding(encoding)
      const from = start === undefined ? 0 : Math.max(0, Math.floor(start))
      const to = end === undefined ? this.length : Math.min(this.length, Math.floor(end))
      const view = this.subarray(from, to)
      if (name === 'hex') return hexEncode(view)
      if (name === 'base64') return base64Encode(view)
      if (name === 'latin1') return latin1Decode(view)
      if (name === 'utf16le') return utf16Decode(view)
      return utf8Decode(view)
    }

    toJSON() {
      return { type: 'Buffer', data: Array.from(this) }
    }

    equals(other) {
      const target = toBytes(other)
      if (target.length !== this.length) return false
      for (let i = 0; i < this.length; i += 1) if (this[i] !== target[i]) return false
      return true
    }
  }

  Buf.from = function from(value, encoding) {
    if (typeof value === 'string') {
      const name = normalizeEncoding(encoding)
      if (name === 'hex') return new Buf(hexDecode(value))
      if (name === 'base64') return new Buf(base64Decode(value))
      if (name === 'latin1') return new Buf(latin1Encode(value))
      if (name === 'utf16le') return new Buf(utf16Encode(value))
      return new Buf(utf8Encode(value))
    }
    if (value instanceof ArrayBuffer) return new Buf(new Uint8Array(value))
    if (value && value.buffer instanceof ArrayBuffer) {
      const length = value.byteLength !== undefined ? value.byteLength : value.length
      return new Buf(new Uint8Array(value.buffer, value.byteOffset || 0, length))
    }
    if (Array.isArray(value)) return new Buf(Uint8Array.from(value))
    if (typeof value === 'number') return Buf.alloc(value)
    return new Buf(0)
  }

  Buf.alloc = function alloc(size, fill) {
    const buffer = new Buf(Math.max(0, Math.floor(size) || 0))
    if (fill !== undefined && fill !== 0) buffer.fill(typeof fill === 'string' ? fill.charCodeAt(0) : fill)
    return buffer
  }

  Buf.concat = function concat(list) {
    const chunks = (list || []).map(toBytes)
    const total = chunks.reduce((sum, chunk) => sum + chunk.length, 0)
    const out = new Buf(total)
    let offset = 0
    chunks.forEach((chunk) => {
      out.set(chunk, offset)
      offset += chunk.length
    })
    return out
  }

  Buf.isBuffer = (value) => value instanceof Buf
  Buf.byteLength = (value) => toBytes(value).length

  /* ================= 查询串 ================= */

  function stringifyQuery(object) {
    const parts = []
    const encode = (value) => encodeURIComponent(value === undefined || value === null ? '' : value)
    const walk = (prefix, value) => {
      if (value === undefined || value === null) return
      if (Array.isArray(value)) {
        value.forEach((item) => walk(prefix, item))
      } else if (typeof value === 'object') {
        Object.keys(value).forEach((key) => walk(prefix ? prefix + '[' + key + ']' : key, value[key]))
      } else {
        parts.push(prefix + '=' + encode(value))
      }
    }
    Object.keys(object || {}).forEach((key) => walk(key, object[key]))
    return parts.join('&')
  }

  function parseQuery(input) {
    const result = {}
    String(input || '')
      .replace(/^\?/, '')
      .split('&')
      .forEach((pair) => {
        if (!pair) return
        const index = pair.indexOf('=')
        const key = decodeURIComponent((index < 0 ? pair : pair.slice(0, index)).replace(/\+/g, ' '))
        const value = index < 0 ? '' : decodeURIComponent(pair.slice(index + 1).replace(/\+/g, ' '))
        result[key] = value
      })
    return result
  }

  /* ================= axios 垫片 ================= */

  function createHttpError(message, config, response) {
    const error = new Error(message)
    error.config = config
    error.response = response || null
    error.isAxiosError = true
    if (response) {
      error.code = 'ERR_BAD_RESPONSE'
      error.status = response.status
    } else {
      error.code = 'ERR_NETWORK'
    }
    return error
  }

  function parseMaybeJson(body) {
    if (typeof body !== 'string') return body
    const text = body.trim()
    if (!text) return body
    if (text[0] === '{' || text[0] === '[' || text[0] === '"') {
      try {
        return JSON.parse(text)
      } catch (error) {
        return body
      }
    }
    return body
  }

  function toArrayBuffer(body) {
    if (body instanceof ArrayBuffer) return body
    if (body instanceof Uint8Array) return body.buffer.slice(body.byteOffset, body.byteOffset + body.byteLength)
    return toBytes(body).buffer.slice(0)
  }

  function axiosRequest(config) {
    const options = typeof config === 'string' ? { url: config } : Object.assign({}, config || {})
    return new Promise((resolve, reject) => {
      const method = String(options.method || 'GET').toUpperCase()
      let url = String(options.url || '')
      const params = options.params
      if (params) {
        const query = params instanceof URLSearchParams ? params.toString() : stringifyQuery(params)
        if (query) url += (url.indexOf('?') >= 0 ? '&' : '?') + query
      }

      const headers = Object.assign({}, options.headers || {})
      let body = options.data
      if (body != null && typeof body === 'object' && !(body instanceof Uint8Array) && !(body instanceof ArrayBuffer) && !(body instanceof URLSearchParams)) {
        body = JSON.stringify(body)
        if (!headers['content-type'] && !headers['Content-Type']) headers['content-type'] = 'application/json'
      } else if (typeof URLSearchParams !== 'undefined' && body instanceof URLSearchParams) {
        body = body.toString()
        if (!headers['content-type'] && !headers['Content-Type']) headers['content-type'] = 'application/x-www-form-urlencoded'
      }

      const timeout = Number(options.timeout) > 0 ? Number(options.timeout) : 20000
      const responseType = String(options.responseType || 'json').toLowerCase()
      const wantsBinary = responseType === 'arraybuffer' || responseType === 'blob' || responseType === 'buffer'
      const validateStatus =
        typeof options.validateStatus === 'function'
          ? options.validateStatus
          : (status) => status >= 200 && status < 300

      let settled = false
      const finish = (error, response) => {
        if (settled) return
        settled = true
        if (error) {
          reject(error)
          return
        }
        const status = response.status
        const payload = { data: response.data, status: status, statusText: '', headers: response.headers, config: options, request: {} }
        if (validateStatus(status)) resolve(payload)
        else reject(createHttpError('Request failed with status code ' + status, options, payload))
      }

      const buildData = (raw) => {
        if (wantsBinary) return toArrayBuffer(raw)
        if (responseType === 'text') return typeof raw === 'string' ? raw : String(raw == null ? '' : raw)
        return parseMaybeJson(raw)
      }

      const sendViaLx = () => {
        if (!lxRequest) {
          finish(createHttpError('当前环境不支持 HTTP 请求', options, null))
          return
        }
        const requestOptions = { method: method, headers: headers, timeout: timeout }
        if (body != null && method !== 'GET' && method !== 'HEAD') requestOptions.body = body
        // 部分洛雪实现支持 binary 选项；不支持时会忽略并返回文本。
        if (wantsBinary) requestOptions.binary = true
        try {
          lxRequest(url, requestOptions, (error, response) => {
            if (error) {
              finish(createHttpError(String((error && error.message) || error), options, null))
              return
            }
            finish(null, {
              data: buildData(response && response.body),
              status: (response && (response.statusCode || response.status)) || 0,
              headers: (response && response.headers) || {},
            })
          })
        } catch (error) {
          finish(createHttpError(String((error && error.message) || error), options, null))
        }
      }

      // lx.request 只能返回文本，二进制（音频签名校验）优先走 fetch。
      if (wantsBinary && typeof fetch === 'function') {
        const init = { method: method, headers: headers }
        if (body != null && method !== 'GET' && method !== 'HEAD') init.body = body
        fetch(url, init)
          .then((response) => response.arrayBuffer().then((buffer) => ({ response: response, buffer: buffer })))
          .then(({ response, buffer }) => {
            finish(null, {
              data: buffer,
              status: response.status,
              headers: Object.fromEntries(response.headers.entries()),
            })
          })
          .catch(() => sendViaLx())
        return
      }

      sendViaLx()
    })
  }

  function createAxios(defaults) {
    const base = Object.assign({}, defaults || {})
    const merge = (config) => Object.assign({}, base, config)
    const axios = (config) => axiosRequest(merge(typeof config === 'string' ? { url: config } : config))
    axios.request = (config) => axiosRequest(merge(config))
    axios.get = (url, config) => axiosRequest(merge(Object.assign({}, config, { url: url, method: 'GET' })))
    axios.delete = (url, config) => axiosRequest(merge(Object.assign({}, config, { url: url, method: 'DELETE' })))
    axios.head = (url, config) => axiosRequest(merge(Object.assign({}, config, { url: url, method: 'HEAD' })))
    axios.options = (url, config) => axiosRequest(merge(Object.assign({}, config, { url: url, method: 'OPTIONS' })))
    axios.post = (url, data, config) => axiosRequest(merge(Object.assign({}, config, { url: url, data: data, method: 'POST' })))
    axios.put = (url, data, config) => axiosRequest(merge(Object.assign({}, config, { url: url, data: data, method: 'PUT' })))
    axios.patch = (url, data, config) => axiosRequest(merge(Object.assign({}, config, { url: url, data: data, method: 'PATCH' })))
    axios.create = (instanceDefaults) => createAxios(Object.assign({}, base, instanceDefaults || {}))
    axios.defaults = base
    axios.interceptors = {
      request: { use: () => 0, eject: () => {} },
      response: { use: () => 0, eject: () => {} },
    }
    axios.isAxiosError = (error) => !!(error && error.isAxiosError)
    axios.isCancel = () => false
    axios.CancelToken = { source: () => ({ token: {}, cancel: () => {} }) }
    axios.all = (list) => Promise.all(list)
    axios.default = axios
    return axios
  }

  /* ================= crypto-js 垫片 ================= */

  const HASH_HEX = { SHA1: sha1Hex, SHA256: sha256Hex }

  function makeWordArray(bytes) {
    const source = toBytes(bytes)
    const words = []
    for (let i = 0; i < source.length; i += 1) words[i >>> 2] |= source[i] << (24 - (i % 4) * 8)
    return {
      __bytes: source,
      words: words,
      sigBytes: source.length,
      toString: (encoder) => {
        const target = encoder || enc.Hex
        return target && typeof target.stringify === 'function' ? target.stringify(makeWordArray(source)) : hexEncode(source)
      },
      concat(other) {
        const right = toBytes(other && other.__bytes ? other.__bytes : other)
        const merged = new Uint8Array(source.length + right.length)
        merged.set(source, 0)
        merged.set(right, source.length)
        return makeWordArray(merged)
      },
      clamp() {},
    }
  }

  function md5Hex(message) {
    // 洛雪自带的 md5 只保证支持字符串，二进制一律走内置实现。
    if (typeof message === 'string' && lxCrypto && typeof lxCrypto.md5 === 'function') {
      try {
        return lxCrypto.md5(message)
      } catch (error) {
        /* 退回内置实现 */
      }
    }
    return md5Impl(toBytes(message))
  }

  function hashToWordArray(hex) {
    return makeWordArray(hexDecode(hex))
  }

  const enc = {
    Utf8: {
      parse: (input) => makeWordArray(utf8Encode(String(input))),
      stringify: (wordArray) => utf8Decode(toBytes(wordArray)),
    },
    Latin1: {
      parse: (input) => makeWordArray(latin1Encode(String(input))),
      stringify: (wordArray) => latin1Decode(toBytes(wordArray)),
    },
    Hex: {
      parse: (input) => makeWordArray(hexDecode(String(input))),
      stringify: (wordArray) => hexEncode(toBytes(wordArray)),
    },
    Base64: {
      parse: (input) => makeWordArray(base64Decode(String(input))),
      stringify: (wordArray) => base64Encode(toBytes(wordArray)),
    },
  }
  enc.Utf16 = enc.Utf16LE = enc.Latin1

  const CryptoJS = {
    MD5: (message) => hashToWordArray(md5Hex(message)),
    SHA1: (message) => hashToWordArray(sha1Hex(toBytes(message))),
    SHA256: (message) => hashToWordArray(sha256Hex(toBytes(message))),
    HmacMD5: (message, key) => hashToWordArray(hmacHex(toBytes(message), toBytes(key), md5Hex)),
    HmacSHA1: (message, key) => hashToWordArray(hmacHex(toBytes(message), toBytes(key), (bytes) => sha1Hex(bytes))),
    HmacSHA256: (message, key) => hashToWordArray(hmacHex(toBytes(message), toBytes(key), (bytes) => sha256Hex(bytes))),
    enc: enc,
    mode: { CBC: 'aes-128-cbc', ECB: 'aes-128-ecb', CFB: 'aes-128-cfb', OFB: 'aes-128-ofb', CTR: 'aes-128-ctr' },
    pad: { Pkcs7: 'pkcs7', NoPadding: 'nopadding', ZeroPadding: 'zeropadding', Iso10126: 'iso10126', AnsiX923: 'ansix923' },
    AES: {
      encrypt(message, key, cfg) {
        const options = cfg || {}
        if (!lxCrypto || typeof lxCrypto.aesEncrypt !== 'function') {
          throw new Error('洛雪环境不支持 AES 加密')
        }
        const mode = typeof options.mode === 'string' ? options.mode : 'aes-128-cbc'
        const keyBytes = new Buf(toBytes(key))
        const ivBytes = options.iv ? new Buf(toBytes(options.iv)) : null
        const cipher = new Buf(lxCrypto.aesEncrypt(new Buf(toBytes(message)), mode, keyBytes, ivBytes))
        return {
          ciphertext: makeWordArray(cipher),
          toString: (encoder) => (encoder && encoder.stringify ? encoder.stringify(makeWordArray(cipher)) : base64Encode(cipher)),
        }
      },
      decrypt(cipherText, key, cfg) {
        throw new Error('洛雪环境中暂不支持 AES 解密')
      },
    },
    lib: { WordArray: { create: () => makeWordArray(new Uint8Array(0)) } },
  }

  /* ================= 哈希实现（无依赖兜底） ================= */

  function md5Impl(bytes) {
    const K = []
    for (let i = 0; i < 64; i += 1) K[i] = Math.floor(Math.abs(Math.sin(i + 1)) * 4294967296) >>> 0
    const S = [7, 12, 17, 22, 5, 9, 14, 20, 4, 11, 16, 23, 6, 10, 15, 21]
    const padded = padMessage(bytes, true)
    let a0 = 0x67452301
    let b0 = 0xefcdab89
    let c0 = 0x98badcfe
    let d0 = 0x10325476
    for (let i = 0; i < padded.length; i += 64) {
      const M = []
      for (let j = 0; j < 16; j += 1) {
        const offset = i + j * 4
        M[j] = padded[offset] | (padded[offset + 1] << 8) | (padded[offset + 2] << 16) | (padded[offset + 3] << 24)
      }
      let A = a0
      let B = b0
      let C = c0
      let D = d0
      for (let j = 0; j < 64; j += 1) {
        let F
        let G
        if (j < 16) {
          F = (B & C) | (~B & D)
          G = j
        } else if (j < 32) {
          F = (D & B) | (~D & C)
          G = (5 * j + 1) % 16
        } else if (j < 48) {
          F = B ^ C ^ D
          G = (3 * j + 5) % 16
        } else {
          F = C ^ (B | ~D)
          G = (7 * j) % 16
        }
        const temp = D
        D = C
        C = B
        const sum = (A + F + K[j] + M[G]) >>> 0
        const shift = S[(j >>> 4) * 4 + (j % 4)]
        B = (B + ((sum << shift) | (sum >>> (32 - shift)))) >>> 0
        A = temp
      }
      a0 = (a0 + A) >>> 0
      b0 = (b0 + B) >>> 0
      c0 = (c0 + C) >>> 0
      d0 = (d0 + D) >>> 0
    }
    const out = new Uint8Array(16)
    ;[a0, b0, c0, d0].forEach((word, index) => {
      out[index * 4] = word & 0xff
      out[index * 4 + 1] = (word >>> 8) & 0xff
      out[index * 4 + 2] = (word >>> 16) & 0xff
      out[index * 4 + 3] = (word >>> 24) & 0xff
    })
    return hexEncode(out)
  }

  function sha1Hex(bytes) {
    const padded = padMessage(bytes, false)
    let h0 = 0x67452301
    let h1 = 0xefcdab89
    let h2 = 0x98badcfe
    let h3 = 0x10325476
    let h4 = 0xc3d2e1f0
    const words = new Array(80)
    for (let i = 0; i < padded.length; i += 64) {
      for (let j = 0; j < 16; j += 1) {
        const offset = i + j * 4
        words[j] = ((padded[offset] << 24) | (padded[offset + 1] << 16) | (padded[offset + 2] << 8) | padded[offset + 3]) >>> 0
      }
      for (let j = 16; j < 80; j += 1) {
        const value = words[j - 3] ^ words[j - 8] ^ words[j - 14] ^ words[j - 16]
        words[j] = ((value << 1) | (value >>> 31)) >>> 0
      }
      let a = h0
      let b = h1
      let c = h2
      let d = h3
      let e = h4
      for (let j = 0; j < 80; j += 1) {
        let f
        let k
        if (j < 20) {
          f = (b & c) | (~b & d)
          k = 0x5a827999
        } else if (j < 40) {
          f = b ^ c ^ d
          k = 0x6ed9eba1
        } else if (j < 60) {
          f = (b & c) | (b & d) | (c & d)
          k = 0x8f1bbcdc
        } else {
          f = b ^ c ^ d
          k = 0xca62c1d6
        }
        const temp = (((a << 5) | (a >>> 27)) + f + e + k + words[j]) >>> 0
        e = d
        d = c
        c = ((b << 30) | (b >>> 2)) >>> 0
        b = a
        a = temp
      }
      h0 = (h0 + a) >>> 0
      h1 = (h1 + b) >>> 0
      h2 = (h2 + c) >>> 0
      h3 = (h3 + d) >>> 0
      h4 = (h4 + e) >>> 0
    }
    return [h0, h1, h2, h3, h4].map(hex32).join('')
  }

  function sha256Hex(bytes) {
    // SHA-256 常量表：前 64 个质数立方根小数部分 × 2^32
    const K = []
    for (let i = 0; i < 64; i += 1) K[i] = (Math.pow(Math.abs(Math.sin(i + 1)), 3) * 4294967296) >>> 0
    const H = [0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19]
    const padded = padMessage(bytes, false)
    const w = new Array(64)
    for (let i = 0; i < padded.length; i += 64) {
      for (let j = 0; j < 16; j += 1) {
        const offset = i + j * 4
        w[j] = ((padded[offset] << 24) | (padded[offset + 1] << 16) | (padded[offset + 2] << 8) | padded[offset + 3]) >>> 0
      }
      for (let j = 16; j < 64; j += 1) {
        const s0 = rotr(w[j - 15], 7) ^ rotr(w[j - 15], 18) ^ (w[j - 15] >>> 3)
        const s1 = rotr(w[j - 2], 17) ^ rotr(w[j - 2], 19) ^ (w[j - 2] >>> 10)
        w[j] = (w[j - 16] + s0 + w[j - 7] + s1) >>> 0
      }
      let a = H[0]
      let b = H[1]
      let c = H[2]
      let d = H[3]
      let e = H[4]
      let f = H[5]
      let g = H[6]
      let h = H[7]
      for (let j = 0; j < 64; j += 1) {
        const S1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25)
        const ch = (e & f) ^ (~e & g)
        const temp1 = (h + S1 + ch + K[j] + w[j]) >>> 0
        const S0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22)
        const maj = (a & b) ^ (a & c) ^ (b & c)
        const temp2 = (S0 + maj) >>> 0
        h = g
        g = f
        f = e
        e = (d + temp1) >>> 0
        d = c
        c = b
        b = a
        a = (temp1 + temp2) >>> 0
      }
      H[0] = (H[0] + a) >>> 0
      H[1] = (H[1] + b) >>> 0
      H[2] = (H[2] + c) >>> 0
      H[3] = (H[3] + d) >>> 0
      H[4] = (H[4] + e) >>> 0
      H[5] = (H[5] + f) >>> 0
      H[6] = (H[6] + g) >>> 0
      H[7] = (H[7] + h) >>> 0
    }
    return H.map(hex32).join('')
  }

  function hmacHex(message, key, hashFn) {
    let keyBytes = key
    if (keyBytes.length > 64) keyBytes = hexDecode(hashFn(keyBytes))
    const paddedKey = new Uint8Array(64)
    paddedKey.set(keyBytes)
    const inner = new Uint8Array(64 + message.length)
    for (let i = 0; i < 64; i += 1) inner[i] = paddedKey[i] ^ 0x36
    inner.set(message, 64)
    const innerHash = hexDecode(hashFn(inner))
    const outer = new Uint8Array(64 + innerHash.length)
    for (let i = 0; i < 64; i += 1) outer[i] = paddedKey[i] ^ 0x5c
    outer.set(innerHash, 64)
    return hashFn(outer)
  }

  function padMessage(bytes, littleEndian) {
    const length = bytes.length
    const withOne = new Uint8Array(((length + 8) >> 6 << 6) + 64)
    withOne.set(bytes)
    withOne[length] = 0x80
    const bitLength = length * 8
    const tail = withOne.length - 8
    if (littleEndian) {
      for (let i = 0; i < 4; i += 1) withOne[tail + i] = (bitLength / Math.pow(2, 8 * i)) & 0xff
    } else {
      const high = Math.floor(bitLength / 4294967296)
      const low = bitLength >>> 0
      withOne[tail] = (high >>> 24) & 0xff
      withOne[tail + 1] = (high >>> 16) & 0xff
      withOne[tail + 2] = (high >>> 8) & 0xff
      withOne[tail + 3] = high & 0xff
      withOne[tail + 4] = (low >>> 24) & 0xff
      withOne[tail + 5] = (low >>> 16) & 0xff
      withOne[tail + 6] = (low >>> 8) & 0xff
      withOne[tail + 7] = low & 0xff
    }
    return withOne
  }

  function rotr(value, bits) {
    return ((value >>> bits) | (value << (32 - bits))) >>> 0
  }

  function hex32(value) {
    return ('00000000' + (value >>> 0).toString(16)).slice(-8)
  }

  /* ================= he / qs ================= */

  const HTML_ENTITIES = {
    amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', copy: '©', reg: '®',
    trade: '™', hellip: '…', mdash: '—', ndash: '–', lsquo: '‘', rsquo: '’',
    ldquo: '“', rdquo: '”', middot: '·', bull: '•', deg: '°', times: '×',
    divide: '÷', laquo: '«', raquo: '»', yen: '¥', euro: '€', pound: '£',
    cent: '¢', sect: '§', para: '¶', plusmn: '±', frac12: '½', frac14: '¼',
    frac34: '¾', sup2: '²', sup3: '³', micro: 'µ', ensp: ' ', emsp: ' ',
    thinsp: ' ', zwnj: '‌', zwj: '‍', shy: '­', iexcl: '¡', iquest: '¿',
  }

  function codePointToString(code) {
    if (!code || code > 0x10ffff || (code >= 0xd800 && code <= 0xdfff)) return '�'
    try {
      return String.fromCodePoint(code)
    } catch (error) {
      return '�'
    }
  }

  const he = {
    decode(input) {
      if (input == null) return ''
      return String(input).replace(/&(#x?[0-9a-fA-F]+|[a-zA-Z][a-zA-Z0-9]{1,31});?/g, (match, body) => {
        if (body[0] === '#') {
          const isHex = body[1] === 'x' || body[1] === 'X'
          const code = parseInt(isHex ? body.slice(2) : body.slice(1), isHex ? 16 : 10)
          return codePointToString(code)
        }
        const key = body.toLowerCase()
        return Object.prototype.hasOwnProperty.call(HTML_ENTITIES, key) ? HTML_ENTITIES[key] : match
      })
    },
    encode(input) {
      return String(input == null ? '' : input)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;')
    },
    escape(input) {
      return he.encode(input)
    },
    version: '1.2.0',
  }

  const qs = {
    stringify: (object, options) => stringifyQuery(object),
    parse: (input) => parseQuery(input),
    escape: (value) => encodeURIComponent(value),
    unescape: (value) => decodeURIComponent(value),
  }

  /* ================= 未提供能力的占位模块 ================= */

  function createStubModule(name) {
    const message = '打包音源：当前环境未提供 ' + name + ' 的完整实现'
    const stub = function () {
      throw new Error(message)
    }
    return new Proxy(stub, {
      get(target, key) {
        if (key === 'default') return stub
        if (key === '__esModule') return true
        if (typeof key === 'symbol' || key === 'then') return undefined
        return function () {
          throw new Error(message + '（' + String(key) + '）')
        }
      },
      apply() {
        throw new Error(message)
      },
    })
  }

  /* ================= 模块注册表 ================= */

  const cryptoModule = {
    createHash(algorithm) {
      const method = String(algorithm).toUpperCase()
      const parts = []
      return {
        update(value) {
          parts.push(toBytes(value))
          return this
        },
        digest(encoding) {
          const merged = Buf.concat(parts)
          const hex =
            method === 'SHA256' ? sha256Hex(merged) : method === 'SHA1' ? sha1Hex(merged) : md5Hex(merged)
          return normalizeEncoding(encoding) === 'base64' ? base64Encode(hexDecode(hex)) : hex
        },
      }
    },
    randomBytes(size) {
      const sizeValue = Math.max(0, Number(size) || 0)
      if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
        const bytes = new Uint8Array(sizeValue)
        crypto.getRandomValues(bytes)
        return new Buf(bytes)
      }
      const bytes = new Uint8Array(sizeValue)
      for (let i = 0; i < sizeValue; i += 1) bytes[i] = Math.floor(Math.random() * 256)
      return new Buf(bytes)
    },
    createHmac(algorithm, key) {
      const method = String(algorithm).toUpperCase()
      const parts = []
      return {
        update(value) {
          parts.push(toBytes(value))
          return this
        },
        digest(encoding) {
          const merged = Buf.concat(parts)
          const hex = hmacHex(merged, toBytes(key), method === 'SHA256' ? (bytes) => sha256Hex(bytes) : md5Hex)
          return normalizeEncoding(encoding) === 'hex' ? hex : base64Encode(hexDecode(hex))
        },
      }
    },
    webcrypto: typeof crypto !== 'undefined' ? crypto : undefined,
  }

  const moduleCache = {}
  const moduleFactories = {
    axios: () => createAxios(),
    buffer: () => ({ Buffer: Buf, SlowBuffer: Buf, INSPECT_MAX_BYTES: 50, kMaxLength: 2147483647 }),
    crypto: () => cryptoModule,
    'crypto-js': () => CryptoJS,
    he: () => he,
    qs: () => qs,
  }

  function requireModule(name) {
    const key = String(name || '').replace(/^node:/, '')
    if (Object.prototype.hasOwnProperty.call(moduleCache, key)) return moduleCache[key]
    const baseName = key.split('/')[0]
    const factory = moduleFactories[key] || moduleFactories[baseName]
    const value = factory ? factory() : createStubModule(key)
    moduleCache[key] = value
    return value
  }

  return requireModule
}
