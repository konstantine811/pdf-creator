import type { DrawStroke, FitMode, PageItem, PageTextAnnotation } from '../types'
import { drawImageRotatedFit, normalizeRotation } from './pageRotation'
import { A4 } from './pageSizes'

export interface ContentRect {
  x: number
  y: number
  width: number
  height: number
}

export function getContentRect(
  containerWidth: number,
  containerHeight: number,
  sourceWidth: number,
  sourceHeight: number,
): ContentRect {
  const scale = Math.min(containerWidth / sourceWidth, containerHeight / sourceHeight)
  const width = sourceWidth * scale
  const height = sourceHeight * scale
  return {
    x: (containerWidth - width) / 2,
    y: (containerHeight - height) / 2,
    width,
    height,
  }
}

export function pageHasAnnotations(page: PageItem): boolean {
  const hasText = page.textAnnotations?.some((item) => item.content.trim()) ?? false
  return Boolean(hasText || (page.drawStrokes && page.drawStrokes.length > 0))
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('Не вдалося завантажити зображення'))
    img.src = src
  })
}

function resolvePageDimensions(
  page: PageItem,
  fitMode: FitMode,
  imageWidth: number,
  imageHeight: number,
): { width: number; height: number } {
  if (fitMode === 'a4-fit') {
    return { width: A4.width, height: A4.height }
  }

  const rotation = normalizeRotation(page.rotation ?? 0)
  const baseWidth = page.width ?? imageWidth
  const baseHeight = page.height ?? imageHeight

  if (rotation === 90 || rotation === 270) {
    return { width: baseHeight, height: baseWidth }
  }

  return { width: baseWidth, height: baseHeight }
}

export function drawTextAnnotations(
  ctx: CanvasRenderingContext2D,
  annotations: PageTextAnnotation[],
  canvasWidth: number,
  canvasHeight: number,
): void {
  for (const annotation of annotations) {
    const content = annotation.content.trim()
    if (!content) continue

    const x = annotation.x * canvasWidth
    const y = annotation.y * canvasHeight
    const maxWidth = canvasWidth * 0.88

    ctx.save()
    ctx.fillStyle = annotation.color
    ctx.font = `600 ${annotation.fontSize}px system-ui, -apple-system, sans-serif`
    ctx.textAlign = 'left'
    ctx.textBaseline = 'top'
    ctx.fillText(content, x, y, maxWidth)
    ctx.restore()
  }
}

export function drawStrokes(
  ctx: CanvasRenderingContext2D,
  strokes: DrawStroke[],
  canvasWidth: number,
  canvasHeight: number,
): void {
  for (const stroke of strokes) {
    if (stroke.points.length < 2) continue

    ctx.save()
    ctx.strokeStyle = stroke.color
    ctx.lineWidth = stroke.width
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.beginPath()

    stroke.points.forEach((point, index) => {
      const x = point.x * canvasWidth
      const y = point.y * canvasHeight
      if (index === 0) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
    })

    ctx.stroke()
    ctx.restore()
  }
}

export function drawAnnotationsOnCanvas(
  ctx: CanvasRenderingContext2D,
  page: PageItem,
  canvasWidth: number,
  canvasHeight: number,
): void {
  if (page.textAnnotations?.length) {
    drawTextAnnotations(ctx, page.textAnnotations, canvasWidth, canvasHeight)
  }
  if (page.drawStrokes?.length) {
    drawStrokes(ctx, page.drawStrokes, canvasWidth, canvasHeight)
  }
}

export async function compositeDataUrlWithAnnotations(
  page: PageItem,
  baseDataUrl: string,
  fitMode: FitMode,
): Promise<string> {
  return compositePageContent(page, baseDataUrl, fitMode, true)
}

export async function compositePageContent(
  page: PageItem,
  baseDataUrl: string,
  fitMode: FitMode,
  includeAnnotations = true,
): Promise<string> {
  const hasRotation = normalizePageRotation(page.rotation) !== 0
  const hasAnnotations = pageHasAnnotations(page)
  const fillImageToA4 = page.type === 'image' && fitMode === 'a4-fit'
  const contentScale = page.scale ?? 1
  const hasCustomScale = Math.abs(contentScale - 1) > 0.001

  // Photos on A4 always composite with cover so they fill the page.
  if (!hasRotation && !fillImageToA4 && !hasCustomScale) {
    if (!hasAnnotations) return baseDataUrl
    if (!includeAnnotations) return baseDataUrl
  }

  const img = await loadImage(baseDataUrl)
  const pageSize = resolvePageDimensions(page, fitMode, img.width, img.height)

  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(pageSize.width))
  canvas.height = Math.max(1, Math.round(pageSize.height))
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Не вдалося створити canvas')

  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, canvas.width, canvas.height)

  drawImageRotatedFit(
    ctx,
    img,
    canvas.width,
    canvas.height,
    page.rotation ?? 0,
    img.width,
    img.height,
    fillImageToA4 ? 'cover' : 'contain',
    contentScale,
  )

  if (includeAnnotations && hasAnnotations) {
    drawAnnotationsOnCanvas(ctx, page, canvas.width, canvas.height)
  }

  return canvas.toDataURL('image/png')
}

function normalizePageRotation(rotation?: number): number {
  return normalizeRotation(rotation ?? 0)
}

export async function renderAnnotatedPageToPngBytes(
  page: PageItem,
  baseDataUrl: string,
  fitMode: FitMode,
): Promise<Uint8Array> {
  const dataUrl = await compositeDataUrlWithAnnotations(page, baseDataUrl, fitMode)
  const response = await fetch(dataUrl)
  const buffer = await response.arrayBuffer()
  return new Uint8Array(buffer)
}
