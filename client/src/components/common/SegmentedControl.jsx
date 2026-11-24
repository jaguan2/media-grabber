import { Box, ButtonBase, Typography } from '@mui/material'
import { alpha } from '@mui/material/styles'

/**
 * A row of format/quality options with a pink tint on the current choice.
 * The rest sit flat with a hairline border and warm on hover. Used for
 * MP4/MP3, the quality ladder, and JPG/PNG.
 *
 * `options`: [{ value, label, sub?, icon? }] — `sub` is a small secondary line
 * (e.g. a filesize under a quality label).
 */
export function SegmentedControl({
  options,
  value,
  onChange,
  size = 'medium',
  sx,
  ariaLabel,
  disabled = false,
}) {
  const pad =
    size === 'small' ? { px: 1.5, py: 0.7, fontSize: 12.5 } : { px: 1.85, py: 0.9, fontSize: 13.5 }

  return (
    <Box
      role="group"
      aria-label={ariaLabel}
      sx={{ display: 'inline-flex', flexWrap: 'wrap', maxWidth: '100%', gap: 1, ...sx }}
    >
      {options.map((opt) => {
        const selected = opt.value === value
        return (
          <ButtonBase
            key={opt.value}
            onClick={() => onChange?.(opt.value)}
            disabled={disabled}
            aria-pressed={selected}
            aria-label={opt.label}
            sx={(theme) => {
              const { ink, border, accent } = theme.app
              return {
                display: 'inline-flex',
                flexDirection: opt.sub ? 'column' : 'row',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: { xs: 44, md: 36 },
                gap: opt.sub ? 0.1 : 0.6,
                borderRadius: `${theme.app.radius}px`,
                fontWeight: selected ? 600 : 400,
                lineHeight: 1.2,
                border: '1px solid',
                bgcolor: selected ? '#fff0f4' : '#fafaf7',
                color: ink,
                borderColor: selected ? '#e16d90' : border,
                transition: 'all 0.2s ease',
                ...pad,
                '@media (hover: hover)': {
                  '&:hover': {
                    borderColor: accent,
                    color: ink,
                  },
                },
                '&:focus-visible': {
                  outline: 'none',
                  boxShadow: `0 0 0 3px ${alpha(accent, 0.35)}`,
                },
                '&.Mui-disabled': { opacity: 0.6 },
              }
            }}
          >
            {opt.icon}
            {opt.label}
            {opt.sub && (
              <Typography
                component="span"
                sx={{ fontSize: 10.5, fontWeight: 400, opacity: 0.7, lineHeight: 1.2 }}
              >
                {opt.sub}
              </Typography>
            )}
          </ButtonBase>
        )
      })}
    </Box>
  )
}
