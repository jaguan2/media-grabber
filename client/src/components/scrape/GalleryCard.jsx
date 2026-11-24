import { useState } from 'react'
import { Box, Paper, Typography, ButtonBase, CircularProgress } from '@mui/material'
import { alpha } from '@mui/material/styles'
import DownloadRoundedIcon from '@mui/icons-material/DownloadRounded'
import CheckRoundedIcon from '@mui/icons-material/CheckRounded'
import FolderZipRoundedIcon from '@mui/icons-material/FolderZipRounded'
import CollectionsRoundedIcon from '@mui/icons-material/CollectionsRounded'
import { Button } from '../common/Button'
import { SegmentedControl } from '../common/SegmentedControl'
import { imageDownloadUrl } from '../../utils/api'
import { downloadUrl, downloadZip } from '../../utils/download'
import { safeName } from '../../utils/format'

/**
 * A photo post: every image in a selectable grid. Downloads honor the JPG/PNG
 * choice (converted server-side); multiple photos can be zipped in one go.
 */
export function GalleryCard({ images, title, platform }) {
  const [fmt, setFmt] = useState('jpg')
  const [selected, setSelected] = useState(() => new Set())
  const [zipping, setZipping] = useState(false)
  const [error, setError] = useState(null)

  const base = safeName(title, `${platform}-post`)
  const nameFor = (i) => `${base} ${i + 1}.${fmt}`

  const toggle = (i) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(i)) next.delete(i)
      else next.add(i)
      return next
    })
  }

  const zipMany = async (indices) => {
    setZipping(true)
    setError(null)
    try {
      const items = await Promise.all(
        indices.map(async (i) => {
          const resp = await fetch(imageDownloadUrl(images[i].src, { format: fmt }))
          if (!resp.ok) throw new Error('One of the photos failed to fetch.')
          return { blob: await resp.blob(), filename: nameFor(i) }
        })
      )
      await downloadZip(items, `${base}.zip`)
    } catch (err) {
      setError(err.message ?? 'Could not build the ZIP.')
    } finally {
      setZipping(false)
    }
  }

  const single = images.length === 1

  return (
    <Paper
      sx={{ p: { xs: 2, sm: 3 }, borderRadius: '18px', boxShadow: '0 8px 35px -28px #47263440' }}
    >
      {/* Toolbar */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap', mb: 2.5 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, mr: 'auto' }}>
          <Box
            sx={{
              width: 38,
              height: 38,
              display: 'grid',
              placeItems: 'center',
              borderRadius: '10px',
              bgcolor: '#fff0f4',
              color: '#b92b57',
            }}
          >
            <CollectionsRoundedIcon sx={{ fontSize: 20 }} />
          </Box>
          <Box>
            <Typography
              component="h3"
              sx={{ fontWeight: 600, fontSize: 17, letterSpacing: '-.3px' }}
            >
              {single ? '1 photo' : `${images.length} photos`}
              {selected.size > 0 && (
                <Typography
                  component="span"
                  sx={{ color: 'text.secondary', fontWeight: 400, fontSize: 13, ml: 1 }}
                >
                  · {selected.size} selected
                </Typography>
              )}
            </Typography>
            <Typography sx={{ fontSize: 11, color: 'text.secondary', mt: 0.25 }}>
              {single
                ? 'A little something to save.'
                : 'Pick your favorites or take the whole set.'}
            </Typography>
          </Box>
        </Box>

        <SegmentedControl
          ariaLabel="Image format"
          size="small"
          value={fmt}
          onChange={setFmt}
          disabled={zipping}
          options={[
            { value: 'jpg', label: 'JPG' },
            { value: 'png', label: 'PNG' },
          ]}
        />

        {!single && (
          <>
            {selected.size > 0 && (
              <Button
                size="small"
                variant="outline"
                disabled={zipping}
                onClick={() =>
                  selected.size === 1
                    ? downloadUrl(
                        imageDownloadUrl(images[[...selected][0]].src, {
                          format: fmt,
                          filename: nameFor([...selected][0]),
                        })
                      )
                    : zipMany([...selected].sort((a, b) => a - b))
                }
                startIcon={<DownloadRoundedIcon sx={{ fontSize: 16 }} />}
              >
                Download selected
              </Button>
            )}
            <Button
              variant="accent"
              size="small"
              disabled={zipping}
              onClick={() => zipMany(images.map((_, i) => i))}
              startIcon={
                zipping ? (
                  <CircularProgress size={14} thickness={5} sx={{ color: 'inherit' }} />
                ) : (
                  <FolderZipRoundedIcon sx={{ fontSize: 16 }} />
                )
              }
            >
              {zipping ? 'Zipping…' : 'Download all (.zip)'}
            </Button>
          </>
        )}
        {single && (
          <Button
            variant="accent"
            size="small"
            onClick={() =>
              downloadUrl(imageDownloadUrl(images[0].src, { format: fmt, filename: nameFor(0) }))
            }
            startIcon={<DownloadRoundedIcon sx={{ fontSize: 16 }} />}
          >
            Download {fmt.toUpperCase()}
          </Button>
        )}
      </Box>

      {error && (
        <Typography
          role="alert"
          sx={{ color: 'secondary.main', fontWeight: 500, fontSize: 13, mb: 2 }}
        >
          {error}
        </Typography>
      )}

      {/* Photo grid */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: single
            ? 'minmax(0, 560px)'
            : { xs: 'repeat(2, minmax(0, 1fr))', sm: 'repeat(3, minmax(0, 1fr))' },
          justifyContent: single ? 'center' : 'start',
          gap: 1.5,
        }}
      >
        {images.map((img, i) => {
          const isSelected = selected.has(i)
          return (
            <Box
              key={i}
              sx={(theme) => ({
                position: 'relative',
                borderRadius: '12px',
                overflow: 'hidden',
                border: `2px solid ${isSelected ? theme.app.accent : theme.app.border}`,
                transition: 'border-color 160ms ease, transform 200ms ease',
                '@media (hover: hover)': {
                  '&:hover': { transform: 'translateY(-3px)' },
                  '&:hover .tile-actions': { opacity: 1 },
                },
                '&:focus-within .tile-actions': { opacity: 1 },
              })}
            >
              <Box
                component="img"
                src={img.src}
                alt={`Photo ${i + 1}`}
                loading="lazy"
                onClick={() => !single && toggle(i)}
                sx={{
                  display: 'block',
                  width: '100%',
                  aspectRatio: '1 / 1',
                  objectFit: 'cover',
                  cursor: single ? 'default' : 'pointer',
                }}
              />

              <Box
                sx={{
                  position: 'absolute',
                  top: 10,
                  left: 10,
                  pointerEvents: 'none',
                  bgcolor: '#24212a90',
                  color: '#fff',
                  px: 0.8,
                  py: 0.35,
                  borderRadius: '5px',
                  fontSize: 10,
                }}
              >
                {String(i + 1).padStart(2, '0')}
              </Box>

              {/* Selection check (multi-photo posts only) */}
              {!single && (
                <ButtonBase
                  onClick={() => toggle(i)}
                  aria-label={isSelected ? `Deselect photo ${i + 1}` : `Select photo ${i + 1}`}
                  aria-pressed={isSelected}
                  sx={(theme) => ({
                    position: 'absolute',
                    top: 8,
                    right: 8,
                    width: { xs: 44, md: 28 },
                    height: { xs: 44, md: 28 },
                    borderRadius: '50%',
                    bgcolor: isSelected ? theme.app.accent : alpha('#ffffff', 0.9),
                    border: `1px solid ${isSelected ? theme.app.accent : theme.app.border}`,
                    transition: 'background-color 160ms ease, transform 160ms ease',
                    '&:hover': { transform: 'scale(1.1)' },
                    '&:focus-visible': { outline: '2px solid #ff004f', outlineOffset: 3 },
                  })}
                >
                  {isSelected && <CheckRoundedIcon sx={{ fontSize: 18, color: '#fff' }} />}
                </ButtonBase>
              )}

              {/* Per-photo download */}
              <Box
                className="tile-actions"
                sx={{
                  position: 'absolute',
                  left: 0,
                  right: 0,
                  bottom: 0,
                  p: 1,
                  display: 'flex',
                  justifyContent: 'flex-end',
                  background: 'linear-gradient(0deg, rgba(30,30,36,0.5), transparent)',
                  opacity: { xs: 1, md: single ? 1 : 0 },
                  transition: 'opacity 180ms ease',
                }}
              >
                <ButtonBase
                  onClick={() =>
                    downloadUrl(imageDownloadUrl(img.src, { format: fmt, filename: nameFor(i) }))
                  }
                  aria-label={`Download photo ${i + 1} as ${fmt.toUpperCase()}`}
                  sx={(theme) => ({
                    width: { xs: 44, md: 32 },
                    height: { xs: 44, md: 32 },
                    borderRadius: '50%',
                    bgcolor: alpha('#ffffff', 0.95),
                    border: `1px solid ${theme.app.border}`,
                    transition: 'transform 160ms ease',
                    '&:hover': { transform: 'scale(1.1)' },
                    '&:focus-visible': { outline: '2px solid #ff004f', outlineOffset: 3 },
                  })}
                >
                  <DownloadRoundedIcon sx={{ fontSize: 17, color: 'text.primary' }} />
                </ButtonBase>
              </Box>
            </Box>
          )
        })}
      </Box>
    </Paper>
  )
}
