import assert from 'node:assert/strict'
import { execFile } from 'node:child_process'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { promisify } from 'node:util'
import { test } from 'node:test'
import express from 'express'
import sharp from 'sharp'
import { createApp } from '../app.js'
import { streamHostedJob, HOSTED_LIMITS } from './hosted.js'
import { ffmpegPath } from './ytdlp.js'
import { readHostedDownload } from '../../client/src/utils/hostedDownload.js'

test('hosted downloads stream files, enforce limits, and recover after failures', async (t) => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'media-hosted-test-'))
  t.after(() => fs.rm(dir, { recursive: true, force: true }))
  const clip = path.join(dir, 'clip.mp4')
  await promisify(execFile)(ffmpegPath, [
    '-hide_banner', '-loglevel', 'error', '-y',
    '-f', 'lavfi', '-i', 'testsrc2=size=320x180:rate=15:duration=1',
    '-f', 'lavfi', '-i', 'sine=frequency=440:duration=1',
    '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-shortest', clip,
  ], { windowsHide: true })

  const app = express()
  app.use(express.json())
  app.get('/clip.mp4', (req, res) => res.sendFile(clip))
  app.get('/broken.mp4', (req, res) => res.type('video/mp4').send('not a video'))
  let limits = HOSTED_LIMITS
  app.post('/download', (req, res) => streamHostedJob(req, res, req.body, limits))
  app.use(createApp({ hosted: true }))
  const server = app.listen(0, '127.0.0.1')
  await new Promise((resolve) => server.once('listening', resolve))
  t.after(() => new Promise((resolve) => server.close(resolve)))
  const base = `http://127.0.0.1:${server.address().port}`

  function download(format, source = '/clip.mp4') {
    return fetch(`${base}/download`, {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ url: `${base}${source}`, format }),
    })
  }

  assert.equal((await (await fetch(`${base}/api/config`)).json()).mode, 'hosted')
  assert.equal((await fetch(`${base}/api/jobs/missing`)).status, 404)
  const bad = await fetch(`${base}/api/jobs`, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ url: `${base}/clip.mp4`, format: 'mp4', playlistIndex: -1 }),
  })
  assert.equal(bad.status, 400)

  for (const format of ['mp4', 'mp3', 'gif']) {
    const response = await download(format)
    assert.match(response.headers.get('content-type'), /application\/x-ndjson/)
    let progressEvents = 0
    const result = await readHostedDownload(response, () => progressEvents++)
    assert.ok(progressEvents > 0)
    assert.equal(path.extname(result.filename), `.${format}`)
    const bytes = Buffer.from(await result.file.arrayBuffer())
    assert.ok(bytes.length > 0)
    if (format === 'gif') {
      const metadata = await sharp(bytes, { animated: true }).metadata()
      assert.equal(metadata.pages, 15)
    }
  }

  limits = { ...HOSTED_LIMITS, processingSeconds: 0 }
  await assert.rejects(readHostedDownload(await download('mp4')), /took too long/)
  limits = { ...HOSTED_LIMITS, maxFileBytes: 1 }
  await assert.rejects(readHostedDownload(await download('mp4')), /too large|no output file/)
  limits = HOSTED_LIMITS
  await assert.rejects(readHostedDownload(await download('gif', '/broken.mp4')), /convert this video/)
  assert.ok((await readHostedDownload(await download('mp4'))).file.size > 0,
    'the instance must accept another download after errors')
})

test('hosted client handles fragmented streams above 4.5 MB and rejects truncation', async () => {
  const bytes = Buffer.alloc(5 * 1024 * 1024, 123)
  const records = [{ type: 'file', filename: 'large.mp4', size: bytes.length }]
  for (let start = 0; start < bytes.length; start += 64 * 1024) {
    records.push({ type: 'chunk', data: bytes.subarray(start, start + 64 * 1024).toString('base64') })
  }
  records.push({ type: 'done' })
  const text = records.map((record) => JSON.stringify(record)).join('\n') + '\n'
  const encoded = new TextEncoder().encode(text)
  let offset = 0
  const response = new Response(new ReadableStream({
    pull(controller) {
      if (offset >= encoded.length) return controller.close()
      controller.enqueue(encoded.subarray(offset, offset + 7777))
      offset += 7777
    },
  }))
  const result = await readHostedDownload(response)
  assert.deepEqual(Buffer.from(await result.file.arrayBuffer()), bytes)
  await assert.rejects(readHostedDownload(new Response(text.slice(0, text.lastIndexOf('{')))), /interrupted/)
  await assert.rejects(readHostedDownload(new Response(
    JSON.stringify({ type: 'error', error: 'Choose a shorter clip.' }) + '\n',
  )), /Choose a shorter clip/)
})
