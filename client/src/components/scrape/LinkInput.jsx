import { useState } from 'react'
import { Box, InputBase, CircularProgress } from '@mui/material'
import { alpha } from '@mui/material/styles'
import ArrowDownwardRoundedIcon from '@mui/icons-material/ArrowDownwardRounded'
import { Button } from '../common/Button'

/**
 * The paste-a-link row: a clean bordered input and a solid dark fetch button,
 * side by side. Focus lights the border and ring in the accent pink.
 */
export function LinkInput({ onSubmit, busy }) {
  const [url, setUrl] = useState('')
  const canGo = /^https?:\/\/\S+/i.test(url.trim()) && !busy

  const submit = () => {
    if (canGo) onSubmit?.(url.trim())
  }

  return (
    <Box
      sx={{
        display: 'flex',
        gap: 1.5,
        width: '100%',
        flexDirection: { xs: 'column', sm: 'row' },
        alignItems: 'stretch',
      }}
    >
      <Box
        sx={(theme) => ({
          flex: 1,
          minWidth: 0,
          display: 'flex',
          alignItems: 'center',
          px: 2,
          borderRadius: `${theme.app.radius}px`,
          bgcolor: theme.app.surface,
          border: `1px solid ${theme.app.border}`,
          transition: 'border-color 200ms ease, box-shadow 200ms ease',
          '&:focus-within': {
            borderColor: theme.app.accent,
            boxShadow: `0 0 0 3px ${alpha(theme.app.accent, 0.15)}`,
          },
        })}
      >
        <InputBase
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') submit()
          }}
          placeholder="Paste a YouTube, Instagram, or X link…"
          fullWidth
          inputProps={{ 'aria-label': 'Post link', spellCheck: false }}
          sx={{ py: 1.5, fontSize: 16, fontWeight: 400 }}
        />
      </Box>

      <Button
        onClick={submit}
        disabled={!canGo}
        startIcon={
          busy ? (
            <CircularProgress size={16} thickness={5} sx={{ color: 'inherit' }} />
          ) : (
            <ArrowDownwardRoundedIcon sx={{ fontSize: 18 }} />
          )
        }
        sx={{ px: 4, minHeight: 48, whiteSpace: 'nowrap' }}
      >
        {busy ? 'Reading…' : 'Grab it'}
      </Button>
    </Box>
  )
}
