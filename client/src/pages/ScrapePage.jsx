import { Box, Paper, Typography, CircularProgress } from '@mui/material'
import ErrorOutlineRoundedIcon from '@mui/icons-material/ErrorOutlineRounded'
import { LinkInput } from '../components/scrape/LinkInput'
import { VideoCard } from '../components/scrape/VideoCard'
import { GalleryCard } from '../components/scrape/GalleryCard'

const PLATFORM_LABEL = {
  youtube: 'YouTube',
  instagram: 'Instagram',
  twitter: 'X',
  other: 'Link',
}

/**
 * The whole scrape flow: hero + link input, then the resolved result —
 * video cards (MP4 quality ladder / MP3) and/or a photo gallery grid.
 */
export function ScrapePage({ state, onFetch }) {
  const { status, data, error } = state

  const images = data?.items?.filter((i) => i.type === 'image') ?? []
  const videos = data?.items?.filter((i) => i.type === 'video') ?? []
  const badge = PLATFORM_LABEL[data?.platform] ?? PLATFORM_LABEL.other

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: { xs: 3, md: 4 }, py: { xs: 4, sm: 6, md: 8 } }}>
      {/* Hero */}
      <Box sx={{ maxWidth: 720 }}>
        <Typography
          component="h1"
          sx={{ fontSize: 'clamp(36px, 5vw, 60px)', fontWeight: 600, lineHeight: 1.1, letterSpacing: '-1.5px' }}
        >
          Paste a link,
          <br />
          keep the
          <Box component="span" sx={{ color: 'secondary.main' }}> media.</Box>
        </Typography>
        <Typography sx={{ color: 'text.secondary', fontSize: { xs: 16, md: 19 }, mt: 2.5, maxWidth: 560 }}>
          An ad-free grabber for YouTube, Instagram, and X. Videos as MP4, MP3, or GIF, photos as
          JPG or PNG. No popups, no countdown timers, no “premium”.
        </Typography>
      </Box>

      <LinkInput onSubmit={onFetch} busy={status === 'loading'} />

      {status === 'loading' && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, py: 2 }}>
          <CircularProgress size={20} thickness={5} sx={{ color: 'secondary.main' }} />
          <Typography sx={{ color: 'text.secondary', fontSize: 15 }}>
            Reading that link…
          </Typography>
        </Box>
      )}

      {status === 'error' && (
        <Paper sx={{ p: { xs: 2, sm: 2.5 }, display: 'flex', alignItems: 'flex-start', gap: 1.5, borderColor: 'secondary.main' }}>
          <ErrorOutlineRoundedIcon sx={{ color: 'secondary.main', flexShrink: 0 }} />
          <Typography sx={{ minWidth: 0, overflowWrap: 'anywhere', fontWeight: 500, fontSize: 14.5 }}>{error}</Typography>
        </Paper>
      )}

      {status === 'done' && data && (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
          {/* Result header: platform + post title */}
          <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1.5, flexWrap: 'wrap' }}>
            <Typography
              component="span"
              sx={{
                fontSize: 12,
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '1px',
                color: 'secondary.main',
              }}
            >
              {badge}
            </Typography>
            {(data.title || data.uploader) && (
              <Typography sx={{ minWidth: 0, overflowWrap: 'anywhere', color: 'text.secondary', fontSize: 14 }}>
                {[data.uploader, data.title].filter(Boolean).join(' · ').slice(0, 120)}
              </Typography>
            )}
          </Box>

          {images.length > 0 && (
            <GalleryCard images={images} title={data.title} platform={data.platform} />
          )}
          {videos.map((v, i) => (
            <VideoCard key={i} item={v} />
          ))}
        </Box>
      )}
    </Box>
  )
}
