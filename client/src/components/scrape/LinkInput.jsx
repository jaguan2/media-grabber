import { useRef, useState } from 'react'
import { Box, InputBase, CircularProgress, Typography, ButtonBase } from '@mui/material'
import { alpha } from '@mui/material/styles'
import ArrowDownwardRoundedIcon from '@mui/icons-material/ArrowDownwardRounded'
import ContentPasteRoundedIcon from '@mui/icons-material/ContentPasteRounded'
import LinkRoundedIcon from '@mui/icons-material/LinkRounded'
import { Button } from '../common/Button'
import { PlatformBadge, platformFromUrl } from './PlatformBadge'

export function LinkInput({ onSubmit, busy }) {
  const [url, setUrl] = useState('')
  const [pasteError, setPasteError] = useState('')
  const inputRef = useRef(null)
  const platform = platformFromUrl(url)
  const canGo = /^https?:\/\/\S+/i.test(url.trim()) && !busy
  const paste = async () => {
    try {
      setUrl((await navigator.clipboard.readText()).trim())
      setPasteError('')
    } catch {
      setPasteError('Clipboard unavailable. Paste your link directly into the field.')
    }
    inputRef.current?.focus()
  }
  return (
    <Box
      component="form"
      onSubmit={(event) => {
        event.preventDefault()
        if (canGo) onSubmit?.(url.trim())
      }}
      sx={(theme) => ({
        position: 'relative',
        p: { xs: 2, sm: 3.5 },
        border: `1px solid ${theme.app.border}`,
        borderRadius: '20px',
        bgcolor: '#fff',
        boxShadow: '0 16px 65px -32px rgba(105,41,62,.25)',
        '&::before': {
          content: '""',
          position: 'absolute',
          width: 70,
          height: 3,
          left: { xs: 16, sm: 28 },
          top: -1,
          bgcolor: theme.app.accent,
          borderRadius: '0 0 3px 3px',
        },
      })}
    >
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 2,
          mb: 2,
        }}
      >
        <Box>
          <Typography component="h2" sx={{ fontSize: 17, fontWeight: 600, letterSpacing: '-.3px' }}>
            Found something good?
          </Typography>
          <Typography sx={{ fontSize: 12, color: 'text.secondary', mt: 0.35 }}>
            Drop the link. Pick a format. Make it yours.
          </Typography>
        </Box>
        <Box
          sx={{
            display: { xs: 'none', sm: 'flex' },
            alignItems: 'center',
            gap: 0.75,
            color: 'text.secondary',
            fontSize: 11,
          }}
        >
          <Box sx={{ width: 5, height: 5, borderRadius: '50%', bgcolor: '#728674' }} />
          No ads. No sign-up.
        </Box>
      </Box>
      <Box sx={{ display: 'flex', gap: 1.25, flexDirection: { xs: 'column', sm: 'row' } }}>
        <Box
          sx={(theme) => ({
            flex: 1,
            minWidth: 0,
            display: 'flex',
            alignItems: 'center',
            gap: 1.2,
            pl: { xs: 1.5, sm: 2 },
            pr: 0.7,
            borderRadius: '11px',
            bgcolor: '#fafaf7',
            border: `1px solid ${theme.app.border}`,
            transition: 'border-color 180ms ease, box-shadow 180ms ease',
            '&:focus-within': {
              borderColor: theme.app.accent,
              boxShadow: `0 0 0 3px ${alpha(theme.app.accent, 0.09)}`,
            },
          })}
        >
          <LinkRoundedIcon sx={{ color: 'text.secondary', fontSize: 21, flexShrink: 0 }} />
          <InputBase
            value={url}
            inputRef={inputRef}
            onChange={(event) => {
              setUrl(event.target.value)
              setPasteError('')
            }}
            placeholder="Paste a link to a video or post…"
            fullWidth
            inputProps={{ 'aria-label': 'Post link', spellCheck: false, autoCapitalize: 'none' }}
            sx={{ py: 1.8, fontSize: { xs: 14, sm: 15 }, minWidth: 0 }}
          />
          <ButtonBase
            type="button"
            onClick={paste}
            disabled={busy}
            aria-label="Paste link from clipboard"
            sx={{
              minWidth: 44,
              minHeight: 44,
              px: 1,
              gap: 0.6,
              fontSize: 11,
              color: 'text.secondary',
              borderRadius: '7px',
              '&:hover': { bgcolor: '#eeeae8' },
              '&:focus-visible': { outline: '2px solid #ff004f', outlineOffset: 1 },
            }}
          >
            <ContentPasteRoundedIcon sx={{ fontSize: 16 }} />
            <Box component="span" sx={{ display: { xs: 'none', md: 'inline' } }}>
              Paste
            </Box>
          </ButtonBase>
        </Box>
        <Button
          type="submit"
          variant="accent"
          disabled={!canGo}
          startIcon={
            busy ? (
              <CircularProgress size={17} thickness={5} sx={{ color: 'inherit' }} />
            ) : (
              <ArrowDownwardRoundedIcon sx={{ fontSize: 19 }} />
            )
          }
          sx={{ px: 3, minHeight: 55, borderRadius: '11px', whiteSpace: 'nowrap' }}
        >
          {busy ? 'Reading link…' : 'Grab media'}
        </Button>
      </Box>
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          gap: 1,
          flexWrap: 'wrap',
          mt: 1.6,
          minHeight: 20,
        }}
      >
        <Box aria-live="polite" sx={{ color: 'text.secondary', fontSize: 11 }}>
          {platform ? (
            <PlatformBadge platform={platform} compact />
          ) : (
            'YouTube, Instagram, X, and more'
          )}
        </Box>
        <Typography sx={{ fontSize: 10, color: 'text.secondary', letterSpacing: '.5px' }}>
          MP4 · MP3 · GIF · JPG · PNG
        </Typography>
      </Box>
      {pasteError && (
        <Typography role="status" sx={{ fontSize: 12, mt: 1.25, color: 'text.secondary' }}>
          {pasteError}
        </Typography>
      )}
    </Box>
  )
}
