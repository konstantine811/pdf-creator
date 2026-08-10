import type { ScanPoint } from '../../types/scanner'

export function defaultCorners(width: number, height: number): ScanPoint[] {
  const marginX = width * 0.08
  const marginY = height * 0.12
  return [
    { x: marginX, y: marginY },
    { x: width - marginX, y: marginY },
    { x: width - marginX, y: height - marginY },
    { x: marginX, y: height - marginY },
  ]
}

export function cornersDistance(a: ScanPoint[], b: ScanPoint[]): number {
  if (a.length !== b.length) return Number.POSITIVE_INFINITY
  return a.reduce((sum, point, index) => {
    const other = b[index]
    const dx = point.x - other.x
    const dy = point.y - other.y
    return sum + Math.hypot(dx, dy)
  }, 0)
}

export function polygonArea(corners: ScanPoint[]): number {
  let area = 0
  for (let i = 0; i < corners.length; i += 1) {
    const next = corners[(i + 1) % corners.length]
    area += corners[i].x * next.y - next.x * corners[i].y
  }
  return Math.abs(area) / 2
}

export function smoothCorners(
  previous: ScanPoint[] | null,
  next: ScanPoint[],
  alpha = 0.45,
): ScanPoint[] {
  if (!previous || previous.length !== 4) return next
  return next.map((point, index) => ({
    x: previous[index].x * (1 - alpha) + point.x * alpha,
    y: previous[index].y * (1 - alpha) + point.y * alpha,
  }))
}
