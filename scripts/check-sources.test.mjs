import assert from 'node:assert/strict'
import test from 'node:test'
import fs from 'node:fs/promises'
import path from 'node:path'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { verifyAudioUrl } from './check-sources.mjs'

async function withFetch(mock, run) {
  const original = globalThis.fetch
  globalThis.fetch = mock
  try { await run() } finally { globalThis.fetch = original }
}

const audio = Buffer.concat([Buffer.from('ID3'), Buffer.alloc(1024)])

test('读取真实字节，兼容 text/plain 的音频', async () => {
  await withFetch(async () => new Response(audio, { status: 206, headers: { 'content-type': 'text/plain' } }), async () => {
    assert.equal((await verifyAudioUrl('https://example.test/audio')).ok, true)
  })
})

test('拒绝 JSON 错误、伪音频错误体与空响应', async () => {
  for (const [body, type] of [['{"code":401}', 'application/json'], ['<html>error</html>', 'audio/mpeg'], ['', 'audio/mpeg']]) {
    await withFetch(async () => new Response(body, { headers: { 'content-type': type } }), async () => {
      assert.equal((await verifyAudioUrl('https://example.test/audio')).ok, false)
    })
  }
})

test('Range 被拒绝时使用普通 GET 验证，不关闭拉流检查', async () => {
  let calls = 0
  await withFetch(async (_url, options) => {
    calls++
    if (calls === 1) {
      assert.equal(options.headers.range, 'bytes=0-2047')
      return new Response('', { status: 416 })
    }
    assert.equal(options.headers.range, undefined)
    return new Response(audio, { headers: { 'content-type': 'audio/mpeg' } })
  }, async () => {
    assert.equal((await verifyAudioUrl('https://example.test/audio')).ok, true)
    assert.equal(calls, 2)
  })
})

test('局部复测合并既有记录，不删除未选中的音源', async () => {
  await fs.mkdir('temp', { recursive: true })
  const dir = await fs.mkdtemp(path.resolve('temp/check-sources-fixture-'))
  const previous = {
    id: 'preserved-source', title: '保留的音源', category: '优质', status: 'available',
    stats: { ok: 1, tested: 1, total: 1 }, platforms: [], history: [], checkedAt: '2026-01-01T00:00:00Z',
  }
  try {
    await fs.writeFile(path.join(dir, 'targeted.js'), `/** @name 合成回归音源 */
      lx.on(lx.EVENT_NAMES.request, () => 'https://example.test/audio');
      lx.send(lx.EVENT_NAMES.inited, { sources: { wy: { qualitys: ['128k'] } } });`)
    const out = path.join(dir, 'status.json')
    const dataOut = path.join(dir, 'data.json')
    await fs.writeFile(out, JSON.stringify({ sources: [previous] }))
    // 此合成音源没有上游服务，仅为合并逻辑关闭网络校验；正式检测仍默认校验真实音频。
    await promisify(execFile)(process.execPath, [
      'scripts/check-sources.mjs', '--dir', dir, '--remote', path.join(dir, 'missing.json'),
      '--only', 'targeted', '--no-verify', '--out', out, '--data-out', dataOut,
    ])
    const result = JSON.parse(await fs.readFile(out, 'utf8'))
    assert.equal(result.summary.total, 2)
    assert.deepEqual(result.sources.find((source) => source.id === previous.id), previous)
    assert.equal(result.checkScope, 'filtered')
    assert.equal(await fs.readFile(dataOut, 'utf8'), await fs.readFile(out, 'utf8'))
  } finally {
    await fs.rm(dir, { recursive: true, force: true })
  }
})

test('保留 HTTP 状态码与网络错误类型', async () => {
  await withFetch(async () => new Response('', { status: 404 }), async () => {
    assert.match((await verifyAudioUrl('https://example.test/audio')).error, /HTTP 404/)
  })
  await withFetch(async () => { throw new TypeError('fetch failed', { cause: { code: 'ENOTFOUND' } }) }, async () => {
    assert.match((await verifyAudioUrl('https://example.test/audio')).error, /ENOTFOUND/)
  })
})
