import type { DetectedDocument, ScanPoint } from '../../types/scanner'
import type { JscanifyCornerPoints, JscanifyInstance } from '../../types/jscanify'
import {
  LIVE_MAX_SIDE,
  detectPaperFromCapture,
  detectPaperInCanvas,
} from './paperDetection'

export { LIVE_MAX_SIDE }

export function cornerPointsToScanPoints(
  cornerPoints: JscanifyCornerPoints,
): ScanPoint[] | null {
  const { topLeftCorner, topRightCorner, bottomRightCorner, bottomLeftCorner } =
    cornerPoints

  if (!topLeftCorner || !topRightCorner || !bottomRightCorner || !bottomLeftCorner) {
    return null
  }

  return [topLeftCorner, topRightCorner, bottomRightCorner, bottomLeftCorner]
}

export function scanPointsToCornerPoints(corners: ScanPoint[]): JscanifyCornerPoints {
  return {
    topLeftCorner: corners[0],
    topRightCorner: corners[1],
    bottomLeftCorner: corners[3],
    bottomRightCorner: corners[2],
  }
}

export function detectDocumentWithJscanify(
  _scanner: JscanifyInstance | null,
  canvas: HTMLCanvasElement,
  mode: 'live' | 'capture' = 'live',
): DetectedDocument {
  return detectPaperInCanvas(canvas, mode)
}

export function detectDocumentFromCapture(
  _scanner: JscanifyInstance | null,
  canvas: HTMLCanvasElement,
): { corners: ScanPoint[]; found: boolean } {
  return detectPaperFromCapture(canvas)
}
