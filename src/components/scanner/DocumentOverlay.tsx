import { useEffect, useRef } from 'react'
import type { DetectedDocument } from '../../types/scanner'
import { defaultCorners } from '../../utils/scanner/geometry'
import { mapVideoPointsToElement } from '../../utils/scanner/videoMapping'

interface DocumentOverlayProps {
  detection: DetectedDocument | null
  videoRef: React.RefObject<HTMLVideoElement | null>
  scannerReady: boolean
}

function drawCornerHandle(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  found: boolean,
): void {
  const outerR = found ? 22 : 14
  const innerR = found ? 16 : 10

  ctx.beginPath()
  ctx.arc(x, y, outerR, 0, Math.PI * 2)
  ctx.fillStyle = found ? 'rgba(255, 255, 255, 0.92)' : 'rgba(255, 255, 255, 0.55)'
  ctx.fill()

  ctx.beginPath()
  ctx.arc(x, y, innerR, 0, Math.PI * 2)
  ctx.fillStyle = found ? '#d6d785' : 'rgba(214, 215, 133, 0.75)'
  ctx.fill()

  ctx.beginPath()
  ctx.arc(x, y, innerR, 0, Math.PI * 2)
  ctx.strokeStyle = found ? '#ffffff' : 'rgba(255, 255, 255, 0.8)'
  ctx.lineWidth = found ? 2.5 : 2
  ctx.stroke()
}

function drawPolygon(
  ctx: CanvasRenderingContext2D,
  mapped: Array<{ x: number; y: number }>,
  found: boolean,
): void {
  ctx.beginPath()
  ctx.moveTo(mapped[0].x, mapped[0].y)
  mapped.slice(1).forEach((point) => ctx.lineTo(point.x, point.y))
  ctx.closePath()

  ctx.fillStyle = found ? 'rgba(214, 215, 133, 0.18)' : 'rgba(214, 215, 133, 0.06)'
  ctx.fill()

  ctx.strokeStyle = found ? '#d6d785' : 'rgba(214, 215, 133, 0.55)'
  ctx.lineWidth = found ? 4 : 2
  ctx.setLineDash(found ? [] : [10, 8])
  ctx.shadowColor = 'rgba(0,0,0,0.5)'
  ctx.shadowBlur = found ? 8 : 0
  ctx.stroke()
  ctx.setLineDash([])
  ctx.shadowBlur = 0

  mapped.forEach((point) => drawCornerHandle(ctx, point.x, point.y, found))
}

export default function DocumentOverlay({
  detection,
  videoRef,
  scannerReady,
}: DocumentOverlayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const detectionRef = useRef(detection)
  const scannerReadyRef = useRef(scannerReady)

  useEffect(() => {
    detectionRef.current = detection
  }, [detection])

  useEffect(() => {
    scannerReadyRef.current = scannerReady
  }, [scannerReady])

  useEffect(() => {
    let rafId: number | null = null

    const paint = () => {
      const canvas = canvasRef.current
      const video = videoRef.current
      if (!canvas || !video) return

      const rect = video.getBoundingClientRect()
      if (rect.width <= 0 || rect.height <= 0) return

      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      canvas.width = Math.max(1, Math.round(rect.width * dpr))
      canvas.height = Math.max(1, Math.round(rect.height * dpr))
      canvas.style.width = `${rect.width}px`
      canvas.style.height = `${rect.height}px`

      const ctx = canvas.getContext('2d')
      if (!ctx) return

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.clearRect(0, 0, rect.width, rect.height)

      if (!scannerReadyRef.current || !video.videoWidth || !video.videoHeight) {
        return
      }

      const current = detectionRef.current
      const corners =
        current?.found && current.corners.length === 4
          ? current.corners
          : defaultCorners(video.videoWidth, video.videoHeight)

      const mapped = mapVideoPointsToElement(
        corners,
        video.videoWidth,
        video.videoHeight,
        rect.width,
        rect.height,
        'cover',
      )

      drawPolygon(ctx, mapped, Boolean(current?.found))
    }

    const loop = () => {
      paint()
      rafId = requestAnimationFrame(loop)
    }

    loop()

    return () => {
      if (rafId !== null) cancelAnimationFrame(rafId)
    }
  }, [videoRef])

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 2,
      }}
    />
  )
}
