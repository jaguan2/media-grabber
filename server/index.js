import express from 'express'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { resolveUrl } from './lib/resolve.js'
import { streamMedia } from './lib/media.js'
import { createJob, getJob, streamJobFile, cleanupStaleJobs } from './lib/jobs.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const PORT = process.env.PORT ?? 5175

const app = express()
app.use(express.json())

// Resolve a pasted link into downloadable items.
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

// Proxy (and optionally convert / attach) a remote image or thumbnail.
app.get('/api/media', streamMedia)

// Start a video/audio/GIF download job; poll it; then fetch the file.
app.post('/api/jobs', (req, res) => {
  const { url, format, height, playlistIndex } = req.body ?? {}
  if (!/^https?:\/\//i.test(String(url ?? ''))) {
    return res.status(400).json({ error: 'Bad video URL.' })
  }
  if (!['mp4', 'mp3', 'gif'].includes(format)) {
    return res.status(400).json({ error: 'Format must be mp4, mp3, or gif.' })
  }
  const h = height ? parseInt(height, 10) : null
  const idx = playlistIndex ? parseInt(playlistIndex, 10) : null
  const id = createJob({ url, format, height: h || null, playlistIndex: idx || null })
  res.json({ id })
})

app.get('/api/jobs/:id', (req, res) => {
  const job = getJob(req.params.id)
  if (!job) return res.status(404).json({ error: 'Unknown job.' })
  const { status, progress, phase, error } = job
  res.json({ status, progress, phase, error })
})

app.get('/api/jobs/:id/file', streamJobFile)

// Production: serve the built client if it exists.
const clientDist = path.join(__dirname, '..', 'client', 'dist')
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist))
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api/')) return next()
    res.sendFile(path.join(clientDist, 'index.html'))
  })
}

setInterval(cleanupStaleJobs, 10 * 60 * 1000)
cleanupStaleJobs()

const server = app.listen(PORT, () => {
  console.log(`Media Scraper API listening on http://localhost:${PORT}`)
})
server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    // Without this, the raw crash leaves the client 500-ing on every /api call
    // with no hint why.
    console.error(
      `Port ${PORT} is already in use — Media Scraper is probably already running ` +
        `(another "npm run dev" or MediaScraper.exe). Close that one and try again.`,
    )
    process.exit(1)
  }
  throw err
})
