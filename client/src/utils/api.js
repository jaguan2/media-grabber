// Thin client for the Media Scraper API. All calls are same-origin (Vite proxies /api
// to the Express server in dev).

async function jsonOrThrow(resp, fallbackMsg) {
  let data = null
  try {
    data = await resp.json()
  } catch {
    // Non-JSON error body — fall through to the fallback message.
  }
  if (!resp.ok) throw new Error(data?.error ?? fallbackMsg)
  return data
}

/** Resolve a pasted link → { platform, title, uploader, sourceUrl, items }. */
export async function resolveLink(url) {
  const resp = await fetch('/api/resolve', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ url }),
  })
  return jsonOrThrow(resp, 'Could not read that link.')
}

/** Start a video/audio/GIF download job → { id }. */
export async function startJob({ url, format, height, playlistIndex }) {
  const resp = await fetch('/api/jobs', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ url, format, height, playlistIndex }),
  })
  return jsonOrThrow(resp, 'Could not start the download.')
}

/** Poll a job → { status, progress, phase, error }. */
export async function getJob(id) {
  const resp = await fetch(`/api/jobs/${id}`)
  return jsonOrThrow(resp, 'Lost track of the download.')
}

export function jobFileUrl(id) {
  return `/api/jobs/${id}/file`
}

/** Append conversion/attachment params onto a proxied /api/media URL. */
export function imageDownloadUrl(src, { format, filename } = {}) {
  let url = src
  if (format) url += `&format=${format}`
  if (filename) url += `&dl=${encodeURIComponent(filename)}`
  return url
}

/** Proxy a RAW remote URL through /api/media (e.g. a direct CDN mp4). */
export function mediaProxyUrl(remoteSrc, { filename } = {}) {
  let url = `/api/media?src=${encodeURIComponent(remoteSrc)}`
  if (filename) url += `&dl=${encodeURIComponent(filename)}`
  return url
}
