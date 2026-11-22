import fs from 'node:fs'
import path from 'node:path'
import { setTimeout as delay } from 'node:timers/promises'
import { createJob, getJob, destroyJob } from './jobs.js'

export const HOSTED_LIMITS = Object.freeze({
  // Leave room for the standalone yt-dlp runtime in Vercel's 500 MB /tmp.
  maxTempBytes: 320 * 1024 * 1024,
  processingSeconds: 270,
})

// Fluid compute can send concurrent requests to one instance. Keep its shared
// 500 MB /tmp scratch space bounded. This guard is per instance, not a job store.
let active = false

async function directoryBytes(dir) {
  const entries = await fs.promises.readdir(dir, { withFileTypes: true })
  const sizes = await Promise.all(entries.map(async (entry) => {
    try {
      const target = path.join(dir, entry.name)
      return entry.isDirectory() ? await directoryBytes(target) : (await fs.promises.stat(target)).size
    } catch (err) {
      if (err.code === 'ENOENT') return 0 // yt-dlp renamed a partial file
      throw err
    }
  }))
  return sizes.reduce((sum, size) => sum + size, 0)
}

function writeRecord(res, record) {
  return new Promise((resolve, reject) => {
    if (res.destroyed) return reject(new Error('Download connection closed.'))
    res.write(`${JSON.stringify(record)}\n`, (err) => err ? reject(err) : resolve())
  })
}

// Progress and file bytes travel over ONE request. No work continues after the
// response, and no later invocation needs this instance's Map or temp files.
export async function streamHostedJob(req, res, options, limits = HOSTED_LIMITS) {
  if (active) return res.status(429).json({ error: 'Another download is running. Try again shortly.' })
  active = true
  let id
  let deadline
  let disconnected = false
  let cleanup
  const onClose = () => {
    disconnected = true
    if (id) cleanup ??= destroyJob(id)
  }
  res.on('close', onClose)
  try {
    res.setHeader('Content-Type', 'application/x-ndjson; charset=utf-8')
    res.setHeader('Cache-Control', 'no-store, no-transform')
    res.setHeader('X-Content-Type-Options', 'nosniff')
    await writeRecord(res, { type: 'progress', progress: 0, phase: 'starting' })
    id = createJob(options, { maxFileBytes: limits.maxFileBytes, isolated: true })
    const job = getJob(id)
    const startedAt = Date.now()
    // Leave time for cleanup before Hobby's 300-second invocation deadline.
    deadline = setTimeout(() => {
      onClose()
      res.destroy()
    }, 295_000)
    while (job.status === 'running') {
      if (disconnected) return
      if (Date.now() - startedAt >= limits.processingSeconds * 1000) {
        throw new Error('This download took too long for the hosted app. Try a shorter clip or use the local app.')
      }
      if (await directoryBytes(job.dir) > limits.maxTempBytes) {
        throw new Error('This download needs too much temporary space. Choose lower quality or use the local app.')
      }
      await writeRecord(res, { type: 'progress', progress: job.progress, phase: job.phase })
      await delay(500)
    }
    if (disconnected) return
    if (job.status !== 'done') throw new Error(job.error ?? 'The download failed.')
    const { size } = await fs.promises.stat(job.file)
    if (limits.maxFileBytes && size > limits.maxFileBytes) {
      throw new Error('This file is too large for the hosted download. Choose lower quality or use the local app.')
    }
    const filename = path.basename(job.file)
    await writeRecord(res, { type: 'file', filename, size })
    for await (const chunk of fs.createReadStream(job.file, { highWaterMark: 64 * 1024 })) {
      if (disconnected) return
      // Base64 keeps file bytes separate from newline-delimited progress/error
      // records. The client decodes one chunk at a time into a bounded Blob.
      await writeRecord(res, { type: 'chunk', data: chunk.toString('base64') })
    }
    await writeRecord(res, { type: 'done' })
  } catch (err) {
    // Release native processes and scratch space before telling the client it
    // can retry; the client may close the stream as soon as it reads the error.
    if (id) await (cleanup ??= destroyJob(id))
    if (!disconnected && !res.destroyed) {
      await writeRecord(res, { type: 'error', error: err.message }).catch(() => {})
    }
  } finally {
    clearTimeout(deadline)
    res.removeListener('close', onClose)
    if (id) await (cleanup ?? destroyJob(id))
    active = false
    if (!res.destroyed) res.end()
  }
}
