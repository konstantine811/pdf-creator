import { useCallback, useEffect, useRef, useState } from 'react'
import type { DetectedDocument } from '../types/scanner'
import type { JscanifyInstance } from '../types/jscanify'
import { cornersDistance, smoothCorners } from '../utils/scanner/geometry'
import {
  LIVE_MAX_SIDE,
  detectDocumentWithJscanify,
} from '../utils/scanner/jscanifyDetection'
import { loadJscanify } from '../utils/scanner/jscanifyLoader'

const MIN_DETECTION_GAP_MS = 80
const MIN_CORNER_CHANGE_PX = 8

function detectionChanged(
  prev: DetectedDocument | null,
  next: DetectedDocument,
): boolean {
  if (!prev) return true
  if (prev.found !== next.found) return true
  if (Math.abs(prev.areaRatio - next.areaRatio) > 0.015) return true
  if (!next.found) return false
  return cornersDistance(prev.corners, next.corners) > MIN_CORNER_CHANGE_PX
}

function drawVideoFrame(
  video: HTMLVideoElement,
  canvas: HTMLCanvasElement,
): { width: number; height: number } | null {
  if (video.videoWidth === 0 || video.videoHeight === 0) return null

  const scale = LIVE_MAX_SIDE / Math.max(video.videoWidth, video.videoHeight)
  const width = Math.max(1, Math.round(video.videoWidth * scale))
  const height = Math.max(1, Math.round(video.videoHeight * scale))

  if (canvas.width !== width) canvas.width = width
  if (canvas.height !== height) canvas.height = height

  const ctx = canvas.getContext('2d', { alpha: false })
  if (!ctx) return null

  ctx.drawImage(video, 0, 0, width, height)
  return { width, height }
}

function scaleDetectionToVideo(
  detection: DetectedDocument,
  frameWidth: number,
  frameHeight: number,
  videoWidth: number,
  videoHeight: number,
): DetectedDocument {
  const scaleX = videoWidth / frameWidth
  const scaleY = videoHeight / frameHeight
  return {
    ...detection,
    corners: detection.corners.map((point) => ({
      x: point.x * scaleX,
      y: point.y * scaleY,
    })),
  }
}

export function useDocumentDetection(
  videoRef: React.RefObject<HTMLVideoElement | null>,
  enabled: boolean,
) {
  const [detection, setDetection] = useState<DetectedDocument | null>(null)
  const [scannerReady, setScannerReady] = useState(false)
  const [scannerLoading, setScannerLoading] = useState(false)
  const [scannerError, setScannerError] = useState<string | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const scannerRef = useRef<JscanifyInstance | null>(null)
  const detectionRef = useRef<DetectedDocument | null>(null)
  const smoothedCornersRef = useRef<DetectedDocument['corners'] | null>(null)
  const cancelledRef = useRef(false)

  useEffect(() => {
    if (!enabled) return undefined

    cancelledRef.current = false
    setScannerLoading(true)
    loadJscanify()
      .then((scanner) => {
        if (cancelledRef.current) return
        scannerRef.current = scanner
        setScannerReady(true)
        setScannerLoading(false)
      })
      .catch((error: Error) => {
        if (cancelledRef.current) return
        setScannerError(error.message)
        setScannerLoading(false)
      })

    return () => {
      cancelledRef.current = true
    }
  }, [enabled])

  useEffect(() => {
    if (!enabled || !scannerReady || !scannerRef.current) {
      detectionRef.current = null
      smoothedCornersRef.current = null
      setDetection(null)
      return undefined
    }

    const scanner = scannerRef.current
    cancelledRef.current = false

    if (!canvasRef.current) {
      canvasRef.current = document.createElement('canvas')
    }

    const canvas = canvasRef.current

    const runLoop = async () => {
      while (!cancelledRef.current) {
        const startedAt = performance.now()
        const video = videoRef.current

        if (video && video.videoWidth > 0) {
          const frameSize = drawVideoFrame(video, canvas)
          if (frameSize) {
            try {
              const result = detectDocumentWithJscanify(scanner, canvas, 'live')
              let scaled = scaleDetectionToVideo(
                result,
                frameSize.width,
                frameSize.height,
                video.videoWidth,
                video.videoHeight,
              )

              if (scaled.found) {
                const smoothed = smoothCorners(smoothedCornersRef.current, scaled.corners)
                smoothedCornersRef.current = smoothed
                scaled = { ...scaled, corners: smoothed }
              } else {
                smoothedCornersRef.current = null
                scaled = { ...scaled, corners: [] }
              }

              if (detectionChanged(detectionRef.current, scaled)) {
                detectionRef.current = scaled
                setDetection(scaled)
              }
            } catch (error) {
              if (import.meta.env.DEV) {
                console.warn('[scanner] jscanify live detection failed', error)
              }
            }
          }
        }

        const elapsed = performance.now() - startedAt
        const delay = Math.max(MIN_DETECTION_GAP_MS, 250 - elapsed)
        await new Promise((resolve) => window.setTimeout(resolve, delay))
      }
    }

    void runLoop()

    return () => {
      cancelledRef.current = true
    }
  }, [enabled, scannerReady, videoRef])

  const captureFrame = useCallback((): HTMLCanvasElement | null => {
    const video = videoRef.current
    if (!video || video.videoWidth === 0) return null

    const canvas = document.createElement('canvas')
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    const ctx = canvas.getContext('2d')
    if (!ctx) return null
    ctx.drawImage(video, 0, 0)
    return canvas
  }, [videoRef])

  return {
    detection,
    scannerReady,
    scannerLoading,
    scannerError,
    captureFrame,
    scanner: scannerRef.current,
  }
}
