/*!
 * @name 合并音源
 * @description 从插件订阅转换：汽水音乐 / 哔哩哔哩 / 咪咕音乐
 * @version 2026-10-21
 * @author convert-subscription.mjs
 */
// 由 scripts/convert-subscription.mjs 自动生成，请勿手工修改。
// 订阅来源：temp/merge-subscription.json

(function () {
  'use strict';

  const lx = typeof globalThis !== 'undefined' ? globalThis.lx : null;
  if (!lx) return;
  const EVENT_NAMES = lx.EVENT_NAMES;

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


  // 部分插件通过 env.getUserVariables() 读取 API Key 等用户变量
  const __USER_VARIABLES = {};
  const env = {
    getUserVariables: function () {
      return __USER_VARIABLES;
    },
  };

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
    "qishui": { title: "汽水音乐", fallbackQualities: ["128k","320k","flac"] },
    "bili": { title: "哔哩哔哩", fallbackQualities: ["128k","320k"] },
    "mg": { title: "咪咕音乐", fallbackQualities: ["128k","320k","flac"] },
  };

  __ADAPTERS["mg"] = (info) => ({ ...info, id: info.id || info.copyrightId || info.songmid });

  __PLUGINS["qishui"] = __loadPlugin(function (module, exports, require) {
/* ===== 汽水音乐 (https://music.cwo.cc.cd/plugins/qishui.js) ===== */
/**
 * 汽水音乐 BakaMusic 插件
 * @author JanYun & Toskysun
 * @version 3.3.0
 * @description 汽水音乐插件：歌词和取流走 PC track_v2，签名经转发。专辑、歌手、歌单、榜单、评论走 PC API。sessionid 支持用户变量自定义
 * @officialGroup BakaMusic官方群：1064805856
 * @janyunGroup 简云官方群：288305439
 * @srcLink https://music.cwo.cc.cd/plugins/qishui.js
 */

"use strict";

Object.defineProperty(exports, "__esModule", {
  "value": true
});

const axios = require("axios");

const PAGE_SIZE = 20;

const QISHUI_PLATFORM_NAME = "汽水音乐";
const DOUYIN_IMAGE_BASE_URL = "https://p3-luna.douyinpic.com/img/";
const DOUYIN_VIDEO_MUSIC_URL = "https://music.douyin.com/qishui/share/ugc_video";

const QISHUI_API_HEADERS = {
  "Accept": "*/*",
  "Content-Type": "application/json; charset=UTF-8",
  "User-Agent": "com.luna.music/100159040 (Linux; U; Android 11; zh_CN; Cronet/TTNetVersion:dd1b0931 2024-06-28 QuicVersion:d299248d 2024-04-09)",
  "X-Argus": "=",
  "x-common-params-v2": "channel=official&aid=386088&device_id=2081836196178571"
};

const QISHUI_PC_API_BASE = "https://api.qishui.com/luna/pc";
const QISHUI_ANDROID_API_BASE = "https://api.qishui.com/luna";

const QISHUI_ANDROID_API_HEADERS = {
  "User-Agent": "com.luna.music/100198030 (Linux; U; Android 15; zh_CN_#Hans; ABR-AL80; Build/V417IR;tt-ok/3.12.13.19)",
  "Accept-Encoding": "gzip",
  "content-type": "application/json; charset=UTF-8"
};

const QISHUI_ANDROID_API_PARAMS = {
  "device_platform": "android",
  "os": "android",
  "ssmix": "a",
  "cdid": "46556f98-1720-4248-83da-62b74b60b46a",
  "channel": "xiaomi_8478_64",
  "aid": "8478",
  "app_name": "luna",
  "version_code": "100198030",
  "version_name": "19.8.0",
  "manifest_version_code": "100198030",
  "update_version_code": "100198030",
  "resolution": "1080*1920",
  "dpi": "480",
  "device_type": "ABR-AL80",
  "device_brand": "HUAWEI",
  "language": "zh",
  "os_api": "35",
  "os_version": "15",
  "ac": "wifi",
  "device_model": "ABR-AL80",
  "save_power": "0",
  "font_size": "1.00",
  "luna_first_launch_apk_type": "normal_apk",
  "diversion_channel_name": "xiaomi_8478_64",
  "is_car_play": "0",
  "battery": "0.99",
  "network_speed": "10156",
  "hybrid_version_code": "100198030",
  "tz_name": "Asia/Shanghai",
  "tz_offset": "28800",
  "luna_register_time": "1784311292",
  "diversion_category_level_two": "Xiaomi%E5%95%86%E5%BA%97-%E8%87%AA%E7%84%B6",
  "package": "com.luna.music",
  "charge": "0",
  "luna_apk_type": "normal_apk",
  "output_device_type": "Phone",
  "volume": "1.00",
  "brightness": "0.08",
  "need_personal_recommend": "1",
  "is_teen_mode": "0",
  "sim_region": "cn",
  "diversion_category_level_one": "%E5%8E%82%E5%95%86%E5%95%86%E5%BA%97-%E8%87%AA%E7%84%B6",
  "android_device_type": "default",
  "iid": "2204957404569386",
  "device_id": "2204957404565290"
};

const QISHUI_XHEADERS_SIGN_URL = "https://211.161.236.45/api/music/soda/sign-pc.php";
const QISHUI_XHEADERS_INSTANCE = "soda-386088-pc";
const QISHUI_XHEADERS_KEY = "xh_9K5EgmaNu-hTx48CwL48wkcLVPtR50U0";

const QISHUI_XHEADERS_NAMES = [
  "x-ss-stub",
  "x-helios",
  "x-medusa"
];

/** 默认 sessionid；过期后可在插件用户变量 sessionid 中覆盖 */
const QISHUI_DEFAULT_SESSION_ID = "1512ef1b523456980d81f3d04a7b7057";

const QISHUI_PC_API_HEADERS = {
  "Accept": "*/*",
  "Content-Type": "application/json; charset=utf-8",
  "Accept-Encoding": "gzip, deflate",
  "User-Agent": "LunaPC/3.8.0(467160162)",
  "x-luna-background-type": "foreground",
  "x-luna-is-background-req": "0",
  "x-luna-is-local-user": "0"
};

const QISHUI_PC_API_PARAMS = {
  "aid": "386088",
  "app_name": "luna_pc",
  "region": "cn",
  "geo_region": "cn",
  "os_region": "cn",
  "sim_region": "",
  "device_id": "2081836196178571",
  "cdid": "",
  "iid": "2081836196182667",
  "version_name": "3.8.0",
  "version_code": "30080000",
  "channel": "official",
  "build_mode": "master",
  "network_carrier": "",
  "ac": "wifi",
  "tz_name": "Asia/Shanghai",
  "resolution": "",
  "device_platform": "windows",
  "device_type": "Windows",
  "os_version": "Windows 11 Pro for Workstations",
  "fp": "2081836196178571"
};

const AUDIO_PLAYBACK_HEADERS = {
  "Accept": "*/*",
  "Accept-Language": "zh-CN,zh;q=0.9",
  "Cache-Control": "no-cache",
  "Pragma": "no-cache",
  "Range": "bytes=0-",
  "Referer": "https://www.douyin.com/",
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/95.0.4638.69 Safari/537.36"
};

const QISHUI_WEB_SHARE_HEADERS = {
  "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "User-Agent": "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)"
};

const QISHUI_WEB_SHARE_URL = "https://music.douyin.com/qishui/share/playlist";

const QISHUI_SEARCH_TYPE_MAP = {
  "music": "track",
  "album": "album",
  "artist": "artist",
  "sheet": "playlist"
};

const QISHUI_QUALITY_TO_BAKA = {
  "medium": "128k",
  "higher": "192k",
  "highest": "320k",
  "lossless": "flac",
  "hi_res": "hires",
  "spatial": "atmos"
};

const BAKA_QUALITY_TO_QISHUI = {
  "128k": "medium",
  "192k": "higher",
  "320k": "highest",
  "flac": "lossless",
  "hires": "hi_res",
  "atmos": "spatial",
  "atmos_plus": "spatial"
};

const QISHUI_QUALITY_FALLBACK_BITRATE = {
  "medium": 128000,
  "higher": 192000,
  "highest": 320000,
  "lossless": 1411000,
  "hi_res": 2304000,
  "spatial": 324000
};

const QISHUI_QUALITY_PRIORITY = ["medium", "higher", "highest", "lossless", "hi_res", "spatial"];

const VIDEO_QUALITY_PICK_ORDER = ["320k", "192k", "128k", "flac", "hires", "atmos", "atmos_plus"];

const QISHUI_NO_LYRIC = "[00:00.000]暂无歌词，请欣赏";

const QISHUI_TOP_LIST_ITEMS = [{
  "id": "7036274230471712007",
  "description": "汽水音乐内每周热度最高的50首歌，每周四更新",
  "coverImg": "https://p3-luna.douyinpic.com/img/tos-cn-i-b829550vbb/d0d8d48461a62748e84689cdf049b19a.png~tplv-b829550vbb-resize:960:960.png",
  "title": "热歌榜"
}, {
  "id": "7060812597884869927",
  "description": "近期发行的热度最高的50首新歌，每周四更新",
  "coverImg": "https://p3-luna.douyinpic.com/img/tos-cn-i-b829550vbb/f12f7eb5b54d0899c7c724df009668a8.png~tplv-b829550vbb-resize:960:960.png",
  "title": "新歌榜"
}, {
  "id": "7061475546400005410",
  "description": "汽水音乐内每周热度最高的50首外文歌曲，每周四更新",
  "coverImg": "https://p3-luna.douyinpic.com/img/tos-cn-i-b829550vbb/33747550ed5499b58feda42a21748637.png~tplv-b829550vbb-resize:960:960.png",
  "title": "欧美榜"
}, {
  "id": "7415959718721494311",
  "description": "抖音音乐人开放平台上传歌曲，综合每周站内热度进行排序展示",
  "coverImg": "https://p3-luna.douyinpic.com/img/tos-cn-v-2774c002/o8FQKiQQBxHWa2hzsBNAgYOX6iEHEAibADAbfB~tplv-b829550vbb-resize:960:960.png",
  "title": "音乐人歌曲榜"
}];

const QISHUI_TOP_LIST_IDS = new Set(QISHUI_TOP_LIST_ITEMS.map(item => String(item.id)));

const QISHUI_FALLBACK_PLAYLISTS = [{
  "id": "7434476168507637799",
  "title": "旅行者必听｜原神全部专辑上线✨",
  "artist": "汽水音乐APP",
  "createUserId": "2331429247649368",
  "description": "汽水音乐公开歌单",
  "artwork": "https://p3-luna.douyinpic.com/img/tos-cn-i-b829550vbb/c2da1ff20dcb4a168117392c7964b6d0~tplv-b829550vbb-crop-center:720:720.jpg",
  "createTime": 1730981418,
  "fee": 0,
  "_bakaSourceType": "playlist"
}];

function isEncryptedPlayback(playInfo) {
  const method = String(playInfo?.EncryptionMethod || "").toLowerCase();
  return Boolean(playInfo?.PlayAuth) || method.includes("cenc");
}

function decodeSpadeValue(ch) {
  const code = Number(ch);
  if (code >= 48 && code <= 57) {
    return code - 48;
  }
  if (code >= 97 && code <= 122) {
    return code - 97 + 10;
  }
  return 0xFF;
}

function popcount32(value) {
  let x = value & 0xFFFFFFFF;
  let count = 0;
  while (x) {
    count += x & 1;
    x >>>= 1;
  }
  return count;
}

function decodeSpadePlayAuth(playAuth) {
  if (!playAuth || typeof playAuth !== "string") {
    return "";
  }

  let raw;
  try {
    raw = Buffer.from(playAuth, "base64");
  } catch {
    return "";
  }

  if (raw.length < 3) {
    return "";
  }

  const pad = (raw[0] ^ raw[1] ^ raw[2]) - 48;
  const dml = raw.length - pad - 2;
  if (pad < 0 || dml <= 1 || raw.length < pad + 2) {
    return "";
  }

  const end = raw.length - pad;
  const source = raw.slice(1, end);
  const candidate = Buffer.from(source);
  const buff = Buffer.concat([Buffer.from([0xfa, 0x55]), source]);

  for (let i = 0; i < source.length; i++) {
    let v = (candidate[i] ^ buff[i]) - popcount32(i) - 21;
    while (v < 0) {
      v += 0xFF;
    }
    candidate[i] = v;
  }

  const skip = decodeSpadeValue(candidate[0]);
  const decoded = candidate.slice(1, 1 + dml - skip);

  return decoded.toString("utf8");
}

function buildDouyinImageUrl(uri, templatePrefix, size = "960:960") {
  return `${DOUYIN_IMAGE_BASE_URL}${uri}~${templatePrefix}-resize:${size}.png`;
}

function buildImageUrlFromCover(urlCover, size = "960:960") {
  if (!urlCover) return "";
  if (typeof urlCover === "string") return urlCover;

  if (urlCover.uri && urlCover.template_prefix) {
    return buildDouyinImageUrl(urlCover.uri, urlCover.template_prefix, size);
  }

  if (Array.isArray(urlCover.urls) && urlCover.urls.length > 0) {
    const firstUrl = urlCover.urls[0];
    if (!urlCover.uri || String(firstUrl).includes(urlCover.uri)) {
      return firstUrl;
    }
    return `${firstUrl}${urlCover.uri}`;
  }

  return "";
}

function buildSingerList(artists = []) {
  return artists.map(artist => {
    const artistInfo = artist?.user_info || artist?.author_info || artist || {};
    return {
      id: artistInfo.id || artist?.id || "",
      name: artistInfo.name || artistInfo.nickname || artist?.name || "",
      avatar: artistInfo.avatar
        || buildImageUrlFromCover(artistInfo.url_avatar, "100:100")
        || buildImageUrlFromCover(artistInfo.medium_avatar_url, "100:100")
        || buildImageUrlFromCover(artistInfo.thumb_avatar_url, "100:100")
        || "",
    };
  }).filter(artist => artist.id || artist.name);
}

function createSearchId() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

let qishuiDevice = null;

function rememberQishuiDevice(device) {
  if (!device || typeof device !== "object") {
    return;
  }
  const next = Object.assign({}, qishuiDevice);
  Object.entries(device).forEach(([key, value]) => {
    if (value == null || value === "") {
      return;
    }
    next[key] = String(value);
  });
  qishuiDevice = next;
}

function qishuiDeviceDrift(params, device) {
  if (!device || typeof device !== "object") {
    return false;
  }
  return Object.entries(device).some(([key, value]) => {
    if (value == null || value === "") {
      return false;
    }
    return String(params[key] ?? "") !== String(value);
  });
}

function getPcApiParams(extraParams = {}) {
  return Object.assign({}, QISHUI_PC_API_PARAMS, qishuiDevice || {}, extraParams);
}

function getQishuiUserVariables() {
  try {
    return (typeof env !== "undefined" && env?.getUserVariables?.()) || {};
  } catch (error) {
    return {};
  }
}

/**
 * 读取用户变量 sessionid（支持纯值或含 sessionid= 的 Cookie 片段）
 * BakaMusic: env.getUserVariables()
 */
function getQishuiSessionId() {
  try {
    const userVariables = getQishuiUserVariables();
    const raw = userVariables.sessionid || "";

    if (raw && typeof raw === "string") {
      const trimmed = raw.trim();
      if (!trimmed) {
        return QISHUI_DEFAULT_SESSION_ID;
      }

      const match = trimmed.match(/(?:^|[;\s])sessionid=([^;]+)/i);
      if (match) {
        return match[1].trim();
      }

      if (!trimmed.includes("=")) {
        return trimmed;
      }
    }
  } catch (error) {
    // env 在非插件宿主环境下可能不存在
  }

  return QISHUI_DEFAULT_SESSION_ID;
}

function getPcApiHeaders() {
  return Object.assign({}, QISHUI_PC_API_HEADERS, {
    "Cookie": `sessionid=${getQishuiSessionId()}`
  });
}

function normalizeSignedXHeaders(headers) {
  const normalized = {};
  Object.entries(headers || {}).forEach(([name, value]) => {
    normalized[String(name).toLowerCase()] = String(value);
  });

  const missing = QISHUI_XHEADERS_NAMES.filter(name => !normalized[name]);
  if (missing.length > 0) {
    throw new Error("X-Headers 签名结果不完整");
  }

  return {
    "X-Helios": normalized["x-helios"],
    "X-SS-STUB": normalized["x-ss-stub"],
    "X-Medusa": normalized["x-medusa"]
  };
}

async function signQishuiPcRequest(url, bodyBytes, khronos) {
  const response = await axios.default.post(
    QISHUI_XHEADERS_SIGN_URL,
    {
      "instance": QISHUI_XHEADERS_INSTANCE,
      "url": url,
      "body_b64": bodyBytes.toString("base64"),
      "options": {
        "khronos": Number(khronos)
      }
    },
    {
      "headers": {
        "Content-Type": "application/json",
        "Accept": "application/json",
        "Authorization": `Bearer ${QISHUI_XHEADERS_KEY}`
      },
      "timeout": 15000,
      "maxRedirects": 5
    }
  );

  const payload = response.data?.headers ? response.data : (response.data?.data || {});
  if (!payload.headers) {
    const error = new Error(response.data?.msg || response.data?.message || "X-Headers 签名服务返回异常");
    error.qishuiSignRetryable = true;
    throw error;
  }

  return {
    "headers": normalizeSignedXHeaders(payload.headers),
    "device": payload.device && typeof payload.device === "object" ? payload.device : null
  };
}

async function prepareSignedQishuiPcRequest(endpoint, bodyBytes) {
  const khronos = Math.floor(Date.now() / 1000);
  let requestUrl = axios.default.getUri({
    "url": `${QISHUI_PC_API_BASE}/${endpoint}`,
    "params": getPcApiParams()
  });
  let signed = await signQishuiPcRequest(requestUrl, bodyBytes, khronos);
  if (qishuiDeviceDrift(getPcApiParams(), signed.device)) {
    rememberQishuiDevice(signed.device);
    requestUrl = axios.default.getUri({
      "url": `${QISHUI_PC_API_BASE}/${endpoint}`,
      "params": getPcApiParams()
    });
    signed = await signQishuiPcRequest(requestUrl, bodyBytes, khronos);
  }
  rememberQishuiDevice(signed.device);
  return {
    "requestUrl": requestUrl,
    "headers": Object.assign({}, getPcApiHeaders(), {
      "x-khronos": String(khronos)
    }, signed.headers)
  };
}

function parseVideoModelToPlayInfoList(videoModel) {
  if (!videoModel) {
    return [];
  }

  let videoModelObj = videoModel;
  if (typeof videoModel === "string") {
    try {
      videoModelObj = JSON.parse(videoModel);
    } catch (error) {
      console.error(`[汽水音乐] video_model 解析失败: ${error.message}`);
      return [];
    }
  }

  if (!Array.isArray(videoModelObj?.video_list)) {
    return [];
  }

  return videoModelObj.video_list.map(video => ({
    "Bitrate": video.video_meta?.bitrate || 0,
    "FileHash": video.video_meta?.file_hash || "",
    "Size": video.video_meta?.size || 0,
    "Height": 0,
    "Width": 0,
    "Format": video.video_meta?.vtype || "",
    "Codec": video.video_meta?.codec_type || "",
    "Logo": "",
    "Definition": "",
    "Quality": video.video_meta?.quality || "",
    "Duration": video.video_duration || 0,
    "EncryptionMethod": video.encrypt_info?.encryption_method || "",
    "PlayAuth": video.encrypt_info?.spade_a || "",
    "PlayAuthID": video.encrypt_info?.kid || "",
    "MainPlayUrl": video.main_url || "",
    "BackupPlayUrl": video.backup_url || "",
    "UrlExpire": video.url_expire || 0,
    "FileID": video.video_meta?.file_id || "",
    "P2pVerifyURL": "",
    "PreloadInterval": 60,
    "PreloadMaxStep": 10,
    "PreloadMinStep": 5,
    "PreloadSize": 327680,
    "CheckInfo": ""
  }));
}

function resolveReturnedQuality(playInfo, requestedQuality) {
  const qishuiQuality = playInfo?.Quality;
  if (qishuiQuality === "spatial") {
    return requestedQuality === "atmos_plus" ? "atmos_plus" : "atmos";
  }
  return QISHUI_QUALITY_TO_BAKA[qishuiQuality] || requestedQuality;
}

/** 试听流：video_model 里直接就是 "video_duration": 60（或 30） */
function isFixedPreviewDuration(value) {
  return value === 60 || value === 30 || value === "60" || value === "30";
}

function parseVideoModelObject(videoModel) {
  if (!videoModel) {
    return null;
  }
  if (typeof videoModel === "string") {
    try {
      return JSON.parse(videoModel);
    } catch (error) {
      console.error(`[汽水音乐] video_model 解析失败: ${error.message}`);
      return null;
    }
  }
  return videoModel;
}

/** track_v2 的 video_model 若条目 duration 固定 30/60，说明是试听流 */
function isPreviewVideoModel(videoModel) {
  const videoModelObj = parseVideoModelObject(videoModel);
  const videoList = videoModelObj?.video_list;
  if (!Array.isArray(videoList) || videoList.length === 0) {
    return false;
  }

  return videoList.some(video => isFixedPreviewDuration(video?.video_duration));
}

function normalizePcTrackData(apiData, trackId) {
  const media = Array.isArray(apiData?.media)
    ? (apiData.media.find(item => String(item?.id) === String(trackId)) || apiData.media[0])
    : null;
  const item = Array.isArray(apiData?.items)
    ? (apiData.items.find(entry => String(entry?.id) === String(trackId)) || apiData.items[0])
    : null;
  const wrapper = media?.entity?.track_wrapper || item?.entity?.track_wrapper || {};
  const track = wrapper.track || media?.entity?.track || item?.entity?.track || media?.track || apiData?.track || null;

  return {
    "status_info": apiData?.status_info,
    "track": track,
    "track_player": track?.player_info || wrapper.player_info || media?.track_player || apiData?.track_player || null,
    "lyric": track?.lyric || wrapper.lyric || media?.lyric || apiData?.lyric || null
  };
}

async function fetchPcTrackV2(trackId) {
  const bodyText = JSON.stringify({
    "track_id": String(trackId),
    "media_type": "track",
    "queue_type": "daily_mix",
    "scene_name": "track_reco"
  });
  const bodyBytes = Buffer.from(bodyText, "utf8");
  const signedRequest = await prepareSignedQishuiPcRequest("track_v2", bodyBytes);
  const response = await axios.default.post(
    signedRequest.requestUrl,
    bodyBytes,
    {
      "headers": signedRequest.headers,
      "timeout": 20000,
      "transformRequest": [data => data]
    }
  );

  return normalizePcTrackData(response.data, trackId);
}

/**
 * 优先 PC track_v2；
 * 试听或没有播放列表时回落 SEO url_player_info
 */
async function fetchTrackPlaybackData(trackId) {
  let pcData = null;

  try {
    pcData = await fetchPcTrackV2(trackId);
    const videoModel = pcData?.track_player?.video_model;
    const playInfoList = parseVideoModelToPlayInfoList(videoModel);
    const isPreview = isPreviewVideoModel(videoModel);

    if (playInfoList.length > 0 && !isPreview) {
      console.log(`[汽水音乐] PC track_v2 成功: trackId=${trackId}, qualities=${playInfoList.map(item => item.Quality).join(",")}`);
      return {
        "trackData": pcData,
        "playInfoList": playInfoList,
        "source": "pc_track_v2"
      };
    }

    if (isPreview) {
      console.log(`[汽水音乐] PC track_v2 为试听流(30/60s)，改用 SEO url_player_info: trackId=${trackId}`);
    } else {
      console.warn(`[汽水音乐] PC track_v2 无播放列表, trackId=${trackId}, status=${pcData?.status_info?.status_msg || "unknown"}`);
    }
  } catch (error) {
    console.error(`[汽水音乐] PC track_v2 失败: ${error.message}`);
  }

  const seoResult = await fetchSeoTrackData(trackId);
  return {
    "trackData": pcData || seoResult.seoData,
    "playInfoList": seoResult.playInfoList || [],
    "source": "seo_fallback"
  };
}

function getAndroidApiParams(extraParams = {}, requestTicket = String(Date.now())) {
  return Object.assign({}, QISHUI_ANDROID_API_PARAMS, {
    "_rticket": requestTicket
  }, extraParams);
}

async function qishuiAndroidGet(path, params = {}) {
  const response = await axios.default.get(`${QISHUI_ANDROID_API_BASE}${path}`, {
    "params": getAndroidApiParams(params),
    "headers": QISHUI_ANDROID_API_HEADERS
  });

  return response.data;
}

async function qishuiPcGet(path, params = {}, includeSession = false) {
  const headers = includeSession
    ? Object.assign({}, QISHUI_PC_API_HEADERS, {
      "Cookie": `sessionid=${getQishuiSessionId()}`
    })
    : QISHUI_PC_API_HEADERS;
  const response = await axios.default.get(`${QISHUI_PC_API_BASE}${path}`, {
    "params": getPcApiParams(params),
    "headers": headers
  });

  return response.data;
}

async function qishuiPcPost(path, data = {}, params = {}) {
  const response = await axios.default.post(`${QISHUI_PC_API_BASE}${path}`, data, {
    "params": getPcApiParams(params),
    "headers": QISHUI_PC_API_HEADERS
  });

  return response.data;
}

function getPositiveNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : 0;
}

function normalizeDurationSeconds(duration) {
  const number = getPositiveNumber(duration);
  if (!number) {
    return undefined;
  }
  return Math.floor(number > 10000 ? number / 1000 : number);
}

function getQueryParamFromUrl(url, key) {
  const escapedKey = String(key).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = String(url || "").match(new RegExp(`[?&]${escapedKey}=([^&#]+)`));
  return match ? decodeURIComponent(match[1]) : "";
}

function getVideoUrl(videoOptions = {}) {
  return videoOptions.url || videoOptions.play_url || videoOptions.video_url || videoOptions.main_url || "";
}

function getExplicitVideoBitrate(videoOptions = {}) {
  const bitrateFromField = getPositiveNumber(videoOptions.bitrate || videoOptions.BitRate || videoOptions.br || videoOptions.bt);
  if (bitrateFromField) {
    return bitrateFromField < 10000 ? Math.round(bitrateFromField * 1000) : Math.round(bitrateFromField);
  }

  const bitrateFromUrl = getPositiveNumber(getQueryParamFromUrl(videoOptions.url, "br"))
    || getPositiveNumber(getQueryParamFromUrl(videoOptions.url, "bt"));
  if (bitrateFromUrl) {
    return bitrateFromUrl < 10000 ? Math.round(bitrateFromUrl * 1000) : Math.round(bitrateFromUrl);
  }

  return 0;
}

function getVideoBitrate(videoOptions = {}, fallbackBitrate = 192000) {
  return getExplicitVideoBitrate(videoOptions) || fallbackBitrate;
}

function getVideoResolution(videoOptions = {}) {
  const width = getPositiveNumber(videoOptions.width);
  const height = getPositiveNumber(videoOptions.height);

  if (width && height) {
    return width >= height ? `${height}p` : `${width}x${height}`;
  }
  if (height) {
    return `${height}p`;
  }
  return "";
}

function getVideoDeclaredSize(videoOptions = {}) {
  return getPositiveNumber(videoOptions.size || videoOptions.Size || videoOptions.file_size || videoOptions.FileSize);
}

function resolveVideoQualityKey(bitrate) {
  if (bitrate >= 300000) {
    return "320k";
  }
  if (bitrate >= 160000) {
    return "192k";
  }
  return "128k";
}

function estimateVideoSize(videoOptions = {}, bitrate = 0) {
  const duration = getPositiveNumber(videoOptions.duration || videoOptions.offsetDuration);
  if (!duration || !bitrate) {
    return 0;
  }

  const durationSeconds = duration > 10000 ? duration / 1000 : duration;
  return Math.round(bitrate * durationSeconds / 8);
}

async function getRemoteContentLength(url) {
  if (!url) {
    return 0;
  }

  try {
    const response = await axios.default.head(url, {
      "headers": AUDIO_PLAYBACK_HEADERS,
      "timeout": 15000,
      "validateStatus": status => status >= 200 && status < 400
    });
    return getPositiveNumber(response?.headers?.["content-length"] || response?.headers?.["Content-Length"]);
  } catch (error) {
    return 0;
  }
}

function createVideoQualityEntry(videoOptions = {}, size = 0, fallbackBitrate = 192000) {
  const bitrate = getVideoBitrate(videoOptions, fallbackBitrate);
  const resolvedSize = getPositiveNumber(size)
    || getVideoDeclaredSize(videoOptions)
    || estimateVideoSize(videoOptions, bitrate);

  return {
    "size": resolvedSize,
    "bitrate": bitrate,
    "qishuiQuality": "ugc_video",
    "videoQuality": getVideoResolution(videoOptions),
    "width": getPositiveNumber(videoOptions.width) || undefined,
    "height": getPositiveNumber(videoOptions.height) || undefined,
    "url": videoOptions.url || "",
    "vid": videoOptions.video_id || videoOptions.vid || videoOptions.id || ""
  };
}

async function createVideoQualitiesFromOptions(videoOptions = {}) {
  const declaredSize = getVideoDeclaredSize(videoOptions);
  const size = declaredSize || await getRemoteContentLength(videoOptions.url);
  const entry = createVideoQualityEntry(videoOptions, size);
  return {
    [resolveVideoQualityKey(entry.bitrate)]: entry
  };
}

function createVideoQualitiesFromTrack(track = {}) {
  const url = getVideoUrl(track);
  const hasEstimateInput = !!getPositiveNumber(track.duration || track.offsetDuration);
  if (!url && !getVideoDeclaredSize(track) && !getExplicitVideoBitrate(track) && !hasEstimateInput) {
    return {};
  }

  const entry = createVideoQualityEntry(Object.assign({}, track, {
    "url": url,
    "video_id": track.video_id || track.vid || track.id
  }), 0, 128000);

  return {
    [resolveVideoQualityKey(entry.bitrate)]: entry
  };
}

function pickVideoQualityEntry(qualities = {}, requestedQuality) {
  if (requestedQuality && qualities[requestedQuality]) {
    return {
      "quality": requestedQuality,
      "entry": qualities[requestedQuality]
    };
  }

  for (const quality of VIDEO_QUALITY_PICK_ORDER) {
    if (qualities[quality]) {
      return {
        "quality": quality,
        "entry": qualities[quality]
      };
    }
  }

  const firstQuality = Object.keys(qualities)[0];
  return firstQuality ? {
    "quality": firstQuality,
    "entry": qualities[firstQuality]
  } : null;
}

function isUsableVideoQualityEntry(entry) {
  return !!entry?.url && !!getPositiveNumber(entry.size);
}

function withQishuiPlatform(...items) {
  return Object.assign({}, ...items, {
    "platform": QISHUI_PLATFORM_NAME
  });
}

function createQualitiesFromBitRates(bitRates = []) {
  const qualities = {};

  if (!Array.isArray(bitRates)) {
    return qualities;
  }

  const spatialEntries = [];

  bitRates.forEach(bitRate => {
    const qishuiQuality = bitRate?.quality;
    const bitrate = bitRate.br || QISHUI_QUALITY_FALLBACK_BITRATE[qishuiQuality];

    if (qishuiQuality === "spatial") {
      spatialEntries.push({
        "size": bitRate.size,
        "bitrate": bitrate,
        "qishuiQuality": qishuiQuality
      });
      return;
    }

    const qualityKey = QISHUI_QUALITY_TO_BAKA[qishuiQuality];

    if (!qualityKey) {
      return;
    }

    qualities[qualityKey] = {
      "size": bitRate.size,
      "bitrate": bitrate,
      "qishuiQuality": qishuiQuality
    };
  });

  assignSpatialQualities(qualities, spatialEntries);

  return qualities;
}

function createQualitiesFromPlayInfoList(playInfoList = []) {
  const qualities = {};

  if (!Array.isArray(playInfoList)) {
    return qualities;
  }

  const spatialEntries = [];

  playInfoList.forEach(playInfo => {
    const qishuiQuality = playInfo?.Quality;
    const bitrate = playInfo.Bitrate || QISHUI_QUALITY_FALLBACK_BITRATE[qishuiQuality];

    if (qishuiQuality === "spatial") {
      spatialEntries.push({
        "size": playInfo.Size,
        "bitrate": bitrate,
        "qishuiQuality": qishuiQuality
      });
      return;
    }

    const qualityKey = QISHUI_QUALITY_TO_BAKA[qishuiQuality];

    if (!qualityKey) {
      return;
    }

    qualities[qualityKey] = {
      "size": playInfo.Size,
      "bitrate": bitrate,
      "qishuiQuality": qishuiQuality
    };
  });

  assignSpatialQualities(qualities, spatialEntries);

  return qualities;
}

function getQualityEntryScore(entry) {
  return Number(entry?.bitrate || entry?.Bitrate || entry?.br || 0) * 1000000000
    + Number(entry?.size || entry?.Size || 0);
}

function assignSpatialQualities(qualities, entries) {
  const sortedEntries = entries
    .filter(Boolean)
    .sort((a, b) => getQualityEntryScore(b) - getQualityEntryScore(a));

  if (sortedEntries.length === 0) {
    return;
  }

  if (sortedEntries.length > 1) {
    qualities["atmos_plus"] = sortedEntries[0];
    qualities["atmos"] = sortedEntries[1];
  } else {
    qualities["atmos"] = sortedEntries[0];
  }
}

function normalizeTrack(track) {
  return track?.entity?.track_wrapper?.track
    || track?.entity?.track
    || track?.entity?.video
    || track?.entity?.ugc_video
    || track?.track
    || track;
}

function isVideoTrack(track = {}, rawTrack = track) {
  return !!(
    rawTrack?.entity?.video
    || rawTrack?.entity?.ugc_video
    || rawTrack?.type === "video"
    || rawTrack?.media_type === "video"
    || track.video_id
    || track.ugc_video_id
    || track.type === "ugc_video"
    || track.video_type === "ugc_video"
    || track.media_type === "ugc_video"
    || track.videoName
    || getVideoUrl(track)
  );
}

function normalizeAlbum(album) {
  return album?.entity?.album || album?.album || album;
}

function normalizeArtist(artist) {
  return artist?.entity?.artist || artist?.artist || artist;
}

function normalizePlaylist(playlist) {
  return playlist?.entity?.playlist || playlist?.playlist || playlist;
}

function pickQishuiQuality(musicItem, quality) {
  const exactQuality = musicItem?.qualities?.[quality]?.qishuiQuality;
  if (exactQuality) {
    return exactQuality;
  }

  return BAKA_QUALITY_TO_QISHUI[quality] || "higher";
}

function getBestPlayableInfo(playInfoList, qishuiQuality, bakaQuality) {
  if (!Array.isArray(playInfoList) || playInfoList.length === 0) {
    return null;
  }

  if (qishuiQuality === "spatial") {
    const spatialPlayInfoList = playInfoList
      .filter(item => item?.Quality === "spatial")
      .sort((a, b) => getQualityEntryScore(b) - getQualityEntryScore(a));

    if (spatialPlayInfoList.length > 0) {
      if (bakaQuality === "atmos_plus") {
        return spatialPlayInfoList[0];
      }
      return spatialPlayInfoList.length > 1 ? spatialPlayInfoList[1] : spatialPlayInfoList[0];
    }
  }

  const exact = playInfoList.find(item => item?.Quality === qishuiQuality);
  if (exact) {
    return exact;
  }

  const targetIndex = QISHUI_QUALITY_PRIORITY.indexOf(qishuiQuality);
  if (targetIndex !== -1) {
    for (let index = targetIndex - 1; index >= 0; index--) {
      const fallbackQuality = QISHUI_QUALITY_PRIORITY[index];
      const fallback = playInfoList.find(item => item?.Quality === fallbackQuality);
      if (fallback) {
        return fallback;
      }
    }
  }

  return playInfoList[playInfoList.length - 1];
}

function escapeQrcText(text) {
  return String(text || "").replace(/\(/g, "（").replace(/\)/g, "）");
}

function parseQishuiKrcToQrc(krcContent) {
  if (!krcContent || typeof krcContent !== "string") {
    return null;
  }

  const qrcLines = [];
  const lines = krcContent.replace(/\r/g, "").split("\n");
  const wordPattern = /<(\d+),(\d+),\d+>([^<]*)/g;

  for (const line of lines) {
    const lineMatch = line.trim().match(/^\[(\d+),(\d+)\](.*)$/);
    if (!lineMatch) {
      continue;
    }

    const lineStartMs = Number(lineMatch[1]);
    const lineDurationMs = Number(lineMatch[2]);
    const content = lineMatch[3] || "";
    const qrcWords = [];
    let match;

    wordPattern.lastIndex = 0;
    while ((match = wordPattern.exec(content)) !== null) {
      const wordOffsetMs = Number(match[1]);
      const wordDurationMs = Number(match[2]);
      const wordText = escapeQrcText(match[3]);

      if (!wordText) {
        continue;
      }

      qrcWords.push(`${wordText}(${lineStartMs + wordOffsetMs},${wordDurationMs})`);
    }

    if (qrcWords.length > 0) {
      qrcLines.push(`[${lineStartMs},${lineDurationMs}]${qrcWords.join("")}`);
    }
  }

  return qrcLines.length > 0 ? qrcLines.join("\n") : null;
}

function extractLyricText(value) {
  if (!value) {
    return "";
  }

  if (typeof value === "string") {
    return value;
  }

  if (typeof value.content === "string") {
    return value.content;
  }

  if (typeof value.lyric === "string") {
    return value.lyric;
  }

  return "";
}

/**
 * Android track_v2 的翻译挂在 lyric.lang_translations 下，键为语言码（如 ZH-HANS-CN）。
 * 跳过与原词同语言的条目，避免把歌词自身当成翻译。
 */
function pickLangTranslation(lyric, matcher) {
  const langTranslations = lyric?.lang_translations;
  if (!langTranslations || typeof langTranslations !== "object") {
    return "";
  }

  const sourceLang = String(lyric?.lang || "").toUpperCase();

  for (const [key, value] of Object.entries(langTranslations)) {
    const lang = String(key).toUpperCase();
    if (lang === sourceLang || !matcher(lang)) {
      continue;
    }

    const text = extractLyricText(value);
    if (text) {
      return text;
    }
  }

  return "";
}

function extractTranslationLyric(lyric) {
  return extractLyricText(lyric?.translations?.cn)
    || extractLyricText(lyric?.translations?.zh)
    || extractLyricText(lyric?.translation)
    || pickLangTranslation(lyric, lang => lang.startsWith("ZH"))
    || "";
}

function extractRomanizationLyric(lyric) {
  return extractLyricText(lyric?.romanization)
    || extractLyricText(lyric?.romaji)
    || extractLyricText(lyric?.translations?.romanization)
    || extractLyricText(lyric?.translations?.romaji)
    || pickLangTranslation(lyric, lang => /ROMAJI|ROMAN|LATN|PINYIN|(^|-)RM(-|$)/.test(lang))
    || "";
}

function extractRouterData(html) {
  if (!html || typeof html !== "string") return null;

  const assignment = "_ROUTER_DATA = ";
  const startIndex = html.indexOf(assignment);
  if (startIndex === -1) return null;

  const jsonStart = startIndex + assignment.length;
  let jsonEnd = html.indexOf(";\nfunction runWindowFn", jsonStart);

  if (jsonEnd === -1) {
    jsonEnd = html.indexOf(";</script>", jsonStart);
  }

  if (jsonEnd === -1) return null;

  try {
    return JSON.parse(html.slice(jsonStart, jsonEnd));
  } catch (error) {
    return null;
  }
}

function parseWebPlaylistDetail(html) {
  const routerData = extractRouterData(html);
  const playlistPage = routerData?.loaderData?.playlist_page;

  if (!playlistPage) return null;

  return {
    "playlistInfo": playlistPage.playlistInfo || null,
    "media_resources": Array.isArray(playlistPage.medias) ? playlistPage.medias : []
  };
}

function hasValidPlaylistDetail(playlistDetail) {
  return !!playlistDetail && Array.isArray(playlistDetail.media_resources) && playlistDetail.media_resources.length > 0;
}

function createRecommendSheetFromTopList(topListItem) {
  return {
    "id": topListItem.id,
    "title": topListItem.title,
    "artist": "汽水音乐",
    "createUserId": "",
    "description": topListItem.description,
    "artwork": topListItem.coverImg,
    "createTime": 0,
    "fee": 0,
    "_bakaSourceType": "toplist"
  };
}

function getFallbackRecommendSheets() {
  return QISHUI_FALLBACK_PLAYLISTS
    .concat(QISHUI_TOP_LIST_ITEMS.map(createRecommendSheetFromTopList))
    .map(item => Object.assign({}, item));
}

function getVipFee(isVipOnly) {
  return isVipOnly === true ? 1 : 0;
}

function parseSearchResultItem(searchItem) {
  const vipFee = getVipFee(searchItem?.["qishui_label_info"]?.["only_vip_playable"]);

  const authorInfo = searchItem.author_info || {};
  const singerList = (authorInfo.id || authorInfo.name) ? [{
    id: authorInfo.id,
    name: authorInfo.name,
    avatar: authorInfo.avatar || "",
  }] : [];

  return {
    "id": searchItem.item_id,
    "title": searchItem.title,
    "artist": searchItem.author_info.name,
    "singerList": singerList,
    "artwork": searchItem.cover_url,
    "duration": searchItem.duration,
    "qualities": createQualitiesFromBitRates(searchItem.bit_rates),
    "fee": vipFee
  };
}

function parseRankTrackItem(rankItem, index = 0) {
  const musicItem = parseTrackItem(rankItem?.track);
  if (musicItem && rankItem?.rank) {
    musicItem.rank = rankItem.rank.rank || index + 1;
    musicItem.rankDelta = rankItem.rank.rank_delta || "0";
  }
  return musicItem;
}

function parseTrackItem(track) {
  const rawTrack = track;
  track = normalizeTrack(track);
  if (!track) return null;

  const vipFee = getVipFee(track?.["label_info"]?.["only_vip_playable"]);
  const album = track.album || {};
  const isVideo = isVideoTrack(track, rawTrack);
  const videoId = track.video_id || track.ugc_video_id || track.id || track.vid;
  const videoQuality = isVideo ? getVideoResolution(track) : undefined;
  const artwork = album.url_cover
    ? buildImageUrlFromCover(album.url_cover)
    : (buildImageUrlFromCover(track.cover_url)
      || track.image_url?.urls?.[0]
      || track.share_cover_url?.urls?.[0]
      || track.coverURL
      || track.firstFrameURL
      || "");
  const audioQualities = createQualitiesFromBitRates(track.bit_rates);
  const videoQualities = isVideo ? createVideoQualitiesFromTrack(track) : {};
  const qualities = isVideo ? videoQualities : audioQualities;

  const artistEntries = Array.isArray(track.artists) && track.artists.length > 0
    ? track.artists
    : track.author_info ? [track.author_info] : [];
  const singerList = buildSingerList(artistEntries);
  const primaryArtist = singerList[0] || {};

  return {
    "id": track.id || track.video_id || track.ugc_video_id,
    "title": track.name || track.title || track.videoName || track.desc || "",
    "artist": primaryArtist.name || track.artistName || track.author || "",
    "artistId": primaryArtist.id,
    "singerList": singerList,
    "album": album.name || "",
    "albumId": album.id || "",
    "artwork": artwork,
    "duration": normalizeDurationSeconds(track.duration || track.duration_ms),
    "qualities": qualities,
    "fee": vipFee,
    "mv": isVideo ? videoId : undefined,
    "vid": isVideo ? videoId : (track.vid || track.video_id),
    "is_video": isVideo || undefined,
    "videoId": isVideo ? videoId : undefined,
    "videoQuality": videoQuality
  };
}

function parsePlaylistMediaResource(mediaResource) {
  return parseTrackItem(mediaResource);
}

function parseAlbumItem(albumItem) {
  const album = normalizeAlbum(albumItem);
  if (!album) return null;
  const description = album.intro
    || (Array.isArray(album.pclines) ? album.pclines.join("\n") : "");

  return {
    "id": album.id,
    "title": album.name || "",
    "artist": buildSingerList(album.artists || []).map(artist => artist.name).filter(Boolean).join(" / "),
    "artwork": buildImageUrlFromCover(album.url_cover),
    "date": album.release_date,
    "description": description,
    "worksNum": album.count_tracks
  };
}

function parseArtistItem(artistItem) {
  const artist = normalizeArtist(artistItem);
  if (!artist) return null;

  return {
    "id": artist.id,
    "name": artist.name || artist.simple_display_name || "",
    "avatar": buildImageUrlFromCover(artist.url_avatar) || buildImageUrlFromCover(artist.user?.medium_avatar_url),
    "description": artist.description || "",
    "fans": artist.stats?.count_collected || 0,
    "platform": QISHUI_PLATFORM_NAME,
    "albumCount": artist.count_albums || 0,
    "trackCount": artist.count_tracks || 0
  };
}

function parsePlaylistItem(playlistItem) {
  const playlist = normalizePlaylist(playlistItem);
  if (!playlist) return null;

  return {
    "id": playlist.id,
    "title": playlist.title || playlist.public_title || playlist.name || "",
    "artist": playlist.owner?.nickname || playlist.user_artist_info?.user_brief?.nickname || "",
    "createUserId": playlist.owner?.id || playlist.user_artist_info?.user_brief?.id || "",
    "description": playlist.desc || "",
    "artwork": buildImageUrlFromCover(playlist.url_cover),
    "createTime": playlist.create_time || 0,
    "worksNum": playlist.count_tracks || playlist.resource_cnt?.track_cnt || 0,
    "fee": getVipFee(playlist?.["label_info"]?.["only_vip_playable"]),
    "_bakaSourceType": "playlist"
  };
}

function parseRecommendPlaylistBlock(playlistBlock) {
  const playlist = playlistBlock?.resources?.[0]?.entity?.playlist;
  return parsePlaylistItem(playlist);
}

function parseCommentItem(comment) {
  const createdAt = comment.time_created ? Number(comment.time_created) : 0;
  const createDate = new Date(createdAt < 1000000000000 ? createdAt * 1000 : createdAt);

  return {
    "id": comment.id,
    "nickName": comment.user.nickname,
    "avatar": buildImageUrlFromCover(comment.user?.medium_avatar_url),
    "comment": comment.content,
    "like": comment.count_digged,
    "createAt": createDate.toLocaleString()
  };
}

async function searchMusic(keyword, page) {
  return searchQishui(keyword, page, "music");
}

async function searchVideoMusic(keyword, page) {
  try {
    const offset = (page - 1) * PAGE_SIZE;
    const apiData = await qishuiPcGet("/search/mixed", {
      "q": keyword,
      "cursor": String(offset),
      "search_id": createSearchId(),
      "search_method": "input",
      "debug_params": "",
      "from_search_id": "",
      "search_scene": ""
    }, true);
    if (Number(apiData?.status_code || 0) !== 0) {
      return [];
    }

    const groups = Array.isArray(apiData?.result_groups) ? apiData.result_groups : [];
    return groups
      .flatMap(group => Array.isArray(group.data) ? group.data : [])
      .map(parseTrackItem)
      .filter(item => item?.is_video)
      .slice(0, 8);
  } catch (error) {
    // 混合搜索依赖有效登录态；失败时仍完整返回 Android 歌曲搜索结果。
    return [];
  }
}

function mergeVideoSearchResults(musicItems, videoItems) {
  if (!videoItems.length) return musicItems;
  const seen = new Set(musicItems.map(item => `track:${item.id}`));
  const uniqueVideos = videoItems.filter(item => {
    const key = `video:${item.videoId || item.id}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  const insertIndex = Math.min(5, musicItems.length);
  return [
    ...musicItems.slice(0, insertIndex),
    ...uniqueVideos,
    ...musicItems.slice(insertIndex),
  ];
}

async function searchQishui(keyword, page, type = "music") {
  const searchType = QISHUI_SEARCH_TYPE_MAP[type] || "track";
  const offset = (page - 1) * PAGE_SIZE;
  const [apiData, videoItems] = await Promise.all([
    qishuiAndroidGet(`/search/${searchType}`, {
      "q": keyword,
      "cursor": String(offset),
      "count": "20",
      "aid": "386088"
    }),
    type === "music" ? searchVideoMusic(keyword, page) : Promise.resolve([]),
  ]);

  const groups = Array.isArray(apiData.result_groups) ? apiData.result_groups : [];
  const primaryData = groups
    .flatMap(group => Array.isArray(group.data) ? group.data : [])
    .map(item => {
      if (type === "album") return parseAlbumItem(item);
      if (type === "artist") return parseArtistItem(item);
      if (type === "sheet") return parsePlaylistItem(item);
      return parseTrackItem(item);
    })
    .filter(Boolean);
  const data = type === "music"
    ? mergeVideoSearchResults(primaryData, videoItems)
    : primaryData;

  return {
    "isEnd": primaryData.length === 0 || primaryData.length < PAGE_SIZE || !groups.some(group => group.has_more),
    "data": data
  };
}



async function fetchSeoTrackData(trackId) {
  const seoUrl = `https://beta-luna.douyin.com/luna/h5/seo_track?track_id=${trackId}&device_platform=web`;
  const seoResponse = await axios.default.get(seoUrl);
  const playInfoUrl = seoResponse?.data?.track_player?.url_player_info;
  let playInfoList = [];

  if (playInfoUrl) {
    try {
      console.log(`[汽水音乐] fetchSeoTrackData: 使用 SEO url_player_info, trackId=${trackId}`);
      const playInfoResponse = await axios.default.get(playInfoUrl);
      playInfoList = playInfoResponse?.data?.Result?.Data?.PlayInfoList || [];
    } catch (error) {
      console.warn(`[汽水音乐] fetchSeoTrackData: url_player_info 拉取失败, ${error.message}`);
    }
  }

  return {
    "seoData": seoResponse.data,
    "playInfoList": playInfoList
  };
}

async function getMusicInfoFromPc(trackId) {
  try {
    const { trackData, playInfoList, source } = await fetchTrackPlaybackData(trackId);
    const track = trackData?.track
      || trackData?.seo_track?.track
      || null;
    const musicItem = parseTrackItem(track);

    if (!musicItem && !playInfoList.length) {
      return null;
    }

    const result = musicItem || {
      "id": trackId,
      "title": "",
      "artist": "",
      "qualities": {}
    };

    const playInfoQualities = createQualitiesFromPlayInfoList(playInfoList);
    if (Object.keys(playInfoQualities).length > 0) {
      // 以真实可播档位为准，避免 bit_rates 标 flac 但无流
      result.qualities = playInfoQualities;
    } else if (musicItem?.qualities) {
      result.qualities = musicItem.qualities;
    }

    result._playSource = source;
    return result;
  } catch (error) {
    console.error(`[汽水音乐] getMusicInfo 取流错误: ${error.message}`);
    return null;
  }
}

async function getMusicInfoFromSeo(trackId) {
  try {
    const { seoData, playInfoList } = await fetchSeoTrackData(trackId);
    const musicItem = parseTrackItem(seoData?.seo_track?.track);

    if (!musicItem) {
      return null;
    }

    const playInfoQualities = createQualitiesFromPlayInfoList(playInfoList);
    if (Object.keys(playInfoQualities).length > 0) {
      musicItem.qualities = Object.assign({}, musicItem.qualities, playInfoQualities);
    }

    return musicItem;
  } catch (error) {
    return null;
  }
}

async function getVideoMusicInfo(ugcVideoId) {
  if (!ugcVideoId) {
    return null;
  }

  try {
    const response = await axios.default.get(DOUYIN_VIDEO_MUSIC_URL, {
      "params": {
        "ugc_video_id": ugcVideoId,
        "__loader": "ugc_video_page"
      },
      "headers": QISHUI_WEB_SHARE_HEADERS
    });

    const apiData = response?.data || {};
    const videoOptions = apiData.videoOptions || {};

    if (!videoOptions?.url || Number(videoOptions.status_code) !== 0) {
      return null;
    }

    const videoId = videoOptions.video_id || apiData.video_id || ugcVideoId;
    const videoQuality = getVideoResolution(videoOptions);
    const qualities = await createVideoQualitiesFromOptions(videoOptions);
    const artistName = videoOptions.artistName || "";
    const singerList = artistName ? [{
      "id": "",
      "name": artistName,
      "avatar": Array.isArray(videoOptions.artistThumbAvatarArr) ? (videoOptions.artistThumbAvatarArr[0] || "") : ""
    }] : [];

    return {
      "id": videoId,
      "title": videoOptions.videoName || "",
      "artist": artistName,
      "artistId": "",
      "singerList": singerList,
      "album": "",
      "albumId": "",
      "artwork": videoOptions.coverURL || videoOptions.firstFrameURL || videoOptions.metaURL || "",
      "duration": normalizeDurationSeconds(videoOptions.duration || videoOptions.offsetDuration),
      "qualities": qualities,
      "fee": 0,
      "vid": videoId,
      "videoId": videoId,
      "videoQuality": videoQuality,
      "url": videoOptions.url,
      "is_video": true
    };
  } catch (error) {
    console.error(`[汽水音乐] getVideoMusicInfo 错误: ${error.message}`);
    return null;
  }
}

function mergeVideoMusicInfo(musicItem, videoInfo) {
  if (!videoInfo) {
    return withQishuiPlatform(musicItem);
  }

  return withQishuiPlatform(musicItem, videoInfo, {
    "id": videoInfo.id || musicItem.id,
    "title": videoInfo.title || musicItem.title || musicItem.name || "",
    "artist": videoInfo.artist || musicItem.artist || "",
    "artwork": videoInfo.artwork || musicItem.artwork || "",
    "duration": videoInfo.duration || musicItem.duration,
    "qualities": Object.keys(videoInfo.qualities || {}).length ? videoInfo.qualities : musicItem.qualities,
    "url": videoInfo.url || musicItem.url,
    "is_video": true
  });
}

function prepareMusicList(musicList = []) {
  return musicList.map(musicItem => musicItem?.is_video
    ? withQishuiPlatform(musicItem)
    : musicItem);
}

async function getVideoPlaybackSource(musicItem, quality = "192k") {
  const id = musicItem?.videoId || musicItem?.vid || musicItem?.mv || musicItem?.id;
  let videoItem = musicItem || {};
  let picked = pickVideoQualityEntry(videoItem.qualities, quality);

  if (!isUsableVideoQualityEntry(picked?.entry)) {
    const videoInfo = await getVideoMusicInfo(id);
    if (videoInfo) {
      videoItem = mergeVideoMusicInfo(videoItem, videoInfo);
      picked = pickVideoQualityEntry(videoItem.qualities, quality);
    }
  }

  const playUrl = picked?.entry?.url || videoItem.url;
  if (!playUrl) {
    return null;
  }

  return {
    "url": playUrl,
    "headers": AUDIO_PLAYBACK_HEADERS,
    "quality": picked?.quality || "192k",
    "videoQuality": picked?.entry?.videoQuality || videoItem.videoQuality,
    "width": picked?.entry?.width,
    "height": picked?.entry?.height
  };
}

async function getMvSource(musicItem, videoQuality = "1080p") {
  if (!musicItem?.is_video && !musicItem?.videoId && !musicItem?.mv) {
    return null;
  }

  const source = await getVideoPlaybackSource(musicItem, videoQuality);
  if (!source?.url) return null;

  const picked = pickVideoQualityEntry(musicItem?.qualities, source.quality);
  const entry = picked?.entry || {};
  const availableVideoQualities = Object.entries(musicItem?.qualities || {})
    .map(([key, value]) => ({
      key,
      label: value?.videoQuality || key,
      width: getPositiveNumber(value?.width) || undefined,
      height: getPositiveNumber(value?.height) || undefined,
      size: getPositiveNumber(value?.size) || undefined,
      codec: value?.codec || value?.codecs || undefined,
      mimeType: "video/mp4",
    }))
    .filter((value) => value.width || value.height || value.size || value.label !== value.key);
  if (!availableVideoQualities.length) {
    availableVideoQualities.push({
      key: source.videoQuality || entry.videoQuality || musicItem.videoQuality || videoQuality,
      label: source.videoQuality || entry.videoQuality || musicItem.videoQuality || videoQuality,
      width: getPositiveNumber(source.width || entry.width) || undefined,
      height: getPositiveNumber(source.height || entry.height) || undefined,
      size: getPositiveNumber(source.size || entry.size) || undefined,
      mimeType: "video/mp4",
    });
  }
  return {
    "url": source.url,
    "headers": source.headers || AUDIO_PLAYBACK_HEADERS,
    "userAgent": AUDIO_PLAYBACK_HEADERS["User-Agent"],
    "videoQuality": source.videoQuality || entry.videoQuality || musicItem.videoQuality || videoQuality,
    "mimeType": "video/mp4",
    "duration": normalizeDurationSeconds(musicItem.duration),
    "width": getPositiveNumber(source.width || entry.width) || undefined,
    "height": getPositiveNumber(source.height || entry.height) || undefined,
    "size": getPositiveNumber(source.size || entry.size) || undefined,
    "codec": source.codec || entry.codec || entry.codecs || undefined,
    "availableVideoQualities": availableVideoQualities
  };
}

async function getMusicPlaybackSource(musicItem, quality = "128k") {
  if (!musicItem?.id) return null;

  if (musicItem.is_video) {
    const videoSource = await getVideoPlaybackSource(musicItem, quality);
    if (videoSource?.url) {
      return videoSource;
    }
  }

  try {
    let lastErrorMessage = "";
    let playUrl = "";
    let playInfo = null;

    for (let attempt = 1; attempt <= 3; attempt++) {
      const { playInfoList, source } = await fetchTrackPlaybackData(musicItem.id);

      if (!playInfoList.length) {
        lastErrorMessage = "播放列表为空";
        if (attempt < 3) {
          continue;
        }
        break;
      }

      // 有真实 playInfoList 时，不按搜索期 bit_rates 误拦 flac 等
      const availableQualities = createQualitiesFromPlayInfoList(playInfoList);
      if (Object.keys(availableQualities).length > 0 && !availableQualities[quality]) {
        // 仍尝试 pick + fallback，而不是直接失败
        console.warn(`[汽水音乐] 请求音质 ${quality} 不在列表 ${Object.keys(availableQualities).join(",")}，将尝试回落`);
      }

      const qishuiQuality = BAKA_QUALITY_TO_QISHUI[quality]
        || pickQishuiQuality(musicItem, quality);
      playInfo = getBestPlayableInfo(playInfoList, qishuiQuality, quality);
      const actualQuality = resolveReturnedQuality(playInfo, quality);
      console.log(`[汽水音乐] 获取播放源: trackId=${musicItem.id}, req=${quality}, actual=${actualQuality}, qishui=${qishuiQuality}, source=${source}, playInfo.Quality=${playInfo?.Quality}`);

      playUrl = playInfo?.MainPlayUrl || playInfo?.BackupPlayUrl;
      if (!playUrl) {
        lastErrorMessage = "未找到播放地址";
        if (attempt < 3) {
          continue;
        }
        break;
      }

      if (isEncryptedPlayback(playInfo) && !playInfo?.PlayAuth) {
        lastErrorMessage = "该歌曲加密但未返回 PlayAuth";
        if (attempt < 3) {
          continue;
        }
        break;
      }

      if (isEncryptedPlayback(playInfo)) {
        const cek = decodeSpadePlayAuth(playInfo.PlayAuth);
        if (!cek) {
          lastErrorMessage = "解密 PlayAuth 失败";
          if (attempt < 3) {
            continue;
          }
          break;
        }

        return {
          url: playUrl,
          headers: AUDIO_PLAYBACK_HEADERS,
          cek: cek,
          quality: actualQuality
        };
      }

      return {
        url: playUrl,
        headers: AUDIO_PLAYBACK_HEADERS,
        quality: actualQuality
      };
    }

    throw new Error(lastErrorMessage || "未找到可播放源");
  } catch (error) {
    const videoSource = await getVideoPlaybackSource(musicItem, quality);
    if (videoSource?.url) {
      return videoSource;
    }

    console.error(`[汽水音乐] 获取播放源错误: ${error.message}`);
    return {
      url: ""
    };
  }
}

async function getMusicInfo(musicBase) {
  const hasQualities = musicBase.qualities && Object.keys(musicBase.qualities).length > 0;
  const existingVideoQuality = musicBase.is_video ? pickVideoQualityEntry(musicBase.qualities) : null;
  if (
    musicBase.artwork
    && hasQualities
    && (!musicBase.is_video || (existingVideoQuality?.entry?.url && getPositiveNumber(existingVideoQuality.entry.size)))
  ) {
    return withQishuiPlatform(musicBase);
  }

  const songId = musicBase.id || musicBase.item_id;
  if (!songId) {
    console.error('[汽水音乐] getMusicInfo: 缺少有效的歌曲ID');
    return null;
  }

  if (musicBase.is_video) {
    const videoMusicInfo = await getVideoMusicInfo(songId);
    if (videoMusicInfo) {
      return withQishuiPlatform(musicBase, videoMusicInfo);
    }
  }

  const pcMusicInfo = await getMusicInfoFromPc(songId);
  if (pcMusicInfo) {
    return withQishuiPlatform(pcMusicInfo);
  }

  const seoMusicInfo = await getMusicInfoFromSeo(songId);
  if (seoMusicInfo) {
    return withQishuiPlatform(seoMusicInfo);
  }

  const videoMusicInfo = await getVideoMusicInfo(songId);
  if (videoMusicInfo) {
    return withQishuiPlatform(musicBase, videoMusicInfo);
  }

  try {
    const response = await axios.default.get("https://api-vehicle.volcengine.com/v2/custom/contents", {
      "params": {
        "sources": "qishui",
        "need_author": true,
        "need_album": true,
        "need_ugc": true,
        "need_stat": true,
        "item_ids": songId
      }
    });

    const apiData = response.data;
    if (!apiData.data || !apiData.data.list || apiData.data.list.length === 0) {
      console.error('[汽水音乐] getMusicInfo: 未找到歌曲信息');
      return null;
    }

    const item = apiData.data.list[0];
    const vipFee = getVipFee(item?.["qishui_label_info"]?.["only_vip_playable"]);

    const authorInfo = item.author_info || {};
    const singerList = (authorInfo.id || authorInfo.name) ? [{
      id: authorInfo.id,
      name: authorInfo.name,
      avatar: authorInfo.avatar || "",
    }] : [];

    return {
      id: songId,
      title: (item.title || ''),
      artist: item.author_info?.name || '',
      album: item.album_info?.name || '',
      artwork: item.cover_url,
      duration: item.duration,
      qualities: createQualitiesFromBitRates(item.bit_rates),
      fee: vipFee,
      platform: QISHUI_PLATFORM_NAME,
      singerList,
    };
  } catch (error) {
    console.error('[汽水音乐] getMusicInfo 错误:', error.message);
    return null;
  }
}

async function fetchTrackDetail(trackId) {
  return fetchPcTrackV2(trackId);
}

async function getLegacyMusicDetailInfo(trackId) {
  const response = await axios.default.get("https://api-vehicle.volcengine.com/v2/custom/contents", {
    "params": {
      "sources": "qishui",
      "need_author": true,
      "need_album": true,
      "need_ugc": true,
      "need_stat": true,
      "item_ids": trackId
    }
  });

  const apiData = response.data;
  const item = apiData?.data?.list?.[0];

  if (!item) {
    return {};
  }

  const rawLrc = item.lyric_info?.lyric_text;

  return {
    "artwork": item.cover_url,
    "rawLrc": typeof rawLrc === "string" ? rawLrc : ""
  };
}

async function getMusicDetailInfo(musicItem) {
  const trackId = musicItem?.id || musicItem?.item_id;
  if (!trackId) {
    return {
      "rawLrc": QISHUI_NO_LYRIC
    };
  }

  let artwork = musicItem?.artwork || "";

  try {
    const detail = await fetchTrackDetail(trackId);
    const lyric = detail?.lyric || {};
    const rawLrc = parseQishuiKrcToQrc(lyric.content);
    const trackInfo = parseTrackItem(detail?.track);
    artwork = trackInfo?.artwork || artwork;
    const result = {
      "artwork": artwork
    };
    const translation = extractTranslationLyric(lyric);
    const romanization = extractRomanizationLyric(lyric);

    if (rawLrc) {
      result.rawLrc = rawLrc;
    } else if (typeof lyric.content === "string" && /^\[\d{1,2}:\d{2}/.test(lyric.content.trim())) {
      result.rawLrc = lyric.content;
    }

    if (translation) {
      result.translation = translation;
    }

    if (romanization) {
      result.romanization = romanization;
    }

    if (result.rawLrc || result.translation || result.romanization) {
      return result;
    }
  } catch (error) {
    console.error(`[汽水音乐] track_v2 获取歌词错误: ${error.message}`);
  }

  try {
    const legacyResult = await getLegacyMusicDetailInfo(trackId);
    if (typeof legacyResult.rawLrc === "string" && legacyResult.rawLrc.trim()) {
      return legacyResult;
    }
    return {
      ...legacyResult,
      "artwork": legacyResult.artwork || artwork,
      "rawLrc": QISHUI_NO_LYRIC
    };
  } catch (error) {
    console.error(`[汽水音乐] legacy 获取歌词错误: ${error.message}`);
    return {
      "artwork": artwork,
      "rawLrc": QISHUI_NO_LYRIC
    };
  }
}

async function getAlbumInfo(album) {
  const apiData = await qishuiPcGet(`/albums/${album.id}`, {
    "ignore_tracks": "false"
  });

  return {
    "isEnd": true,
    "albumItem": parseAlbumItem(apiData.album_info) || album,
    "musicList": (apiData.tracks || []).map(parseTrackItem).filter(Boolean)
  };
}

async function fetchArtistAlbumsPage(artistId, page) {
  const targetCount = page * PAGE_SIZE;
  const albums = [];
  const seenAlbumIds = new Set();
  let cursor = 0;
  let hasMore = true;

  for (let requestCount = 0; requestCount < 8; requestCount++) {
    const apiData = await qishuiPcGet(`/artists/${artistId}/albums`, {
      "cursor": String(cursor),
      "count": String(PAGE_SIZE)
    });

    let addedCount = 0;
    (apiData.albums || []).forEach(album => {
      const albumId = String(album?.id || "");
      if (!albumId || seenAlbumIds.has(albumId)) {
        return;
      }
      seenAlbumIds.add(albumId);
      albums.push(album);
      addedCount += 1;
    });

    hasMore = apiData.has_more === true;
    if (albums.length >= targetCount || (!hasMore && addedCount === 0)) {
      break;
    }

    cursor += PAGE_SIZE;
  }

  const startIndex = (page - 1) * PAGE_SIZE;
  const pageAlbums = albums.slice(startIndex, startIndex + PAGE_SIZE);

  return {
    "isEnd": pageAlbums.length < PAGE_SIZE || (!hasMore && albums.length <= targetCount),
    "data": pageAlbums.map(parseAlbumItem).filter(Boolean)
  };
}

async function getArtistWorks(artist, page, type) {
  if (type === "album") {
    return fetchArtistAlbumsPage(artist.id, page);
  }

  if (type && type !== "music") {
    return {
      "isEnd": true,
      "data": []
    };
  }

  const apiData = await qishuiPcGet(`/artists/${artist.id}/tracks`, {
    "cursor": String((page - 1) * 50),
    "count": "50"
  });

  return {
    "isEnd": !apiData.has_more,
    "data": (apiData.tracks || []).map(parseTrackItem).filter(Boolean)
  };
}

async function fetchPlaylistDetailFromApi(playlistId) {
  let cursor = "";
  let playlistInfo = null;
  const resources = [];
  const cursors = new Set();
  for (let page = 0; ; page++) {
    if (page >= 10000) throw new Error('[汽水音乐] 歌单分页超出合理范围，请重试');
    let data;
    try {
      data = await qishuiPcGet("/playlist/detail", {
        "playlist_id": playlistId, "cursor": cursor, "count": "100"
      });
    } catch (error) {
      if (page === 0) return null;
      throw error;
    }
    if (!data || !Array.isArray(data.media_resources)) {
      if (page === 0) return null;
      throw new Error('[汽水音乐] 歌单分页数据异常');
    }
    playlistInfo = playlistInfo || data.playlist || null;
    resources.push(...data.media_resources);
    const hasMore = data.has_more === true || data.has_more === 1 || data.has_more === '1';
    if (!hasMore) return { playlistInfo, media_resources: resources, has_more: false, next_cursor: data.next_cursor };
    const next = data.next_cursor == null ? '' : String(data.next_cursor);
    if (!data.media_resources.length || !next || next === cursor || cursors.has(next)) {
      throw new Error('[汽水音乐] 歌单分页游标未推进');
    }
    cursors.add(next);
    cursor = next;
  }
}

async function fetchPlaylistDetailFromWeb(playlistId) {
  try {
    const response = await axios.default.get(QISHUI_WEB_SHARE_URL, {
      "params": {
        "playlist_id": playlistId
      },
      "headers": QISHUI_WEB_SHARE_HEADERS,
      "responseType": "text",
      "transformResponse": [data => data],
      "validateStatus": status => status >= 200 && status < 500
    });

    const playlistDetail = parseWebPlaylistDetail(response.data);

    if (
      hasValidPlaylistDetail(playlistDetail)
      && String(playlistDetail?.playlistInfo?.id || "") === String(playlistId)
    ) {
      return playlistDetail;
    }
  } catch (error) {
    return null;
  }

  return null;
}

async function fetchPlaylistDetail(playlistId) {
  const apiDetail = await fetchPlaylistDetailFromApi(playlistId);
  if (hasValidPlaylistDetail(apiDetail)) {
    return apiDetail;
  }

  const webDetail = await fetchPlaylistDetailFromWeb(playlistId);
  if (hasValidPlaylistDetail(webDetail)) {
    return webDetail;
  }

  return {
    "playlistInfo": null,
    "media_resources": []
  };
}

function extractIdFromUrl(url, type) {
  const idParam = type === "playlist" ? "playlist_id" : "track_id";
  const pathPattern = type === "playlist" ? "playlist" : "track";

  let extractedId = (url.match(new RegExp(`${pathPattern}\\/([\\d]+)`)) || [])[1];
  if (extractedId) return extractedId;

  extractedId = (url.match(new RegExp(`[?&]${idParam}=([\\d]+)`)) || [])[1];
  if (extractedId) return extractedId;

  extractedId = (url.match(/[?&]ugc_video_id=([\d]+)/) || [])[1];
  if (extractedId) return extractedId;

  extractedId = (url.match(/[?&]id=([\d]+)/) || [])[1];
  if (extractedId) return extractedId;

  return null;
}

async function resolveRedirectId(url, type) {
  try {
    const redirectRes = await axios.default.get(url.trim(), {
      "maxRedirects": 0,
      "validateStatus": status => status >= 200 && status < 400,
      "headers": QISHUI_WEB_SHARE_HEADERS
    });
    const location = redirectRes.headers && redirectRes.headers.location;
    if (location) {
      const redirectedId = extractIdFromUrl(location, type);
      if (redirectedId) return redirectedId;
      if (/douyin\.com\/s\//i.test(location) || /qishui\.douyin\.com/i.test(location)) {
        return resolveRedirectId(location, type);
      }
    }
  } catch (error) {
  }

  return null;
}

async function extractQishuiId(input, type = "playlist") {
  if (!input || typeof input !== "string") return null;

  const trimmedInput = input.trim();
  const plainId = (trimmedInput.match(/^(\d+)$/) || [])[1];
  if (plainId) return plainId;

  const directId = extractIdFromUrl(trimmedInput, type);
  if (directId) return directId;

  const longId = (trimmedInput.match(/\b\d{10,}\b/) || [])[0];
  if (longId) return longId;

  const urls = trimmedInput.match(/https?:\/\/[^\s@]+/g) || [];
  for (const url of urls) {
    const urlId = extractIdFromUrl(url, type);
    if (urlId) return urlId;

    if (/douyin\.com\/s\//i.test(url) || /qishui\.douyin\.com/i.test(url)) {
      const redirectedId = await resolveRedirectId(url, type);
      if (redirectedId) return redirectedId;
    }
  }

  return null;
}

async function importMusicPlaylist(playlistUrl) {
  const playlistId = await extractQishuiId(playlistUrl, "playlist");

  if (!playlistId) return;

  const playlistDetail = await fetchPlaylistDetail(playlistId);
  const musicList = playlistDetail.media_resources
    .map(parsePlaylistMediaResource)
    .filter(Boolean);
  const preparedMusicList = prepareMusicList(musicList);
  const sheetItem = parsePlaylistItem(playlistDetail.playlistInfo) || {
    "id": String(playlistId),
    "title": ""
  };

  return Object.assign({}, sheetItem, {
    "id": String(sheetItem.id || playlistId),
    "worksNum": sheetItem.worksNum || preparedMusicList.length,
    "musicList": preparedMusicList
  });
}

async function importMusicItem(urlLike) {
  const trackId = await extractQishuiId(urlLike, "track");
  if (!trackId) return null;
  const isVideoUrl = /ugc_video|ugc_video_id/i.test(String(urlLike || ""));

  return getMusicInfo({
    "id": trackId,
    "is_video": isVideoUrl || undefined
  });
}

async function getMusicPlaylistInfo(playlist) {
  if (playlist?._bakaSourceType === "toplist" || QISHUI_TOP_LIST_IDS.has(String(playlist?.id))) {
    const baseTopList = QISHUI_TOP_LIST_ITEMS.find(item => String(item.id) === String(playlist.id)) || {
      "id": playlist.id,
      "title": playlist.title,
      "description": playlist.description,
      "coverImg": playlist.artwork
    };
    const topListDetail = await getTopListDetail(baseTopList);

    return {
      "isEnd": true,
      "musicList": topListDetail.musicList || []
    };
  }
  const playlistDetail = await fetchPlaylistDetail(playlist.id);
  const musicList = playlistDetail.media_resources
    .map(parsePlaylistMediaResource)
    .filter(Boolean);

  return {
    "isEnd": true,
    "sheetItem": parsePlaylistItem(playlistDetail.playlistInfo) || playlist,
    "musicList": prepareMusicList(musicList)
  };
}

async function getRecommendPlaylistTags() {
  return {
    "data": [],
    "pinned": [{
      "id": 0,
      "title": "每日推荐"
    }, {
      "id": 14,
      "title": "流行"
    }, {
      "id": 8,
      "title": "华语"
    }, {
      "id": 9,
      "title": "欧美"
    }, {
      "id": 20,
      "title": "国风"
    }, {
      "id": 18,
      "title": "民谣"
    }, {
      "id": 15,
      "title": "摇滚"
    }, {
      "id": 38,
      "title": "说唱"
    }, {
      "id": 16,
      "title": "电子"
    }, {
      "id": 19,
      "title": "R&B"
    }, {
      "id": 69,
      "title": "治愈"
    }, {
      "id": 45,
      "title": "睡前"
    }, {
      "id": 40,
      "title": "学习"
    }]
  };
}

async function getRecommendPlaylistsByTag(tag, page) {
  let subChannelId = Number.isNaN(parseInt(tag.id, 10)) ? 0 : parseInt(tag.id, 10);

  try {
    const response = await qishuiPcPost("/discover/mix", {
      "block_type": "discover_playlist_mix",
      "feed_discover_extra": {},
      "latest_douyin_liked_playlist_show_ts": 0,
      "sub_channel_id": subChannelId
    });

    if (response && Array.isArray(response.inner_block) && response.inner_block.length > 0) {
      return {
        "isEnd": !response.has_more,
        "data": response.inner_block.map(parseRecommendPlaylistBlock).filter(Boolean)
      };
    }
  } catch (error) {
  }

  return {
    "isEnd": true,
    "data": page > 1 ? [] : getFallbackRecommendSheets()
  };
}

async function getTopLists() {
  return [{
    "title": "默认排行榜",
    "data": QISHUI_TOP_LIST_ITEMS
  }];
}

async function getTopListDetail(topListItem, page = 1) {
  let apiData;

  try {
    apiData = await qishuiPcGet(`/charts/${topListItem.id}`);
  } catch (error) {
    const response = await axios.default.get(`https://api5-lf.qishui.com/luna/charts/${topListItem.id}?charge=0`, {
      "headers": QISHUI_API_HEADERS
    });
    apiData = response.data;
  }

  const chart = apiData?.chart || {};

  const musicList = (chart.track_ranks || []).map(parseRankTrackItem).filter(Boolean);

  return { ...topListItem, 
    "title": chart.title || topListItem.title,
    "musicList": prepareMusicList(musicList)
   };
}

async function getMusicComments(musicItem, page = 1) {
  const cursor = (page - 1) * PAGE_SIZE;
  const apiData = await qishuiPcGet("/comments", {
    "group_id": musicItem.id,
    "cursor": String(cursor),
    "count": String(PAGE_SIZE),
    "group_type": "1",
    "image_strategy": "2"
  });

  const comments = (apiData.comments || []).map(parseCommentItem).filter(Boolean);

  return {
    "isEnd": apiData.has_more === false || comments.length < PAGE_SIZE,
    "data": comments
  };
}

function getMusicDetailPageUrl(musicItem) {
  const songId = musicItem.id || musicItem.item_id || musicItem.track_id || musicItem.videoId || musicItem.vid;
  if (musicItem?.is_video) {
    return songId
      ? `https://music.douyin.com/qishui/share/ugc_video?ugc_video_id=${songId}`
      : "";
  }
  return songId
    ? `https://music.douyin.com/qishui/share/track?track_id=${songId}&hybrid_sdk_version=bullet&auto_play_bgm=1`
    : "";
}

async function getHotSearch() {
  const response = await axios.default.post("https://api5-lq.qishui.com/luna/search-block", {
    ab_param: JSON.stringify({ search_chart: 2 }),
    from_query: "",
    includes: ["search_chart"],
  }, {
    params: {
      device_platform: "android", os: "android", aid: 8478, app_name: "luna",
      version_code: 100111050, version_name: "11.1.0", channel: "vivo_8478_64",
      device_type: "PJF110", device_brand: "OnePlus", os_api: 34, os_version: "14",
    },
    headers: { "User-Agent": "okhttp/3.10.0", "Content-Type": "application/json" },
    timeout: 10000,
  });
  const body = response.data;
  const charts = body?.search_chart_block?.charts;
  if ((body?.status_code != null && body.status_code !== 0) || !Array.isArray(charts)) {
    throw new Error("汽水音乐热搜加载失败，请稍后重试");
  }
  const list = charts.flatMap(chart => Array.isArray(chart?.content) ? chart.content : []);
  return [...new Set(list.filter(item => item?.behavior === "search").map(item => item.keyword)
    .filter(word => typeof word === "string" && word.trim())
    .map(word => word.trim()))].slice(0, 30);
}

module.exports = {
  getHotSearch,
  "platform": "汽水音乐",
  "author": "JanYun & Toskysun",
  "version": "3.3.0",
  "appVersion": ">0.1.0-alpha.0",
  "srcUrl": "https://music.cwo.cc.cd/plugins/qishui.js",
  "cacheControl": "no-cache",
  "supportedQualities": ["128k", "192k", "320k", "flac", "hires", "atmos", "atmos_plus"],
  "supportedVideoQualities": ["360p", "480p", "720p", "1080p"],
  "userVariables": [
    {
      "key": "sessionid",
      "name": "sessionid",
      "hint": "汽水/抖音登录 Cookie 中的 sessionid。可填纯 sessionid 或 sessionid=xxx 片段；过期后请更新"
    }
  ],
  "hints": {
    "importMusicSheet": [
      "汽水APP：歌单-分享-分享链接；手动访问链接后再复制链接粘贴即可",
      "网页：复制URL并粘贴，或者直接输入纯数字歌单ID即可",
      "导入时间和歌单大小有关，请耐心等待"
    ],
    "importMusicItem": [
      "汽水APP：歌曲-分享-分享链接；也可以直接输入纯数字歌曲ID"
    ]
  },
  "supportedSearchType": ["music", "album", "artist", "sheet"],

  
  async "search"(query, page, type) {
    const searchType = type || "music";
    if (["music", "album", "artist", "sheet"].includes(searchType)) {
      return await searchQishui(query, page, searchType);
    }
    return {
      "isEnd": true,
      "data": []
    };
  },

  "getMediaSource": getMusicPlaybackSource,
  "getMvSource": getMvSource,
  "getMusicInfo": getMusicInfo,
  "getMusicDetailPageUrl": getMusicDetailPageUrl,
  "getLyric": getMusicDetailInfo,
  "getAlbumInfo": getAlbumInfo,
  "getArtistWorks": getArtistWorks,
  "importMusicSheet": importMusicPlaylist,
  "importMusicItem": importMusicItem,
  "getMusicSheetInfo": getMusicPlaylistInfo,
  "getRecommendSheetTags": getRecommendPlaylistTags,
  "getRecommendSheetsByTag": getRecommendPlaylistsByTag,
  "getTopLists": getTopLists,
  "getTopListDetail": getTopListDetail,
  "getMusicComments": getMusicComments
};

}, "汽水音乐");

  __PLUGINS["bili"] = __loadPlugin(function (module, exports, require) {
/* ===== 哔哩哔哩 (https://music.cwo.cc.cd/plugins/bilibili.js) ===== */
"use strict";

/**
 * BakaMusic Bilibili plugin
 * WBI/player flow based on bilibili-video-downloader.
 * Only axios and Node built-ins are required.
 */
const axiosModule = require("axios");
const axios = axiosModule.default || axiosModule;
let CryptoJs = null;
let nodeCrypto = null;
try { CryptoJs = require("crypto-js"); } catch (_) {}
try { nodeCrypto = require("crypto"); } catch (_) {}
const { Buffer } = require("buffer");

const API_BASE = "https://api.bilibili.com";
const PAGE_SIZE = 20;
const USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36";
const REFERER = "https://www.bilibili.com/";
const AUDIO_QUALITY = { low: 30216, medium: 30232, high: 30280, dolby: 30250, hires: 30251 };
const QUALITY_ID = { "64k": 30216, "96k": 30216, "128k": 30216, "132k": 30232, "192k": 30232, "320k": 30280 };
const QUALITY_LABEL = { 30216: "128k", 30232: "192k", 30280: "320k" };
const WBI_MIXIN_TABLE = [46,47,18,2,53,8,23,32,15,50,10,31,58,3,45,35,27,43,5,49,33,9,42,19,29,28,14,39,12,38,41,13,37,48,7,16,24,55,40,61,26,17,0,1,60,51,30,4,22,25,54,21,56,59,6,63,57,62,11,36,20,34,44,52];
const HTTP_HEADERS = {
  "User-Agent": USER_AGENT,
  Accept: "application/json, text/plain, */*",
  "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
  Referer: REFERER,
};
const SEARCH_HEADERS = {
  ...HTTP_HEADERS,
  Origin: "https://search.bilibili.com",
  "Sec-Fetch-Site": "same-site",
  "Sec-Fetch-Mode": "cors",
  "Sec-Fetch-Dest": "empty",
};

let fingerprint;
let wbiKeys;
let wbiKeysAt = 0;
let biliTicket;
let biliTicketExpires = 0;
const videoViewCache = new Map();
const VIDEO_VIEW_TTL = 10 * 60 * 1000;
const VIDEO_VIEW_CACHE_LIMIT = 256;

function getUserVariables() {
  try {
    if (typeof env !== "undefined" && env && typeof env.getUserVariables === "function") {
      return env.getUserVariables() || {};
    }
  } catch (_) {}
  return {};
}

function getCookieInput() {
  const vars = getUserVariables();
  // Keep all aliases instead of selecting the first non-empty field.  The
  // settings panel may retain an old BILI_COOKIE while the user has just
  // entered a fresh SESSDATA; selecting only one of them silently drops the
  // login cookie and makes premium DASH tracks look unavailable.
  return [
    vars.BILI_COOKIE, vars.bili_cookie, vars.BILI_CK, vars.bili_ck,
    vars.CK, vars.ck, vars.COOKIE, vars.cookie, vars.Cookie,
    vars.SESSDATA, vars.sessdata,
  ].filter((value) => value !== undefined && value !== null && String(value).trim()).join("; ");
}

function parseCookieString(value) {
  const jar = {};
  String(value || "").split(";").forEach((part) => {
    const index = part.indexOf("=");
    if (index <= 0) return;
    const key = part.slice(0, index).trim();
    const val = part.slice(index + 1).trim().replace(/^['\"]|['\"]$/g, "");
    if (key && val) jar[key] = val;
  });
  return jar;
}

function getUserCookieJar() {
  const raw = String(getCookieInput() || "").trim();
  if (!raw) return {};
  // A raw SESSDATA token may contain a trailing `=` (base64 padding), so
  // detect cookie assignments by their key shape rather than any equals sign.
  return /(?:^|;\s*)[A-Za-z_][\w-]*\s*=/.test(raw)
    ? parseCookieString(raw)
    : { SESSDATA: raw };
}

function hasLoginCookie() {
  const jar = getUserCookieJar();
  return Boolean(jar.SESSDATA || jar.DedeUserID || jar.bili_jct || jar.CSRFKEY);
}

async function loadFingerprint() {
  if (fingerprint && (fingerprint.b_3 || fingerprint.b_4)) return fingerprint;
  try {
    const response = await axios.get(`${API_BASE}/x/frontend/finger/spi`, { headers: { "User-Agent": USER_AGENT }, timeout: 10000 });
    fingerprint = response.data?.data || {};
  } catch (_) { fingerprint = {}; }
  return fingerprint;
}

function buildCookieHeader() {
  const jar = { ...getUserCookieJar() };
  if (fingerprint?.b_3 && !jar.buvid3) jar.buvid3 = fingerprint.b_3;
  if (fingerprint?.b_4 && !jar.buvid4) jar.buvid4 = fingerprint.b_4;
  if (biliTicket && Date.now() < biliTicketExpires && !jar.bili_ticket) {
    jar.bili_ticket = biliTicket;
    jar.bili_ticket_expires = String(Math.floor(biliTicketExpires / 1000));
  }
  return Object.keys(jar).filter((key) => jar[key] !== undefined && jar[key] !== "").map((key) => `${key}=${jar[key]}`).join("; ");
}

function cookieValue(name) { return getUserCookieJar()[name] || ""; }
function csrfToken() { return cookieValue("bili_jct") || cookieValue("csrf"); }

// Bilibili's image CDN appends an `@...` transform to many API responses
// (for example `@320w_180h_1c_!web-search-common-cover.avif`).  Those URLs are
// intentionally small thumbnails and become visibly soft when BakaMusic uses
// them for the now-playing artwork or immersive background.  Keep the CDN
// host/path and remove only its image-processing suffix so the original asset
// is requested.  The same normalization is used for video covers, favorites,
// and user avatars.
function stripBilibiliImageTransform(value) {
  try {
    const parsed = new URL(value);
    const host = String(parsed.hostname || "").toLowerCase();
    const isBilibiliCdn = /(?:^|\.)hdslb\.com$/.test(host) || /(?:^|\.)biliimg\.com$/.test(host);
    if (isBilibiliCdn && /\/bfs\//i.test(parsed.pathname)) {
      parsed.pathname = parsed.pathname.replace(/@[^/]*$/, "");
      return parsed.toString();
    }
  } catch (_) {}
  return value;
}

function normalizeImage(url) {
  if (!url) return "";
  let value = String(url).trim();
  if (value.startsWith("//")) value = `https:${value}`;
  value = value.replace(/^http:\/\//i, "https://");
  return stripBilibiliImageTransform(value);
}

function decodeHtml(value) {
  return String(value || "")
    .replace(/<em[^>]*>/gi, "").replace(/<\/em>/gi, "")
    .replace(/&#(x[0-9a-f]+|[0-9]+);/gi, (raw, code) => {
      const radix = String(code).toLowerCase().startsWith("x") ? 16 : 10;
      const number = parseInt(String(code).replace(/^x/i, ""), radix);
      return Number.isFinite(number) ? String.fromCodePoint(number) : raw;
    })
    .replace(/&quot;/g, '"').replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&#39;|&apos;/g, "'");
}

function durationToSec(value) {
  if (typeof value === "number" && Number.isFinite(value)) return Math.max(0, Math.round(value));
  if (typeof value !== "string") return 0;
  if (/^\d+(?:\.\d+)?$/.test(value.trim())) return Math.round(Number(value));
  const parts = value.trim().split(":").map(Number);
  if (!parts.length || parts.some((part) => !Number.isFinite(part))) return 0;
  return Math.round(parts.reduce((total, part) => total * 60 + part, 0));
}

function formatFileSize(bytes) {
  const value = Number(bytes);
  if (!Number.isFinite(value) || value <= 0) return undefined;
  const units = ["B", "KB", "MB", "GB"];
  let size = value, index = 0;
  while (size >= 1024 && index < units.length - 1) { size /= 1024; index += 1; }
  return `${size.toFixed(1)}${units[index]}`;
}

function formatDate(timestamp) {
  const number = Number(timestamp);
  if (!Number.isFinite(number) || number <= 0) return undefined;
  const date = new Date(number < 10000000000 ? number * 1000 : number);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString().slice(0, 10);
}

function getMixinKey(value) { return WBI_MIXIN_TABLE.map((index) => String(value || "").charAt(index)).join("").slice(0, 32); }
function encodeWbi(value) { return encodeURIComponent(String(value)).replace(/[!'()*]/g, ""); }
function parseQueryString(query) {
  const params = {};
  String(query || "").split("&").forEach((pair) => {
    if (!pair) return;
    const index = pair.indexOf("=");
    const key = index >= 0 ? pair.slice(0, index) : pair;
    const value = index >= 0 ? pair.slice(index + 1) : "";
    try { params[decodeURIComponent(key)] = decodeURIComponent(value); } catch (_) { params[key] = value; }
  });
  return params;
}

function md5Hex(value) {
  if (CryptoJs?.MD5) return CryptoJs.MD5(String(value)).toString(CryptoJs.enc?.Hex);
  if (nodeCrypto?.createHash) return nodeCrypto.createHash("md5").update(String(value)).digest("hex");
  throw new Error("MD5 provider is missing");
}

function hmacSha256Hex(key, value) {
  if (CryptoJs?.HmacSHA256) return CryptoJs.HmacSHA256(String(value), String(key)).toString(CryptoJs.enc?.Hex);
  if (nodeCrypto?.createHmac) return nodeCrypto.createHmac("sha256", String(key)).update(String(value)).digest("hex");
  throw new Error("HMAC-SHA256 provider is missing");
}

function signWbi(params, imgKey, subKey) {
  const values = { ...params, wts: Math.floor(Date.now() / 1000) };
  const query = Object.keys(values).sort()
    .filter((key) => values[key] !== undefined && values[key] !== null && values[key] !== "")
    .map((key) => `${encodeWbi(key)}=${encodeWbi(String(values[key]).replace(/[!'()*]/g, ""))}`).join("&");
  const wRid = md5Hex(query + getMixinKey(`${imgKey}${subKey}`));
  return { ...values, w_rid: wRid };
}

function fileStem(url) {
  const match = String(url || "").match(/\/([^/?#]+?)(?:\.[^./?#]+)?(?:[?#].*)?$/);
  return match ? match[1] : "";
}

async function getBiliTicket() {
  const ts = Math.floor(Date.now() / 1000);
  const hexsign = hmacSha256Hex("XgwSnGZ1p", `ts${ts}`);
  try {
    const response = await axios.post(`${API_BASE}/bapis/bilibili.api.ticket.v1.Ticket/GenWebTicket`, null, {
      params: { key_id: "ec02", hexsign, "context[ts]": ts, csrf: csrfToken() }, headers: HTTP_HEADERS, timeout: 10000,
    });
    const data = response.data?.data || {};
    if (data.ticket) {
      biliTicket = data.ticket;
      const created = Number(data.created_at || ts) * 1000;
      biliTicketExpires = created + Math.max(3600, Number(data.ttl || 259200) - 3600) * 1000;
    }
    return data;
  } catch (_) { return {}; }
}

async function getWbiKeys(force = false) {
  if (!force && wbiKeys && Date.now() - wbiKeysAt < 12 * 60 * 60 * 1000) return wbiKeys;
  const nav = await rawApiGet("/x/web-interface/nav", {}, { useCookie: true });
  const navData = nav?.data;
  let imgUrl = navData?.wbi_img?.img_url;
  let subUrl = navData?.wbi_img?.sub_url;
  if (!imgUrl || !subUrl) {
    const ticket = await getBiliTicket();
    imgUrl = imgUrl || ticket.nav?.wbi_img?.img_url || ticket.nav?.img;
    subUrl = subUrl || ticket.nav?.wbi_img?.sub_url || ticket.nav?.sub;
  }
  const img = fileStem(imgUrl), sub = fileStem(subUrl);
  if (img && sub) { wbiKeys = { img, sub }; wbiKeysAt = Date.now(); }
  return wbiKeys || { img: "", sub: "" };
}

async function rawApiGet(path, params = {}, options = {}) {
  const requestParams = { ...params };
  let headers = { ...HTTP_HEADERS, ...(options.headers || {}) };
  if (options.useCookie !== false) {
    await loadFingerprint();
    const cookie = buildCookieHeader();
    if (cookie) headers.Cookie = cookie;
  }
  if (options.wbi) {
    const keys = await getWbiKeys();
    Object.assign(requestParams, signWbi(requestParams, keys.img, keys.sub));
  }
  try {
    const response = await axios.get(path.startsWith("http") ? path : `${API_BASE}${path}`, {
      params: requestParams, headers, timeout: options.timeout || 20000, validateStatus: () => true,
    });
    return response.data;
  } catch (error) {
    if (options.throwOnError === false) return null;
    throw error;
  }
}

async function apiGet(path, params = {}, options = {}) {
  const body = await rawApiGet(path, params, options);
  if (!body || (body.code !== undefined && body.code !== 0)) {
    const error = new Error(`Bilibili API error: ${body && (body.message || body.msg || body.code)}`);
    error.response = body;
    throw error;
  }
  return body;
}

async function getVideoView(identifier) {
  const params = {};
  const bvid = identifier && (identifier.bvid || (typeof identifier === "string" && /^BV/i.test(identifier) ? identifier : ""));
  const aid = identifier && (identifier.aid || (typeof identifier === "number" || /^\d+$/.test(String(identifier || "")) ? identifier : ""));
  if (bvid) params.bvid = bvid;
  else if (aid) params.aid = aid;
  else throw new Error("A BVID or AID is required");
  const cacheKey = bvid ? `bvid:${String(bvid).toUpperCase()}` : `aid:${String(aid)}`;
  const cached = videoViewCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) return cached.value;
  if (cached) videoViewCache.delete(cacheKey);
  const body = await apiGet("/x/web-interface/view", params, { useCookie: true });
  if (!body.data) throw new Error("Video metadata is empty");
  if (videoViewCache.size >= VIDEO_VIEW_CACHE_LIMIT) {
    const firstKey = videoViewCache.keys().next().value;
    if (firstKey) videoViewCache.delete(firstKey);
  }
  videoViewCache.set(cacheKey, { value: body.data, expiresAt: Date.now() + VIDEO_VIEW_TTL });
  return body.data;
}

async function getCid(bvid, aid) { return getVideoView({ bvid, aid }); }

async function getPlayurlData(bvid, aid, cid) {
  const params = { ...(bvid ? { bvid } : { aid }), cid: Number(cid), qn: 127, fnval: 4048, fnver: 0, fourk: 1 };
  let body = null;
  try { body = await rawApiGet("/x/player/wbi/playurl", params, { wbi: true, useCookie: true }); } catch (_) { body = null; }
  const hasMedia = (value) => value && value.code === 0 && value.data && (value.data.dash || value.data.durl);
  const hasPremiumAudio = (value) => {
    const dash = value?.data?.dash;
    return Boolean(dash?.flac?.audio || dash?.dolby?.audio);
  };
  // Some WBI responses contain only the three standard audio tracks even with
  // a valid cookie. Query the legacy player endpoint as a capability fallback;
  // it still honours SESSDATA and often exposes FLAC/Dolby/Hi-Res.
  if (!hasMedia(body) || !hasPremiumAudio(body)) {
    try {
      const legacy = await rawApiGet("/x/player/playurl", params, { useCookie: true });
      if (hasMedia(legacy) && (!hasMedia(body) || hasPremiumAudio(legacy))) body = legacy;
    } catch (_) {}
  }
  if (!hasMedia(body)) throw new Error(`Playback metadata request failed: ${body && (body.message || body.msg || body.code) || "empty response"}`);
  return body;
}

async function getProgressiveVideoData(bvid, aid, cid, videoQuality) {
  const wanted = String(videoQuality || "1080p").toLowerCase().replace(/\s+/g, "");
  const qn = VIDEO_QUALITY_ID[wanted] || Number(wanted.replace(/p$/, "")) || 80;
  const params = {
    ...(bvid ? { bvid } : { aid }),
    cid: Number(cid),
    qn,
    fnval: 0,
    fnver: 0,
    fourk: 1,
  };
  let body = null;
  const hasSingleFile = (value) => value?.code === 0
    && asArray(value.data?.durl).filter((entry) => mediaUrl(entry)).length === 1;
  try { body = await rawApiGet("/x/player/wbi/playurl", params, { wbi: true, useCookie: true }); } catch (_) { body = null; }
  if (!hasSingleFile(body)) {
    try { body = await rawApiGet("/x/player/playurl", params, { useCookie: true }); } catch (_) { body = null; }
  }
  return hasSingleFile(body)
    ? { ...body, data: { ...body.data, dash: undefined } }
    : null;
}

function mediaUrl(media) { return media && (media.baseUrl || media.base_url || media.url || media.play_url || ""); }
function mediaSize(media, duration) {
  if (media && Number(media.size) > 0) return formatFileSize(media.size);
  if (media && Number(media.bandwidth) > 0 && Number(duration) > 0) return formatFileSize(Number(media.bandwidth) * Number(duration) / 8);
  return undefined;
}
function asArray(value) { return !value ? [] : Array.isArray(value) ? value : [value]; }

function collectQualities(playData) {
  const dash = playData?.dash;
  const qualities = {}, videoQualities = [];
  if (!dash) return { qualities: { "128k": {} }, videoQualities };
  const duration = Number(dash.duration || (playData.timelength && playData.timelength / 1000) || 0);
  asArray(dash.audio).forEach((audio) => {
    const id = Number(audio.id);
    const label = QUALITY_LABEL[id] || (Number(audio.bandwidth) >= 180000 ? "320k" : Number(audio.bandwidth) >= 100000 ? "192k" : "128k");
    qualities[label] = { size: mediaSize(audio, duration), bitrate: Number(audio.bandwidth) || undefined, id };
  });
  const flac = asArray(dash.flac?.audio)[0];
  if (flac) {
    const flacId = Number(flac.id) || AUDIO_QUALITY.hires;
    const entry = { size: mediaSize(flac, duration), bitrate: Number(flac.bandwidth) || undefined, id: flacId };
    // `dash.flac` is the 30251 Hi-Res stream on Bilibili.  Expose exactly one
    // quality key for it; publishing flac + flac24bit + hires here makes the
    // player display the same URL three times.  Keep a generic FLAC label only
    // for a future non-30251 stream returned by the API.
    qualities[flacId === AUDIO_QUALITY.hires ? "hires" : "flac"] = entry;
  }
  const dolby = asArray(dash.dolby?.audio)[0];
  if (dolby) qualities.dolby = { size: mediaSize(dolby, duration), bitrate: Number(dolby.bandwidth) || undefined, id: Number(dolby.id) || AUDIO_QUALITY.dolby };
  asArray(dash.video).forEach((video) => {
    if (!video || video.id === undefined) return;
    videoQualities.push({
      id: Number(video.id), quality: Number(video.id), codec: video.codecs || video.codec || "",
      width: Number(video.width) || undefined, height: Number(video.height) || undefined,
      bitrate: Number(video.bandwidth) || undefined, size: mediaSize(video, duration),
    });
  });
  if (!Object.keys(qualities).length) qualities["128k"] = {};
  return { qualities, videoQualities };
}

function pickAudio(playData, requestedQuality) {
  const dash = playData?.dash;
  if (!dash) return asArray(playData?.durl)[0] || null;
  const wanted = String(requestedQuality || "320k").toLowerCase();
  if (wanted === "dolby") {
    const dolby = asArray(dash.dolby?.audio);
    if (dolby.length) return dolby[0];
    const flac = asArray(dash.flac?.audio);
    if (flac.length) return flac[0];
  }
  if (wanted === "flac" || wanted === "flac24bit" || wanted === "hires" || wanted === "lossless") {
    const flac = asArray(dash.flac?.audio);
    if (flac.length) return flac[0];
  }
  const audios = asArray(dash.audio).filter((audio) => mediaUrl(audio));
  if (!audios.length) return asArray(dash.dolby?.audio)[0] || asArray(dash.flac?.audio)[0] || asArray(playData.durl)[0] || null;
  audios.sort((a, b) => Number(a.id || 0) - Number(b.id || 0));
  const target = QUALITY_ID[wanted] || AUDIO_QUALITY.high;
  return audios.find((audio) => Number(audio.id) === target) || audios.filter((audio) => Number(audio.id) <= target).pop() || audios[0] || null;
}

function resolvedAudioQuality(playData, media) {
  const id = Number(media?.id);
  if (id === AUDIO_QUALITY.dolby) return "dolby";
  if (id === AUDIO_QUALITY.hires) return "hires";
  if (QUALITY_LABEL[id]) return QUALITY_LABEL[id];
  const dash = playData?.dash;
  const mediaUrlValue = mediaUrl(media);
  if (mediaUrlValue && asArray(dash?.dolby?.audio).some((item) => mediaUrl(item) === mediaUrlValue)) return "dolby";
  if (mediaUrlValue && asArray(dash?.flac?.audio).some((item) => mediaUrl(item) === mediaUrlValue)) return "hires";
  const bitrate = Number(media?.bandwidth);
  if (bitrate >= 180000) return "320k";
  if (bitrate >= 100000) return "192k";
  if (bitrate > 0) return "128k";
  return "128k";
}

const VIDEO_QUALITY_ID = {
  "360p": 16, "480p": 32, "720p": 64, "720p60": 74,
  "1080p": 80, "1080p+": 112, "1080p60": 116, "4k": 120,
  "hdr": 125, "dolby_vision": 126, "8k": 127,
};
const VIDEO_QUALITY_LABEL = {
  16: "360p", 32: "480p", 64: "720p", 74: "720p60", 80: "1080p",
  112: "1080p+", 116: "1080p60", 120: "4k", 125: "hdr", 126: "dolby_vision", 127: "8k",
};

function pickVideo(playData, requestedQuality = "1080p") {
  const videos = asArray(playData?.dash?.video).filter((video) => mediaUrl(video));
  if (!videos.length) return asArray(playData?.durl)[0] || null;
  // Chromium's built-in MP4 pipeline is broadly compatible with AVC. Prefer
  // AVC over HEVC/AV1 when DASH exposes several codecs at the same height;
  // the latter can report a valid URL yet fail with MEDIA_ERR_DECODE.
  const compatible = videos.filter((video) => {
    const codec = String(video.codecs || video.codec || "").toLowerCase();
    return !codec || /(?:avc1|avc3|h264)/i.test(codec);
  });
  const candidates = compatible.length ? compatible : videos;
  const wanted = String(requestedQuality).toLowerCase().replace(/\s+/g, "");
  const target = VIDEO_QUALITY_ID[wanted] || Number(wanted.replace(/p$/, "")) || 80;
  const ordered = candidates.slice().sort((a, b) => Number(a.id || 0) - Number(b.id || 0));
  return ordered.find((video) => Number(video.id) === target)
    || ordered.filter((video) => Number(video.id) <= target).pop()
    || ordered[0];
}

function getMediaHeaders(musicItem) {
  const id = musicItem?.bvid || musicItem?.aid || musicItem?.id || "";
  const headers = {
    "User-Agent": USER_AGENT, Accept: "*/*", Referer: id ? `${REFERER}video/${id}` : REFERER,
    Origin: "https://www.bilibili.com", "Accept-Encoding": "identity",
  };
  const cookie = buildCookieHeader();
  if (cookie) headers.Cookie = cookie;
  return headers;
}

function formatMedia(result = {}) {
  const owner = result.owner || result.upper || {};
  const title = decodeHtml(result.title || result.part || result.name || "");
  const mid = owner.mid || result.mid || result.author_mid;
  const artist = result.artist || result.author || owner.name || "";
  const singerList = mid || artist ? [{ id: mid, name: artist, avatar: normalizeImage(owner.face || result.face) }] : [];
  const bvid = result.bvid || result.bv_id;
  const aid = result.aid || result.id;
  const cid = result.cid;
  const artwork = normalizeImage(result.pic || result.cover || result.arcurl || result.upic);
  const item = {
    id: cid || bvid || aid, aid, bvid, cid, title, artist, singerList, album: bvid || aid,
    // BakaMusic accepts artwork; coverImg is kept in sync because the music
    // bar and immersive background prefer that field when both are present.
    artwork, coverImg: artwork,
    duration: durationToSec(result.duration !== undefined ? result.duration : result.length),
    tags: Array.isArray(result.tag) ? result.tag : (typeof result.tag === "string" ? result.tag.split(",").filter(Boolean) : []),
    date: formatDate(result.pubdate || result.created),
    // Search/view responses do not carry DASH capability information.  An
    // empty map deliberately lets BakaMusic call getMusicInfo(), instead of
    // treating synthetic 128/192/320 entries as the complete quality list
    // and hiding premium tracks from the quality picker.
    qualities: result.qualities || {},
  };
  if (result.videoQualities) item.videoQualities = result.videoQualities;
  if (result.description || result.desc) item.description = result.description || result.desc;
  return item;
}

async function getMusicInfo(musicBase = {}) {
  const bvid = musicBase.bvid || (typeof musicBase.id === "string" && /^BV/i.test(musicBase.id) ? musicBase.id : "");
  const aid = musicBase.aid || (!bvid && /^\d+$/.test(String(musicBase.id || "")) ? musicBase.id : "");
  if (!bvid && !aid) return null;
  const hasRealQualities = musicBase.qualities && Object.values(musicBase.qualities).some((entry) => entry && Object.keys(entry).length > 0);
  // Never reuse a pre-login quality snapshot.  Search results and items
  // cached before SESSDATA was entered commonly contain only 128/192/320K;
  // refreshing the player metadata after login is what reveals FLAC/Hi-Res
  // and Dolby tracks.
  if (musicBase.artwork && hasRealQualities && !hasLoginCookie()) {
    return { ...musicBase, bvid, aid, platform: "bilibili" };
  }
  try {
    const video = await getVideoView({ bvid, aid });
    const page = video.pages?.[0];
    const cid = musicBase.cid || page?.cid || video.cid;
    let playback = null;
    try { playback = await getPlayurlData(video.bvid, video.aid, cid); } catch (_) {}
    const metadata = collectQualities(playback?.data);
    const item = formatMedia({ ...video, cid, qualities: metadata.qualities, videoQualities: metadata.videoQualities });
    item.platform = "bilibili";
    item.duration = durationToSec(video.duration);
    item.pages = (video.pages || []).map((part) => ({ cid: part.cid, title: part.part, duration: durationToSec(part.duration) }));
    return item;
  } catch (error) {
    console.error(`[bilibili] getMusicInfo: ${error.message}`);
    return null;
  }
}

async function getMediaSource(musicItem = {}, quality = "320k") {
  const bvid = musicItem.bvid || (typeof musicItem.id === "string" && /^BV/i.test(musicItem.id) ? musicItem.id : "");
  const aid = musicItem.aid || (!bvid && /^\d+$/.test(String(musicItem.id || "")) ? musicItem.id : "");
  if (!bvid && !aid) throw new Error("A BVID or AID is required for playback");
  // Let BakaMusic's quality fallback order handle quality levels that
  // Bilibili does not expose.  Returning a 320K URL for an unsupported
  // request (for example `master`, `atmos` or `atmos_plus`) makes the host
  // believe the requested level succeeded and stops the fallback chain.
  const requestedQuality = String(quality || "320k").trim().toLowerCase();
  const supportedQuality = new Set(["128k", "192k", "320k", "flac", "flac24bit", "hires", "lossless", "dolby"]);
  if (!supportedQuality.has(requestedQuality)) {
    throw new Error(`Unsupported Bilibili audio quality: ${requestedQuality}`);
  }
  // Search results already carry cid on some endpoints; imported/detail
  // items may keep it under pages or _bilibiliData. Reuse it before issuing a
  // view request so playing the same search result does not refetch metadata.
  let cid = musicItem.cid || musicItem._bilibiliData?.cid || musicItem.pages?.[0]?.cid;
  if (!cid) {
    const view = await getVideoView({ bvid, aid });
    cid = view.cid || view.pages?.[0]?.cid;
  }
  const response = await getPlayurlData(bvid, aid, cid);
  const selected = pickAudio(response.data, requestedQuality);
  const url = mediaUrl(selected);
  if (!url) throw new Error("No playable audio URL returned");
  const backup = selected && (selected.backupUrl || selected.backup_url || selected.backup_url_list || []);
  return {
    // BakaMusic treats this field as an IQualityKey and calls `.trim()` on
    // it while building download names.  Returning Bilibili's numeric stream
    // id (30280, 30251, …) makes downloads fail and also reports Master even
    // when the actual fallback stream is 320K.
    url, headers: getMediaHeaders({ ...musicItem, bvid, aid }), quality: resolvedAudioQuality(response.data, selected),
    duration: Number(response.data?.timelength) > 0 ? Math.round(response.data.timelength / 1000) : undefined,
    backupUrl: Array.isArray(backup) ? backup.slice(0, 2) : [],
  };
}

async function getMvSource(musicItem = {}, videoQuality = "1080p") {
  const bvid = musicItem.bvid || (typeof musicItem.id === "string" && /^BV/i.test(musicItem.id) ? musicItem.id : "");
  const aid = musicItem.aid || (!bvid && /^\d+$/.test(String(musicItem.id || "")) ? musicItem.id : "");
  if (!bvid && !aid) return null;
  let cid = musicItem.cid || musicItem._bilibiliData?.cid || musicItem.pages?.[0]?.cid;
  if (!cid) {
    const view = await getVideoView({ bvid, aid });
    cid = view.cid || view.pages?.[0]?.cid;
  }
  // Progressive MP4 contains both video and audio. Prefer it so playback,
  // volume control and downloads operate on one complete media file.
  const response = await getProgressiveVideoData(bvid, aid, cid, videoQuality)
    || await getPlayurlData(bvid, aid, cid);
  const selected = pickVideo(response.data, videoQuality);
  const url = mediaUrl(selected);
  if (!url) return null;
  const actualId = Number(selected?.id)
    || Number(response.data?.quality)
    || VIDEO_QUALITY_ID[String(videoQuality).toLowerCase()]
    || 80;
  const backup = selected?.backupUrl || selected?.backup_url || [];
  const availableVideoQualities = response.data?.dash?.video
    ? collectQualities(response.data).videoQualities
        .filter((item) => item?.quality !== undefined)
        .map((item) => ({
          key: VIDEO_QUALITY_LABEL[Number(item.id)] || `${Number(item.id)}q`,
          label: VIDEO_QUALITY_LABEL[Number(item.id)] || `${Number(item.height || item.id)}p`,
          width: item.width,
          height: item.height,
          bitrate: item.bitrate,
          size: item.size,
          codec: item.codec,
          mimeType: "video/mp4",
        }))
    : [];
  if (!availableVideoQualities.length) {
    availableVideoQualities.push({
      key: VIDEO_QUALITY_LABEL[actualId] || `${actualId}q`,
      label: VIDEO_QUALITY_LABEL[actualId] || `${actualId}q`,
      width: Number(selected?.width) || undefined,
      height: Number(selected?.height) || undefined,
      size: mediaSize(selected, Number(response.data?.timelength) > 0 ? Number(response.data.timelength) / 1000 : undefined),
      codec: selected?.codecs || selected?.codec || undefined,
      mimeType: "video/mp4",
    });
  }
  return {
    url,
    headers: getMediaHeaders({ ...musicItem, bvid, aid }),
    userAgent: USER_AGENT,
    videoQuality: VIDEO_QUALITY_LABEL[actualId] || `${actualId}q`,
    mimeType: selected?.mimeType || "video/mp4",
    duration: Number(response.data?.timelength) > 0 ? Math.round(response.data.timelength / 1000) : undefined,
    width: Number(selected?.width) || undefined,
    height: Number(selected?.height) || undefined,
    codec: selected?.codecs || selected?.codec || undefined,
    size: mediaSize(selected, Number(response.data?.timelength) > 0 ? Number(response.data.timelength) / 1000 : undefined),
    availableVideoQualities,
    backupUrls: Array.isArray(backup) ? backup.slice(0, 3) : [],
  };
}

async function searchBase(keyword, page, searchType = "video") {
  await loadFingerprint();
  const params = {
    context: "", page: Number(page) || 1, order: "", page_size: PAGE_SIZE, keyword: String(keyword || ""),
    duration: "", tids_1: "", tids_2: "", __refresh__: true, _extra: "", highlight: 1,
    single_column: 0, platform: "pc", from_source: "", search_type: searchType, dynamic_offset: 0,
  };
  let body = await rawApiGet("/x/web-interface/search/type", params, { headers: SEARCH_HEADERS, useCookie: true });
  if (!body || body.code !== 0 || !body.data) {
    body = await rawApiGet("/x/web-interface/search/all/v2", { keyword: keyword || "", page: page || 1, page_size: PAGE_SIZE }, { headers: SEARCH_HEADERS, useCookie: true });
  }
  return body?.data || {};
}

function pageEnd(data, page) {
  const total = Number(data && (data.numResults || data.num_results || data.total));
  return total > 0 ? Number(page || 1) * PAGE_SIZE >= total : true;
}

async function searchVideos(keyword, page) {
  const resultData = await searchBase(keyword, page, "video");
  let list = resultData.result || resultData.items || resultData.video || [];
  if (!Array.isArray(list) && Array.isArray(resultData.result)) list = resultData.result;
  // search/all/v2 groups results by result_type.
  if (Array.isArray(list) && list.length && list[0]?.data) list = list.find((group) => group.result_type === "video")?.data || [];
  return { isEnd: pageEnd(resultData, page) || list.length < PAGE_SIZE, data: list.map(formatMedia) };
}

async function searchArtists(keyword, page) {
  const resultData = await searchBase(keyword, page, "bili_user");
  let list = resultData.result || resultData.items || [];
  if (Array.isArray(list) && list.length && list[0]?.data) list = list.find((group) => group.result_type === "bili_user" || group.result_type === "user")?.data || [];
  return {
    isEnd: pageEnd(resultData, page) || list.length < PAGE_SIZE,
    data: list.map((result) => ({
      id: result.mid, name: decodeHtml(result.uname || result.name), fans: Number(result.fans) || undefined,
      description: result.usign || result.sign, avatar: normalizeImage(result.upic || result.face), worksNum: Number(result.videos) || undefined,
    })),
  };
}

async function getCookieMid() {
  const value = cookieValue("DedeUserID");
  if (value && /^\d+$/.test(value)) return value;
  try {
    const nav = await rawApiGet("/x/web-interface/nav", {}, { useCookie: true });
    const mid = nav?.data?.mid;
    return mid && /^\d+$/.test(String(mid)) ? String(mid) : "";
  } catch (_) { return ""; }
}

async function getFavoriteFolders(mid) {
  const userMid = mid || await getCookieMid();
  if (!userMid) return [];
  const body = await rawApiGet("/x/v3/fav/folder/created/list", { up_mid: userMid, ps: 50, pn: 1 }, { useCookie: true });
  const list = body?.data?.list || body?.data?.folders;
  return Array.isArray(list) ? list : [];
}

async function searchSheets(keyword, page) {
  const folders = await getFavoriteFolders();
  const query = String(keyword || "").toLowerCase();
  const matched = folders.filter((folder) => !query || String(folder.title || "").toLowerCase().includes(query));
  if (matched.length) {
    const start = ((Number(page) || 1) - 1) * PAGE_SIZE;
    return {
      isEnd: start + PAGE_SIZE >= matched.length,
      data: matched.slice(start, start + PAGE_SIZE).map((folder) => ({
        id: String(folder.id || folder.fid), title: folder.title || "", artwork: normalizeImage(folder.cover),
        description: folder.intro || "", worksNum: Number(folder.media_count || folder.cnt) || 0,
        artist: folder.upper?.name || "", _bilibiliType: "favorite",
      })),
    };
  }
  const videos = await searchVideos(keyword, page);
  return { isEnd: videos.isEnd, data: videos.data.map((item) => ({ ...item, id: item.bvid || item.aid, worksNum: 1, _bilibiliType: "video" })) };
}

function randomDmString() {
  return Buffer.from(Array.from({ length: 36 }, () => Math.floor(32 + Math.random() * 96))).toString("base64").replace(/=+$/, "");
}

async function getArtistWorks(artistItem = {}, page = 1, type = "music") {
  const mid = String(artistItem.id || artistItem.mid || "");
  if (!mid || (type && type !== "music" && type !== "album")) return { isEnd: true, data: [] };
  const params = {
    mid, pn: String(page || 1), ps: "30", index: "1", order: "pubdate", order_avoided: "true",
    platform: "web", web_location: "333.1387", dm_img_list: "[]", dm_img_str: randomDmString(),
    dm_cover_img_str: randomDmString(), dm_img_inter: '{"ds":[],"wh":[0,0,0],"of":[0,0,0]}',
  };
  try {
    const body = await apiGet("/x/space/wbi/arc/search", params, { wbi: true, useCookie: true, timeout: 25000 });
    const list = body.data?.list?.vlist || [];
    const pageInfo = body.data?.page || {};
    return {
      isEnd: list.length < Number(pageInfo.ps || 30) || Number(pageInfo.pn || page) * Number(pageInfo.ps || 30) >= Number(pageInfo.count || 0),
      data: list.map(formatMedia),
    };
  } catch (error) {
    console.error(`[bilibili] getArtistWorks: ${error.message}`);
    return { isEnd: true, data: [] };
  }
}

async function getFavoriteList(id, page = 1, all = false) {
  const result = [];
  let info = null, hasMore = false, pn = Number(page) || 1;
  const maxPages = all ? 10000 : 1;
  const pageSignatures = new Set();
  for (let count = 0; count < maxPages; count += 1) {
    const body = await rawApiGet("/x/v3/fav/resource/list", { media_id: id, platform: "web", ps: 36, pn }, { useCookie: true });
    const data = body?.data;
    if (!data || body.code !== 0) throw new Error('[bilibili] 收藏夹分页请求失败');
    info = info || data.info || null;
    if (!Array.isArray(data.medias) && data.info?.mid && count === 0) {
      // Older links expose `fid`; the resource endpoint now expects the
      // composite folder id returned by created/list.
      const folders = await getFavoriteFolders(String(data.info.mid));
      const folder = folders.find((entry) => String(entry.id) === String(id) || String(entry.fid) === String(id));
      if (folder && String(folder.id) !== String(id)) return getFavoriteList(String(folder.id), page, all);
    }
    if (!Array.isArray(data.medias)) {
      if (result.length || data.has_more || Number(info?.media_count) > 0) {
        throw new Error('[bilibili] 收藏夹分页数据异常');
      }
      hasMore = false;
      break;
    }
    const signature = JSON.stringify(data.medias.map(item => item.id ?? item.bvid ?? item.aid));
    if (data.medias.length && pageSignatures.has(signature)) throw new Error('[bilibili] 收藏夹分页重复');
    pageSignatures.add(signature);
    result.push(...data.medias);
    hasMore = data.has_more === true || data.has_more === 1 || data.has_more === '1';
    if (hasMore && !data.medias.length) throw new Error('[bilibili] 收藏夹分页提前结束');
    if (!hasMore || !all) break;
    pn += 1;
  }
  if (all && hasMore) throw new Error('[bilibili] 收藏夹分页超出合理范围，请重试');
  return { info, medias: result, hasMore };
}

function favoriteMediaToItem(media) {
  const item = formatMedia({ ...media, pic: media.cover, owner: media.upper, aid: media.aid, bvid: media.bvid });
  item.id = media.cid || media.bvid || media.aid || media.id;
  item.album = media.bvid || media.aid;
  return item;
}

function extractFavoriteId(value) {
  const input = String(value || "").trim();
  if (/^\d+$/.test(input)) return input;
  const patterns = [/[?&](?:fid|media_id)=(\d+)/i, /\/(?:ml|pl)(\d+)/i, /\/fav(?:list|folder|resource)\/(\d+)/i, /bilibili\.com\/medialist\/detail\/ml(\d+)/i];
  for (const pattern of patterns) {
    const match = input.match(pattern);
    if (match) return match[1];
  }
  return "";
}

async function importMusicSheet(urlLike) {
  const text = String(urlLike || "").trim();
  const bvid = (text.match(/\b(BV[a-zA-Z0-9]{10})\b/) || [])[1];
  if (bvid) {
    const view = await getVideoView({ bvid });
    const pages = view.pages || [{ cid: view.cid, part: view.title, duration: view.duration }];
    return {
      id: bvid, title: decodeHtml(view.title), artwork: normalizeImage(view.pic), artist: view.owner?.name || "",
      description: view.desc || "", worksNum: pages.length,
      musicList: pages.map((part) => formatMedia({ ...view, cid: part.cid, title: part.part || view.title, duration: part.duration })),
    };
  }
  let id = extractFavoriteId(text);
  const mid = (text.match(/space\.bilibili\.com\/(\d+)/i) || [])[1];
  if (mid && id) {
    const folders = await getFavoriteFolders(mid);
    const folder = folders.find((entry) => String(entry.id) === String(id) || String(entry.fid) === String(id));
    if (folder?.id) id = String(folder.id);
  }
  if (!id) return undefined;
  const favorite = await getFavoriteList(id, 1, true);
  const musicList = favorite.medias.map(favoriteMediaToItem);
  const info = favorite.info || {};
  return {
    id: String(info.id || info.fid || id), title: info.title || "", artwork: normalizeImage(info.cover),
    artist: info.upper?.name || "", description: info.intro || "", worksNum: Number(info.media_count || info.cnt) || musicList.length,
    createAt: Number(info.ctime) > 0 ? Number(info.ctime) * 1000 : undefined, musicList,
  };
}

async function getMusicSheetInfo(sheet = {}, page = 1) {
  if (sheet._bilibiliType === "video" || /^BV/i.test(String(sheet.id || ""))) {
    if (!sheet.bvid && sheet.aid) {
      const item = await getMusicInfo({ id: sheet.aid, aid: sheet.aid, cid: sheet.cid });
      return { isEnd: true, sheetItem: sheet, musicList: item ? [item] : [] };
    }
    const detail = await importMusicSheet(String(sheet.bvid || sheet.id));
    return { isEnd: true, sheetItem: detail, musicList: detail ? detail.musicList : [] };
  }
  const id = sheet.id || sheet.fid || sheet.media_id;
  if (!id) return { isEnd: true, musicList: [] };
  const favorite = await getFavoriteList(id, page, false);
  const musicList = favorite.medias.map(favoriteMediaToItem);
  const total = Number(favorite.info?.media_count || favorite.info?.cnt || 0);
  return {
    isEnd: !favorite.hasMore,
    sheetItem: favorite.info ? {
      ...sheet, id: String(favorite.info.id || id), title: favorite.info.title || sheet.title || "",
      artwork: normalizeImage(favorite.info.cover || sheet.artwork), description: favorite.info.intro || sheet.description || "",
      worksNum: total || sheet.worksNum || musicList.length,
    } : sheet,
    musicList,
  };
}

async function getAlbumInfo(albumItem = {}) {
  const video = await getVideoView(albumItem.bvid || albumItem.aid || albumItem.id);
  const pages = video.pages || [{ cid: video.cid, part: video.title, duration: video.duration }];
  return {
    albumItem: formatMedia(video),
    musicList: pages.map((part) => formatMedia({ ...video, cid: part.cid, title: part.part || video.title, duration: part.duration })),
  };
}

const BOARD_KEYS = [
  [0,"全站"],[3,"音乐"],[1,"动画"],[119,"鬼畜"],[168,"国创相关"],[129,"舞蹈"],[4,"游戏"],[36,"知识"],
  [188,"科技"],[234,"运动"],[223,"汽车"],[160,"生活"],[211,"美食"],[217,"动物圈"],[155,"时尚"],[5,"娱乐"],[181,"影视"],
];

async function getTopLists() {
  const cover = "https://s1.hdslb.com/bfs/static/jinkela/popular/assets/icon_rank.png";
  const weeklyCover = "https://s1.hdslb.com/bfs/static/jinkela/popular/assets/icon_weekly.png";
  let weekly = [];
  try {
    const body = await rawApiGet("/x/web-interface/popular/series/list", {}, { useCookie: true });
    weekly = (body?.data?.list || []).slice(0, 12).map((entry) => ({
      id: `popular/series/one?number=${entry.number}`, title: entry.subject || entry.name || `每周必看 ${entry.number}`,
      description: entry.name || "", coverImg: weeklyCover,
    }));
  } catch (_) {}
  return [
    { title: "每周必看", data: weekly },
    { title: "热门", data: [
      { id: "popular?ps=20&pn=1", title: "热门视频", coverImg: cover },
      { id: "popular/precious?page_size=100&page=1", title: "入站必刷", coverImg: cover },
    ] },
    { title: "排行榜", data: BOARD_KEYS.map(([rid, title]) => ({ id: `ranking/v2?rid=${rid}&type=all`, title, coverImg: cover })) },
  ];
}

async function getTopListDetail(topListItem = {}) {
  const rawId = String(topListItem.id || "");
  const question = rawId.indexOf("?");
  const path = question >= 0 ? rawId.slice(0, question) : rawId;
  const query = question >= 0 ? rawId.slice(question + 1) : "";
  const params = parseQueryString(query);
  const needsWbi = path.includes("ranking") || path.includes("popular/series") || path === "popular";
  let body = null;
  try { body = await rawApiGet(`/x/web-interface/${path}`, params, { wbi: needsWbi, useCookie: true }); } catch (_) { body = null; }
  if (!body || body.code !== 0) {
    try { body = await rawApiGet(`/x/web-interface/${path}`, params, { useCookie: true }); } catch (_) { body = null; }
  }
  const data = body?.data;
  const list = data?.list || data?.item || data?.archives || data?.result || [];
  return { ...topListItem, musicList: (Array.isArray(list) ? list : []).map(formatMedia) };
}

async function getRecommendSheetTags() {
  return {
    pinned: [{ id:"popular",title:"热门" },{ id:"3",title:"音乐" },{ id:"1",title:"动画" },{ id:"4",title:"游戏" },{ id:"36",title:"知识" },{ id:"188",title:"科技" }],
    data: [],
  };
}

async function getRecommendSheetsByTag(tag = {}, page = 1) {
  const rid = String(tag.id || "popular");
  const asSheets = (items) => (items || []).map((item) => ({
    id: String(item.bvid || item.aid || item.id),
    title: item.title || "",
    artist: item.artist || "",
    artwork: item.artwork || "",
    description: item.description || "Bilibili 视频歌单",
    worksNum: 1,
    playCount: item.playCount,
    _bilibiliType: "video",
    bvid: item.bvid,
    aid: item.aid,
    musicList: [item],
  }));
  if (rid === "popular") {
    const detail = await getTopListDetail({ id: `popular?ps=20&pn=${page || 1}`, title: "热门" });
    return { isEnd: !detail.musicList || detail.musicList.length < PAGE_SIZE, data: asSheets(detail.musicList) };
  }
  const detail = await getTopListDetail({ id: `ranking/v2?rid=${encodeURIComponent(rid)}&type=all`, title: tag.title || "排行榜" });
  return { isEnd: true, data: asSheets(detail.musicList) };
}

function formatComment(item = {}) {
  const location = item.reply_control?.location;
  return {
    id: item.rpid, nickName: item.member?.uname || "", avatar: normalizeImage(item.member?.avatar),
    comment: item.content?.message || "", like: Number(item.like) || 0,
    createAt: Number(item.ctime) > 0 ? Number(item.ctime) * 1000 : undefined,
    location: location && String(location).replace(/^IP属地：/, ""),
  };
}

async function getMusicComments(musicItem = {}, page = 1) {
  const aid = musicItem.aid || (typeof musicItem.id === "number" || /^\d+$/.test(String(musicItem.id || "")) ? musicItem.id : "");
  if (!aid) return { isEnd: true, data: [] };
  const params = {
    type: 1, mode: 3, oid: aid, plat: 1, web_location: 1315875,
    pagination_str: JSON.stringify({ offset: page > 1 ? String((page - 1) * PAGE_SIZE) : "" }),
  };
  try {
    const body = await apiGet("/x/v2/reply/wbi/main", params, { wbi: true, useCookie: true });
    const replies = body.data?.replies || [];
    const data = replies.map((reply) => {
      const comment = formatComment(reply);
      if (reply.replies?.length) comment.replies = reply.replies.map(formatComment);
      return comment;
    });
    return { isEnd: Boolean(body.data?.cursor?.is_end) || data.length < PAGE_SIZE, data };
  } catch (error) {
    console.error(`[bilibili] getMusicComments: ${error.message}`);
    return { isEnd: true, data: [] };
  }
}

function subtitleToLrc(payload) {
  if (typeof payload === "string") {
    try { payload = JSON.parse(payload); } catch (_) { return ""; }
  }
  const body = Array.isArray(payload) ? payload : payload?.body;
  if (!Array.isArray(body)) return "";
  return body.map((line) => {
    const from = Number(line.from);
    if (!Number.isFinite(from)) return "";
    const minutes = Math.floor(from / 60).toString().padStart(2, "0");
    const seconds = (from % 60).toFixed(2).padStart(5, "0");
    return `[${minutes}:${seconds}]${String(line.content || "")}`;
  }).filter(Boolean).join("\n");
}

async function getLyric(musicItem = {}) {
  const bvid = musicItem.bvid || (typeof musicItem.id === "string" && /^BV/i.test(musicItem.id) ? musicItem.id : "");
  const aid = musicItem.aid || (!bvid && /^\d+$/.test(String(musicItem.id || "")) ? musicItem.id : "");
  let cid = musicItem.cid;
  try {
    if (!cid) {
      const view = await getVideoView({ bvid, aid });
      cid = view.cid || view.pages?.[0]?.cid;
    }
    const body = await apiGet("/x/player/wbi/v2", { ...(bvid ? { bvid } : { aid }), cid }, { wbi: true, useCookie: true });
    const subtitles = body.data?.subtitle?.subtitle || body.data?.subtitle?.list || [];
    const subtitle = subtitles.find((item) => /zh|中文/i.test(item.lan || item.lan_doc || "")) || subtitles[0];
    if (!subtitle) return { rawLrc: "" };
    const url = normalizeImage(subtitle.subtitle_url || subtitle.url);
    if (!url) return { rawLrc: "" };
    const response = await axios.get(url, { headers: getMediaHeaders(musicItem), timeout: 15000 });
    return { rawLrc: subtitleToLrc(response.data), artwork: musicItem.artwork };
  } catch (error) {
    console.error(`[bilibili] getLyric: ${error.message}`);
    return { rawLrc: "", artwork: musicItem.artwork };
  }
}

function getMusicDetailPageUrl(musicItem = {}) {
  const bvid = musicItem.bvid || musicItem._bilibiliData?.bvid || (typeof musicItem.id === "string" && /^BV/i.test(musicItem.id) ? musicItem.id : "");
  if (bvid) return `https://www.bilibili.com/video/${bvid}`;
  const aid = musicItem.aid || musicItem._bilibiliData?.aid || (/^\d+$/.test(String(musicItem.id || "")) ? musicItem.id : "");
  return aid ? `https://www.bilibili.com/video/av${aid}` : "";
}

async function importMusicItem(urlLike) {
  const text = String(urlLike || "");
  const bvid = (text.match(/\b(BV[a-zA-Z0-9]{10})\b/) || [])[1];
  const aid = (text.match(/(?:av|aid[=/])([0-9]+)/i) || [])[1] || (/^\d+$/.test(text.trim()) ? text.trim() : "");
  if (!bvid && !aid) return undefined;
  return getMusicInfo({ bvid, aid, id: bvid || aid });
}

async function getHotSearch() {
  const response = await axios.get(`${API_BASE}/x/web-interface/wbi/search/square`, {
    params: { limit: 30 }, headers: HTTP_HEADERS, timeout: 10000,
  });
  const body = response.data;
  const list = body?.data?.trending?.list;
  if (body?.code !== 0 || !Array.isArray(list)) {
    throw new Error("Bilibili热搜加载失败，请稍后重试");
  }
  return [...new Set(list.map(item => item?.keyword)
    .filter(word => typeof word === "string" && word.trim())
    .map(word => word.trim()))].slice(0, 30);
}

module.exports = {
  getHotSearch,
  platform: "bilibili",
  author: "Toskysun",
  version: "2.1.0",
  appVersion: ">=0.1.0-alpha.0",
  srcUrl: "https://music.cwo.cc.cd/plugins/bilibili.js",
  cacheControl: "no-cache",
  primaryKey: ["id", "aid", "bvid", "cid"],
  supportedQualities: ["128k", "192k", "320k", "flac", "hires", "dolby"],
  supportedVideoQualities: ["360p", "480p", "720p", "720p60", "1080p", "1080p+", "1080p60", "4k", "hdr", "dolby_vision", "8k"],
  userVariables: [
    {
      key: "SESSDATA", name: "Bilibili Cookie / SESSDATA",
      hint: "可填写浏览器完整 Cookie，或只填写 SESSDATA；登录后会重新探测会员、杜比和 Hi-Res 音质。",
    },
    {
      key: "BILI_COOKIE", name: "Bilibili 完整 Cookie（可选）",
      hint: "优先使用此字段。支持 buvid3、bili_jct、DedeUserID 等登录字段。",
    },
    {
      key: "CK", name: "CK（Cookie 别名，可选）",
      hint: "兼容旧版客户端的 CK 字段；可填写完整浏览器 Cookie。",
    },
  ],
  hints: {
    importMusicSheet: [
      "支持收藏夹 URL、fid/media_id、/medialist/detail/ml数字，也支持直接粘贴 BV 视频链接（多分P会展开为歌单）",
      "私有收藏夹需要在用户变量中填写完整 Cookie；公开收藏夹可直接导入",
    ],
    importMusicItem: ["支持 BV/av 视频链接或直接输入 BV 号、AV 号"],
  },
  supportedSearchType: ["music", "album", "sheet", "artist", "lyric"],
  async search(query, page = 1, type = "music") {
    if (type === "artist") return searchArtists(query, page);
    if (type === "sheet") return searchSheets(query, page);
    return searchVideos(query, page);
  },
  getMediaSource,
  getMvSource,
  getMusicInfo,
  getMusicDetailPageUrl,
  getLyric,
  getAlbumInfo,
  getArtistWorks,
  importMusicSheet,
  importMusicItem,
  getMusicSheetInfo,
  getRecommendSheetTags,
  getRecommendSheetsByTag,
  getTopLists,
  getTopListDetail,
  getMusicComments,
};

}, "哔哩哔哩");

  __PLUGINS["mg"] = __loadPlugin(function (module, exports, require) {
/* ===== 咪咕音乐 (https://music.cwo.cc.cd/plugins/mg.js) ===== */
/**
 * 咪咕音乐 BakaMusic 免密插件
 * 内置官方听歌线路，无需 source/key；支持咪咕全部 8 档音质
 * @version 1.3.3
 */
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });

const axios_1 = require("axios");

const cheerio_1 = require("cheerio");

const CryptoJS = require("crypto-js");

const { Buffer } = require('buffer');

const searchRows = 20;

const BASE_SUPPORTED_QUALITIES = [
  "mgg",
  "128k",
  "320k",
  "flac",
  "flac24bit",
  "hires",
  "atmos",
  "atmos_plus",
];

/** BakaMusic 音质键 -> 咪咕 toneFlag */
const qualityLevels = {
  mgg: "LQ",
  "128k": "PQ",
  "320k": "HQ",
  flac: "SQ",
  flac24bit: "ZQ24",
  hires: "ZQ32",
  atmos: "Z3D",
  atmos_plus: "3D60",
};

const MIGU_QUALITY_FALLBACKS = {
  mgg: ["mgg", "128k"],
  "128k": ["128k", "mgg"],
  "320k": ["320k", "128k", "mgg"],
  flac: ["flac", "320k", "128k", "mgg"],
  flac24bit: ["flac24bit", "flac", "320k", "128k", "mgg"],
  hires: ["hires", "flac24bit", "flac", "320k", "128k", "mgg"],
  atmos: ["atmos", "hires", "flac24bit", "flac", "320k", "128k", "mgg"],
  atmos_plus: ["atmos_plus", "atmos", "hires", "flac24bit", "flac", "320k", "128k", "mgg"],
};

const MIGU_QUALITY_INFO = {
  LQ: { key: "mgg", bitrate: 64000 },
  PQ: { key: "128k", bitrate: 128000 },
  HQ: { key: "320k", bitrate: 320000 },
  SQ: { key: "flac", bitrate: 1411000 },
  ZQ: { key: "flac24bit", bitrate: 2304000 },
  ZQ24: { key: "flac24bit", bitrate: 2304000 },
  ZQ32: { key: "hires", bitrate: 4608000 },
  Z3D: { key: "atmos", bitrate: 4608000 },
  "3D60": { key: "atmos_plus", bitrate: 4608000 },
};

const MIGU_TONE_PATHS = {
  LQ: encodeURI("全曲试听/Mp3_64_22_16"),
  PQ: encodeURI("标清高清/MP3_128_16_Stero"),
  HQ: encodeURI("标清高清/MP3_320_16_Stero"),
  SQ: encodeURI("歌曲下载/flac"),
  ZQ24: encodeURI("歌曲下载/flac_24bit"),
  ZQ32: encodeURI("歌曲下载/wav_32bit"),
  Z3D: encodeURI("歌曲下载/wav_3d"),
  "3D60": encodeURI("歌曲下载/wav_3d_60s"),
};

const MIGU_TONE_EXTENSIONS = {
  LQ: ".mp3",
  PQ: ".mp3",
  HQ: ".mp3",
  SQ: ".flac",
  ZQ24: ".flac",
  ZQ32: ".wav",
  Z3D: ".wav",
  "3D60": ".wav",
};

const MIGU_STRATEGY_KEY = "Jk8qzuePiJ1qE3mDYhLQ3T73DtDoAhLP";

function decodeMiguStrategyResponse(data) {
  const encrypted = Buffer.isBuffer(data) ? data : Buffer.from(data);
  if (
    encrypted.length < 4 ||
    encrypted[0] !== 0xab ||
    encrypted[1] !== 0xcd ||
    encrypted[2] !== 0x01
  ) {
    throw new Error("咪咕播放接口返回了未知数据格式");
  }

  const offset = encrypted[3];
  const key = Buffer.from(MIGU_STRATEGY_KEY, "utf8");
  const decrypted = Buffer.alloc(encrypted.length - 4);
  for (let i = 4; i < encrypted.length; i++) {
    decrypted[i - 4] = (encrypted[i] + offset - key[(i - 4) % key.length] + 256) % 256;
  }

  return JSON.parse(decrypted.toString("utf8"));
}

function detectMiguToneFlag(url) {
  for (const [toneFlag, path] of Object.entries(MIGU_TONE_PATHS)) {
    if (String(url).includes(path)) return toneFlag;
  }
  return "";
}

function replaceMiguTone(url, targetToneFlag, sourceToneFlag, stripQuery = true) {
  let result = String(url || "");
  if (stripQuery) result = result.split("?")[0];
  const source = sourceToneFlag || detectMiguToneFlag(result);
  if (!MIGU_TONE_PATHS[targetToneFlag] || !MIGU_TONE_PATHS[source]) return result;

  result = result.replace(MIGU_TONE_PATHS[source], MIGU_TONE_PATHS[targetToneFlag]);
  return result.replace(MIGU_TONE_EXTENSIONS[source], MIGU_TONE_EXTENSIONS[targetToneFlag]);
}

function normalizeMiguToneFlag(quality) {
  const requestedQuality = normalizeMiguQualityKey(quality);
  return qualityLevels[requestedQuality];
}

function normalizeMiguQualityKey(quality) {
  const requestedQuality = quality || "128k";
  if (qualityLevels[requestedQuality]) return requestedQuality;
  const entry = Object.entries(qualityLevels).find(([, toneFlag]) => toneFlag === requestedQuality);
  if (entry) return entry[0];
  throw new Error(`咪咕音乐不支持 ${requestedQuality} 音质`);
}

async function probeMiguMediaUrl(url) {
  try {
    const response = await axios_1.default.head(url, {
      timeout: 8000,
      maxRedirects: 5,
      validateStatus: () => true,
    });
    if (response.status >= 200 && response.status < 400) return true;
    if (response.status === 404 || response.status === 410) return false;
  } catch (_) {
    // 网络波动时保留目标音质，避免错误降级。
  }
  return null;
}

async function resolveMiguStrategyUrl(baseUrl, requestedQuality) {
  const candidates = MIGU_QUALITY_FALLBACKS[requestedQuality] || [requestedQuality, "128k"];
  for (const candidateQuality of candidates) {
    const candidateUrl = replaceMiguTone(baseUrl, qualityLevels[candidateQuality], "PQ");
    if (candidateQuality === "128k") {
      return { url: candidateUrl, quality: candidateQuality };
    }

    const available = await probeMiguMediaUrl(candidateUrl);
    if (available !== false) {
      if (candidateQuality !== requestedQuality) {
        console.warn(`[咪咕] ${requestedQuality} 资源不可用，已降级至 ${candidateQuality}`);
      }
      return { url: candidateUrl, quality: candidateQuality };
    }
  }
  return null;
}

/**
 * 官方线路：resourceinfo 解析 ID -> strategy/listen-url 解密 -> CDN 音质路径转换
 * 返回 { code: 200, url } 或抛错
 */
async function requestMusicUrl(_source, musicItem, quality) {
  const item = musicItem && typeof musicItem === "object" ? musicItem : { copyrightId: musicItem };
  const itemId = String(item.id || "");
  let copyrightId = String(item.copyrightId || item.copyright_id || "");
  let contentId = String(item.contentId || item.content_id || "");
  let miguSongId = String(item.songId || "");

  if (!contentId && /^\d{15,}$/.test(itemId)) contentId = itemId;
  if (!miguSongId && itemId && itemId !== contentId) miguSongId = itemId;
  if (!copyrightId && itemId && !contentId) copyrightId = itemId;
  if (!copyrightId && !contentId) throw new Error("缺少 copyrightId/contentId");

  const requestedQuality = normalizeMiguQualityKey(quality);
  const toneFlag = normalizeMiguToneFlag(requestedQuality);
  const headersC = {
    channel: "0140210",
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    Referer: "https://m.music.migu.cn/",
  };

  if (copyrightId && (!contentId || !miguSongId)) {
    try {
      const info = await axios_1.default.get(
        "https://c.musicapp.migu.cn/MIGUM2.0/v1.0/content/resourceinfo.do?resourceType=2&copyrightId=" +
          encodeURIComponent(copyrightId),
        { headers: headersC, timeout: 10000 }
      );
      const resource = info.data && info.data.resource && info.data.resource[0];
      if (resource) {
        contentId = String(resource.contentId || contentId || "");
        miguSongId = String(resource.songId || miguSongId || "");
        copyrightId = String(resource.copyrightId || copyrightId || "");
      }
    } catch (e) {
      console.error("[咪咕] resourceinfo 失败:", e.message);
    }
  }

  const extractUrl = (body) => {
    if (!body) return null;
    if (typeof body === "string") {
      try {
        body = JSON.parse(body);
      } catch (_) {
        return null;
      }
    }
    let url =
      (body.data &&
        (body.data.url ||
          body.data.playUrl ||
          body.data.listenUrl ||
          (body.data.songItem && body.data.songItem.url))) ||
      body.playUrl ||
      body.listenUrl ||
      body.url;
    if (!url && body.data) {
      const s = JSON.stringify(body.data);
      const m = s.match(/https?:\/\/[^"'\\]+?\.(?:mp3|m4a|aac|flac|wav)[^"'\\]*/i);
      if (m) url = m[0];
    }
    if (!url) return null;
    if (url.startsWith("//")) url = "https:" + url;
    return String(url).replace(/\+/g, "%2B");
  };

  if (contentId) {
    try {
      const strategyHeaders = {
        birth: "h5page",
        channel: "014X031",
        Referer: "https://y.migu.cn/",
        "location-data": "30.6698676660,104.1229614820",
        "location-info": "",
      };
      const response = await axios_1.default.get(
        "https://c.musicapp.migu.cn/strategy/listen-url/h5/v2.4?contentId=" +
          encodeURIComponent(contentId) +
          "&copyrightId=" +
          encodeURIComponent(copyrightId) +
          "&resourceType=2&netType=01&toneFlag=PQ&scene=&lowerQualityContentId=" +
          encodeURIComponent(contentId),
        { headers: strategyHeaders, responseType: "arraybuffer", timeout: 10000 }
      );
      const decoded = decodeMiguStrategyResponse(response.data);
      const url = extractUrl(decoded);
      if (url) {
        const resolved = await resolveMiguStrategyUrl(url, requestedQuality);
        if (resolved) return { code: 200, ...resolved };
      }
    } catch (e) {
      console.error("[咪咕] strategy listen-url 失败:", e.message);
    }
  }

  // 兼容旧线路；部分歌曲或接口异常时仍可直接按 toneFlag 获取。
  if (miguSongId && contentId) {
    try {
      const r = await axios_1.default.get(
        "https://c.musicapp.migu.cn/MIGUM2.0/v2.0/content/listen-url?netType=00&resourceType=2&songId=" +
          encodeURIComponent(miguSongId) +
          "&toneFlag=" +
          toneFlag +
          "&copyrightId=" +
          encodeURIComponent(copyrightId) +
          "&contentId=" +
          encodeURIComponent(contentId),
        { headers: headersC, timeout: 10000 }
      );
      const url = extractUrl(r.data);
      if (url) {
        return {
          code: 200,
          url: replaceMiguTone(url, toneFlag, undefined, false),
          quality: requestedQuality,
        };
      }
      if (r.data && r.data.data && r.data.data.dialogInfo) {
        throw new Error(r.data.data.dialogInfo.text || "无法获取播放链接");
      }
    } catch (e) {
      console.error("[咪咕] listen-url v2.0 失败:", e.message);
    }
  }

  // 兜底：仅 contentId
  if (contentId || copyrightId) {
    try {
      const cid = contentId || copyrightId;
      const sid = miguSongId || "";
      const r = await axios_1.default.get(
        "https://c.musicapp.migu.cn/MIGUM2.0/v2.0/content/listen-url?netType=00&resourceType=2" +
          (sid ? "&songId=" + encodeURIComponent(sid) : "") +
          "&toneFlag=" +
          toneFlag +
          "&copyrightId=" +
          encodeURIComponent(copyrightId) +
          "&contentId=" +
          encodeURIComponent(cid),
        { headers: headersC, timeout: 10000 }
      );
      const url = extractUrl(r.data);
      if (url) {
        return {
          code: 200,
          url: replaceMiguTone(url, toneFlag, undefined, false),
          quality: requestedQuality,
        };
      }
    } catch (e) {
      console.error("[咪咕] listen-url 兜底失败:", e.message);
    }
  }

  throw new Error("咪咕官方线路获取失败");
}

const DELTA = 2654435769n;

const MIN_LENGTH = 32;

const keyArr = [
  27303562373562475n,
  18014862372307051n,
  22799692160172081n,
  34058940340699235n,
  30962724186095721n,
  27303523720101991n,
  27303523720101998n,
  31244139033526382n,
  28992395054481524n,
];

const MAX = 9223372036854775807n;

const MIN = -9223372036854775808n;

const mrcRegexps = {
  lineTime: /^\s*\[(\d+),\d+\]/,
  wordTime: /\(\d+,\d+\)/,
  wordTimeAll: /(\(\d+,\d+\))/g,
};

const boardList = [
  { id: '27553319', name: '尖叫新歌榜', bangid: '27553319', coverImg: 'https://d.musicapp.migu.cn/data/oss/column/00/1w/dk/3ebe613aca744a7c95e29d7e8e91f2e7' },
  { id: '27186466', name: '尖叫热歌榜', bangid: '27186466', coverImg: 'https://d.musicapp.migu.cn/data/oss/column/00/1w/dh/ab6099687adc46febf73f885107ddb37' },
  { id: '27553408', name: '尖叫原创榜', bangid: '27553408', coverImg: 'https://d.musicapp.migu.cn/data/oss/column/00/1w/dh/e98a179c357c436d8e2746fcbe64dda2' },
  { id: '75959118', name: '音乐风向榜', bangid: '75959118', coverImg: 'https://d.musicapp.migu.cn/data/oss/column/00/1w/hh/72ea2a03dd554a5abded58a49af05d32' },
  { id: '76557036', name: '彩铃分贝榜', bangid: '76557036', coverImg: 'https://d.musicapp.migu.cn/data/oss/column/00/1w/hi/c50f0baa268c486290cb35394ac0f8a0' },
  { id: '76557745', name: '会员臻爱榜', bangid: '76557745', coverImg: 'https://d.musicapp.migu.cn/data/oss/column/00/1w/hi/eab41af2aee7487cbb4b11b187f0dddb' },
  { id: '23189800', name: '港台榜', bangid: '23189800', coverImg: 'https://d.musicapp.migu.cn/data/oss/column/00/1w/dh/2d827a0ea8ea459992a9add11adba63e' },
  { id: '23189399', name: '内地榜', bangid: '23189399', coverImg: 'https://d.musicapp.migu.cn/data/oss/column/00/1w/di/b0fcbed68fa642048a5ebef817235c72' },
  { id: '19190036', name: '欧美榜', bangid: '19190036', coverImg: 'https://d.musicapp.migu.cn/data/oss/column/00/1w/dh/a97fbb1b8fd04f6eb648a05be773c87c' },
  { id: '83176390', name: '国风金曲榜', bangid: '83176390', coverImg: 'https://d.musicapp.migu.cn/data/oss/column/00/1w/di/b0fcbed68fa642048a5ebef817235c72' },
];

const UA =
  "Mozilla/5.0 (Linux; Android 6.0.1; Moto G (4)) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/89.0.4389.114 Mobile Safari/537.36 Edg/89.0.774.68";

const By = CryptoJS.MD5(UA).toString();

function sizeFormate(size) {
  if (!size || size === 0) return '0B';
  if (size < 1024) return size + 'B';
  if (size < 1024 * 1024) return (size / 1024).toFixed(2) + 'KB';
  if (size < 1024 * 1024 * 1024) return (size / (1024 * 1024)).toFixed(2) + 'MB';
  return (size / (1024 * 1024 * 1024)).toFixed(2) + 'GB';
}

function formatImgUrl(img) {
  if (!img) return null;
  if (/^https?:/.test(img)) return img;
  if (/^\/\//.test(img)) return 'http:' + img;
  return 'http://d.musicapp.migu.cn' + img;
}

function normalizeDurationSeconds(value) {
  if (value === undefined || value === null || value === '') return undefined;

  if (typeof value === 'string' && value.includes(':')) {
    const parts = value.split(':').map(part => parseInt(part, 10));
    if (parts.some(part => Number.isNaN(part))) return undefined;
    return parts.reduce((total, part) => total * 60 + part, 0);
  }

  const numericValue = Number(value);
  if (!Number.isFinite(numericValue) || numericValue <= 0) return undefined;

  // Migu V3 search returns seconds directly, while some legacy fields may still be milliseconds.
  return numericValue >= 1000 ? Math.floor(numericValue / 1000) : Math.floor(numericValue);
}

/**
 * 作者单曲 song-list 接口不返回 length/duration，但有 newRateFormats.size。
 * 用 CBR 档位（PQ/HQ/LQ）按体积反推秒数；flac/hires 码率不稳，不用于估算。
 */
function estimateDurationFromFormats(item) {
  if (!item || typeof item !== 'object') return undefined;
  const formats = []
    .concat(Array.isArray(item.newRateFormats) ? item.newRateFormats : [])
    .concat(Array.isArray(item.rateFormats) ? item.rateFormats : []);
  if (!formats.length) return undefined;

  const bitrateMap = {
    PQ: 128000,
    HQ: 320000,
    LQ: 48000,
  };

  for (const type of ['PQ', 'HQ', 'LQ']) {
    const format = formats.find((f) => f && f.formatType === type);
    if (!format) continue;
    const size = Number(format.size || format.androidSize || format.iosSize);
    const bitrate = bitrateMap[type];
    if (!Number.isFinite(size) || size < 1000 || !bitrate) continue;
    const seconds = Math.floor((size * 8) / bitrate);
    if (seconds > 5 && seconds < 7200) return seconds;
  }
  return undefined;
}

/** 咪咕列表常见时长字段：duration / length(00:03:02) / songTime 等；缺失时用音质 size 估算 */
function pickDurationSeconds(item) {
  if (!item || typeof item !== 'object') return undefined;
  const candidates = [
    item.duration,
    item.length,
    item.songTime,
    item.playTime,
    item.timeLength,
    item.songLength,
    item.lengthOfTrack,
  ];
  for (const value of candidates) {
    const seconds = normalizeDurationSeconds(value);
    if (seconds) return seconds;
  }
  return estimateDurationFromFormats(item);
}

function toMD5(str) {
  return CryptoJS.MD5(str).toString();
}

function createSignature(time, str) {
  const deviceId = '963B7AA0D21511ED807EE5846EC87D20';
  const signatureMd5 = '6cdc72a439cef99a3418d2a78aa28c73';
  const sign = toMD5(
    `${str}${signatureMd5}yyapp2d16148780a1dcc7408e06336b98cfd50${deviceId}${time}`
  );
  return { sign, deviceId };
}

function musicCanPlayFilter(_) {
  return _.mp3 || _.listenUrl || _.lisQq || _.lisCr;
}

function addMiguQuality(qualities, format) {
  if (!format) return;

  let formatType;
  let size;
  let bitrate;
  if (typeof format === 'string') {
    const parts = format.split('|');
    formatType = parts[0];
    bitrate = Number(parts[2]) || undefined;
    size = Number(parts[3]) || undefined;
  } else {
    formatType = format.formatType || format.toneFlag;
    size = format.asize || format.isize || format.size || format.androidSize || format.iosSize || format.fileSize;
    bitrate = format.bitRate || format.bitrate;
  }

  const definition = MIGU_QUALITY_INFO[formatType];
  if (!definition) return;
  qualities[definition.key] = {
    size: size ? sizeFormate(size) : 'N/A',
    bitrate: bitrate || definition.bitrate,
  };

  // 3D60 与 Z3D 使用同一歌曲资源编号；接口只声明 Z3D 时也可取到 60s 版本。
  if (formatType === 'Z3D' && !qualities.atmos_plus) {
    qualities.atmos_plus = {};
  }
}

function getMiGuQualitiesFromSong(songData) {
  const qualities = {};
  const formats = []
    .concat(Array.isArray(songData.audioFormats) ? songData.audioFormats : [])
    .concat(Array.isArray(songData.newRateFormats) ? songData.newRateFormats : [])
    .concat(Array.isArray(songData.rateFormats) ? songData.rateFormats : []);

  if (typeof songData.rateFormats === 'string') {
    songData.rateFormats.split('|').filter(Boolean).forEach((formatType) => {
      formats.push({ formatType });
    });
  }

  formats.forEach((format) => addMiguQuality(qualities, format));
  if (Object.keys(qualities).length === 0) {
    qualities['128k'] = {};
  }
  return qualities;
}

function extractLyricInfo(songData) {
  const sources = [
    songData,
    songData === null || songData === void 0 ? void 0 : songData.songInfo,
    songData === null || songData === void 0 ? void 0 : songData.musicInfo,
    songData === null || songData === void 0 ? void 0 : songData.objectInfo,
    songData === null || songData === void 0 ? void 0 : songData.fullSong,
  ].filter(Boolean);
  
  const pickUrl = (fields) => {
    for (const source of sources) {
      for (const field of fields) {
        if (source[field]) {
          return source[field];
        }
      }
    }
    return undefined;
  };
  
  return {
    lrcUrl: pickUrl(['lrcUrl', 'lrcurl', 'lyricUrl', 'lyricUrlNew']),
    mrcUrl: pickUrl(['mrcUrl', 'mrcurl', 'mrcLyricUrl']),
    trcUrl: pickUrl(['trcUrl', 'trcurl', 'trcLyricUrl']),
  };
}

function formatSingerName(singerList) {
  if (!singerList || !Array.isArray(singerList)) return '';
  return singerList.map(singer => singer.name || singer.singerName || '').filter(Boolean).join(', ');
}

const toLong = (str) => {
  const num = typeof str == 'string' ? BigInt('0x' + str) : str;
  if (num > MAX) return toLong(num - (1n << 64n));
  else if (num < MIN) return toLong(num + (1n << 64n));
  return num;
};

const toBigintArray = (data) => {
  const length = Math.floor(data.length / 16);
  const jArr = Array(length);
  for (let i = 0; i < length; i++) {
    jArr[i] = toLong(data.substring(i * 16, i * 16 + 16));
  }
  return jArr;
};

const longToBytes = (l) => {
  const result = Buffer.alloc(8);
  for (let i = 0; i < 8; i++) {
    result[i] = parseInt(l & 0xffn);
    l >>= 8n;
  }
  return result;
};

const longArrToString = (data) => {
  const arrayList = [];
  for (const j of data) arrayList.push(longToBytes(j).toString('utf16le'));
  return arrayList.join('');
};

const teaDecrypt = (data, key) => {
  const length = data.length;
  const lengthBigint = BigInt(length);
  if (length >= 1) {
    let j2 = data[0];
    let j3 = toLong((6n + 52n / lengthBigint) * DELTA);
    while (true) {
      let j4 = j3;
      if (j4 == 0n) break;
      let j5 = toLong(3n & toLong(j4 >> 2n));
      let j6 = lengthBigint;
      while (true) {
        j6--;
        if (j6 > 0n) {
          let j7 = data[j6 - 1n];
          let i = j6;
          j2 = toLong(
            data[i] -
              (toLong(toLong(j2 ^ j4) + toLong(j7 ^ key[toLong(toLong(3n & j6) ^ j5)])) ^
                toLong(
                  toLong(toLong(j7 >> 5n) ^ toLong(j2 << 2n)) +
                    toLong(toLong(j2 >> 3n) ^ toLong(j7 << 4n))
                ))
          );
          data[i] = j2;
        } else break;
      }
      let j8 = data[lengthBigint - 1n];
      j2 = toLong(
        data[0n] -
          toLong(
            toLong(toLong(key[toLong(toLong(j6 & 3n) ^ j5)] ^ j8) + toLong(j2 ^ j4)) ^
              toLong(
                toLong(toLong(j8 >> 5n) ^ toLong(j2 << 2n)) +
                  toLong(toLong(j2 >> 3n) ^ toLong(j8 << 4n))
              )
          )
      );
      data[0] = j2;
      j3 = toLong(j4 - DELTA);
    }
  }
  return data;
};

function decryptMrc(data) {
  if (data == null || data.length < MIN_LENGTH) return data;
  try {
    return longArrToString(teaDecrypt(toBigintArray(data), keyArr));
  } catch (error) {
    console.error('[咪咕] MRC解密失败:', error);
    return null;
  }
}

function parseMrc(str) {
  if (!str) return null;
  try {
    str = str.replace(/\r/g, '');
    const lines = str.split('\n');
    const lxlrcLines = [];
    const lrcLines = [];

    for (const line of lines) {
      if (line.length < 6) continue;
      let result = mrcRegexps.lineTime.exec(line);
      if (!result) continue;

      const startTime = parseInt(result[1]);
      let time = startTime;
      let ms = time % 1000;
      time /= 1000;
      let m = parseInt(time / 60).toString().padStart(2, '0');
      time %= 60;
      let s = parseInt(time).toString().padStart(2, '0');
      time = `${m}:${s}.${ms}`;

      let words = line.replace(mrcRegexps.lineTime, '');
      lrcLines.push(`[${time}]${words.replace(mrcRegexps.wordTimeAll, '')}`);

      let times = words.match(mrcRegexps.wordTimeAll);
      if (!times) continue;
      times = times.map((t) => {
        const r = /\((\d+),(\d+)\)/.exec(t);
        return `<${parseInt(r[1]) - startTime},${r[2]}>`;
      });
      const wordArr = words.split(mrcRegexps.wordTime);
      const newWords = times.map((t, index) => `${t}${wordArr[index]}`).join('');
      lxlrcLines.push(`[${time}]${newWords}`);
    }

    return {
      lyric: lrcLines.join('\n'),
      lxlyric: lxlrcLines.join('\n'),
    };
  } catch (error) {
    console.error('[咪咕] MRC解析失败:', error);
    return null;
  }
}

function cleanLyricText(text) {
  if (!text) return '';
  return text.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
}

async function getHighQualityPic(songId) {
  try {
    const res = await axios_1.default.get(
      `http://music.migu.cn/v3/api/music/audioPlayer/getSongPic?songId=${songId}`,
      {
        headers: {
          Referer: 'http://music.migu.cn/v3/music/player/audio?from=migu',
        },
      }
    );
    if (res.data && res.data.returnCode === '000000') {
      let url = res.data.largePic || res.data.mediumPic || res.data.smallPic;
      if (url && !/^https?:/.test(url)) url = 'http:' + url;
      return url;
    }
  } catch (error) {
    }
  return null;
}

async function fetchText(url) {
  if (!url) return '';
  try {
    const res = await axios_1.default.get(url, {
      headers: {
        'Referer': 'https://app.c.nf.migu.cn/',
        'User-Agent': 'Mozilla/5.0 (Linux; Android 5.1.1; Nexus 6 Build/LYZ28E)',
      },
    });
    return res.data || '';
  } catch (error) {
    console.error('[咪咕] 获取文本失败:', error);
    return '';
  }
}

async function searchMusicV3(query, page, limit = searchRows) {
  const time = Date.now().toString();
  const signData = createSignature(time, query);
  
  const headers = {
    uiVersion: 'A_music_3.6.1',
    deviceId: signData.deviceId,
    timestamp: time,
    sign: signData.sign,
    channel: '0146921',
    'User-Agent':
      'Mozilla/5.0 (Linux; U; Android 11.0.0; zh-cn; MI 11 Build/OPR1.170623.032) AppleWebKit/534.30 (KHTML, like Gecko) Version/4.0 Mobile Safari/534.30',
  };
  
  const url = `https://jadeite.migu.cn/music_search/v3/search/searchAll?isCorrect=0&isCopyright=1&searchSwitch=%7B%22song%22%3A1%2C%22album%22%3A0%2C%22singer%22%3A0%2C%22tagSong%22%3A1%2C%22mvSong%22%3A0%2C%22bestShow%22%3A1%2C%22songlist%22%3A0%2C%22lyricSong%22%3A0%7D&pageSize=${limit}&text=${encodeURIComponent(query)}&pageNo=${page}&sort=0&sid=USS`;
  
  try {
    const res = await axios_1.default.get(url, { headers });
    return res.data;
  } catch (error) {
    console.error('[咪咕] 搜索V3 API失败，回退到旧API:', error);
      return searchBase(query, page, 2);
  }
}

async function searchBase(query, page, type) {
  const headers = {
    Accept: "application/json, text/javascript, */*; q=0.01",
    "Accept-Encoding": "gzip, deflate, br",
    "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8,en-GB;q=0.7,en-US;q=0.6",
    Connection: "keep-alive",
    "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
    Host: "m.music.migu.cn",
    Referer: `https://m.music.migu.cn/v3/search?keyword=${encodeURIComponent(
      query
    )}`,
    "Sec-Fetch-Dest": "empty",
    "Sec-Fetch-Mode": "cors",
    "Sec-Fetch-Site": "same-origin",
    "User-Agent":
      "Mozilla/5.0 (Linux; Android 6.0.1; Moto G (4)) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/89.0.4389.114 Mobile Safari/537.36 Edg/89.0.774.68",
    "X-Requested-With": "XMLHttpRequest",
  };
  const params = {
    keyword: query,
    type,
    pgc: page,
    rows: searchRows,
  };
  const data = await axios_1.default.get(
    "https://m.music.migu.cn/migu/remoting/scr_search_tag",
    { headers, params }
  );
  return data.data;
}

async function searchMusic(query, page) {
  const result = await searchMusicV3(query, page);
  if (result && result.code === '000000' && result.songResultData) {
    const songResultData = result.songResultData || { resultList: [], totalCount: 0 };
    const musics = [];
    
    songResultData.resultList.forEach((itemArray) => {
      if (!Array.isArray(itemArray)) return;
      
      itemArray.forEach((item) => {
        if (!item.songId || !item.copyrightId) return;
        
        const qualities = {};
        
        if (item.audioFormats && Array.isArray(item.audioFormats)) {
          item.audioFormats.forEach((format) => addMiguQuality(qualities, format));
        }
        
        if (Object.keys(qualities).length === 0) {
          if (item.mp3 || item.listenUrl) {
            qualities['128k'] = {
              size: 'N/A',
              bitrate: 128000,
            };
          }
          if (item.lisQq) {
            qualities['320k'] = {
              size: 'N/A',
              bitrate: 320000,
            };
          }
          if (item.lisCr) {
            qualities['flac'] = {
              size: 'N/A',
              bitrate: 1411000,
            };
          }
        }
        
        if (Object.keys(qualities).length === 0) {
          qualities['128k'] = {
            size: 'N/A',
            bitrate: 128000,
          };
        }
        
        let artwork = item.img3 || item.img2 || item.img1 || null;
        if (artwork && !/https?:/.test(artwork)) artwork = 'http://d.musicapp.migu.cn' + artwork;

        const singerList = (item.singerList || []).map(s => ({
          id: s.id || s.singerId,
          name: s.name || s.singerName,
          avatar: s.img || s.singerPic || "",
        }));

        musics.push({
          id: item.songId,
          artwork: artwork,
          title: item.name || item.songName,
          artist: formatSingerName(item.singerList) || item.artist,
          singerList: singerList,
          album: item.album || item.albumName,
          url: item.mp3 || item.listenUrl,
          copyrightId: item.copyrightId,
          singerId: item.singerId,
          qualities: qualities,
          albumId: item.albumId,
          duration: pickDurationSeconds(item),
          lrcUrl: item.lrcUrl,
          mv: item.mvId || undefined,
          mvId: item.mvId || undefined,
          mvCopyrightId: item.mvCopyrightId || item.mvList?.[0]?.copyrightId || undefined,
          mrcUrl: item.mrcurl,          trcUrl: item.trcUrl,
        });
      });
    });
    
    return {
      isEnd: songResultData.totalCount <= page * searchRows,
      data: musics,
    };
  }
  
  if (result && result.musics) {
    const data = result;
    const musics = data.musics.map((_) => {
      const qualities = {};
      
      if (_.mp3 || _.listenUrl || musicCanPlayFilter(_)) {
        qualities['128k'] = {
          size: 'N/A',
          bitrate: 128000,
        };
      }
      
      if (_.lisQq || _.hqUrl) {
        qualities['320k'] = {
          size: 'N/A',
          bitrate: 320000,
        };
      }
      
      if (_.lisCr || _.sqUrl) {
        qualities['flac'] = {
          size: 'N/A',
          bitrate: 1411000,
        };
      }
      
      if (Object.keys(qualities).length === 0) {
        qualities['128k'] = {
          size: 'N/A',
          bitrate: 128000,
        };
      }

      let artwork = _.picL || _.picM || _.picS || _.cover || _.songPic || null;
      if (artwork && !/https?:/.test(artwork)) artwork = 'http://d.musicapp.migu.cn' + artwork;

      const singerList = _.singerId ? [{
        id: _.singerId,
        name: _.artist,
      }] : [];

      return {
        id: _.id,
        artwork: artwork,
        title: _.songName,
        artist: _.artist,
        singerList: singerList,
        album: _.albumName,
        url: musicCanPlayFilter(_),
        copyrightId: _.copyrightId,
        singerId: _.singerId,
        qualities: qualities,
        duration: pickDurationSeconds(_),
        vipFlag: _.vipFlag,
        mv: _.mvId || undefined,
        mvId: _.mvId || undefined,
        mvCopyrightId: _.mvCopyrightId || _.mvList?.[0]?.copyrightId || undefined,
        lrcUrl: _.lrcUrl,
        mrcUrl: _.mrcurl,
        trcUrl: _.trcUrl,
      };
    });
    
    return {
      isEnd: +data.pageNo * searchRows >= data.pgt,
      data: musics,
    };
  }
  
  return {
    isEnd: true,
    data: [],
  };
}

async function searchAlbumV3(query, page, limit = searchRows) {
  const time = Date.now().toString();
  const signData = createSignature(time, query);

  const headers = {
    uiVersion: 'A_music_3.6.1',
    deviceId: signData.deviceId,
    timestamp: time,
    sign: signData.sign,
    channel: '0146921',
    'User-Agent':
      'Mozilla/5.0 (Linux; U; Android 11.0.0; zh-cn; MI 11 Build/OPR1.170623.032) AppleWebKit/534.30 (KHTML, like Gecko) Version/4.0 Mobile Safari/534.30',
  };

  const url = `https://jadeite.migu.cn/music_search/v3/search/searchAll?isCorrect=1&isCopyright=1&searchSwitch=%7B%22song%22%3A0%2C%22album%22%3A1%2C%22singer%22%3A0%2C%22tagSong%22%3A0%2C%22mvSong%22%3A0%2C%22bestShow%22%3A0%2C%22songlist%22%3A0%2C%22lyricSong%22%3A0%7D&pageSize=${limit}&text=${encodeURIComponent(query)}&pageNo=${page}&sort=0&sid=USS`;

  try {
    const res = await axios_1.default.get(url, { headers });
    return res.data;
  } catch (error) {
    console.error('[咪咕] 搜索专辑V3 API失败:', error);
    return null;
  }
}

async function searchAlbum(query, page) {
  const result = await searchAlbumV3(query, page);

  if (result && result.code === '000000' && result.albumResultData) {
    const albumData = result.albumResultData || { result: [], totalCount: 0 };
    const rawList = albumData.result || albumData.resultList || [];
    const albums = [];

    rawList.forEach((item) => {
      if (!item || !item.id) return;

      let artwork = null;
      if (item.imgItems && item.imgItems.length > 0) {
        artwork = item.imgItems[0].img;
      } else if (item.img) {
        artwork = item.img;
      } else {
        artwork = item.localAlbumPicM || item.localAlbumPicS || item.albumPic;
      }

      albums.push({
        id: item.id,
        artwork: formatImgUrl(artwork),
        title: item.name || item.title,
        date: item.publishDate || item.publishTime,
        artist: formatSingerName(item.singers) || (item.singer ? (Array.isArray(item.singer) ? item.singer.map(s => s.name).join(', ') : item.singer) : ''),
        singer: item.singers || item.singer,
        description: item.albumIntro || item.intro,
        worksNum: item.songNum || item.songCount || item.fullSongTotal,
      });
    });

    return {
      isEnd: albumData.totalCount <= page * searchRows,
      data: albums,
    };
  }

  const data = await searchBase(query, page, 4);
  if (!data || !data.albums) {
    return { isEnd: true, data: [] };
  }

  const albums = data.albums.map((_) => ({
    id: _.id,
    artwork: formatImgUrl(_.albumPicL || _.albumPicM || _.albumPicS),
    title: _.title,
    date: _.publishDate,
    artist: (_.singer || []).map((s) => s.name).join(","),
    singer: _.singer,
    worksNum: _.fullSongTotal,
  }));
  return {
    isEnd: +data.pageNo * searchRows >= data.pgt,
    data: albums,
  };
}

async function searchArtistV3(query, page, limit = searchRows) {
  const time = Date.now().toString();
  const signData = createSignature(time, query);

  const headers = {
    uiVersion: 'A_music_3.6.1',
    deviceId: signData.deviceId,
    timestamp: time,
    sign: signData.sign,
    channel: '0146921',
    'User-Agent':
      'Mozilla/5.0 (Linux; U; Android 11.0.0; zh-cn; MI 11 Build/OPR1.170623.032) AppleWebKit/534.30 (KHTML, like Gecko) Version/4.0 Mobile Safari/534.30',
  };

  const url = `https://jadeite.migu.cn/music_search/v3/search/searchAll?isCorrect=1&isCopyright=1&searchSwitch=%7B%22song%22%3A0%2C%22album%22%3A0%2C%22singer%22%3A1%2C%22tagSong%22%3A0%2C%22mvSong%22%3A0%2C%22bestShow%22%3A0%2C%22songlist%22%3A0%2C%22lyricSong%22%3A0%7D&pageSize=${limit}&text=${encodeURIComponent(query)}&pageNo=${page}&sort=0&sid=USS`;

  try {
    const res = await axios_1.default.get(url, { headers });
    return res.data;
  } catch (error) {
    console.error('[咪咕] 搜索歌手V3 API失败:', error);
    return null;
  }
}

async function searchArtist(query, page) {
  const result = await searchArtistV3(query, page);

  if (result && result.code === '000000' && result.singerResultData) {
    const singerData = result.singerResultData || { result: [], totalCount: 0 };
    const rawList = singerData.result || singerData.resultList || [];
    const artists = [];

    rawList.forEach((item) => {
      if (!item || !item.id) return;

      let avatar = null;
      if (item.singerPicUrl && item.singerPicUrl.length > 0) {
        avatar = item.singerPicUrl[0].img;
      } else if (item.imgs && item.imgs.length > 0) {
        avatar = item.imgs[0].img;
      } else if (item.img) {
        avatar = item.img;
      }

      artists.push({
        id: item.id,
        name: item.name || item.title,
        avatar: formatImgUrl(avatar),
        description: item.intro || item.artistIntro,
        worksNum: item.songCount || item.songNum || item.musicNum,
        albumNum: item.albumCount || item.albumNum,
        fans: item.followNum || item.fansNum,
      });
    });

    return {
      isEnd: singerData.totalCount <= page * searchRows,
      data: artists,
    };
  }

  const data = await searchBase(query, page, 1);
  if (!data || !data.artists) {
    return { isEnd: true, data: [] };
  }

  const artists = data.artists.map((result) => ({
    name: result.title,
    id: result.id,
    avatar: formatImgUrl(result.artistPicL || result.artistPicM || result.artistPicS),
    worksNum: result.songNum,
  }));
  return {
    isEnd: +data.pageNo * searchRows >= data.pgt,
    data: artists,
  };
}

async function searchMusicSheetV3(query, page, limit = searchRows) {
  const time = Date.now().toString();
  const signData = createSignature(time, query);

  const headers = {
    uiVersion: 'A_music_3.6.1',
    deviceId: signData.deviceId,
    timestamp: time,
    sign: signData.sign,
    channel: '0146921',
    'User-Agent':
      'Mozilla/5.0 (Linux; U; Android 11.0.0; zh-cn; MI 11 Build/OPR1.170623.032) AppleWebKit/534.30 (KHTML, like Gecko) Version/4.0 Mobile Safari/534.30',
  };

  const url = `https://jadeite.migu.cn/music_search/v3/search/searchAll?isCorrect=1&isCopyright=1&searchSwitch=%7B%22song%22%3A0%2C%22album%22%3A0%2C%22singer%22%3A0%2C%22tagSong%22%3A0%2C%22mvSong%22%3A0%2C%22bestShow%22%3A0%2C%22songlist%22%3A1%2C%22lyricSong%22%3A0%7D&pageSize=${limit}&text=${encodeURIComponent(query)}&pageNo=${page}&sort=0&sid=USS`;

  try {
    const res = await axios_1.default.get(url, { headers });
    return res.data;
  } catch (error) {
    console.error('[咪咕] 搜索歌单V3 API失败:', error);
    return null;
  }
}

async function searchMusicSheet(query, page) {
  const result = await searchMusicSheetV3(query, page);

  if (result && result.code === '000000' && result.songListResultData) {
    const listData = result.songListResultData || { result: [], totalCount: 0 };
    const musicsheet = (listData.result || []).map((item) => {
      let artwork = item.musicListPicUrl || item.img;
      if (!artwork && item.imgItem) {
        artwork = item.imgItem.img;
      }

      return {
        id: item.id,
        title: item.name || item.title,
        artist: item.userName || item.ownerName,
        artwork: formatImgUrl(artwork),
        description: item.intro || item.summary,
        worksNum: item.musicNum || item.songCount,
        playCount: item.playNum || item.playCount,
      };
    });

    return {
      isEnd: listData.totalCount <= page * searchRows,
      data: musicsheet,
    };
  }

  const data = await searchBase(query, page, 6);
  if (!data || !data.songLists) {
    return { isEnd: true, data: [] };
  }

  const musicsheet = data.songLists.map((result) => ({
    title: result.name,
    id: result.id,
    artist: result.userName,
    artwork: formatImgUrl(result.picL || result.picM || result.picS || result.img || result.cover),
    description: result.intro,
    worksNum: result.musicNum,
    playCount: result.playNum,
  }));
  return {
    isEnd: +data.pageNo * searchRows >= data.pgt,
    data: musicsheet,
  };
}

async function searchLyricV3(query, page, limit = searchRows) {
  const time = Date.now().toString();
  const signData = createSignature(time, query);

  const headers = {
    uiVersion: 'A_music_3.6.1',
    deviceId: signData.deviceId,
    timestamp: time,
    sign: signData.sign,
    channel: '0146921',
    'User-Agent':
      'Mozilla/5.0 (Linux; U; Android 11.0.0; zh-cn; MI 11 Build/OPR1.170623.032) AppleWebKit/534.30 (KHTML, like Gecko) Version/4.0 Mobile Safari/534.30',
  };

  const searchSwitch = encodeURIComponent(
    JSON.stringify({
      song: 0,
      album: 0,
      singer: 0,
      tagSong: 0,
      mvSong: 0,
      bestShow: 0,
      songlist: 0,
      lyricSong: 1,
    })
  );

  const url = `https://jadeite.migu.cn/music_search/v3/search/searchAll?isCorrect=1&isCopyright=1&searchSwitch=${searchSwitch}&pageSize=${limit}&text=${encodeURIComponent(query)}&pageNo=${page}&sort=0&sid=USS`;

  try {
    const res = await axios_1.default.get(url, { headers });
    return res.data;
  } catch (error) {
    console.error('[咪咕] 搜索歌词V3 API失败:', error);
    return null;
  }
}

async function searchLyric(query, page) {
  const result = await searchLyricV3(query, page);

  if (result && result.code === '000000' && result.lyricResultData) {
    const lyricData = result.lyricResultData || { result: [], totalCount: 0 };
    const rawList = lyricData.result || lyricData.resultList || [];
    const flattened = [];

    rawList.forEach((item) => {
      if (!item) return;
      if (Array.isArray(item)) {
        item.forEach((sub) => sub && flattened.push(sub));
      } else {
        flattened.push(item);
      }
    });

    const lyrics = flattened
      .map((item) => {
        const wrapper = item.objectInfo || item;
        const songInfo = wrapper.songInfo || wrapper.fullSong || wrapper.musicInfo || wrapper;
        const lyricText =
          cleanLyricText(
            wrapper.lyric ||
              wrapper.lyricContent ||
              wrapper.lyricText ||
              wrapper.lyricTxt ||
              wrapper.lyricStr ||
              songInfo.lyric ||
              songInfo.lyricContent
          ) || '';

        let artwork = null;
        if (songInfo.albumImgs && songInfo.albumImgs.length > 0) {
          artwork = songInfo.albumImgs[0].img;
        } else if (songInfo.imgItems && songInfo.imgItems.length > 0) {
          artwork = songInfo.imgItems[0].img;
        } else {
          artwork =
            songInfo.img3 ||
            songInfo.img2 ||
            songInfo.img1 ||
            songInfo.albumPic ||
            songInfo.cover ||
            songInfo.songPic ||
            songInfo.picL ||
            songInfo.picM ||
            songInfo.picS ||
            songInfo.mediumPic ||
            songInfo.largePic ||
            songInfo.smallPic;
        }

        let artist = formatSingerName(songInfo.singerList);
        if (!artist && Array.isArray(songInfo.singers)) {
          artist = songInfo.singers.map((s) => s.name || s.singerName || s).filter(Boolean).join(', ');
        }
        if (!artist && Array.isArray(songInfo.artists)) {
          artist = songInfo.artists.map((s) => s.name || s.singerName || s).filter(Boolean).join(', ');
        }
        if (!artist) {
          if (Array.isArray(songInfo.singerName)) {
            artist = songInfo.singerName.join(', ');
          } else {
            artist = songInfo.singerName || songInfo.singer || songInfo.artist || '';
          }
        }

        const title = songInfo.songName || songInfo.name || songInfo.title;
        const id = songInfo.songId || songInfo.id || wrapper.id;

        if (!title || (!id && !songInfo.copyrightId)) {
          return null;
        }

        const lyricInfo = extractLyricInfo(wrapper);
        const songLyricInfo = extractLyricInfo(songInfo);

        return {
          title,
          id: id || songInfo.copyrightId,
          artist,
          artwork: formatImgUrl(artwork),
          album: songInfo.album || songInfo.albumName,
          lrc: lyricText,
          copyrightId: songInfo.copyrightId,
          lrcUrl: lyricInfo.lrcUrl || songLyricInfo.lrcUrl,
          mrcUrl: lyricInfo.mrcUrl || songLyricInfo.mrcUrl,
          trcUrl: lyricInfo.trcUrl || songLyricInfo.trcUrl,
        };
      })
      .filter(Boolean);

    const totalCount = Number(lyricData.totalCount || lyricData.total || 0);
    const isEnd = totalCount > 0 ? totalCount <= page * searchRows : lyrics.length < searchRows;

    return {
      isEnd,
      data: lyrics,
    };
  }

  try {
    const data = await searchBase(query, page, 7);
    const songs = Array.isArray(data?.songs) ? data.songs : [];
    const lyrics = songs.map((result) => {
      const lyricInfo = extractLyricInfo(result);
      return {
        title: result.title,
        id: result.id,
        artist: result.artist,
        artwork: formatImgUrl(
          result.img3 ||
            result.img2 ||
            result.img1 ||
            result.picL ||
            result.picM ||
            result.picS ||
            result.cover ||
            result.songPic ||
            result.albumPic ||
            result.mediumPic
        ),
        lrc: cleanLyricText(result.lyrics),
        album: result.albumName,
        copyrightId: result.copyrightId,
        lrcUrl: lyricInfo.lrcUrl,
        mrcUrl: lyricInfo.mrcUrl,
        trcUrl: lyricInfo.trcUrl,
      };
    });

    return {
      isEnd: data && data.pgt ? +data.pageNo * searchRows >= data.pgt : songs.length < searchRows,
      data: lyrics,
    };
  } catch (error) {
    console.error('[咪咕] 旧歌词搜索失败:', error);
  }

  return {
    isEnd: true,
    data: [],
  };
}

async function getMediaSource(musicItem, quality) {
  try {
    const res = await requestMusicUrl('mg', musicItem, quality || '128k');
    if (res && res.code === 200 && res.url) {
      return { url: res.url, quality: res.quality };
    }
    console.error(`[咪咕] 获取播放链接失败: ${(res && res.msg) || '未知错误'}`);
    return null;
  } catch (error) {
    console.error(`[咪咕] 获取播放源错误: ${error.message}`);
    throw error;
  }
}

async function getMiGuMusicInfo(copyrightId) {
  try {
    const res = await axios_1.default.post(
      'https://c.musicapp.migu.cn/MIGUM2.0/v1.0/content/resourceinfo.do?resourceType=2',
      `resourceId=${copyrightId}`,
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': 'Mozilla/5.0 (Linux; Android 6.0.1; Moto G (4)) AppleWebKit/537.36',
          'Referer': 'https://m.music.migu.cn/',
        },
      }
    );

    if (res.data && res.data.resource && res.data.resource.length > 0) {
      return res.data.resource[0];
    }
    return null;
  } catch (error) {
    console.error('[咪咕] 获取歌曲信息失败:', error);
    return null;
  }
}

const MIGU_MV_HEADERS = {
  channel: "0140210",
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
  Referer: "https://m.music.migu.cn/",
};

function parseMiguVideoDuration(value) {
  if (typeof value === "number") return value > 10000 ? Math.round(value / 1000) : Math.round(value);
  const parts = String(value || "").split(":").map(Number);
  if (parts.length === 3 && parts.every(Number.isFinite)) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2 && parts.every(Number.isFinite)) return parts[0] * 60 + parts[1];
  return undefined;
}

function orderMiguMvFormats(rateFormats, requestedQuality) {
  const formats = Array.isArray(rateFormats) ? rateFormats.filter((item) => item?.url) : [];
  if (!formats.length) return [];
  const requested = String(requestedQuality || "1080p").toLowerCase();
  const order = requested === "4k" || requested === "uhd"
    ? ["UHD", "SQ", "HQ", "PQ"]
    : Number(requested.replace(/p$/, "")) >= 1080
      ? ["HQ", "SQ", "UHD", "PQ"]
      : Number(requested.replace(/p$/, "")) >= 720
        ? ["HQ", "PQ", "SQ", "UHD"]
        : ["PQ", "HQ", "SQ", "UHD"];
  const ordered = order
    .map((formatType) => formats.find((item) => String(item.formatType).toUpperCase() === formatType))
    .filter(Boolean);
  return ordered.concat(formats.filter((item) => !ordered.includes(item)));
}

function getMiguMvQuality(formatType) {
  const type = String(formatType || "").toUpperCase();
  if (type === "UHD") return "4k";
  if (type === "SQ" || type === "HQ") return "1080p";
  return "720p";
}

function buildMiguMediaUrl(path) {
  if (!path) return "";
  if (/^\/\//.test(path)) return `https:${path}`;
  if (/^https?:\/\//i.test(path)) {
    return String(path).replace(/^http:\/\/freevod\.nf\.migu\.cn(?::8080)?/i, "https://freevod.nf.migu.cn");
  }
  return `https://freetyst.nf.migu.cn${path}`;
}

async function requestMiguMvPlayUrl(resource, format) {
  if (!resource?.contentId || !format?.url) return "";
  const response = await axios_1.default.get("https://c.musicapp.migu.cn/MIGUM2.0/v1.0/content/mvplayinfo.do", {
    params: {
      mvContentId: resource.contentId,
      mvCopyrightId: resource.copyrightId,
      format: format.format,
      url: format.url,
      size: format.size,
      resourceType: resource.resourceType || "D",
    },
    headers: MIGU_MV_HEADERS,
    timeout: 20000,
  });
  return response.data?.code === "000000" ? buildMiguMediaUrl(response.data.playUrl) : "";
}

async function getMvSource(musicItem, videoQuality = "1080p") {
  const mvId = musicItem?.mvId || musicItem?.mv || musicItem?.mvCopyrightId;
  if (!mvId) return null;

  try {
    const response = await axios_1.default.get("https://c.musicapp.migu.cn/MIGUM2.0/v1.0/content/resourceinfo.do", {
      params: { resourceType: "D", resourceId: String(mvId) },
      headers: MIGU_MV_HEADERS,
      timeout: 20000,
    });
    const resource = response.data?.resource?.[0];
    if (!resource) return null;
    const orderedFormats = orderMiguMvFormats(resource.rateFormats, videoQuality);
    let selected = orderedFormats[0] || null;
    let url = "";
    for (const format of orderedFormats) {
      try {
        url = await requestMiguMvPlayUrl(resource, format);
      } catch (_) {}
      if (url) {
        selected = format;
        break;
      }
    }
    // Older fixtures may expose a directly playable URL instead of mvplayinfo.
    if (!url) {
      url = buildMiguMediaUrl(selected?.url || resource.widescreenPath || resource.highscreenPath);
    }
    if (!url) return null;
    const isHls = /\.m3u8(?:\?|$)/i.test(url);
    const actualQuality = getMiguMvQuality(selected?.formatType);
    const selectedSize = Number(selected?.size) || undefined;
    return {
      url,
      headers: MIGU_MV_HEADERS,
      userAgent: MIGU_MV_HEADERS["User-Agent"],
      videoQuality: actualQuality,
      mimeType: isHls
        ? "application/vnd.apple.mpegurl"
        : selected?.fileType ? `video/${String(selected.fileType).toLowerCase()}` : "video/mp4",
      duration: parseMiguVideoDuration(resource.migumvDuration),
      size: selectedSize,
      availableVideoQualities: [{
        key: actualQuality,
        label: actualQuality,
        size: selectedSize,
        mimeType: isHls ? "application/vnd.apple.mpegurl" : "video/mp4",
      }],
      // mvplayinfo 返回带 playSessionId 的临时 HLS 地址，保守刷新以免缓存过期会话。
      expiresAt: isHls ? Date.now() + 30 * 60 * 1000 : undefined,
    };
  } catch (error) {
    console.error(`[咪咕] 获取 MV 播放源错误: ${error.message}`);
    return null;
  }
}

async function getMusicInfo(musicBase) {
  if (musicBase.artwork && musicBase.qualities && Object.keys(musicBase.qualities).length > 0) {
    return {
      id: musicBase.id,
      copyrightId: musicBase.copyrightId,
      title: musicBase.title,
      artist: musicBase.artist,
      album: musicBase.album,
      albumId: musicBase.albumId,
      artwork: musicBase.artwork,
      qualities: musicBase.qualities,
      mv: musicBase.mv,
      mvId: musicBase.mvId,
      mvCopyrightId: musicBase.mvCopyrightId,
      platform: '咪咕音乐',
    };
  }

  const songId = musicBase.id || musicBase.copyrightId || musicBase.songId;
  if (!songId) {
    console.error('[咪咕] getMusicInfo: 缺少有效的歌曲ID');
    return null;
  }

  try {
    const time = Date.now().toString();
    const signData = createSignature(time, songId);

    const url = `https://jadeite.migu.cn/music_search/v3/search/searchAll?isCorrect=0&isCopyright=1&searchSwitch=%7B%22song%22%3A1%2C%22album%22%3A0%2C%22singer%22%3A0%2C%22tagSong%22%3A1%2C%22mvSong%22%3A0%2C%22bestShow%22%3A1%2C%22songlist%22%3A0%2C%22lyricSong%22%3A0%7D&pageSize=10&text=${encodeURIComponent(songId)}&pageNo=1&sort=0&sid=USS`;

    const res = await axios_1.default.get(url, {
      headers: {
        uiVersion: 'A_music_3.6.1',
        deviceId: signData.deviceId,
        timestamp: time,
        sign: signData.sign,
        channel: '0146921',
        'User-Agent': 'Mozilla/5.0 (Linux; U; Android 11.0.0; zh-cn; MI 11 Build/OPR1.170623.032) AppleWebKit/534.30 (KHTML, like Gecko) Version/4.0 Mobile Safari/534.30',
      },
    });

    if (res.data && res.data.code === '000000' && res.data.songResultData) {
      const resultList = res.data.songResultData.resultList || [];

      for (const itemArray of resultList) {
        if (!Array.isArray(itemArray)) continue;

        for (const item of itemArray) {
          if (item.songId === songId || item.copyrightId === songId ||
              String(item.songId) === String(songId) || String(item.copyrightId) === String(songId)) {

            const qualities = {};
            if (item.audioFormats && Array.isArray(item.audioFormats)) {
              item.audioFormats.forEach((format) => addMiguQuality(qualities, format));
            }
            if (Object.keys(qualities).length === 0) {
              qualities['128k'] = {};
              qualities['320k'] = {};
            }

            let artwork = item.img3 || item.img2 || item.img1 || null;
            if (artwork && !/https?:/.test(artwork)) artwork = 'http://d.musicapp.migu.cn' + artwork;

                const singerList = (item.singerList || []).map(s => ({
              id: s.id || s.singerId,
              name: s.name || s.singerName,
            }));

            return {
              id: item.songId,
              copyrightId: item.copyrightId,
              title: item.name || item.songName,
              artist: formatSingerName(item.singerList) || item.artist,
              singerList: singerList,
              album: item.album || item.albumName,
              albumId: item.albumId,
              artwork: artwork,
              duration: pickDurationSeconds(item),
              qualities: qualities,
              mv: item.mvId || undefined,
              mvId: item.mvId || undefined,
              mvCopyrightId: item.mvCopyrightId || item.mvList?.[0]?.copyrightId || undefined,
              platform: '咪咕音乐',
            };
          }
        }
      }
    }

    console.error('[咪咕] getMusicInfo: 未找到歌曲信息');
    return null;
  } catch (error) {
    console.error('[咪咕] getMusicInfo 错误:', error.message);
    return null;
  }
}

async function getLyric(musicItem) {
  try {
    const mrcUrl = musicItem.mrcUrl;
    const lrcUrl = musicItem.lrcUrl;
    const trcUrl = musicItem.trcUrl;

    let musicInfo = null;
    if (!mrcUrl && !lrcUrl) {
      musicInfo = await getMiGuMusicInfo(musicItem.copyrightId);
    }

    const finalMrcUrl = mrcUrl || musicInfo?.mrcurl || musicInfo?.mrcUrl;
    const finalLrcUrl = lrcUrl || musicInfo?.lrcUrl;
    const finalTrcUrl = trcUrl || musicInfo?.trcUrl;

    if (!finalMrcUrl && !finalLrcUrl) {
      const headers = {
        Accept: "application/json, text/javascript, */*; q=0.01",
        "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
        Host: "m.music.migu.cn",
        Referer: `https://m.music.migu.cn/migu/l/?s=149&p=163&c=5200&j=l&id=${musicItem.copyrightId}`,
        "User-Agent": "Mozilla/5.0 (Linux; Android 6.0.1; Moto G (4)) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/89.0.4389.114 Mobile Safari/537.36 Edg/89.0.774.68",
      };
      const result = (
        await axios_1.default.get(
          "https://m.music.migu.cn/migu/remoting/cms_detail_tag",
          {
            headers,
            params: {
              cpid: musicItem.copyrightId,
            },
          }
        )
      ).data;
      return {
        rawLrc: result.data?.lyricLrc || '',
      };
    }

    let lyricPromise;

    if (finalMrcUrl) {
      lyricPromise = fetchText(finalMrcUrl).then(content => {
        if (!content) return null;
        const decrypted = decryptMrc(content);
        if (decrypted) {
          const parsed = parseMrc(decrypted);
          if (parsed) return parsed;
        }
        return null;
      });
    } else if (finalLrcUrl) {
      lyricPromise = fetchText(finalLrcUrl).then(text => ({
        lyric: text,
        lxlyric: '',
      }));
    }

    const translationPromise = finalTrcUrl
      ? fetchText(finalTrcUrl)
      : Promise.resolve('');

    if (!lyricPromise) {
      return { rawLrc: '' };
    }

    const [lyricResult, translation] = await Promise.all([lyricPromise, translationPromise]);

    if (!lyricResult) {
      return { rawLrc: '' };
    }

    return {
      rawLrc: lyricResult.lyric || '',
      translation: translation || undefined,
    };
  } catch (error) {
    console.error('[咪咕] 获取歌词失败:', error);
    return { rawLrc: '' };
  }
}

async function getArtistAlbumWorks(artistItem, page) {
  try {
    const result = await searchAlbum(artistItem.name, page);

    if (result && result.data) {
      const albums = result.data.filter(album => {
        const albumArtist = album.artist?.toLowerCase() || '';
        const artistName = artistItem.name?.toLowerCase() || '';
        return albumArtist.includes(artistName) || artistName.includes(albumArtist);
      });

      return {
        isEnd: result.isEnd,
        data: albums,
      };
    }
  } catch (error) {
    console.error('[咪咕] 获取歌手专辑失败:', error.message);
  }

  return {
    isEnd: true,
    data: [],
  };
}

async function getArtistWorks(artistItem, page, type) {
  if (type === "music") {
    try {
      const res = await axios_1.default.get(
        `https://app.c.nf.migu.cn/MIGUM3.0/v1.0/template/song-list/release/`,
        {
          params: {
            singerId: artistItem.id,
            templateVersion: '2',
            needSimple: '01',
            pageNumber: page
          },
          transformResponse: [(data) => {
            if (typeof data === 'string') {
              try {
                const fixedData = data.replace(/,\"subTitle1\":\s*\"[^}]*\}[^}]*\}\"/g, '');
                return JSON.parse(fixedData);
              } catch (e) {
                console.error('[咪咕] JSON 解析失败:', e.message);
                return { code: 'ERROR', data: {} };
              }
            }
            return data;
          }]
        }
      );

      if (res.data && res.data.code === '000000' && res.data.data?.contentItemList) {
        const itemsArray = res.data.data.contentItemList[0]?.itemList || [];
        const items = itemsArray.map(item => item.song || item).filter(Boolean);

        return {
          data: items.map((item) => {
            const qualities = {};

            if (item.newRateFormats && Array.isArray(item.newRateFormats)) {
              item.newRateFormats.forEach((format) => addMiguQuality(qualities, format));
            }

            if (Object.keys(qualities).length === 0) {
              qualities['128k'] = { size: 'N/A', bitrate: 128000 };
            }

            let artwork = null;
            if (item.albumImgs && item.albumImgs.length > 0) {
              artwork = item.albumImgs[0].img;
            } else {
              artwork = item.img || item.cover;
            }

            let artist = '';
            if (item.artists && Array.isArray(item.artists)) {
              artist = item.artists.map(a => a.name).filter(Boolean).join(', ');
            } else if (item.singer) {
              artist = item.singer;
            }

            return {
              id: item.songId,
              artwork: formatImgUrl(artwork),
              title: item.songName || item.title,
              artist: artist,
              album: item.album || item.albumName,
              copyrightId: item.copyrightId,
              singerId: item.singerId,
              qualities: qualities,
              duration: pickDurationSeconds(item),
              lrcUrl: item.lrcUrl,
              mrcUrl: item.mrcUrl,
              trcUrl: item.trcUrl,
            };
          }),
        };
      }
    } catch (error) {
      console.error('[咪咕] 获取歌手作品失败:', error.message);
    }

    return { data: [] };
  } else if (type === "album") {
    return getArtistAlbumWorks(artistItem, page);
  }
}

async function getMusicSheetInfo(sheet, page) {
  try {
    let sheetId = sheet.id || sheet;
    
    try {
      const url = `https://app.c.nf.migu.cn/MIGUM2.0/v1.0/user/queryMusicListSongs.do?musicListId=${sheetId}&pageNo=${page}&pageSize=30`;
      
      const res = await axios_1.default.get(url, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (iPhone; CPU iPhone OS 13_2_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/13.0.3 Mobile/15E148 Safari/604.1',
          Referer: 'https://m.music.migu.cn/',
        },
      });
      
      if (res.data && res.data.code === '000000' && res.data.list) {
        const musicList = res.data.list.map((item) => {
          const qualities = {};
          const lyricInfo = extractLyricInfo(item);
          
          if (item.newRateFormats && Array.isArray(item.newRateFormats)) {
            item.newRateFormats.forEach((format) => addMiguQuality(qualities, format));
          }
          
          if (Object.keys(qualities).length === 0 && item.rateFormats) {
            item.rateFormats.split('|').forEach((format) => addMiguQuality(qualities, format));
          }
          
          if (Object.keys(qualities).length === 0) {
            qualities['128k'] = { size: 'N/A', bitrate: 128000 };
          }
          
          let artist = '';
          if (item.artists && Array.isArray(item.artists)) {
            artist = item.artists.map(a => a.name || a.artistName || '').filter(Boolean).join(', ');
          } else if (item.singer) {
            artist = item.singer;
          } else if (item.singerName) {
            artist = Array.isArray(item.singerName) ? item.singerName.join(', ') : item.singerName;
          }
          
          let artwork = null;
          if (item.albumImgs && item.albumImgs.length > 0) {
            artwork = formatImgUrl(item.albumImgs[0].img);
          } else {
            artwork = formatImgUrl(item.albumPic || item.img3 || item.img2 || item.img1);
          }

          return {
            id: item.songId || item.id,
            artwork: artwork,
            title: item.songName || item.name,
            artist: artist,
            album: item.album || item.albumName,
            copyrightId: item.copyrightId,
            singerId: item.singerId,
            qualities: qualities,
            duration: pickDurationSeconds(item),
            lrcUrl: lyricInfo.lrcUrl,
            mrcUrl: lyricInfo.mrcUrl,
            trcUrl: lyricInfo.trcUrl,
          };
        });
        
        return {
          isEnd: res.data.totalCount <= page * 30,
          musicList: musicList,
        };
      }
    } catch (err) {
    }
    
    try {
      const time = Date.now().toString();
      const signData = createSignature(time, sheetId);
      
      const headers = {
        uiVersion: 'A_music_3.6.1',
        deviceId: signData.deviceId,
        timestamp: time,
        sign: signData.sign,
        channel: '0146921',
        'User-Agent':
          'Mozilla/5.0 (Linux; U; Android 11.0.0; zh-cn; MI 11 Build/OPR1.170623.032) AppleWebKit/534.30 (KHTML, like Gecko) Version/4.0 Mobile Safari/534.30',
      };
      
      const url = `https://app.c.nf.migu.cn/MIGUM3.0/resource/playlist/v2.0?playlistId=${sheetId}&pageNo=${page}&pageSize=30`;
      const res = await axios_1.default.get(url, { headers });
      
      if (res.data && res.data.resource && res.data.resource.length > 0) {
        const musicList = res.data.resource.map((item) => {
          const qualities = {};
          const lyricInfo = extractLyricInfo(item);
          
          if (item.newRateFormats && Array.isArray(item.newRateFormats)) {
            item.newRateFormats.forEach((format) => addMiguQuality(qualities, format));
          }
          
          if (Object.keys(qualities).length === 0) {
            qualities['128k'] = { size: 'N/A', bitrate: 128000 };
          }

            const singerList = (item.singers || []).map(s => ({
            id: s.id || s.singerId,
            name: s.name || s.singerName,
            avatar: s.img || s.singerPic || "",
          }));

          return {
            id: item.songId || item.copyrightId || item.id,
            artwork: formatImgUrl(
              item.albumImgs && item.albumImgs.length > 0
                ? item.albumImgs[0].img
                : (item.img3 || item.img2 || item.img1 || item.cover)
            ),
            title: item.songName || item.name,
            artist: item.singer || formatSingerName(item.singers),
            singerList: singerList,
            album: item.album || item.albumName,
            copyrightId: item.copyrightId,
            singerId: item.singerId,
            qualities: qualities,
            duration: pickDurationSeconds(item),
            lrcUrl: lyricInfo.lrcUrl,
            mrcUrl: lyricInfo.mrcUrl,
            trcUrl: lyricInfo.trcUrl,
          };
        });
        
        return {
          isEnd: res.data.totalCount <= page * 30,
          musicList: musicList,
        };
      }
    } catch (err) {
    }
    
    const res = (
      await axios_1.default.get(
        "https://m.music.migu.cn/migumusic/h5/playlist/songsInfo",
        {
          params: {
            palylistId: sheetId,
            pageNo: page,
            pageSize: 30,
          },
          headers: {
            Host: "m.music.migu.cn",
            referer: "https://m.music.migu.cn/v4/music/playlist/",
            By: "7242bd16f68cd9b39c54a8e61537009f",
            "User-Agent":
              "Mozilla/5.0 (iPhone; CPU iPhone OS 13_2_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/13.0.3 Mobile/15E148 Safari/604.1 Edg/113.0.0.0",
          },
        }
      )
    ).data.data;
    
    if (!res) {
      return {
        isEnd: true,
        musicList: [],
      };
    }
    
    const isEnd = res.total < 30;
    return {
      isEnd,
      musicList: res.items
        .filter((item) => {
          var _a;
          return (
            ((_a = item === null || item === void 0 ? void 0 : item.fullSong) ===
              null || _a === void 0
              ? void 0
              : _a.vipFlag) === 0
          );
        })
        .map((_) => {
          var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k;
          
          const qualities = getMiGuQualitiesFromSong(_);
          const lyricInfo = extractLyricInfo(_);
          
          return {
            id: _.id,
            artwork: formatImgUrl(_.mediumPic),
            title: _.name,
            artist:
              (_f =
                (_e =
                  (_d =
                    (_c =
                      (_b = _.singers) === null || _b === void 0
                        ? void 0
                        : _b.map) === null || _c === void 0
                      ? void 0
                      : _c.call(_b, (_) => _.name)) === null || _d === void 0
                    ? void 0
                    : _d.join) === null || _e === void 0
                  ? void 0
                  : _e.call(_d, ",")) !== null && _f !== void 0
                ? _f
                : "",
            album:
              (_h =
                (_g = _.album) === null || _g === void 0
                  ? void 0
                  : _g.albumName) !== null && _h !== void 0
                ? _h
                : "",
            copyrightId: _.copyrightId,
            singerId:
              (_k =
                (_j = _.singers) === null || _j === void 0 ? void 0 : _j[0]) ===
                null || _k === void 0
                ? void 0
                : _k.id,
            qualities: qualities,
            lrcUrl: lyricInfo.lrcUrl,
            mrcUrl: lyricInfo.mrcUrl,
            trcUrl: lyricInfo.trcUrl,
          };
        }),
    };
  } catch (error) {
    console.error('[咪咕] 获取歌单信息失败:', error);
    return {
      isEnd: true,
      musicList: [],
    };
  }
}

async function importMusicSheet(urlLike) {
  var _a, _b, _c, _d;
  let id;
  if (!id) {
    id = (urlLike.match(
      /https?:\/\/music\.migu\.cn\/v3\/(?:my|music)\/playlist\/([0-9]+)/
    ) || [])[1];
  }
  if (!id) {
    id = (urlLike.match(
      /https?:\/\/h5\.nf\.migu\.cn\/app\/v4\/p\/share\/playlist\/index.html\?.*id=([0-9]+)/
    ) || [])[1];
  }
  if (!id) {
    id =
      (_a = urlLike.match(/^\s*(\d+)\s*$/)) === null || _a === void 0
        ? void 0
        : _a[1];
  }
  if (!id) {
    const tempUrl =
      (_b = urlLike.match(/(https?:\/\/c\.migu\.cn\/[\S]+)\?/)) === null ||
      _b === void 0
        ? void 0
        : _b[1];
    if (tempUrl) {
      const request = (
        await axios_1.default.get(tempUrl, {
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/109.0.0.0 Safari/537.36 Edg/109.0.1518.61",
            Accept:
              "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9",
            host: "c.migu.cn",
          },
          validateStatus(status) {
            return (status >= 200 && status < 300) || status === 403;
          },
        })
      ).request;
      const realpath =
        (_c =
          request === null || request === void 0 ? void 0 : request.path) !==
          null && _c !== void 0
          ? _c
          : request === null || request === void 0
          ? void 0
          : request.responseURL;
      if (realpath) {
        id =
          (_d = realpath.match(/id=(\d+)/)) === null || _d === void 0
            ? void 0
            : _d[1];
      }
    }
  }
  if (!id) {
    return;
  }
  const headers = {
    host: "m.music.migu.cn",
    "Sec-Fetch-Dest": "empty",
    "Sec-Fetch-Mode": "cors",
    "Sec-Fetch-Site": "same-origin",
    "User-Agent":
      "Mozilla/5.0 (Linux; Android 6.0.1; Moto G (4)) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/89.0.4389.114 Mobile Safari/537.36 Edg/89.0.774.68",
    "X-Requested-With": "XMLHttpRequest",
    Referer: "https://m.music.migu.cn",
  };
  const res = (
    await axios_1.default.get(
      `https://m.music.migu.cn/migu/remoting/query_playlist_by_id_tag?onLine=1&queryChannel=0&createUserId=migu&contentCountMin=5&playListId=${id}`,
      {
        headers,
      }
    )
  ).data;
  const playlistInfo = res.rsp.playList[0];
  const contentCount = parseInt(playlistInfo.contentCount);
  const cids = [];
  const pageSignatures = new Set();
  if (!Number.isFinite(contentCount) || contentCount < 0) throw new Error("[咪咕] 歌单总数异常");
  let pageNo = 1;
  while ((pageNo - 1) * 20 < contentCount) {
    const listPage = (
      await axios_1.default.get(
        `https://music.migu.cn/v3/music/playlist/${id}?page=${pageNo}`
      )
    ).data;
    const $ = (0, cheerio_1.load)(listPage);
    const pageIds = [];
    $(".row.J_CopySong").each((i, v) => {
      const cid = $(v).attr("data-cid");
      if (cid) pageIds.push(cid);
    });
    const signature = JSON.stringify(pageIds);
    if (!pageIds.length || pageSignatures.has(signature)) throw new Error('[咪咕] 歌单分页未推进');
    pageSignatures.add(signature);
    cids.push(...pageIds);
    pageNo += 1;
  }
  if (cids.length === 0) {
    return;
  }
  const uniqueCids = [...new Set(cids)];
  const items = [];
  for (let offset = 0; offset < uniqueCids.length; offset += 100) {
    const songs = (await axios_1.default({
      url: `https://music.migu.cn/v3/api/music/audioPlayer/songs?type=1&copyrightId=${uniqueCids.slice(offset, offset + 100).join(",")}`,
      headers: { referer: "http://m.music.migu.cn/v3" },
      xsrfCookieName: "XSRF-TOKEN", withCredentials: true,
    })).data;
    if (!Array.isArray(songs?.items) || !songs.items.length) throw new Error('[咪咕] 歌曲详情批次异常');
    items.push(...songs.items);
  }
  const musicList = items
    .map((_) => {
      var _a, _b, _c, _d, _e, _f;
      const lyricInfo = extractLyricInfo(_);
      return {
        id: _.songId,
        artwork: formatImgUrl(_.picL || _.picM || _.picS || _.cover || _.songPic),
        title: _.songName,
        artist:
          (_b =
            (_a = _.singers) === null || _a === void 0
              ? void 0
              : _a.map((_) => _.artistName)) === null || _b === void 0
            ? void 0
            : _b.join(", "),
        album:
          (_d = (_c = _.albums) === null || _c === void 0 ? void 0 : _c[0]) ===
            null || _d === void 0
            ? void 0
            : _d.albumName,
        copyrightId: _.copyrightId,
        singerId:
          (_f = (_e = _.singers) === null || _e === void 0 ? void 0 : _e[0]) ===
            null || _f === void 0
            ? void 0
            : _f.artistId,
        qualities: getMiGuQualitiesFromSong(_), // 添加音质检测
        lrcUrl: lyricInfo.lrcUrl,
        mrcUrl: lyricInfo.mrcUrl,
        trcUrl: lyricInfo.trcUrl,
      };
    });
  return {
    id: String(playlistInfo.playListId || playlistInfo.id || id),
    title: playlistInfo.playListName || playlistInfo.name || playlistInfo.title || "",
    artwork: formatImgUrl(
      playlistInfo.playListPic
        || playlistInfo.image
        || playlistInfo.img
        || playlistInfo.cover,
    ),
    artist: playlistInfo.createUserName
      || playlistInfo.userName
      || playlistInfo.ownerName
      || "",
    description: playlistInfo.summary || playlistInfo.intro || playlistInfo.description || "",
    worksNum: Number(playlistInfo.contentCount) || musicList.length,
    playCount: Number(playlistInfo.playCount || playlistInfo.playNum) || 0,
    musicList,
  };
}

async function getRecommendSheetTags() {
  try {
    const res = await axios_1.default.get(
      'https://app.c.nf.migu.cn/pc/v1.0/template/musiclistplaza-taglist/release',
      {
        headers: {
          'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 13_2_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/13.0.3 Mobile/15E148 Safari/604.1',
          Referer: 'https://m.music.migu.cn/',
        },
      }
    );

    if (res.data && res.data.code === '000000' && res.data.data) {
      const rawList = res.data.data;

      const hotTags = rawList[0]?.content?.map(item => ({
        id: item.texts?.[1] || item.tagId,
        title: item.texts?.[0] || item.tagName,
      })) || [];

      const data = rawList.slice(1).map(group => ({
        title: group.header?.title || group.name,
        data: (group.content || []).map(item => ({
          id: item.texts?.[1] || item.tagId,
          title: item.texts?.[0] || item.tagName,
        })),
      }));

      return {
        pinned: hotTags.slice(0, 8),
        data,
      };
    }
  } catch (error) {
    console.error('[咪咕] 获取歌单标签失败，使用备用API:', error.message);
  }

  try {
    const allTags = (
      await axios_1.default.get(
        "https://m.music.migu.cn/migumusic/h5/playlist/allTag",
        {
          headers: {
            host: "m.music.migu.cn",
            referer: "https://m.music.migu.cn/v4/music/playlist",
            "User-Agent":
              "Mozilla/5.0 (iPhone; CPU iPhone OS 13_2_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/13.0.3 Mobile/15E148 Safari/604.1 Edg/113.0.0.0",
            By: "7242bd16f68cd9b39c54a8e61537009f",
          },
        }
      )
    ).data.data.tags;

    const data = allTags.map((_) => ({
      title: _.tagName,
      data: _.tags.map((t) => ({
        id: t.tagId,
        title: t.tagName,
      })),
    }));

    return {
      pinned: [
        { title: "流行", id: "1000001672" },
        { title: "伤感", id: "1000001795" },
        { title: "电影", id: "1001076080" },
        { title: "经典老歌", id: "1000001635" },
        { title: "中国风", id: "1000001675" },
        { title: "翻唱", id: "1000001831" },
      ],
      data,
    };
  } catch (e) {
    return { pinned: [], data: [] };
  }
}

async function getRecommendSheetsByTag(sheetItem, page) {
  const pageSize = 30;
  const tagId = sheetItem?.id || '';

  try {
    let url;
    if (!tagId) {
      url = `https://app.c.nf.migu.cn/pc/bmw/page-data/playlist-square-recommend/v1.0?templateVersion=2&pageNo=${page}`;
    } else {
      url = `https://app.c.nf.migu.cn/pc/v1.0/template/musiclistplaza-listbytag/release?pageNumber=${page}&templateVersion=2&tagId=${tagId}`;
    }

    const res = await axios_1.default.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 13_2_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/13.0.3 Mobile/15E148 Safari/604.1',
        Referer: 'https://m.music.migu.cn/',
      },
    });

    if (res.data && res.data.code === '000000' && res.data.data) {
      let list = [];

      if (res.data.data.contents) {
        const extractPlaylists = (contents, result = [], ids = new Set()) => {
          for (const item of contents) {
            if (item.contents) {
              extractPlaylists(item.contents, result, ids);
            } else if (item.resType === '2021' && !ids.has(item.resId)) {
              ids.add(item.resId);
              result.push({
                id: String(item.resId),
                title: item.txt,
                artwork: formatImgUrl(item.img),
                artist: '',
                description: item.txt2 || '',
              });
            }
          }
          return result;
        };
        list = extractPlaylists(res.data.data.contents);
      } else if (res.data.data.contentItemList) {
        const itemList = res.data.data.contentItemList[1]?.itemList || res.data.data.contentItemList[0]?.itemList || [];
        list = itemList.map(item => ({
          id: String(item.logEvent?.contentId || item.id),
          title: item.title,
          artwork: formatImgUrl(item.imageUrl),
          artist: '',
          playCount: item.barList?.[0]?.title || '',
        }));
      }

      if (list.length > 0) {
        return {
          isEnd: list.length < pageSize,
          data: list,
        };
      }
    }
  } catch (error) {
    console.error('[咪咕] 获取推荐歌单失败，使用备用API:', error.message);
  }

  const res = (
    await axios_1.default.get(
      "https://m.music.migu.cn/migumusic/h5/playlist/list",
      {
        params: {
          columnId: 15127272,
          tagId: tagId,
          pageNum: page,
          pageSize,
        },
        headers: {
          "user-agent":
            "Mozilla/5.0 (iPhone; CPU iPhone OS 13_2_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/13.0.3 Mobile/15E148 Safari/604.1 Edg/113.0.0.0",
          host: "m.music.migu.cn",
          By: "7242bd16f68cd9b39c54a8e61537009f",
          Referer: "https://m.music.migu.cn/v4/music/playlist",
        },
      }
    )
  ).data.data;

  const isEnd = page * pageSize > res.total;
  const data = res.items.map((_) => ({
    id: _.playListId,
    artist: _.createUserName,
    title: _.playListName,
    artwork: formatImgUrl(_.image),
    playCount: _.playCount,
    createUserId: _.createUserId,
  }));

  return {
    isEnd,
    data,
  };
}

async function getTopLists() {
  const yinyue = {
    title: "咪咕音乐榜",
    data: boardList.slice(0, 6).map(item => ({
      id: item.bangid,
      title: item.name,
      coverImg: item.coverImg,
    })),
  };

  const diqu = {
    title: "地区榜",
    data: boardList.slice(6).map(item => ({
      id: item.bangid,
      title: item.name,
      coverImg: item.coverImg,
    })),
  };

  return [yinyue, diqu];
}

async function getTopListDetail(topListItem) {
  const bangid = topListItem.id;

  try {
    const res = await axios_1.default.get(
      `https://app.c.nf.migu.cn/MIGUM2.0/v1.0/content/querycontentbyId.do?columnId=${bangid}&needAll=0`,
      {
        headers: {
          Referer: 'https://app.c.nf.migu.cn/',
          'User-Agent': 'Mozilla/5.0 (Linux; Android 5.1.1; Nexus 6 Build/LYZ28E) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/59.0.3071.115 Mobile Safari/537.36',
          channel: '0146921',
        },
      }
    );

    if (res.data && res.data.code === '000000' && res.data.columnInfo && res.data.columnInfo.contents) {
      const musicList = res.data.columnInfo.contents.map(item => {
        const songInfo = item.objectInfo || item;
        const qualities = {};

        if (songInfo.newRateFormats && Array.isArray(songInfo.newRateFormats)) {
          songInfo.newRateFormats.forEach((format) => addMiguQuality(qualities, format));
        }

        if (Object.keys(qualities).length === 0) {
          qualities['128k'] = { size: 'N/A', bitrate: 128000 };
        }

        let artwork = null;
        if (songInfo.albumImgs && songInfo.albumImgs.length > 0) {
          artwork = songInfo.albumImgs[0].img;
        } else if (songInfo.albumPic) {
          artwork = songInfo.albumPic;
        } else if (songInfo.img3 || songInfo.img2 || songInfo.img1) {
          artwork = songInfo.img3 || songInfo.img2 || songInfo.img1;
        } else if (songInfo.cover) {
          artwork = songInfo.cover;
        } else if (songInfo.mediumPic || songInfo.largePic || songInfo.smallPic) {
          artwork = songInfo.largePic || songInfo.mediumPic || songInfo.smallPic;
        }
        artwork = formatImgUrl(artwork);

        let artist = '';
        if (songInfo.artists && Array.isArray(songInfo.artists)) {
          artist = songInfo.artists.map(a => a.name).filter(Boolean).join(', ');
        } else if (songInfo.singer) {
          artist = songInfo.singer;
        } else if (songInfo.singerName) {
          artist = Array.isArray(songInfo.singerName) ? songInfo.singerName.join(', ') : songInfo.singerName;
        }

        return {
          id: songInfo.songId,
          artwork: artwork,
          title: songInfo.songName,
          artist: artist,
          album: songInfo.album || songInfo.albumName,
          copyrightId: songInfo.copyrightId,
          singerId: songInfo.singerId,
          lrcUrl: songInfo.lrcUrl,
          mrcUrl: songInfo.mrcUrl,
          trcUrl: songInfo.trcUrl,
          qualities: qualities,
          duration: pickDurationSeconds(songInfo),
        };
      });

      return {
        ...topListItem,
        musicList: musicList,
      };
    }
  } catch (error) {
    console.error('[咪咕] 获取榜单详情失败，使用备用API:', error.message);
  }

  const res = await axios_1.default.get(
    `https://m.music.migu.cn/migumusic/h5/billboard/home`,
    {
      params: {
        pathName: bangid,
        pageNum: 1,
        pageSize: 100,
      },
      headers: {
        Accept: "*/*",
        Host: "m.music.migu.cn",
        referer: `https://m.music.migu.cn/v4/music/top/${bangid}`,
        "User-Agent": UA,
        By,
      },
    }
  );

  if (res.data && res.data.data && res.data.data.songs) {
    return {
      ...topListItem,
      musicList: res.data.data.songs.items.map((_) => {
        let artwork = null;
        if (_.albumImgs && _.albumImgs.length > 0) {
          artwork = _.albumImgs[0].img;
        } else {
          artwork = _.mediumPic || _.largePic || _.smallPic || _.img || _.cover;
        }

        return {
          id: _.id,
          artwork: formatImgUrl(artwork),
          title: _.name,
          artist: _.singers?.map(s => s.name).join(', ') || '',
          album: _.album?.albumName || '',
          copyrightId: _.copyrightId,
          singerId: _.singers?.[0]?.id,
          qualities: getMiGuQualitiesFromSong(_),
          duration: pickDurationSeconds(_),
        };
      }),
    };
  }

  return { ...topListItem, musicList: [] };
}

async function getMusicComments(musicItem, page = 1) {
  const pageSize = 20;

  try {
    const targetId = musicItem.id || musicItem.copyrightId;

    const res = await axios_1.default.get(
      `https://music.migu.cn/v3/api/comment/listComments`,
      {
        params: {
          targetId: targetId,
          pageSize: pageSize,
          pageNo: page,
        },
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/86.0.4195.1 Safari/537.36',
          Referer: 'https://music.migu.cn',
        },
      }
    );

    if (res.status !== 200 || res.data.returnCode !== '000000') {
      return { isEnd: true, data: [] };
    }

    const comments = (res.data.data?.items || []).map((item) => ({
      id: item.commentId?.toString(),
      nickName: item.author?.name || '',
      avatar: item.author?.avatar?.startsWith('//')
        ? `http:${item.author.avatar}`
        : item.author?.avatar,
      comment: item.body || '',
      like: item.praiseCount,
      createAt: item.createTime ? new Date(item.createTime).getTime() : null,
      replies: (item.replyCommentList || []).map((c) => ({
        id: c.commentId?.toString(),
        nickName: c.author?.name || '',
        avatar: c.author?.avatar?.startsWith('//')
          ? `http:${c.author.avatar}`
          : c.author?.avatar,
        comment: c.body || '',
        like: c.praiseCount,
        createAt: c.createTime ? new Date(c.createTime).getTime() : null,
      })),
    }));

    const total = res.data.data?.itemTotal || 0;

    return {
      isEnd: page * pageSize >= total,
      data: comments,
    };
  } catch (error) {
    console.error('[咪咕] 获取评论失败:', error);
    return { isEnd: true, data: [] };
  }
}

function getMusicDetailPageUrl(musicItem) {
  const copyrightId = musicItem.copyrightId || musicItem.copyright_id || musicItem.id;
  return copyrightId ? `http://music.migu.cn/v3/music/song/${copyrightId}` : "";
}

async function getHotSearch() {
  const response = await axios_1.default.get("https://jadeite.migu.cn/music_search/v3/search/hotword", { timeout: 10000 });
  const body = response.data;
  const list = body?.data?.hotwords?.[0]?.hotwordList;
  if (body?.code !== "000000" || !Array.isArray(list)) {
    throw new Error("咪咕音乐热搜加载失败，请稍后重试");
  }
  return [...new Set(list.filter(item => item?.resourceType === "song").map(item => item.word)
    .filter(word => typeof word === "string" && word.trim())
    .map(word => word.trim()))].slice(0, 30);
}

module.exports = {
  getHotSearch,
  platform: "咪咕音乐",
  author: "Toskysun",
  version: "1.3.3",
  appVersion: ">0.1.0-alpha.0",
  srcUrl: "https://music.cwo.cc.cd/plugins/mg.js",
  cacheControl: "no-cache",
  primaryKey: ["copyrightId"],
  supportedQualities: BASE_SUPPORTED_QUALITIES,
  supportedVideoQualities: ["480p", "720p", "1080p", "4k"],
  hints: {
    importMusicSheet: [
      "咪咕APP：自建歌单-分享-复制链接，直接粘贴即可",
      "H5/PC端：复制URL并粘贴，或者直接输入纯数字歌单ID即可",
      "导入时间和歌单大小有关，请耐心等待",
    ],
  },
  supportedSearchType: ["music", "album", "sheet", "artist", "lyric"],
  async search(query, page, type) {
    if (type === "music") {
      return await searchMusic(query, page);
    }
    if (type === "album") {
      return await searchAlbum(query, page);
    }
    if (type === "artist") {
      return await searchArtist(query, page);
    }
    if (type === "sheet") {
      return await searchMusicSheet(query, page);
    }
    if (type === "lyric") {
      return await searchLyric(query, page);
    }
  },
  getMediaSource,
  getMvSource,
  getMusicInfo,
  getMusicDetailPageUrl,
  getLyric: getLyric,
  async getAlbumInfo(albumItem) {
    async function findCorrectAlbumId(albumName, artistName) {
      try {
        const time = Date.now().toString();
        const query = albumName;
        const signData = createSignature(time, query);

        const url = `https://jadeite.migu.cn/music_search/v3/search/searchAll?isCorrect=0&isCopyright=1&searchSwitch=%7B%22song%22%3A1%2C%22album%22%3A0%2C%22singer%22%3A0%2C%22tagSong%22%3A1%2C%22mvSong%22%3A0%2C%22bestShow%22%3A1%2C%22songlist%22%3A0%2C%22lyricSong%22%3A0%7D&pageSize=30&text=${encodeURIComponent(query)}&pageNo=1&sort=0&sid=USS`;

        const res = await axios_1.default.get(url, {
          headers: {
            uiVersion: 'A_music_3.6.1',
            deviceId: signData.deviceId,
            timestamp: time,
            sign: signData.sign,
            channel: '0146921',
            'User-Agent': 'Mozilla/5.0 (Linux; U; Android 11.0.0; zh-cn; MI 11 Build/OPR1.170623.032) AppleWebKit/534.30 (KHTML, like Gecko) Version/4.0 Mobile Safari/534.30',
          },
        });

        if (res.data && res.data.code === '000000' && res.data.songResultData) {
          const songs = res.data.songResultData.resultList || [];
          for (const songArray of songs) {
            for (const song of (Array.isArray(songArray) ? songArray : [songArray])) {
              if (song.album === albumName && song.albumId) {
                return song.albumId;
              }
            }
          }
          for (const songArray of songs) {
            for (const song of (Array.isArray(songArray) ? songArray : [songArray])) {
              if (song.albumId) {
                return song.albumId;
              }
            }
          }
        }
      } catch (e) {
        console.error('[咪咕] 搜索专辑ID失败:', e.message);
      }
      return null;
    }

    async function getAlbumSongs(albumId) {
      try {
        const res = await axios_1.default.get(
          `http://app.c.nf.migu.cn/MIGUM2.0/v1.0/content/queryAlbumSong?albumId=${albumId}&pageNo=1`
        );

        return res.data?.data || res.data;
      } catch (error) {
        console.error('[咪咕] 获取专辑歌曲失败:', error.message);
        return null;
      }
    }

    let albumId = albumItem.id;
    let musicListData = null;

    const data = await getAlbumSongs(albumId);
    if (data && data.songList && data.songList.length > 0) {
      musicListData = data;
    }

    if (!musicListData) {
      const correctId = await findCorrectAlbumId(albumItem.title, albumItem.artist);
      if (correctId) {
        albumId = correctId;
        const data2 = await getAlbumSongs(albumId);
        if (data2 && data2.songList && data2.songList.length > 0) {
          musicListData = data2;
        }
      }
    }

    if (!musicListData || !musicListData.songList) {
      return {
        albumItem: { description: albumItem.description || '' },
        musicList: [],
      };
    }

    return {
      albumItem: { description: albumItem.description || '' },
      musicList: musicListData.songList.map((item) => {
        const qualities = {};
        if (item.newRateFormats && Array.isArray(item.newRateFormats)) {
          item.newRateFormats.forEach((format) => addMiguQuality(qualities, format));
        }
        if (Object.keys(qualities).length === 0) {
          qualities['128k'] = { size: 'N/A', bitrate: 128000 };
        }

        let artwork = null;
        if (item.albumImgs && item.albumImgs.length > 0) {
          artwork = item.albumImgs[0].img;
        }

        let artist = '';
        if (item.artists && Array.isArray(item.artists)) {
          artist = item.artists.map(a => a.name).filter(Boolean).join(', ');
        } else if (item.singer) {
          artist = item.singer;
        }

        return {
          id: item.songId,
          artwork: formatImgUrl(artwork),
          title: item.songName,
          artist: artist,
          album: item.album || albumItem.title,
          copyrightId: item.copyrightId,
          singerId: item.singerId,
          qualities: qualities,
          duration: pickDurationSeconds(item),
        };
      }),
    };
  },
  getArtistWorks: getArtistWorks,
  importMusicSheet,
  getMusicSheetInfo,
  getRecommendSheetTags,
  getRecommendSheetsByTag,
  getTopLists,
  getTopListDetail,
  getMusicComments,
};

}, "咪咕音乐");

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
