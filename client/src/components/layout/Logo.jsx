import { ButtonBase, Typography } from '@mui/material'

/**
 * Wordmark in the portfolio style — plain text with a trailing period and a
 * hot-pink accent dot. Clicking it resets the app to the empty state.
 */
export function Logo({ onGoHome }) {
  return (
    <ButtonBase
      component="a"
      href="/"
      aria-label="Media Scraper home"
      onClick={(e) => {
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.button === 1) return
        e.preventDefault()
        onGoHome?.()
      }}
      sx={{
        minHeight: 44,
        borderRadius: 1,
        '&:focus-visible': {
          outline: (t) => `2px solid ${t.app.accent}`,
          outlineOffset: 3,
        },
      }}
    >
      <Typography
        component="span"
        sx={{ fontSize: 20, fontWeight: 600, lineHeight: 1, color: 'text.primary', letterSpacing: '-0.3px' }}
      >
        Media Scraper
        <Typography component="span" sx={{ color: 'secondary.main' }}>
          .
        </Typography>
      </Typography>
    </ButtonBase>
  )
}
