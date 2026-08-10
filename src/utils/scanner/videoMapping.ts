import type { ScanPoint } from '../../types/scanner'

export function mapVideoPointsToElement(
  points: ScanPoint[],
  videoWidth: number,
  videoHeight: number,
  elementWidth: number,
  elementHeight: number,
  objectFit: 'cover' | 'contain' = 'cover',
): ScanPoint[] {
  if (!videoWidth || !videoHeight || !elementWidth || !elementHeight) return points

  const videoAspect = videoWidth / videoHeight
  const elementAspect = elementWidth / elementHeight

  if (objectFit === 'contain') {
    const scale = Math.min(elementWidth / videoWidth, elementHeight / videoHeight)
    const offsetX = (elementWidth - videoWidth * scale) / 2
    const offsetY = (elementHeight - videoHeight * scale) / 2
    return points.map((point) => ({
      x: point.x * scale + offsetX,
      y: point.y * scale + offsetY,
    }))
  }

  let scale: number
  let offsetX: number
  let offsetY: number

  if (videoAspect > elementAspect) {
    scale = elementHeight / videoHeight
    offsetX = (elementWidth - videoWidth * scale) / 2
    offsetY = 0
  } else {
    scale = elementWidth / videoWidth
    offsetX = 0
    offsetY = (elementHeight - videoHeight * scale) / 2
  }

  return points.map((point) => ({
    x: point.x * scale + offsetX,
    y: point.y * scale + offsetY,
  }))
}
