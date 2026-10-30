// Здам's sync server: keeps one person's progress so all their devices share it.
// No dependencies. Caddy serves the app; this only answers /api/*.
//
//   GET /api/progress            -> { version, state }        (state is null before the first save)
//   PUT /api/progress            <- { state }, header If-Match: <version>
//                                -> { version } or 409 { version, state } when another device saved first
//   GET /api/health              -> ok
//
// Every request except health needs the header `X-Zdam-Key: <ZDAM_KEY>`.
// The app merges, the server only refuses saves based on an old copy, so nothing gets overwritten.

import { createServer } from 'node:http'
import { readFile, writeFile, rename, mkdir, readdir, unlink } from 'node:fs/promises'
import { timingSafeEqual, createHash } from 'node:crypto'
import { join } from 'node:path'

const PORT = Number(process.env.PORT ?? 3000)
const DATA_DIR = process.env.DATA_DIR ?? '/data'
const KEY = process.env.ZDAM_KEY ?? ''
const FILE = join(DATA_DIR, 'progress.json')
const MAX_BODY = 4 * 1024 * 1024
const KEEP_BACKUP_DAYS = 30

if (KEY.length < 16) {
  console.error('ZDAM_KEY is missing or shorter than 16 characters; sync requests will be refused.')
}

const digest = (s) => createHash('sha256').update(s).digest()
const keyOk = (given) => KEY.length >= 16 && typeof given === 'string' && timingSafeEqual(digest(given), digest(KEY))

let doc = { version: 0, state: null }
let queue = Promise.resolve() // one save at a time

async function load() {
  await mkdir(DATA_DIR, { recursive: true })
  try {
    doc = JSON.parse(await readFile(FILE, 'utf8'))
    console.log(`Loaded progress version ${doc.version}`)
  } catch (e) {
    if (e.code !== 'ENOENT') throw e
    console.log('No progress saved yet')
  }
}

async function persist() {
  const tmp = `${FILE}.tmp`
  await writeFile(tmp, JSON.stringify(doc))
  await rename(tmp, FILE)
  // One backup per day, the last KEEP_BACKUP_DAYS kept: a way back if something ever goes wrong.
  const day = new Date().toISOString().slice(0, 10)
  await writeFile(join(DATA_DIR, `backup-${day}.json`), JSON.stringify(doc))
  const backups = (await readdir(DATA_DIR)).filter((f) => /^backup-\d{4}-\d{2}-\d{2}\.json$/.test(f)).sort()
  for (const old of backups.slice(0, -KEEP_BACKUP_DAYS)) await unlink(join(DATA_DIR, old))
}

function send(res, status, body) {
  const json = JSON.stringify(body)
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' })
  res.end(json)
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let size = 0
    const chunks = []
    req.on('data', (c) => {
      size += c.length
      if (size > MAX_BODY) {
        reject(Object.assign(new Error('too large'), { status: 413 }))
        req.destroy()
      } else chunks.push(c)
    })
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')))
    req.on('error', reject)
  })
}

const server = createServer(async (req, res) => {
  try {
    const path = new URL(req.url, 'http://x').pathname
    if (path === '/api/health') return send(res, 200, { ok: true })
    if (path !== '/api/progress') return send(res, 404, { error: 'not found' })
    if (!keyOk(req.headers['x-zdam-key'])) return send(res, 401, { error: 'bad key' })

    if (req.method === 'GET') return send(res, 200, doc)

    if (req.method === 'PUT') {
      const body = JSON.parse(await readBody(req))
      if (!body || typeof body.state !== 'object' || body.state === null) return send(res, 400, { error: 'state missing' })
      const base = Number(req.headers['if-match'])
      const run = queue.then(async () => {
        if (base !== doc.version) return { status: 409, body: doc }
        const next = { version: doc.version + 1, savedAt: new Date().toISOString(), state: body.state }
        const prev = doc
        doc = next
        try {
          await persist()
        } catch (e) {
          doc = prev // not on disk, so not saved
          throw e
        }
        return { status: 200, body: { version: doc.version } }
      })
      queue = run.catch(() => {}) // a failed save must not block the next one
      const result = await run
      return send(res, result.status, result.body)
    }

    res.setHeader('Allow', 'GET, PUT')
    return send(res, 405, { error: 'method not allowed' })
  } catch (e) {
    if (e instanceof SyntaxError) return send(res, 400, { error: 'bad json' })
    console.error(e)
    return send(res, e.status ?? 500, { error: e.status ? e.message : 'server error' })
  }
})

await load()
server.listen(PORT, () => console.log(`Zdam sync listening on :${PORT}`))
for (const sig of ['SIGINT', 'SIGTERM']) process.on(sig, () => server.close(() => process.exit(0)))
