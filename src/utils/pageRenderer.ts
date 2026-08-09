import * as pdfjs from 'pdfjs-dist'
import type { PageItem } from '../types'

const renderCache = new Map<string, string>()

function cacheKey(pageId: string, width: number): string {
  return `${pageId}:${Math.round(width)}`
}

function getPreviewPixelRatio(): number {
  return Math.min(window.devicePixelRatio || 1, 2.5)
}

async function renderPdfPage(
  pdfBytes: Uint8Array,
  pageIndex: number,
  targetWidth: number,
): Promise<string> {
  const loadingTask = pdfjs.getDocument({ data: pdfBytes.slice() })
  const pdf = await loadingTask.promise
  const page = await pdf.getPage(pageIndex + 1)
  const viewportFull = page.getViewport({ scale: 1 })
  const scale = targetWidth / viewportFull.width
  const viewport = page.getViewport({ scale })
  const canvas = document.createElement('canvas')
  canvas.width = viewport.width
  canvas.height = viewport.height
  const context = canvas.getContext('2d')
  if (!context) {
    throw new Error('Не вдалося створити canvas')
  }
  await page.render({ canvas, canvasContext: context, viewport }).promise
  return canvas.toDataURL('image/png')
}

async function renderImagePage(
  page: PageItem,
  targetWidth: number,
): Promise<string> {
  if (!page.imageBytes || !page.width || !page.height) {
    throw new Error('Некоректні дані зображення')
  }

  const mime = page.mimeType ?? 'image/jpeg'
  const blob = new Blob([Uint8Array.from(page.imageBytes)], { type: mime })
  const url = URL.createObjectURL(blob)

  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const image = new Image()
      image.onload = () => resolve(image)
      image.onerror = () => reject(new Error('Не вдалося завантажити зображення'))
      image.src = url
    })

    const renderWidth = Math.min(
      page.width,
      Math.max(targetWidth, Math.round(targetWidth * getPreviewPixelRatio())),
    )
    const scale = renderWidth / page.width
    const canvas = document.createElement('canvas')
    canvas.width = Math.max(1, Math.round(page.width * scale))
    canvas.height = Math.max(1, Math.round(page.height * scale))
    const ctx = canvas.getContext('2d')
    if (!ctx) {
      throw new Error('Не вдалося створити canvas')
    }
    ctx.imageSmoothingEnabled = true
    ctx.imageSmoothingQuality = 'high'
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
    return canvas.toDataURL('image/png')
  } finally {
    URL.revokeObjectURL(url)
  }
}

export async function renderPagePreview(
  page: PageItem,
  targetWidth: number,
): Promise<string> {
  const pixelRatio = getPreviewPixelRatio()
  const renderWidth = Math.round(targetWidth * pixelRatio)
  const key = cacheKey(page.id, renderWidth)
  const cached = renderCache.get(key)
  if (cached) return cached

  let dataUrl: string
  if (page.type === 'pdf' && page.pdfBytes && page.pageIndex !== undefined) {
    dataUrl = await renderPdfPage(page.pdfBytes, page.pageIndex, renderWidth)
  } else if (page.imageBytes && page.width && page.height) {
    dataUrl = await renderImagePage(page, renderWidth)
  } else {
    dataUrl = page.thumbnailUrl
  }

  renderCache.set(key, dataUrl)
  return dataUrl
}

export function clearPageRenderCache(pageIds?: string[]): void {
  if (!pageIds) {
    renderCache.clear()
    return
  }
  for (const key of renderCache.keys()) {
    if (pageIds.some((id) => key.startsWith(`${id}:`))) {
      renderCache.delete(key)
    }
  }
}
