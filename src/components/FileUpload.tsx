import CloudUploadIcon from '@mui/icons-material/CloudUpload'
import {
  Box,
  Button,
  LinearProgress,
  Stack,
  Typography,
} from '@mui/material'
import { useCallback, useRef, useState } from 'react'
import type { LoadProgress } from '../types'

interface FileUploadProps {
  onFilesSelected: (files: File[]) => void
  loading?: boolean
  progress?: LoadProgress | null
}

const ACCEPT =
  '.pdf,.heic,.heif,image/jpeg,image/png,image/webp,image/gif,image/bmp,image/heic,image/heif'

export default function FileUpload({
  onFilesSelected,
  loading,
  progress,
}: FileUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragOver, setDragOver] = useState(false)

  const handleFiles = useCallback(
    (fileList: FileList | null) => {
      if (!fileList?.length) return
      onFilesSelected(Array.from(fileList))
    },
    [onFilesSelected],
  )

  return (
    <Box
      onDragOver={(event) => {
        event.preventDefault()
        if (!loading) setDragOver(true)
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(event) => {
        event.preventDefault()
        setDragOver(false)
        if (loading) return
        handleFiles(event.dataTransfer.files)
      }}
      sx={{
        border: '2px dashed',
        borderColor: dragOver ? 'primary.main' : 'divider',
        borderRadius: 2,
        p: 3,
        textAlign: 'center',
        bgcolor: dragOver ? 'rgba(214, 215, 133, 0.08)' : 'transparent',
        transition: 'border-color 0.2s, background-color 0.2s',
      }}
    >
      <Stack spacing={1.5} sx={{ alignItems: 'center' }}>
        <CloudUploadIcon sx={{ fontSize: 40, color: 'primary.main' }} />
        <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
          Перетягніть PDF або фото сюди
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Підтримуються PDF, JPG, PNG, HEIC (iPhone), WebP, GIF, BMP
        </Typography>
        <Button
          variant="contained"
          disabled={loading}
          onClick={() => inputRef.current?.click()}
        >
          {loading ? 'Завантаження…' : 'Обрати файли'}
        </Button>
        <input
          ref={inputRef}
          type="file"
          hidden
          multiple
          accept={ACCEPT}
          disabled={loading}
          onChange={(event) => {
            handleFiles(event.target.files)
            event.target.value = ''
          }}
        />

        {loading && progress && (
          <Box sx={{ width: '100%', maxWidth: 520, pt: 1 }}>
            <Stack
              direction="row"
              sx={{
                justifyContent: 'space-between',
                alignItems: 'center',
                mb: 0.75,
                gap: 1,
              }}
            >
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  textAlign: 'left',
                  flex: 1,
                }}
                title={progress.fileName || progress.stage}
              >
                {progress.fileName
                  ? `${progress.stage} — ${progress.fileName}`
                  : progress.stage}
              </Typography>
              <Typography
                variant="caption"
                sx={{ fontWeight: 600, color: 'primary.main', flexShrink: 0 }}
              >
                {progress.percent}%
              </Typography>
            </Stack>

            <LinearProgress
              variant="determinate"
              value={progress.percent}
              sx={{
                height: 8,
                borderRadius: 999,
                bgcolor: 'rgba(214, 215, 133, 0.12)',
                '& .MuiLinearProgress-bar': {
                  borderRadius: 999,
                },
              }}
            />

            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ display: 'block', mt: 0.75 }}
            >
              Оброблено {progress.current} з {progress.total}
            </Typography>
          </Box>
        )}
      </Stack>
    </Box>
  )
}
