import type { ScanPoint } from '../../types/scanner'

function distance(a: ScanPoint, b: ScanPoint): number {
  return Math.hypot(a.x - b.x, a.y - b.y)
}

function computeOutputSize(corners: ScanPoint[]): { width: number; height: number } {
  const topWidth = distance(corners[0], corners[1])
  const bottomWidth = distance(corners[3], corners[2])
  const leftHeight = distance(corners[0], corners[3])
  const rightHeight = distance(corners[1], corners[2])

  return {
    width: Math.max(1, Math.round(Math.max(topWidth, bottomWidth))),
    height: Math.max(1, Math.round(Math.max(leftHeight, rightHeight))),
  }
}

export function warpPerspectiveWithCanvas(
  sourceCanvas: HTMLCanvasElement,
  corners: ScanPoint[],
): HTMLCanvasElement {
  const { width, height } = computeOutputSize(corners)
  const output = document.createElement('canvas')
  output.width = width
  output.height = height
  const ctx = output.getContext('2d')
  if (!ctx) {
    throw new Error('Не вдалося створити canvas')
  }

  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, width, height)

  const slices = 24
  for (let row = 0; row < slices; row += 1) {
    for (let col = 0; col < slices; col += 1) {
      const u0 = col / slices
      const v0 = row / slices
      const u1 = (col + 1) / slices
      const v1 = (row + 1) / slices

      const p0 = bilinear(corners, u0, v0)
      const p1 = bilinear(corners, u1, v0)
      const p2 = bilinear(corners, u1, v1)
      const p3 = bilinear(corners, u0, v1)

      drawQuad(
        ctx,
        sourceCanvas,
        p0,
        p1,
        p2,
        p3,
        u0 * sourceCanvas.width,
        v0 * sourceCanvas.height,
        u1 * sourceCanvas.width,
        v1 * sourceCanvas.height,
      )
    }
  }

  return output
}

function bilinear(corners: ScanPoint[], u: number, v: number): ScanPoint {
  const top = lerp(corners[0], corners[1], u)
  const bottom = lerp(corners[3], corners[2], u)
  return lerp(top, bottom, v)
}

function lerp(a: ScanPoint, b: ScanPoint, t: number): ScanPoint {
  return {
    x: a.x + (b.x - a.x) * t,
    y: a.y + (b.y - a.y) * t,
  }
}

function drawQuad(
  ctx: CanvasRenderingContext2D,
  source: HTMLCanvasElement,
  p0: ScanPoint,
  p1: ScanPoint,
  p2: ScanPoint,
  p3: ScanPoint,
  sx0: number,
  sy0: number,
  sx1: number,
  sy1: number,
): void {
  const sw = Math.max(1, sx1 - sx0)
  const sh = Math.max(1, sy1 - sy0)

  ctx.save()
  ctx.beginPath()
  ctx.moveTo(p0.x, p0.y)
  ctx.lineTo(p1.x, p1.y)
  ctx.lineTo(p2.x, p2.y)
  ctx.lineTo(p3.x, p3.y)
  ctx.closePath()
  ctx.clip()
  ctx.transform(
    (p1.x - p0.x) / sw,
    (p1.y - p0.y) / sw,
    (p3.x - p0.x) / sh,
    (p3.y - p0.y) / sh,
    p0.x,
    p0.y,
  )
  ctx.drawImage(source, sx0, sy0, sw, sh, 0, 0, sw, sh)
  ctx.restore()
}
