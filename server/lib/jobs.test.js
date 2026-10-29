import assert from 'node:assert/strict'
import { execFile } from 'node:child_process'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { setTimeout as delay } from 'node:timers/promises'
import { promisify } from 'node:util'
import { test } from 'node:test'
import express from 'express'
import sharp from 'sharp'
import { createJob, getJob, streamJobFile } from './jobs.js'
import { ffmpegPath } from './ytdlp.js'

test('download jobs produce animated GIFs, preserve MP4/MP3, and report conversion failures', async (t) => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'media-scraper-test-'))
  t.after(() => fs.rm(dir, { recursive: true, force: true }))
  const clip = path.join(dir, 'clip.mp4')
  await promisify(execFile)(ffmpegPath, [
    '-hide_banner', '-loglevel', 'error', '-y',
    '-f', 'lavfi', '-i', 'testsrc2=size=800x450:rate=30:duration=1',
    '-f', 'lavfi', '-i', 'sine=frequency=440:duration=1',
    '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-shortest', clip,
  ], { windowsHide: true })
  const app = express()
  app.get('/clip.mp4', (req, res) => res.sendFile(clip))
  app.get('/broken.mp4', (req, res) => res.type('video/mp4').send('invalid video'))
  app.get('/jobs/:id/file', streamJobFile)
  const server = app.listen(0, '127.0.0.1')
  await new Promise((resolve) => server.once('listening', resolve))
  t.after(() => new Promise((resolve) => server.close(resolve)))
  const base = `http://127.0.0.1:${server.address().port}`

  async function finishJob(url, format) {
    const id = createJob({ url, format })
    const job = getJob(id)
    t.after(async () => {
      if (job.status === 'running') job.child.kill()
      // Each target is a per-job directory created by createJob in system temp.
      await fs.rm(job.dir, { recursive: true, force: true })
    })
    const deadline = Date.now() + 30000
    while (job.status === 'running' && Date.now() < deadline) await delay(50)
    assert.notEqual(job.status, 'running', 'job timed out')
    return job
  }

  const gif = await finishJob(`${base}/clip.mp4`, 'gif')
  assert.equal(gif.status, 'done', gif.error)
  assert.equal(path.extname(gif.file), '.gif')
  const metadata = await sharp(gif.file, { animated: true }).metadata()
  assert.equal(metadata.format, 'gif')
  assert.equal(metadata.width, 640)
  assert.equal(metadata.pageHeight, 360)
  assert.equal(metadata.pages, 15)
  assert.equal(metadata.loop, 0)
  const duration = metadata.delay.reduce((sum, ms) => sum + ms, 0)
  assert.ok(Math.abs(duration - 1000) <= 20, `GIF duration was ${duration}ms`)

  const response = await fetch(`${base}/jobs/${gif.id}/file`)
  assert.equal(response.status, 200)
  assert.match(response.headers.get('content-type'), /image\/gif/)
  assert.match(response.headers.get('content-disposition'), /attachment;.*\.gif"/)
  const bytes = Buffer.from(await response.arrayBuffer())
  assert.match(bytes.subarray(0, 6).toString(), /^GIF8[79]a$/)
  for (let i = 0; i < 20 && getJob(gif.id); i++) await delay(25)
  assert.equal(getJob(gif.id), null, 'served job should be removed')

  for (const format of ['mp4', 'mp3']) {
    const job = await finishJob(`${base}/clip.mp4`, format)
    assert.equal(job.status, 'done', job.error)
    assert.equal(path.extname(job.file), `.${format}`)
    assert.ok((await fs.stat(job.file)).size > 0)
    const download = await fetch(`${base}/jobs/${job.id}/file`)
    assert.equal(download.status, 200)
    await download.arrayBuffer()
  }

  const failed = await finishJob(`${base}/broken.mp4`, 'gif')
  assert.equal(failed.status, 'error')
  assert.match(failed.error, /Could not convert this video to GIF/)
  assert.equal(failed.file, null)
})
