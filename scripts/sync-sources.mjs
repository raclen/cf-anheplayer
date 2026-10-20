/**
 * 把本地下载的音源目录同步到仓库的 sources/ 下。
 *
 * 用法：
 *   node scripts/sync-sources.mjs "E:/gopeed downloads/音源 V261017/V261017"
 *   node scripts/sync-sources.mjs "E:/..." --clean
 *
 * 默认只同步 .js 文件，保留「优质」「一般」等一级分类目录；
 * 加 --clean 会删除 sources/ 中源目录已不存在的旧文件。
 */
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const TARGET = path.join(ROOT, 'sources')

const args = process.argv.slice(2)
const sourceDir = args.find((arg) => !arg.startsWith('--'))
const clean = args.includes('--clean')

if (!sourceDir) {
  console.error('用法：node scripts/sync-sources.mjs <音源目录> [--clean]')
  process.exit(1)
}

async function listJs(dir, base = dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true })
  const files = []
  for (const entry of entries) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) files.push(...(await listJs(full, base)))
    else if (entry.isFile() && entry.name.endsWith('.js')) files.push(path.relative(base, full))
  }
  return files
}

async function main() {
  const stat = await fs.stat(sourceDir).catch(() => null)
  if (!stat?.isDirectory()) {
    console.error(`目录不存在：${sourceDir}`)
    process.exit(1)
  }

  const files = await listJs(sourceDir)
  if (!files.length) {
    console.error('源目录中没有找到 .js 音源文件')
    process.exit(1)
  }

  let copied = 0
  for (const rel of files) {
    const from = path.join(sourceDir, rel)
    const to = path.join(TARGET, rel)
    await fs.mkdir(path.dirname(to), { recursive: true })
    await fs.copyFile(from, to)
    copied += 1
  }

  let removed = 0
  if (clean) {
    const existing = await listJs(TARGET).catch(() => [])
    const sourceSet = new Set(files.map((rel) => rel.split(path.sep).join('/')))
    for (const rel of existing) {
      if (!sourceSet.has(rel.split(path.sep).join('/'))) {
        await fs.rm(path.join(TARGET, rel), { force: true })
        removed += 1
      }
    }
  }

  console.log(`已同步 ${copied} 个音源到 sources/${removed ? `，清理 ${removed} 个旧文件` : ''}`)
  console.log('下一步：node scripts/check-sources.mjs')
}

main().catch((error) => {
  console.error('同步失败：', error)
  process.exit(1)
})
