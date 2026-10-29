import { Box, Typography } from '@mui/material'

/** Quiet, minimal footer band. */
export function Footer() {
  return (
    <Box
      component="footer"
      sx={{
        width: '100%',
        px: { xs: 2, sm: 3, md: '4%', lg: '5%' },
        pt: 3,
        pb: 'max(24px, env(safe-area-inset-bottom))',
        bgcolor: (theme) => theme.app.surfaceMuted,
        mt: { xs: 4, md: 6 },
        borderTop: (t) => `1px solid ${t.app.border}`,
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: { xs: 'flex-start', sm: 'center' },
        justifyContent: 'space-between',
        gap: 1.5,
        '& p': { overflowWrap: 'anywhere' },
      }}
    >
      <Box>
        <Typography sx={{ fontSize: 15 }}>
          Created by{' '}
          <Box
            component="a"
            href="https://jaguan2.github.io/personal-portfolio/"
            target="_blank"
            rel="noreferrer"
            sx={{
              color: 'text.primary',
              fontWeight: 600,
              textUnderlineOffset: '4px',
              '&:hover': { color: 'secondary.main' },
              '&:focus-visible': { outline: '2px solid', outlineColor: 'secondary.main', outlineOffset: 4 },
            }}
          >
            Jason Guan
          </Box>
        </Typography>
        <Typography sx={{ color: 'text.secondary', fontSize: 13, mt: 0.5 }}>
          Software Engineer
        </Typography>
      </Box>
      <Typography sx={{ color: 'text.secondary', fontSize: 13 }}>
        © {new Date().getFullYear()} Jason Guan
      </Typography>
    </Box>
  )
}
