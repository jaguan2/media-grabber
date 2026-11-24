import { Box, Typography } from '@mui/material'
import PlayArrowRoundedIcon from '@mui/icons-material/PlayArrowRounded'
import MusicNoteRoundedIcon from '@mui/icons-material/MusicNoteRounded'
import ArrowDownwardRoundedIcon from '@mui/icons-material/ArrowDownwardRounded'

// Decorative sample media cards. Photos are bundled with the app so previews
// also work locally without external image requests. See public/previews/CREDITS.txt.
export function MediaPreview() {
  const card = {
    position: 'absolute',
    bgcolor: '#fff',
    border: '1px solid #e4e4dd',
    borderRadius: '14px',
    boxShadow: '0 18px 45px -24px rgba(45,28,40,.3)',
  }
  return (
    <Box
      aria-hidden="true"
      sx={{
        position: 'relative',
        width: '100%',
        height: 330,
        display: { xs: 'none', md: 'block' },
        pointerEvents: 'none',
        userSelect: 'none',
      }}
    >
      <Box
        sx={{
          position: 'absolute',
          inset: '20px -8px 0 0',
          borderRadius: '50%',
          background: 'radial-gradient(ellipse, #ffe0e8 0%, #ffe0e800 68%)',
        }}
      />
      <Box
        sx={{
          position: 'absolute',
          inset: '12px 5px 15px 25px',
          backgroundImage: 'radial-gradient(#cfc6c6 1px, transparent 1px)',
          backgroundSize: '17px 17px',
          opacity: 0.45,
          maskImage: 'radial-gradient(ellipse, #000 30%, transparent 72%)',
        }}
      />
      <Box sx={{ ...card, width: '77%', top: 24, left: '12%', p: 1, transform: 'rotate(-5deg)' }}>
        <Box
          sx={{
            position: 'relative',
            overflow: 'hidden',
            borderRadius: '9px',
            height: 169,
            background: '#ead5ce',
          }}
        >
          <Box
            component="img"
            src="/previews/lake-tekapo.jpg"
            alt=""
            width={900}
            height={600}
            decoding="async"
            sx={{ display: 'block', width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center 55%' }}
          />
          <Box sx={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center' }}>
            <Box
              sx={{
                width: 43,
                height: 43,
                borderRadius: '50%',
                display: 'grid',
                placeItems: 'center',
                bgcolor: '#ffffffdc',
                color: '#403c52',
                boxShadow: '0 2px 12px #0001',
              }}
            >
              <PlayArrowRoundedIcon sx={{ fontSize: 29 }} />
            </Box>
          </Box>
          <Box
            sx={{
              position: 'absolute',
              right: 10,
              bottom: 9,
              bgcolor: '#292630b8',
              color: '#fff',
              fontSize: 10,
              px: 0.75,
              py: 0.25,
              borderRadius: '4px',
            }}
          >
            00:24
          </Box>
        </Box>
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            px: 0.7,
            pt: 1.1,
            pb: 0.4,
          }}
        >
          <Typography sx={{ fontSize: 11, fontWeight: 500 }}>A moment worth keeping.</Typography>
          <Box sx={{ fontSize: 9, bgcolor: '#f4f3f0', borderRadius: '4px', px: 0.7, py: 0.3 }}>
            MP4
          </Box>
        </Box>
      </Box>
      <Box sx={{ ...card, width: 164, right: -4, bottom: 6, p: 0.9, transform: 'rotate(8deg)' }}>
        <Box sx={{ height: 102, bgcolor: '#ebead8', overflow: 'hidden', borderRadius: '8px' }}>
          <Box
            component="img"
            src="/previews/redondo-beach.jpg"
            alt=""
            width={500}
            height={375}
            decoding="async"
            sx={{ display: 'block', width: '100%', height: '100%', objectFit: 'cover' }}
          />
        </Box>
        <Box
          sx={{ display: 'flex', justifyContent: 'space-between', px: 0.25, pt: 0.8, fontSize: 9 }}
        >
          <span>The whole picture.</span>
          <span style={{ color: '#6c6c74' }}>JPG</span>
        </Box>
      </Box>
      <Box
        sx={{
          ...card,
          left: 0,
          bottom: 30,
          width: 232,
          px: 1.6,
          py: 1.4,
          transform: 'rotate(-3deg)',
          display: 'flex',
          alignItems: 'center',
          gap: 1.2,
        }}
      >
        <Box
          sx={{
            width: 38,
            height: 38,
            bgcolor: '#ffe5ed',
            color: '#d60043',
            borderRadius: '10px',
            display: 'grid',
            placeItems: 'center',
            flexShrink: 0,
          }}
        >
          <MusicNoteRoundedIcon />
        </Box>
        <Box sx={{ flex: 1 }}>
          <Typography sx={{ fontSize: 10, fontWeight: 500, mb: 0.5 }}>
            Just the good part.
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: '3px', height: 19 }}>
            {[7, 13, 19, 10, 15, 8, 18, 13, 7, 16, 11, 6, 13, 9].map((height, i) => (
              <Box
                key={i}
                sx={{
                  height,
                  width: 3,
                  borderRadius: '3px',
                  bgcolor: i < 8 ? '#f24678' : '#ebdce2',
                }}
              />
            ))}
          </Box>
        </Box>
        <Typography sx={{ fontSize: 9, color: 'text.secondary', alignSelf: 'start', mt: 0.3 }}>
          MP3
        </Typography>
      </Box>
      <Box
        sx={{
          position: 'absolute',
          right: 10,
          top: 0,
          width: 43,
          height: 43,
          bgcolor: '#ff004f',
          color: '#fff',
          borderRadius: '13px',
          display: 'grid',
          placeItems: 'center',
          transform: 'rotate(9deg)',
          boxShadow: '0 8px 20px #ff004f24',
        }}
      >
        <ArrowDownwardRoundedIcon />
      </Box>
    </Box>
  )
}
