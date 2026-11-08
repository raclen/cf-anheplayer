import assert from 'node:assert/strict'
import test from 'node:test'
import crypto from 'node:crypto'
import { loadLxSourceCode } from './lx-sandbox.mjs'

const fixture = `/**
 * @name 检测契约回归
 */
const { lx } = globalThis
lx.on(lx.EVENT_NAMES.request, ({ info }) => new Promise((resolve, reject) => {
  lx.request('https://example.test/audio', info, (error, response, body) => {
    if (error) return reject(error)
    if (response.statusCode !== 200) return reject(new Error())
    resolve({ response, body })
  })
})).then(() => lx.send(lx.EVENT_NAMES.inited, {
  sources: { wy: { qualitys: ['128k'], actions: ['musicUrl'] } }
}))`

async function withFetch(mock, run) {
  const original = globalThis.fetch
  globalThis.fetch = mock
  try { await run() } finally { globalThis.fetch = original }
}

test('请求头大小写不应合并音源 User-Agent 或 Content-Type', async () => {
  await withFetch(async (_url, options) => {
    assert.equal(options.headers.get('user-agent'), 'lx-music/desktop')
    assert.equal(options.headers.get('content-type'), 'application/custom')
    return new Response('{"code":0}', { status: 200 })
  }, async () => {
    const loaded = await loadLxSourceCode(fixture)
    assert.equal(loaded.initOk, true)
    const result = await loaded.requestHandler({ info: {
      method: 'POST', body: { id: 1 },
      headers: { 'User-Agent': 'lx-music/desktop', 'Content-Type': 'application/custom' },
    } })
    assert.equal(result.body.code, 0)
    assert.equal(result.response.body, result.body)
    assert.equal(result.response.raw.toString(), '{"code":0}')
  })
})

test('缺省元信息、事件返回值及取消函数符合洛雪契约', async () => {
  const loaded = await loadLxSourceCode(fixture)
  const lx = loaded.sandbox.lx
  assert.equal(lx.currentScriptInfo.version, '')
  assert.equal(lx.currentScriptInfo.description, '')
  assert.equal(lx.env, 'desktop')
  assert.equal(lx.version, '2.0.0')
  await lx.send(lx.EVENT_NAMES.log, '回归检查')
  await withFetch(async (_url, options) => {
    assert.equal(options.headers.get('user-agent').startsWith('Mozilla/'), true)
    return new Response('ok')
  }, async () => {
    await new Promise((resolve, reject) => {
      const cancel = lx.request('https://example.test/audio', {}, (error) => error ? reject(error) : resolve())
      assert.equal(typeof cancel, 'function')
      assert.equal(cancel.abort, cancel)
    })
  })
})

test('AES 保留 PKCS#7 padding，兼容非块对齐的明文', async () => {
  const loaded = await loadLxSourceCode(fixture)
  const utils = loaded.sandbox.lx.utils
  const key = Buffer.alloc(16, 1)
  const iv = Buffer.alloc(16, 2)
  for (const data of [Buffer.from('abc'), Buffer.alloc(16, 3)]) {
    const cipher = crypto.createCipheriv('aes-128-cbc', key, iv)
    const expected = Buffer.concat([cipher.update(data), cipher.final()])
    assert.deepEqual(utils.crypto.aesEncrypt(data, 'aes-128-cbc', key, iv), expected)
  }
})

test('RSA 使用官方的左补零与 RSA_NO_PADDING', async () => {
  const loaded = await loadLxSourceCode(fixture)
  const { publicKey } = crypto.generateKeyPairSync('rsa', { modulusLength: 1024 })
  const data = Buffer.from('契约测试')
  const expected = crypto.publicEncrypt(
    { key: publicKey, padding: crypto.constants.RSA_NO_PADDING },
    Buffer.concat([Buffer.alloc(128 - data.length), data]),
  )
  assert.deepEqual(loaded.sandbox.lx.utils.crypto.rsaEncrypt(data, publicKey), expected)
})

test('zlib helper 返回可还原的 Buffer', async () => {
  const loaded = await loadLxSourceCode(fixture)
  const data = Buffer.from('洛雪检测')
  const compressed = await loaded.sandbox.lx.utils.zlib.deflate(data)
  assert.deepEqual(await loaded.sandbox.lx.utils.zlib.inflate(compressed), data)
})

test('音源吞掉 HTTP 错误时，保留真实状态码且不泄露凭据', async () => {
  await withFetch(async () => new Response('Not Found', { status: 404 }), async () => {
    const loaded = await loadLxSourceCode(fixture)
    await assert.rejects(loaded.requestHandler({ info: {} }), /HTTP 404（example\.test）/)
  })
})
