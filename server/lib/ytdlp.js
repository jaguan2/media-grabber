import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import youtubedl from 'youtube-dl-exec'
import ffmpegPath from 'ffmpeg-static'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// Optional Netscape cookies.txt (exported from a logged-in browser session).
// Needed for private/login-gated Instagram posts; everything else works without.
export const COOKIES_FILE = path.join(__dirname, '..', 'cookies.txt')

// Desktop browser UA — some CDNs (Instagram's especially) refuse default UAs.
export const BROWSER_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36'

export { ffmpegPath }

/** Flags shared by every yt-dlp invocation (metadata dumps and downloads). */
export function commonFlags() {
  const flags = {
    noWarnings: true,
    userAgent: BROWSER_UA,
    // YouTube extraction needs a JS runtime to solve player challenges; without
    // one, yt-dlp uses a deprecated fallback that intermittently fails (bot
    // checks, missing formats, 403s). Reuse the Node that runs this server —
    // in the portable build that's the bundled node.exe.
    jsRuntimes: `node:${process.execPath}`,
  }
  if (fs.existsSync(COOKIES_FILE)) flags.cookies = COOKIES_FILE
  return flags
}

/** Run yt-dlp in metadata mode and return the parsed info JSON. */
export async function ytdlpJson(url, extra = {}) {
  const out = await youtubedl(url, {
    dumpSingleJson: true,
    skipDownload: true,
    ...commonFlags(),
    ...extra,
  })
  return typeof out === 'string' ? JSON.parse(out) : out
}

/** Spawn a yt-dlp download subprocess (returns the execa child promise). */
export function ytdlpExec(url, flags) {
  return youtubedl.exec(url, { ...commonFlags(), ...flags })
}

/**
 * Map a raw yt-dlp failure onto a message a person can act on. The raw stderr
 * is kept on `detail` for debugging, never shown as the headline.
 */
export function friendlyYtdlpError(err) {
  const text = String(err?.stderr ?? err?.message ?? err)
  let friendly = 'Could not fetch that link. The post may be private, deleted, or unsupported.'
  if (/sign in|login required|logged[- ]in|use --cookies|authentication/i.test(text)) {
    friendly =
      'This post needs a login to view. Export your browser cookies to server/cookies.txt and try again.'
  } else if (/rate[- ]?limit|429|too many requests/i.test(text)) {
    friendly = 'The site is rate-limiting us right now — wait a minute and try again.'
  } else if (/private|only available for registered users/i.test(text)) {
    friendly = 'That post is private, so it can’t be fetched.'
  } else if (/unsupported url/i.test(text)) {
    friendly = 'That link type isn’t supported yet. Try a YouTube, Instagram, or X post link.'
  } else if (/video unavailable|404|not found|removed/i.test(text)) {
    friendly = 'That post seems to be unavailable — it may have been removed.'
  } else if (/age.?restricted|age.?gate/i.test(text)) {
    friendly =
      'This video is age-restricted. Export logged-in cookies to server/cookies.txt to fetch it.'
  }
  const e = new Error(friendly)
  e.friendly = friendly
  e.detail = text.split('\n').find((l) => l.includes('ERROR')) ?? text.slice(0, 400)
  return e
}
