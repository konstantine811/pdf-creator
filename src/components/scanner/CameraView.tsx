import CameraAltIcon from '@mui/icons-material/CameraAlt'
import FlipCameraIosIcon from '@mui/icons-material/FlipCameraIos'
import { Box, CircularProgress, IconButton, Stack, Typography } from '@mui/material'
import { useEffect } from 'react'
import type { DetectedDocument } from '../../types/scanner'
import DocumentOverlay from './DocumentOverlay'

interface CameraViewProps {
  videoRef: React.RefObject<HTMLVideoElement | null>
  stream: MediaStream | null
  loading: boolean
  error: string | null
  hint: string
  detection: DetectedDocument | null
  scannerReady: boolean
  onManualCapture: () => void
  onSwitchCamera: () => void
  disabled?: boolean
}

export default function CameraView({
  videoRef,
  stream,
  loading,
  error,
  hint,
  detection,
  scannerReady,
  onManualCapture,
  onSwitchCamera,
  disabled = false,
}: CameraViewProps) {
  useEffect(() => {
    const video = videoRef.current
    if (!video) return undefined
    video.srcObject = stream
    return () => {
      video.srcObject = null
    }
  }, [stream, videoRef])

  return (
    <Box
      sx={{
        position: 'relative',
        borderRadius: 2,
        overflow: 'hidden',
        border: '1px solid rgba(214, 215, 133, 0.18)',
        background: '#111',
        aspectRatio: '3 / 4',
        maxHeight: '72vh',
      }}
    >
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          display: stream ? 'block' : 'none',
        }}
      />

      {!stream && !loading && !error && (
        <Stack
          sx={{
            alignItems: 'center',
            justifyContent: 'center',
            position: 'absolute',
            inset: 0,
            p: 3,
            textAlign: 'center',
          }}
        >
          <Typography color="text.secondary">
            Дозвольте доступ до камери, щоб почати сканування
          </Typography>
        </Stack>
      )}

      {loading && (
        <Stack sx={{ alignItems: 'center', justifyContent: 'center', position: 'absolute', inset: 0 }}>
          <CircularProgress size={36} />
        </Stack>
      )}

      {error && (
        <Stack
          sx={{
            alignItems: 'center',
            justifyContent: 'center',
            position: 'absolute',
            inset: 0,
            p: 3,
            textAlign: 'center',
          }}
        >
          <Typography color="error">{error}</Typography>
        </Stack>
      )}

      {stream && (
        <>
          <DocumentOverlay
            detection={detection}
            videoRef={videoRef}
            scannerReady={scannerReady}
          />
          <Box
            sx={{
              position: 'absolute',
              top: 12,
              left: 12,
              right: 12,
              px: 1.5,
              py: 0.75,
              borderRadius: 1,
              bgcolor: 'rgba(0,0,0,0.55)',
              color: 'common.white',
              textAlign: 'center',
              fontSize: 14,
            }}
          >
            {hint}
          </Box>
          <Stack
            direction="row"
            spacing={2}
            sx={{
              alignItems: 'center',
              justifyContent: 'center',
              position: 'absolute',
              left: 0,
              right: 0,
              bottom: 16,
            }}
          >
            <IconButton
              onClick={onSwitchCamera}
              disabled={disabled}
              sx={{ bgcolor: 'rgba(0,0,0,0.45)', color: 'common.white' }}
              aria-label="Змінити камеру"
            >
              <FlipCameraIosIcon />
            </IconButton>
            <IconButton
              onClick={onManualCapture}
              disabled={disabled}
              sx={{
                width: 68,
                height: 68,
                bgcolor: 'primary.main',
                color: 'primary.contrastText',
                '&:hover': { bgcolor: 'primary.light' },
              }}
              aria-label="Зробити фото"
            >
              <CameraAltIcon fontSize="large" />
            </IconButton>
          </Stack>
        </>
      )}
    </Box>
  )
}

export { CameraView }
