import type { DetectedDocument, ScanPoint } from '../../types/scanner'
import { defaultCorners } from './geometry'

export const LIVE_MAX_SIDE = 960
const CAPTURE_MAX_SIDE = 1280
const MIN_AREA_RATIO_LIVE = 0.06
const MIN_AREA_RATIO_CAPTURE = 0.05

interface CvMat {
  rows: number
  cols: number
  delete(): void
  data32S?: Int32Array
  channels?: () => number
}

interface OpenCvRuntime {
  Mat: new (...args: unknown[]) => CvMat
  MatVector: new () => {
    size(): number
    get(index: number): CvMat
    delete(): void
  }
  Size: new (width: number, height: number) => unknown
  COLOR_RGBA2GRAY: number
  COLOR_RGB2GRAY: number
  INTER_AREA: number
  RETR_EXTERNAL: number
  CHAIN_APPROX_SIMPLE: number
  MORPH_RECT: number
  MORPH_CLOSE: number
  ADAPTIVE_THRESH_GAUSSIAN_C: number
  THRESH_BINARY: number
  THRESH_BINARY_INV: number
  imread(canvas: HTMLCanvasElement): CvMat
  cvtColor(src: CvMat, dst: CvMat, code: number): void
  resize(src: CvMat, dst: CvMat, dsize: unknown, fx: number, fy: number, interp: number): void
  GaussianBlur(src: CvMat, dst: CvMat, ksize: unknown, sigmaX: number): void
  adaptiveThreshold(
    src: CvMat,
    dst: CvMat,
    maxValue: number,
    adaptiveMethod: number,
    thresholdType: number,
    blockSize: number,
    C: number,
  ): void
  getStructuringElement(shape: number, ksize: unknown): CvMat
  morphologyEx(src: CvMat, dst: CvMat, op: number, kernel: CvMat): void
  Canny(src: CvMat, dst: CvMat, t1: number, t2: number): void
  findContours(
    image: CvMat,
    contours: InstanceType<OpenCvRuntime['MatVector']>,
    hierarchy: CvMat,
    mode: number,
    method: number,
  ): void
  arcLength(curve: CvMat, closed: boolean): number
  approxPolyDP(curve: CvMat, approx: CvMat, epsilon: number, closed: boolean): void
  contourArea(contour: CvMat): number
}

function getCv(): OpenCvRuntime {
  return window.cv as unknown as OpenCvRuntime
}

function orderCorners(points: ScanPoint[]): ScanPoint[] {
  if (points.length !== 4) return points
  const sorted = [...points].sort((a, b) => a.y - b.y)
  const top = sorted.slice(0, 2).sort((a, b) => a.x - b.x)
  const bottom = sorted.slice(2, 4).sort((a, b) => a.x - b.x)
  return [top[0], top[1], bottom[1], bottom[0]]
}

function readContourPoints(mat: CvMat): ScanPoint[] {
  const points: ScanPoint[] = []
  const withPtr = mat as CvMat & {
    intPtr?: (row: number, col: number) => Int32Array
  }

  for (let i = 0; i < mat.rows; i += 1) {
    if (withPtr.intPtr) {
      const ptr = withPtr.intPtr(i, 0)
      points.push({ x: ptr[0], y: ptr[1] })
    } else if (mat.data32S) {
      points.push({ x: mat.data32S[i * 2], y: mat.data32S[i * 2 + 1] })
    }
  }
  return points
}

function dist(a: ScanPoint, b: ScanPoint): number {
  return Math.hypot(a.x - b.x, a.y - b.y)
}

function scoreQuad(
  corners: ScanPoint[],
  area: number,
  frameArea: number,
  minAreaRatio: number,
): number {
  if (corners.length !== 4) return 0
  const areaRatio = area / frameArea
  if (areaRatio < minAreaRatio || areaRatio > 0.97) return 0

  const topW = dist(corners[0], corners[1])
  const botW = dist(corners[3], corners[2])
  const leftH = dist(corners[0], corners[3])
  const rightH = dist(corners[1], corners[2])
  const w = Math.max(topW, botW)
  const h = Math.max(leftH, rightH)
  if (w < 28 || h < 28) return 0

  const aspect = Math.max(w, h) / Math.min(w, h)
  if (aspect > 4.2) return 0

  const wRatio = Math.min(topW, botW) / Math.max(topW, botW)
  const hRatio = Math.min(leftH, rightH) / Math.max(leftH, rightH)
  if (wRatio < 0.45 || hRatio < 0.45) return 0

  return areaRatio * wRatio * hRatio
}

