import express from 'express'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createApp } from './app.js'
import { cleanupStaleJobs } from './lib/jobs.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const PORT = process.env.PORT ?? 5175

const app = createApp()

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
