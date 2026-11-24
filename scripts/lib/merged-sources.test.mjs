import assert from 'node:assert/strict'
import test from 'node:test'
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  buildMergedSources,
  mergedSourcesToText,
  normalizeSourceName,
} from './merged-sources.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..', '..')
const SITE = 'https://anhe-player.loc.cc'

const remoteList = [
  {
    id: 'xinghai',
    url: 'https://raw.githubusercontent.com/pdone/lx-music-source/main/xinghai/latest.js',
    mirror: 'https://ghproxy.net/raw.githubusercontent.com/pdone/lx-music-source/main/xinghai/latest.js',
  },
  {
    id: 'qdy',
    url: 'https://raw.githubusercontent.com/pdone/lx-music-source/main/qdy/latest.js',
    mirror: 'https://ghproxy.net/raw.githubusercontent.com/pdone/lx-music-source/main/qdy/latest.js',
  },
]

const fixtureStatus = (sources) => ({ generatedAt: '2026-11-24T02:54:25.534Z', sources })

const entry = (overrides) => ({
  id: 'x1',
  title: '示例',
  name: '示例',
  version: '1.0',
  author: '作者',
  category: '一般',
  status: 'partial',
  stats: { ok: 2, tested: 5, total: 5 },
  file: '一般/示例.js',
  remote: false,
  platforms: [
    { key: 'wy', tested: true, ok: true },
    { key: 'tx', tested: true, ok: false },
  ],
  ...overrides,
})

test('只保留检测通过的音源，地址走本站域名', () => {
  const merged = buildMergedSources(
    fixtureStatus([
      entry({ id: 'a1', name: '甲', title: '甲', status: 'available', stats: { ok: 5, tested: 5, total: 5 } }),
      entry({ id: 'a2', name: '乙', title: '乙', status: 'unavailable', stats: { ok: 0, tested: 5, total: 5 } }),
      entry({ id: 'a3', name: '丙', title: '丙', status: 'untested', stats: { ok: 0, tested: 0, total: 0 } }),
    ]),
    remoteList,
    { site: SITE },
  )
  assert.equal(merged.totalChecked, 3)
  assert.equal(merged.totalPassing, 1)
  assert.equal(merged.included, 1)
  assert.equal(merged.sources[0].url, `${SITE}/sources/a1.js`)
  assert.deepEqual(merged.sources[0].platformsPassed, ['wy'])
  assert.deepEqual(merged.sources[0].platformsFailed, ['tx'])
})

test('同名重复只保留显式指定项，并记录去掉的一项与理由', () => {
  const merged = buildMergedSources(
    fixtureStatus([
      entry({
        id: 'remote-xinghai', name: '星海音乐源', title: 'XingHai（星海）', version: 'v3.2.18',
        remote: true, file: 'https://raw.githubusercontent.com/pdone/lx-music-source/main/xinghai/latest.js',
        stats: { ok: 5, tested: 6, total: 6 },
      }),
      entry({
        id: '315819a926', name: '星海音乐源', title: 'xinghai-music-sourcev2.3.20', version: 'v3.2.20',
        file: '优质/xinghai-music-sourcev2.3.20.js',
        stats: { ok: 5, tested: 6, total: 6 },
      }),
      entry({
        id: 'b63bd95c38', name: '全豆要[聚合音源]', title: '全豆要-聚合音源-V4.1', version: 'v4.1',
        file: '一般/全豆要-聚合音源-V4.1.js', stats: { ok: 2, tested: 5, total: 6 },
      }),
      entry({
        id: 'remote-qdy', name: '全豆要[聚合音源]', title: 'QDY', version: '9.3',
        remote: true, file: 'https://raw.githubusercontent.com/pdone/lx-music-source/main/qdy/latest.js',
        stats: { ok: 2, tested: 5, total: 6 },
      }),
    ]),
    remoteList,
    { site: SITE },
  )
  assert.deepEqual(merged.sources.map((item) => item.id), ['315819a926', 'remote-qdy'])
  assert.equal(merged.sources[1].url, `${SITE}/sources/remote/qdy.js`)
  assert.equal(merged.sources[1].fallbackUrl, remoteList[1].mirror)
  assert.equal(merged.removedDuplicates.length, 2)
  assert.ok(merged.removedDuplicates.every((item) => item.reason.length > 0))
  assert.equal(merged.removedDuplicates[0].keptId, '315819a926')
})

test('不同名但共享后端的不去重，按通过数降序排列', () => {
  const merged = buildMergedSources(
    fixtureStatus([
      entry({ id: 'low', name: '低', title: '低', stats: { ok: 1, tested: 5, total: 5 } }),
      entry({ id: 'high', name: '高', title: '高', stats: { ok: 5, tested: 5, total: 5 } }),
    ]),
    remoteList,
    { site: SITE },
  )
  assert.deepEqual(merged.sources.map((item) => item.id), ['high', 'low'])
  assert.equal(merged.removedDuplicates.length, 0)
})

test('TXT 清单与 JSON 顺序一致，且只含链接', () => {
  const merged = buildMergedSources(
    fixtureStatus([entry({ id: 'a1', name: '甲', title: '甲' })]),
    remoteList,
    { site: SITE },
  )
  const text = mergedSourcesToText(merged)
  assert.equal(text, `${SITE}/sources/a1.js\n`)
  assert.ok(text.split('\n').filter(Boolean).every((line) => line.startsWith('https://')))
})

test('名称归一化忽略大小写与多余空白', () => {
  assert.equal(normalizeSourceName('  星海音乐源 '), normalizeSourceName('星海音乐源'))
  assert.equal(normalizeSourceName('QDY Source'), 'qdy source')
})

test('真实检测结果：无重名、全部通过、按通过数排序', async () => {
  const status = JSON.parse(await fs.readFile(path.join(ROOT, 'src/data/sources-status.json'), 'utf8'))
  const remote = JSON.parse(await fs.readFile(path.join(ROOT, 'sources/remote.json'), 'utf8'))
  const merged = buildMergedSources(status, remote, { site: SITE })
  assert.equal(merged.totalChecked, status.summary.total)
  assert.equal(merged.totalPassing, status.summary.available + status.summary.partial)
  assert.equal(merged.included, merged.totalPassing - merged.removedDuplicates.length)
  const names = merged.sources.map((item) => normalizeSourceName(item.name))
  assert.equal(new Set(names).size, names.length)
  assert.ok(merged.sources.every((item) => ['available', 'partial'].includes(item.status)))
  const okCounts = merged.sources.map((item) => Number(item.passed.split('/')[0]))
  assert.deepEqual(okCounts, [...okCounts].sort((a, b) => b - a))
  assert.ok(merged.sources.every((item) => item.url.startsWith(`${SITE}/sources/`)))
})
