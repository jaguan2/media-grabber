import { ButtonBase } from '@mui/material'
import { alpha } from '@mui/material/styles'

/**
 * The portfolio's flat button: solid dark fill with light text, hairline
 * border, small rounding, and an invert-on-hover with a gentle downward nudge.
 *
 * `variant`:
 *   'solid'   — dark fill, inverts to light on hover (primary actions)
 *   'outline' — transparent with a border, fills dark on hover (secondary)
 *   'accent'  — hot-pink fill (rare, high-emphasis)
 */
export function Button({
  children,
  onClick,
  disabled,
  startIcon,
  variant = 'solid',
  size = 'medium',
  sx,
  ...rest
}) {
  const pad =
    size === 'small'
      ? { px: 1.75, py: 0.85, fontSize: 13 }
      : { px: 2.5, py: 1.25, fontSize: 14 }

  return (
    <ButtonBase
      onClick={onClick}
      disabled={disabled}
      sx={(theme) => {
        const { ink, background, accent, border } = theme.app
        const base = {
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: { xs: 44, md: size === 'small' ? 36 : 44 },
          gap: 0.75,
          borderRadius: `${theme.app.radius}px`,
          fontWeight: 500,
          lineHeight: 1,
          border: '1px solid',
          transition: 'all 0.35s ease',
          ...pad,
        }
        const variants = {
          solid: {
            bgcolor: ink,
            color: background,
            borderColor: ink,
            '@media (hover: hover)': {
              '&:hover': { bgcolor: background, color: ink, transform: 'translateY(4px)' },
            },
          },
          outline: {
            bgcolor: 'transparent',
            color: ink,
            borderColor: border,
            '@media (hover: hover)': {
              '&:hover': { bgcolor: ink, color: background, borderColor: ink, transform: 'translateY(4px)' },
            },
          },
          accent: {
            bgcolor: accent,
            color: '#fff',
            borderColor: accent,
            '@media (hover: hover)': {
              '&:hover': { bgcolor: background, color: accent, transform: 'translateY(4px)' },
            },
          },
        }
        return {
          ...base,
          ...variants[variant],
          '&:active': { transform: 'translateY(1px)' },
          '&.Mui-disabled, &:disabled': { opacity: 0.4, transform: 'none' },
          '&:focus-visible': {
            outline: 'none',
            boxShadow: `0 0 0 3px ${alpha(accent, 0.35)}`,
          },
          '@media (prefers-reduced-motion: reduce)': { transition: 'none' },
          ...sx,
        }
      }}
      {...rest}
    >
      {startIcon}
      {children}
    </ButtonBase>
  )
}
