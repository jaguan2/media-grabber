import express from 'express'
import { resolveUrl } from './lib/resolve.js'
import { streamMedia } from './lib/media.js'
import { createJob, getJob, streamJobFile } from './lib/jobs.js'
import { streamHostedJob, HOSTED_LIMITS } from './lib/hosted.js'

// The HTTP app has no listener or cleanup timers. Both deployment entry points
// use these routes; only the desktop/local entry point owns background jobs.
export function createApp({ hosted = false } = {}) {
  const app = express()
  app.use(express.json())
  app.use('/api', (req, res, next) => {
    res.setHeader('Cache-Control', 'no-store')
    next()
  })

  app.get('/api/config', (req, res) => {
    res.json({ mode: hosted ? 'hosted' : 'local', limits: hosted ? HOSTED_LIMITS : null })
  })

  app.post('/api/resolve', async (req, res) => {
    const url = String(req.body?.url ?? '').trim()
    if (!/^https?:\/\//i.test(url)) {
      return res.status(400).json({ error: 'Paste a full link — it should start with https://' })
    }
    try {
      res.json(await resolveUrl(url))
    } catch (err) {
      console.error('[resolve]', err.detail ?? err.message)
      res.status(422).json({
        error: err.friendly ?? 'Could not read that link. It may be private, removed, or unsupported.',
      })
    }
  })

  app.get('/api/media', (req, res) => streamMedia(req, res, hosted ? {
    maxBytes: HOSTED_LIMITS.maxTempBytes,
    timeoutMs: 60_000,
  } : {}))

  app.post('/api/jobs', async (req, res) => {
    const { url, format, height, playlistIndex } = req.body ?? {}
    if (!/^https?:\/\//i.test(String(url ?? ''))) {
      return res.status(400).json({ error: 'Bad video URL.' })
    }
    if (!['mp4', 'mp3', 'gif'].includes(format)) {
      return res.status(400).json({ error: 'Format must be mp4, mp3, or gif.' })
    }
    const positiveInt = (value) => value == null || (Number.isSafeInteger(Number(value)) && Number(value) > 0)
    if (!positiveInt(height) || !positiveInt(playlistIndex)) {
      return res.status(400).json({ error: 'Quality and playlist index must be positive whole numbers.' })
    }
    const options = { url, format, height: height ? Number(height) : null,
      playlistIndex: playlistIndex ? Number(playlistIndex) : null }
    try {
      if (hosted) return await streamHostedJob(req, res, options)
      res.json({ id: createJob(options) })
    } catch (err) {
      console.error('[job]', err.message)
      if (!res.headersSent) res.status(500).json({ error: 'Could not start the download.' })
      else res.destroy()
    }
  })

  app.get('/api/jobs/:id', (req, res) => {
    if (hosted) return res.status(404).json({ error: 'Hosted downloads use the original request.' })
    const job = getJob(req.params.id)
    if (!job) return res.status(404).json({ error: 'Unknown job.' })
    const { status, progress, phase, error } = job
    res.json({ status, progress, phase, error })
  })

  app.get('/api/jobs/:id/file', (req, res) => {
    if (hosted) return res.status(404).json({ error: 'Hosted downloads use the original request.' })
    streamJobFile(req, res)
  })

  return app
}
