import { useEffect, useRef, useState } from 'react'
import { Box, Paper, Typography, LinearProgress, Stack } from '@mui/material'
import DownloadRoundedIcon from '@mui/icons-material/DownloadRounded'
import MovieRoundedIcon from '@mui/icons-material/MovieRounded'
import MusicNoteRoundedIcon from '@mui/icons-material/MusicNoteRounded'
import GifRoundedIcon from '@mui/icons-material/GifRounded'
import { Button } from '../common/Button'
import { SegmentedControl } from '../common/SegmentedControl'
import { startJob, getJob, jobFileUrl, mediaProxyUrl } from '../../utils/api'
import { downloadUrl } from '../../utils/download'
import { formatBytes, formatDuration, safeName } from '../../utils/format'

/**
 * One downloadable video: thumbnail + metadata, MP4/MP3/GIF toggle, a quality
 * ladder for MP4, and a download button that tracks server-side progress.
 */
export function VideoCard({ item }) {
  const [container, setContainer] = useState('mp4')
  const [height, setHeight] = useState(item.qualities?.[0]?.height ?? null)
  const [job, setJob] = useState(null) // { id, progress, phase } while running
  const [error, setError] = useState(null)
  const pollRef = useRef(null)

  useEffect(() => () => clearInterval(pollRef.current), [])

  const busy = Boolean(job)
  // Fallback path (e.g. a tweet video yt-dlp couldn't parse): no quality
  // ladder, but a direct CDN file we can pull straight through the proxy.
  const isDirect = Boolean(item.directUrl) && (item.qualities?.length ?? 0) === 0

  const download = async () => {
    setError(null)
    if (isDirect && container === 'mp4') {
      downloadUrl(mediaProxyUrl(item.directUrl, { filename: `${safeName(item.title)}.mp4` }))
      return
    }
    try {
      const { id } = await startJob({
        url: container === 'gif' ? item.directUrl ?? item.url : item.url,
        format: container,
        height: container === 'mp4' ? height : undefined,
        playlistIndex: item.playlistIndex,
      })
      setJob({ id, progress: 0, phase: 'starting' })
      // Closure-local guards: skip ticks while one is in flight, and make
      // sure a slow straggler can't double-trigger the finished download.
      let inFlight = false
      let finished = false
      pollRef.current = setInterval(async () => {
        if (inFlight || finished) return
        inFlight = true
        try {
          const state = await getJob(id)
          if (finished) return
          if (state.status === 'done') {
            finished = true
            clearInterval(pollRef.current)
            setJob(null)
            downloadUrl(jobFileUrl(id))
          } else if (state.status === 'error') {
            finished = true
            clearInterval(pollRef.current)
            setJob(null)
            setError(state.error ?? 'The download failed.')
          } else {
            setJob({ id, progress: state.progress, phase: state.phase })
          }
        } catch {
          if (!finished) {
            finished = true
            clearInterval(pollRef.current)
            setJob(null)
            setError('Lost track of the download — try again.')
          }
        } finally {
          inFlight = false
        }
      }, 700)
    } catch (err) {
      setError(err.message)
    }
  }

  const qualityOptions = (item.qualities ?? []).map((q) => ({
    value: q.height,
    label: q.fps ? `${q.label} ${q.fps}fps` : q.label,
    sub: formatBytes(q.filesize) ?? undefined,
  }))

  return (
    <Paper sx={{ p: { xs: 2, sm: 2.5, md: 3 } }}>
      <Box sx={{ display: 'flex', gap: { xs: 2, md: 3 }, flexDirection: { xs: 'column', md: 'row' } }}>
        {item.thumbnail && (
          <Box sx={{ position: 'relative', flexShrink: 0, alignSelf: { xs: 'stretch', md: 'start' } }}>
            <Box
              component="img"
              src={item.thumbnail}
              alt=""
              sx={(theme) => ({
                width: { xs: '100%', md: 240 },
                aspectRatio: '16 / 9',
                objectFit: 'cover',
                borderRadius: `${theme.app.radius}px`,
                border: `1px solid ${theme.app.border}`,
                display: 'block',
              })}
            />
            {item.duration != null && (
              <Typography
                sx={{
                  position: 'absolute',
                  right: 8,
                  bottom: 8,
                  px: 0.85,
                  py: 0.15,
                  borderRadius: 1,
                  fontSize: 12,
                  fontWeight: 500,
                  bgcolor: 'rgba(30,30,36,0.85)',
                  color: '#fff',
                }}
              >
                {formatDuration(item.duration)}
              </Typography>
            )}
          </Box>
        )}

        <Box sx={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 1.75 }}>
          <Box>
            {item.title && (
              <Typography
                sx={{
                  fontWeight: 600,
                  fontSize: 16,
                  lineHeight: 1.35,
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                  overflowWrap: 'anywhere',
                }}
              >
                {item.title}
              </Typography>
            )}
            {item.uploader && (
              <Typography sx={{ color: 'text.secondary', fontSize: 13, mt: 0.25, overflowWrap: 'anywhere' }}>
                {item.uploader}
              </Typography>
            )}
          </Box>

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            <Typography sx={{ fontSize: 12, fontWeight: 500, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Format
            </Typography>
            <SegmentedControl
              ariaLabel="Output format"
              size="small"
              value={container}
              onChange={setContainer}
              options={[
                {
                  value: 'mp4',
                  label: 'MP4 video',
                  icon: <MovieRoundedIcon sx={{ fontSize: 16 }} />,
                },
                {
                  value: 'gif',
                  label: 'GIF animation',
                  icon: <GifRoundedIcon sx={{ fontSize: 16 }} />,
                },
                ...(!isDirect && item.canMp3
                  ? [
                      {
                        value: 'mp3',
                        label: 'MP3 audio',
                        icon: <MusicNoteRoundedIcon sx={{ fontSize: 16 }} />,
                      },
                    ]
                  : []),
              ]}
            />
            {container === 'gif' && (
              <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>
                Loops silently, up to 640px wide at 15 fps.
              </Typography>
            )}
          </Box>

          {!isDirect && container === 'mp4' && qualityOptions.length > 0 && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <Typography sx={{ fontSize: 12, fontWeight: 500, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Quality
              </Typography>
              <SegmentedControl
                ariaLabel="Video quality"
                size="small"
                value={height}
                onChange={setHeight}
                options={qualityOptions}
              />
            </Box>
          )}

          <Box sx={{ display: 'flex', alignItems: { xs: 'stretch', sm: 'center' }, flexDirection: { xs: 'column', sm: 'row' }, gap: 2, flexWrap: 'wrap', mt: 0.5 }}>
            <Button
              onClick={download}
              disabled={busy || (!isDirect && container === 'mp4' && qualityOptions.length > 0 && !height)}
              startIcon={<DownloadRoundedIcon sx={{ fontSize: 18 }} />}
            >
              {busy ? 'Grabbing…' : `Download ${container.toUpperCase()}`}
            </Button>

            {busy && (
              <Stack sx={{ flex: 1, minWidth: 0, gap: 0.75 }}>
                <LinearProgress variant="determinate" value={job.progress ?? 0} />
                <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>
                  {job.phase} · {job.progress ?? 0}%
                </Typography>
              </Stack>
            )}
          </Box>

          {error && (
            <Typography sx={{ color: 'secondary.main', fontWeight: 500, fontSize: 13, overflowWrap: 'anywhere' }}>
              {error}
            </Typography>
          )}
        </Box>
      </Box>
    </Paper>
  )
}
