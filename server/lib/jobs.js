// Video download jobs. A job spawns yt-dlp into a per-job temp dir, tracks
// percent progress from its stdout, and exposes the finished file for one
// streamed download (after which the temp dir is deleted). MP4 merges best
// video ≤ chosen height with best audio via ffmpeg; MP3 extracts audio;
// GIF converts the downloaded video into a silent, looping animation.

import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { randomUUID } from 'node:crypto'
import { spawn } from 'node:child_process'
import { ytdlpExec, ffmpegPath, friendlyYtdlpError } from './ytdlp.js'

// System temp, NOT inside the repo: the project lives in a OneDrive-synced
// folder, and OneDrive locks mid-sync files (EPERM on cleanup) and would
// upload every downloaded video.
const TMP_ROOT = path.join(os.tmpdir(), 'media-scraper-jobs')

const MEDIA_EXTS = new Set(['.mp4', '.mkv', '.webm', '.mp3', '.m4a'])
const STALE_MS = 60 * 60 * 1000 // reclaim undownloaded jobs after an hour

const jobs = new Map()

async function convertToGif(job, input) {
  const output = path.join(job.dir, `${path.parse(input).name}.gif`)
  job.phase = 'converting to GIF'
  job.progress = 99
  // A generated palette preserves colors; limit dimensions and frame rate
  // to keep GIF sizes manageable, and loop the full animation forever.
  const child = spawn(ffmpegPath, [
    '-hide_banner', '-loglevel', 'error', '-y', '-i', input,
    '-filter_complex',
    "fps=15,scale=w='min(640,iw)':h=-1:flags=lanczos,split[a][b];[a]palettegen[p];[b][p]paletteuse",
    '-an', '-loop', '0', output,
  ], { windowsHide: true, stdio: ['ignore', 'ignore', 'pipe'] })
  job.child = child
  // Drain stderr so a failed encoder cannot block on a full pipe.
  child.stderr.on('data', () => {})
  await new Promise((resolve, reject) => {
    const fail = () => {
      const error = new Error('Could not convert this video to GIF. Try downloading MP4 instead.')
      error.friendly = error.message
      reject(error)
    }
    child.once('error', fail)
    child.once('close', (code) => code === 0 ? resolve() : fail())
  })
  return output
}

export function createJob({ url, format, height, playlistIndex }) {
  const id = randomUUID()
  const dir = path.join(TMP_ROOT, id)
  fs.mkdirSync(dir, { recursive: true })

  const flags = {
    output: path.join(dir, '%(title).120B.%(ext)s'),
    restrictFilenames: true, // ASCII-safe names for Windows + Content-Disposition
    newline: true,
    ffmpegLocation: ffmpegPath,
  }
  // NEVER pass a false boolean to youtube-dl-exec: dargs turns
  // `noPlaylist: false` into the invalid flag `--no-no-playlist`.
  if (playlistIndex) flags.playlistItems = String(playlistIndex)
  else flags.noPlaylist = true

  if (format === 'mp3') {
    flags.extractAudio = true
    flags.audioFormat = 'mp3'
    flags.audioQuality = '0'
    flags.format = 'ba/b'
  } else if (format === 'gif') {
    flags.format = 'bv/b'
  } else {
    flags.format = height
      ? `bv*[height<=${height}]+ba/b[height<=${height}]/bv*+ba/b`
      : 'bv*+ba/b'
    flags.mergeOutputFormat = 'mp4'
  }

  const child = ytdlpExec(url, flags)
  const job = {
    id,
    dir,
    child,
    status: 'running',
    progress: 0,
    phase: 'starting',
    error: null,
    file: null,
    createdAt: Date.now(),
  }
  jobs.set(id, job)

  // yt-dlp prints one "[download] Destination:" per stream (video, then audio
  // for merged MP4s), each counting 0→100%. Fold them into a single 0→100 bar.
  const totalPhases = format === 'mp4' ? 2 : 1
  let phase = 0
  let buffer = ''
  child.stdout?.on('data', (chunk) => {
    buffer += chunk.toString()
    const lines = buffer.split('\n')
    buffer = lines.pop() ?? ''
    for (const line of lines) {
      if (line.includes('Destination:')) {
        phase = Math.min(phase + 1, totalPhases)
        job.phase =
          format === 'mp3' ? 'downloading audio' : phase === 1 ? 'downloading video' : 'downloading audio'
      }
      const m = line.match(/\[download\]\s+([\d.]+)%/)
      if (m && phase > 0) {
        const pct = parseFloat(m[1])
        job.progress = Math.min(99, Math.round(((phase - 1) * 100 + pct) / totalPhases))
      }
      if (/\[(Merger|ExtractAudio|VideoConvertor)\]/.test(line)) {
        job.phase = 'processing'
        job.progress = 99
      }
    }
  })

  child
    .then(async () => {
      const file = fs
        .readdirSync(dir)
        .filter((f) => MEDIA_EXTS.has(path.extname(f).toLowerCase()))
        .map((f) => ({ f, size: fs.statSync(path.join(dir, f)).size }))
        .sort((a, b) => b.size - a.size)[0]?.f
      if (!file) {
        job.status = 'error'
        job.error = 'Download finished but no output file was produced.'
        return
      }
      const input = path.join(dir, file)
      job.file = format === 'gif' ? await convertToGif(job, input) : input
      job.status = 'done'
      job.progress = 100
      job.phase = 'done'
    })
    .catch((err) => {
      job.status = 'error'
      job.error = err.friendly ?? friendlyYtdlpError(err).friendly
    })

  return id
}

export function getJob(id) {
  return jobs.get(id) ?? null
}

/** Stream the finished file once, then delete the job's temp dir. */
export function streamJobFile(req, res) {
  const job = jobs.get(req.params.id)
  if (!job) return res.status(404).json({ error: 'Unknown job.' })
  if (job.status !== 'done' || !job.file) {
    return res.status(409).json({ error: 'That download isn’t ready.' })
  }
  res.download(job.file, path.basename(job.file), () => {
    destroyJob(job.id)
  })
}

function destroyJob(id) {
  const job = jobs.get(id)
  if (!job) return
  jobs.delete(id)
  // A still-running yt-dlp must die before its temp dir is deleted from
  // under it (also stops hung downloads from living forever).
  if (job.status === 'running') {
    try {
      job.child?.kill()
    } catch {
      // Already exited.
    }
  }
  fs.rm(job.dir, { recursive: true, force: true }, () => {})
}

export function cleanupStaleJobs() {
  const now = Date.now()
  for (const job of [...jobs.values()]) {
    if (now - job.createdAt > STALE_MS) destroyJob(job.id)
  }
  // Also sweep orphaned dirs from crashed runs.
  if (fs.existsSync(TMP_ROOT)) {
    for (const entry of fs.readdirSync(TMP_ROOT)) {
      if (!jobs.has(entry)) {
        fs.rm(path.join(TMP_ROOT, entry), { recursive: true, force: true }, () => {})
      }
    }
  }
}
