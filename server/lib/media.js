// Same-origin proxy for remote images/thumbnails, with optional on-the-fly
// JPG/PNG conversion via sharp and attachment downloads. Remote CDNs block
// cross-origin <img> loads and hotlinking; routing through here fixes both.

import { Readable, Transform, pipeline } from 'node:stream'
import sharp from 'sharp'
import { BROWSER_UA } from './ytdlp.js'

// Refuse obviously-internal targets so the proxy can't be pointed at the
// local network. Textual check only (no DNS resolution) — acceptable for a
// personal app; every redirect hop is re-validated below.
const BLOCKED_HOST =
  /^(localhost|127\.|0\.|10\.|192\.168\.|169\.254\.|172\.(1[6-9]|2\d|3[01])\.|\[|::)/i

const MAX_REDIRECTS = 5

function isBlocked(url) {
  return !/^https?:$/.test(url.protocol) || BLOCKED_HOST.test(url.hostname)
}

/** Fetch with manual redirects so every hop passes the host blocklist. */
async function fetchChecked(target, headers, signal) {
  let current = target
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    const resp = await fetch(current, { headers, redirect: 'manual', signal })
    if (![301, 302, 303, 307, 308].includes(resp.status)) return resp
    const location = resp.headers.get('location')
    if (!location) return resp
    await resp.body?.cancel()
    current = new URL(location, current)
    if (isBlocked(current)) throw new Error('redirect to blocked host')
  }
  throw new Error('too many redirects')
}

export async function streamMedia(req, res, { maxBytes, timeoutMs } = {}) {
  const { src, referer, format, dl } = req.query

  let target
  try {
    target = new URL(src)
  } catch {
    return res.status(400).json({ error: 'Bad media URL.' })
  }
  if (isBlocked(target)) {
    return res.status(400).json({ error: 'Bad media URL.' })
  }

  let upstream
  try {
    upstream = await fetchChecked(target, {
      'user-agent': BROWSER_UA,
      accept: 'image/avif,image/webp,image/*,video/*,*/*;q=0.8',
      // No compressed responses: undici would decompress transparently and
      // the forwarded Content-Length below would no longer match the bytes.
      'accept-encoding': 'identity',
      ...(referer ? { referer } : {}),
    }, timeoutMs ? AbortSignal.timeout(timeoutMs) : undefined)
  } catch {
    return res.status(502).json({ error: 'Could not reach the media host.' })
  }
  if (!upstream.ok || !upstream.body) {
    return res.status(502).json({ error: `Media host answered ${upstream.status}.` })
  }
  if (maxBytes && Number(upstream.headers.get('content-length')) > maxBytes) {
    await upstream.body.cancel()
    return res.status(413).json({ error: 'This file is too large for the hosted app. Try the local app.' })
  }

  const byteLimit = () => {
    let received = 0
    return new Transform({
      transform(chunk, encoding, callback) {
        received += chunk.length
        callback(maxBytes && received > maxBytes ? new Error('Hosted file size limit exceeded.') : null, chunk)
      },
    })
  }

  if (dl) {
    // Strip filesystem-reserved AND control characters — a raw \r\n here
    // would throw in setHeader and 500 the request (header injection).
    // eslint-disable-next-line no-control-regex
    const safe = String(dl).replace(/[/\\:*?"<>|\x00-\x1f\x7f]/g, '_').slice(0, 150)
    res.setHeader('Content-Disposition', `attachment; filename="${safe}"`)
  }

  const body = Readable.fromWeb(upstream.body)
  const done = (err) => {
    // pipeline destroys every stream on failure; nothing to crash on. Just
    // make sure a half-sent response is terminated.
    if (err && !res.writableEnded) res.destroy()
  }

  if (format === 'jpg' || format === 'png') {
    res.setHeader('Content-Type', format === 'png' ? 'image/png' : 'image/jpeg')
    const transformer =
      format === 'png'
        ? sharp().png()
        : sharp().flatten({ background: '#ffffff' }).jpeg({ quality: 92 })
    pipeline(body, byteLimit(), transformer, byteLimit(), res, done)
    return
  }

  res.setHeader('Content-Type', upstream.headers.get('content-type') ?? 'application/octet-stream')
  const len = upstream.headers.get('content-length')
  if (len && !upstream.headers.get('content-encoding')) res.setHeader('Content-Length', len)
  // Proxied assets are immutable CDN objects — let the browser cache them.
  res.setHeader('Cache-Control', 'public, max-age=3600')
  pipeline(body, byteLimit(), res, done)
}
