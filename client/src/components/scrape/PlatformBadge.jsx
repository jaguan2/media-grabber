import { Box } from '@mui/material'
import YouTubeIcon from '@mui/icons-material/YouTube'
import InstagramIcon from '@mui/icons-material/Instagram'
import XIcon from '@mui/icons-material/X'
import LinkRoundedIcon from '@mui/icons-material/LinkRounded'

const platforms = {
  youtube: { label: 'YouTube', icon: YouTubeIcon, color: '#c92c36' },
  instagram: { label: 'Instagram', icon: InstagramIcon, color: '#b02d6a' },
  twitter: { label: 'X', icon: XIcon, color: '#1e1e24' },
  other: { label: 'Link', icon: LinkRoundedIcon, color: '#6c6c74' },
}

export function platformFromUrl(value) {
  try {
    const host = new URL(value.trim()).hostname.toLowerCase()
    if (/(^|\.)youtube\.com$|(^|\.)youtu\.be$/.test(host)) return 'youtube'
    if (/(^|\.)instagram\.com$/.test(host)) return 'instagram'
    if (/(^|\.)twitter\.com$|(^|\.)x\.com$/.test(host)) return 'twitter'
    return 'other'
  } catch {
    return null
  }
}

export function PlatformBadge({ platform, compact = false }) {
  const { label, icon: Icon, color } = platforms[platform] ?? platforms.other
  return (
    <Box
      component="span"
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 0.75,
        color: 'text.primary',
        fontSize: 12,
        fontWeight: 500,
        whiteSpace: 'nowrap',
        ...(!compact && {
          px: 1.25,
          py: 0.6,
          bgcolor: '#fff',
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: '999px',
        }),
      }}
    >
      <Icon sx={{ fontSize: 17, color }} />
      {label}
    </Box>
  )
}
