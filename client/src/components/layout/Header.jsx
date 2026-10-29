import { Box, Stack } from '@mui/material'
import { Logo } from './Logo'

// Supported platforms, shown as portfolio-style nav links with the animated
// hot-pink underline. Non-interactive labels — they just say what's supported.
const PLATFORMS = ['YouTube', 'Instagram', 'X']

function NavLabel({ children }) {
  return (
    <Box
      component="span"
      sx={(theme) => ({
        position: 'relative',
        fontSize: 15,
        fontWeight: 400,
        color: 'text.primary',
        cursor: 'default',
        '&::after': {
          content: '""',
          position: 'absolute',
          left: 0,
          bottom: -6,
          height: '2px',
          width: '0%',
          bgcolor: theme.app.accent,
          transition: 'width 0.4s ease',
        },
        '&:hover::after': { width: '100%' },
      })}
    >
      {children}
    </Box>
  )
}

/**
 * Minimal top nav in the portfolio style: wordmark left, supported-platform
 * labels right, in a full-width band with responsive page gutters.
 */
export function Header({ onGoHome }) {
  return (
    <Box
      component="header"
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: { xs: 1, sm: 2 },
        width: '100%',
        px: { xs: 2, sm: 3, md: '4%', lg: '5%' },
        py: { xs: 1.5, sm: 2 },
        borderBottom: (theme) => `1px solid ${theme.app.border}`,
      }}
    >
      <Logo onGoHome={onGoHome} />
      <Stack
        component="nav"
        aria-label="Supported platforms"
        direction="row"
        spacing={{ xs: 2.5, md: 3.5 }}
        sx={{ flexBasis: { xs: '100%', sm: 'auto' }, pb: { xs: 0.75, sm: 0 } }}
      >
        {PLATFORMS.map((p) => (
          <NavLabel key={p}>{p}</NavLabel>
        ))}
      </Stack>
    </Box>
  )
}
