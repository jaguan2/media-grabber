import { Box, Paper, Typography, Skeleton } from '@mui/material'
import { useEffect, useState } from 'react'
import ErrorOutlineRoundedIcon from '@mui/icons-material/ErrorOutlineRounded'
import ArrowOutwardRoundedIcon from '@mui/icons-material/ArrowOutwardRounded'
import MovieRoundedIcon from '@mui/icons-material/MovieRounded'
import CollectionsRoundedIcon from '@mui/icons-material/CollectionsRounded'
import TuneRoundedIcon from '@mui/icons-material/TuneRounded'
import { LinkInput } from '../components/scrape/LinkInput'
import { VideoCard } from '../components/scrape/VideoCard'
import { GalleryCard } from '../components/scrape/GalleryCard'
import { MediaPreview } from '../components/scrape/MediaPreview'
import { PlatformBadge } from '../components/scrape/PlatformBadge'

const features = [
  { icon: MovieRoundedIcon, title: 'Save it your way', text: 'Video, audio, or a looping GIF.' },
  {
    icon: CollectionsRoundedIcon,
    title: 'Get the whole picture',
    text: 'One photo or the entire carousel.',
  },
  { icon: TuneRoundedIcon, title: 'You make the call', text: 'Choose your format and quality.' },
]

