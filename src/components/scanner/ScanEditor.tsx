import RotateRightIcon from '@mui/icons-material/RotateRight'
import {
  Box,
  Button,
  Stack,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material'
import { useCallback, useEffect, useRef, useState } from 'react'
import type { ScanFilter, ScanPoint, ScanRotation } from '../../types/scanner'
import { FILTER_LABELS } from '../../utils/scanner/imageFilters'

interface CornerEditorProps {
  imageUrl: string
  corners: ScanPoint[]
  onChange: (corners: ScanPoint[]) => void
}

export default function CornerEditor({ imageUrl, corners, onChange }: CornerEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [imageSize, setImageSize] = useState({ width: 1, height: 1 })
  const [activeIndex, setActiveIndex] = useState<number | null>(null)

  useEffect(() => {
    const img = new Image()
    img.onload = () => {
      setImageSize({ width: img.naturalWidth, height: img.naturalHeight })
    }
    img.src = imageUrl
  }, [imageUrl])

  const toDisplayPoint = useCallback(
    (point: ScanPoint) => {
      const container = containerRef.current
      if (!container) return point
      const rect = container.getBoundingClientRect()
      return {
        x: (point.x / imageSize.width) * rect.width,
        y: (point.y / imageSize.height) * rect.height,
      }
    },
    [imageSize.width, imageSize.height],
  )

  const toImagePoint = useCallback(
    (displayX: number, displayY: number): ScanPoint => {
      const container = containerRef.current
      if (!container) return { x: displayX, y: displayY }
      const rect = container.getBoundingClientRect()
      return {
        x: (displayX / rect.width) * imageSize.width,
        y: (displayY / rect.height) * imageSize.height,
      }
    },
    [imageSize.width, imageSize.height],
  )

  const handlePointerMove = useCallback(
    (event: React.PointerEvent) => {
      if (activeIndex === null) return
      const container = containerRef.current
      if (!container) return
      const rect = container.getBoundingClientRect()
      const x = event.clientX - rect.left
      const y = event.clientY - rect.top
      const imagePoint = toImagePoint(x, y)
      const next = corners.map((corner, index) =>
        index === activeIndex ? imagePoint : corner,
      )
      onChange(next)
    },
    [activeIndex, corners, onChange, toImagePoint],
  )

  const mapped = corners.map(toDisplayPoint)

  return (
    <Box
      ref={containerRef}
      onPointerMove={handlePointerMove}
      onPointerUp={() => setActiveIndex(null)}
      onPointerLeave={() => setActiveIndex(null)}
      sx={{
        position: 'relative',
        borderRadius: 2,
        overflow: 'hidden',
        border: '1px solid rgba(214, 215, 133, 0.18)',
        background: '#111',
        touchAction: 'none',
        userSelect: 'none',
      }}
    >
      <Box
        component="img"
        src={imageUrl}
        alt="Скан"
        sx={{ display: 'block', width: '100%', height: 'auto' }}
      />
      <svg
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none',
        }}
      >
        <polygon
          points={mapped.map((point) => `${point.x},${point.y}`).join(' ')}
          fill="rgba(214, 215, 133, 0.12)"
          stroke="#d6d785"
          strokeWidth="2"
        />
      </svg>
      {mapped.map((point, index) => (
        <Box
          key={index}
          onPointerDown={(event) => {
            event.preventDefault()
            setActiveIndex(index)
          }}
          sx={{
            position: 'absolute',
            left: point.x - 12,
            top: point.y - 12,
            width: 24,
            height: 24,
            borderRadius: '50%',
            bgcolor: 'primary.main',
            border: '2px solid #fff',
            cursor: 'grab',
            zIndex: 2,
          }}
        />
      ))}
    </Box>
  )
}

interface FilterControlsProps {
  filter: ScanFilter
  rotation: ScanRotation
  onFilterChange: (filter: ScanFilter) => void
  onRotate: () => void
}

export function FilterControls({
  filter,
  rotation,
  onFilterChange,
  onRotate,
}: FilterControlsProps) {
  return (
    <Stack spacing={2}>
      <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
          Фільтр
        </Typography>
        <Button
          size="small"
          variant="outlined"
          startIcon={<RotateRightIcon />}
          onClick={onRotate}
        >
          Повернути ({rotation}°)
        </Button>
      </Stack>
      <ToggleButtonGroup
        size="small"
        exclusive
        value={filter}
        onChange={(_, value: ScanFilter | null) => {
          if (value) onFilterChange(value)
        }}
        sx={{ flexWrap: 'wrap' }}
      >
        {(Object.keys(FILTER_LABELS) as ScanFilter[]).map((key) => (
          <ToggleButton key={key} value={key}>
            {FILTER_LABELS[key]}
          </ToggleButton>
        ))}
      </ToggleButtonGroup>
    </Stack>
  )
}