function findBestQuad(
  cv: OpenCvRuntime,
  contours: InstanceType<OpenCvRuntime['MatVector']>,
  frameArea: number,
  scale: number,
  minAreaRatio: number,
): { corners: ScanPoint[]; areaRatio: number; score: number } | null {
  let best: { corners: ScanPoint[]; areaRatio: number; score: number } | null = null

  for (let i = 0; i < contours.size(); i += 1) {
    const contour = contours.get(i)
    const approx = new cv.Mat()
    try {
      const peri = cv.arcLength(contour, true)
      if (peri < 60) continue

      for (const eps of [0.008, 0.012, 0.018, 0.025, 0.035, 0.05]) {
        cv.approxPolyDP(contour, approx, eps * peri, true)
        if (approx.rows !== 4) continue

        const local = orderCorners(readContourPoints(approx))
        if (local.length !== 4) continue

        const area = cv.contourArea(approx)
        const score = scoreQuad(local, area, frameArea, minAreaRatio)
        if (score <= 0) continue

        const mapped = local.map((p) => ({ x: p.x / scale, y: p.y / scale }))
        if (!best || score > best.score) {
          best = { corners: mapped, areaRatio: area / frameArea, score }
        }
        break
      }
    } finally {
      approx.delete()
    }
  }

  return best
}

function canvasToGray(cv: OpenCvRuntime, src: CvMat, gray: CvMat): void {
  const ch = src.channels?.() ?? 4
  cv.cvtColor(src, gray, ch === 4 ? cv.COLOR_RGBA2GRAY : cv.COLOR_RGB2GRAY)
}

function buildBinaryMaps(cv: OpenCvRuntime, gray: CvMat): CvMat[] {
  const maps: CvMat[] = []

  for (const [blockSize, c, inverted] of [
    [15, 4, false],
    [21, 6, false],
    [15, 4, true],
  ] as const) {
    const adaptive = new cv.Mat()
    cv.adaptiveThreshold(
      gray,
      adaptive,
      255,
      cv.ADAPTIVE_THRESH_GAUSSIAN_C,
      inverted ? cv.THRESH_BINARY_INV : cv.THRESH_BINARY,
      blockSize,
      c,
    )
    const closed = new cv.Mat()
    const kernel = cv.getStructuringElement(cv.MORPH_RECT, new cv.Size(7, 7))
    cv.morphologyEx(adaptive, closed, cv.MORPH_CLOSE, kernel)
    kernel.delete()
    adaptive.delete()
    maps.push(closed)
  }

  const edges = new cv.Mat()
  cv.Canny(gray, edges, 40, 120)
  const edgeClosed = new cv.Mat()
  const k2 = cv.getStructuringElement(cv.MORPH_RECT, new cv.Size(5, 5))
  cv.morphologyEx(edges, edgeClosed, cv.MORPH_CLOSE, k2)
  k2.delete()
  edges.delete()
  maps.push(edgeClosed)

  return maps
}

export function detectPaperInCanvas(
  canvas: HTMLCanvasElement,
  mode: 'live' | 'capture' = 'live',
): DetectedDocument {
  const cv = getCv()
  const maxSide = mode === 'live' ? LIVE_MAX_SIDE : CAPTURE_MAX_SIDE
  const minAreaRatio = mode === 'live' ? MIN_AREA_RATIO_LIVE : MIN_AREA_RATIO_CAPTURE
  const maxCanvasSide = Math.max(canvas.width, canvas.height)
  const scale = maxCanvasSide <= maxSide ? 1 : maxSide / maxCanvasSide
  const scaledW = Math.max(1, Math.round(canvas.width * scale))
  const scaledH = Math.max(1, Math.round(canvas.height * scale))

  const src = cv.imread(canvas)
  let small: CvMat | null = null
  const gray = new cv.Mat()
  const contours = new cv.MatVector()
  const hierarchy = new cv.Mat()

  try {
    if (scale === 1) {
      canvasToGray(cv, src, gray)
    } else {
      small = new cv.Mat()
      cv.resize(src, small, new cv.Size(scaledW, scaledH), 0, 0, cv.INTER_AREA)
      canvasToGray(cv, small, gray)
    }

    cv.GaussianBlur(gray, gray, new cv.Size(5, 5), 0)

    const frameArea = scaledW * scaledH
    const binaryMaps = buildBinaryMaps(cv, gray)
    let bestMatch: { corners: ScanPoint[]; areaRatio: number; score: number } | null = null

    for (const edgeMap of binaryMaps) {
      cv.findContours(edgeMap, contours, hierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE)
      const match = findBestQuad(cv, contours, frameArea, scale, minAreaRatio)
      if (match && (!bestMatch || match.score > bestMatch.score)) {
        bestMatch = match
      }
      edgeMap.delete()
    }

    if (!bestMatch) {
      return { found: false, corners: [], areaRatio: 0, sharpness: 0 }
    }

    const clamped = bestMatch.corners.map((p) => ({
      x: Math.max(0, Math.min(canvas.width - 1, p.x)),
      y: Math.max(0, Math.min(canvas.height - 1, p.y)),
    }))

    return {
      found: true,
      corners: clamped,
      areaRatio: bestMatch.areaRatio,
      sharpness: 100,
    }
  } finally {
    src.delete()
    small?.delete()
    gray.delete()
    contours.delete()
    hierarchy.delete()
  }
}

export function detectPaperFromCapture(
  canvas: HTMLCanvasElement,
): { corners: ScanPoint[]; found: boolean } {
  const result = detectPaperInCanvas(canvas, 'capture')
  return {
    found: result.found,
    corners: result.found
      ? result.corners
      : defaultCorners(canvas.width, canvas.height),
  }
}