export function ScrapePage({ state, onFetch }) {
  const { status, data, error } = state
  const [hosted, setHosted] = useState(false)
  useEffect(() => {
    const controller = new AbortController()
    fetch('/api/config', { signal: controller.signal })
      .then((response) => response.json())
      .then((config) => setHosted(config.mode === 'hosted'))
      .catch(() => {})
    return () => controller.abort()
  }, [])
  const images = data?.items?.filter((item) => item.type === 'image') ?? []
  const videos = data?.items?.filter((item) => item.type === 'video') ?? []
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        gap: { xs: 3, md: 4 },
        pt: { xs: 4, sm: 5, md: 6 },
        pb: { xs: 2, md: 4 },
      }}
    >
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: 'minmax(0, 1fr)', md: '1.2fr 1fr' },
          alignItems: 'center',
          columnGap: { md: 3, lg: 6 },
          pb: { xs: 0.5, md: 1 },
        }}
      >
        <Box>
          <Typography
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              fontSize: 10,
              fontWeight: 600,
              letterSpacing: '1.8px',
              mb: 2.3,
              color: 'text.secondary',
            }}
          >
            <Box
              component="span"
              sx={{ width: 6, height: 6, bgcolor: 'secondary.main', borderRadius: '50%' }}
            />
            LESS SCROLLING. MORE KEEPING.
          </Typography>
          <Typography
            component="h1"
            sx={{
              fontSize: { xs: 43, sm: 55, md: 60 },
              fontWeight: 600,
              lineHeight: 1.09,
              letterSpacing: { xs: '-1.8px', md: '-2.5px' },
            }}
          >
            Paste a link.
            <br />
            Keep the{' '}
            <Box component="span" sx={{ color: 'secondary.main' }}>
              good stuff.
            </Box>
          </Typography>
          <Typography
            sx={{
              color: 'text.secondary',
              fontSize: { xs: 14, sm: 15 },
              lineHeight: 1.85,
              mt: 2.5,
              maxWidth: 435,
            }}
          >
            That video. That song. That whole photo carousel. Save your favorite finds in the format
            you want.
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 1, mt: 2.5 }}>
            {['youtube', 'instagram', 'twitter'].map((platform) => (
              <PlatformBadge key={platform} platform={platform} />
            ))}
          </Box>
        </Box>
        <MediaPreview />
      </Box>
      <Box>
        <LinkInput onSubmit={onFetch} busy={status === 'loading'} />
        {hosted && (
          <Typography
            sx={{
              color: 'text.secondary',
              fontSize: 11,
              lineHeight: 1.7,
              mt: 1.5,
              px: { xs: 0.5, sm: 1 },
            }}
          >
            Long or high-quality videos may not finish on the hosted app, but you can still try.
            Keep this page open while downloading.
          </Typography>
        )}
      </Box>
      {status === 'idle' && (
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, minmax(0, 1fr))' },
            gap: { xs: 2.5, sm: 3 },
            pt: 1,
            pb: 0.5,
          }}
        >
          {features.map(({ icon: Icon, title, text }) => (
            <Box key={title} sx={{ display: 'flex', gap: 1.4, alignItems: 'flex-start' }}>
              <Box
                sx={{
                  display: 'grid',
                  placeItems: 'center',
                  width: 35,
                  height: 35,
                  flexShrink: 0,
                  border: '1px solid',
                  borderColor: 'divider',
                  bgcolor: '#f1f0eb',
                  borderRadius: '10px',
                }}
              >
                <Icon sx={{ fontSize: 18, color: 'text.secondary' }} />
              </Box>
              <Box>
                <Typography sx={{ fontWeight: 500, fontSize: 12, mb: 0.5 }}>{title}</Typography>
                <Typography sx={{ fontSize: 11, color: 'text.secondary', lineHeight: 1.7 }}>
                  {text}
                </Typography>
              </Box>
            </Box>
          ))}
        </Box>
      )}
      {status === 'loading' && (
        <Box
          role="status"
          aria-live="polite"
          aria-label="Reading your link and finding available media"
        >
          <Typography sx={{ fontSize: 13, color: 'text.secondary', mb: 1.5 }}>
            Finding the good stuff…
          </Typography>
          <Paper
            sx={{
              p: { xs: 2, sm: 3 },
              display: 'flex',
              gap: 3,
              borderRadius: '18px',
              flexDirection: { xs: 'column', sm: 'row' },
            }}
          >
            <Skeleton
              variant="rounded"
              animation="wave"
              sx={{ width: { xs: '100%', sm: 240 }, height: 135, flexShrink: 0 }}
            />
            <Box sx={{ flex: 1 }}>
              <Skeleton width="70%" height={30} />
              <Skeleton width="40%" />
              <Skeleton variant="rounded" width="85%" height={40} sx={{ mt: 2 }} />
            </Box>
          </Paper>
        </Box>
      )}
      {status === 'error' && (
        <Paper
          role="alert"
          sx={{
            p: 2.5,
            display: 'flex',
            alignItems: 'flex-start',
            gap: 1.5,
            borderRadius: '14px',
            bgcolor: '#fff7f9',
            borderColor: '#f2ccd6',
          }}
        >
          <ErrorOutlineRoundedIcon sx={{ color: 'secondary.main', flexShrink: 0 }} />
          <Box>
            <Typography sx={{ fontWeight: 600, fontSize: 14, mb: 0.5 }}>
              Couldn't grab that one.
            </Typography>
            <Typography sx={{ overflowWrap: 'anywhere', fontSize: 13, color: 'text.secondary' }}>
              {error}
            </Typography>
          </Box>
        </Paper>
      )}
      {status === 'done' && data && (
        <Box className="media-results" sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: 1.5,
            }}
          >
            <Box>
              <Typography
                component="h2"
                sx={{ fontWeight: 600, fontSize: 22, letterSpacing: '-.6px' }}
              >
                Yours for the keeping.
              </Typography>
              <Typography role="status" sx={{ color: 'text.secondary', fontSize: 12, mt: 0.5 }}>
                {data.items.length} {data.items.length === 1 ? 'item' : 'items'} found. Pick your
                format below.
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <PlatformBadge platform={data.platform} />
              {data.sourceUrl && (
                <Box
                  component="a"
                  href={data.sourceUrl}
                  target="_blank"
                  rel="noreferrer"
                  sx={{
                    color: 'text.secondary',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 0.4,
                    fontSize: 11,
                    textDecoration: 'none',
                    '&:hover': { color: 'secondary.main' },
                  }}
                >
                  Original post <ArrowOutwardRoundedIcon sx={{ fontSize: 14 }} />
                </Box>
              )}
            </Box>
          </Box>
          {images.length > 0 && (
            <GalleryCard
              key={data.sourceUrl}
              images={images}
              title={data.title}
              platform={data.platform}
            />
          )}
          {videos.map((video, index) => (
            <VideoCard key={`${data.sourceUrl}-${video.url}-${index}`} item={video} />
          ))}
        </Box>
      )}
    </Box>
  )
}
