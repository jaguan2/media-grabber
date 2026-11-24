import { Box } from '@mui/material'
import { Logo } from './Logo'

/** Wordmark in a full-width band with responsive page gutters. */
export function Header({ onGoHome }) {
  return (
    <Box
      component="header"
      sx={{
        display: 'flex',
        alignItems: 'center',
        width: '100%',
        px: { xs: 2, sm: 3, md: '4%', lg: '5%' },
        py: { xs: 1.5, sm: 2 },
        borderBottom: (theme) => `1px solid ${theme.app.border}`,
      }}
    >
      <Logo onGoHome={onGoHome} />
    </Box>
  )
}
