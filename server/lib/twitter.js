// Tweet resolution via the fxtwitter public API. yt-dlp handles tweet VIDEOS,
// but photo-only tweets dead-end there — fxtwitter reports every attachment
// (photos and videos) in one call, so it drives the item list; yt-dlp is then
// used only to enrich videos with a quality ladder.

import { ytdlpJson, friendlyYtdlpError, BROWSER_UA } from './ytdlp.js'
import { normalizeYtdlp, proxied } from './normalize.js'

export function tweetIdFrom(url) {
  return url.match(/(?:twitter\.com|x\.com)\/[^/]+\/status\/(\d+)/i)?.[1] ?? null
}

export async function resolveTwitter(url) {
  const id = tweetIdFrom(url)
  if (!id) {
    const e = new Error('That looks like an X/Twitter link, but not a post link. Paste a .../status/... link.')
    e.friendly = e.message
    throw e
  }

  const resp = await fetch(`https://api.fxtwitter.com/status/${id}`, {
    headers: { 'user-agent': BROWSER_UA },
  })
  if (!resp.ok) {
    const e = new Error('Could not read that post — it may be deleted or from a private account.')
    e.friendly = e.message
    throw e
  }
  const data = await resp.json()
  const tweet = data?.tweet
  if (!tweet) {
    const e = new Error('Could not read that post — it may be deleted or from a private account.')
    e.friendly = e.message
    throw e
  }

  const media = tweet.media?.all ?? []
  const items = []

  for (const m of media) {
    if (m.type === 'photo') {
      items.push({
        type: 'image',
        src: proxied(m.url, url),
        width: m.width ?? null,
        height: m.height ?? null,
      })
    }
  }

  const hasVideo = media.some((m) => m.type === 'video' || m.type === 'gif')
  if (hasVideo) {
    let videos = []
    // Ask yt-dlp for the tweet's video formats so quality choices are real.
    try {
      const info = await ytdlpJson(url)
      const normalized = normalizeYtdlp(info, url, 'twitter')
      videos = normalized.items.filter((i) => i.type === 'video')
    } catch {
      // Enrichment is optional; the direct files below still work.
    }
    items.push(...videos)
    if (videos.length === 0) {
      // Fall back to fxtwitter's best-quality direct file: still downloadable,
      // just without a quality picker. Some GIFs resolve successfully in
      // yt-dlp but normalize to no videos because codec metadata is missing.
      for (const m of media) {
        if (m.type !== 'video' && m.type !== 'gif') continue
        items.push({
          type: 'video',
          url,
          title: tweet.text?.slice(0, 80) || `tweet-${id}`,
          uploader: tweet.author?.screen_name ?? null,
          duration: m.duration ?? null,
          thumbnail: proxied(m.thumbnail_url, url),
          qualities: [],
          // Without usable yt-dlp metadata, disable audio extraction.
          // The direct file supports MP4 download or GIF conversion.
          canMp3: false,
          directUrl: m.url,
        })
      }
    }
  }

  if (items.length === 0) {
    const e = new Error('That post has no photos or videos to download.')
    e.friendly = e.message
    throw e
  }

  return {
    platform: 'twitter',
    title: tweet.text?.slice(0, 120) || null,
    uploader: tweet.author?.screen_name ? `@${tweet.author.screen_name}` : null,
    sourceUrl: url,
    items,
  }
}

export { friendlyYtdlpError }
