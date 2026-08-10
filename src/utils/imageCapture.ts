import type { PageItem } from '../types'

const THUMBNAIL_MAX_SIDE = 240

function drawToCanvas(
  source: CanvasImageSource,
  width: number,
  height: number,
): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(width))
  canvas.height = Math.max(1, Math.round(height))
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    throw new Error('Не вдалося створити canvas')
  }
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(source, 0, 0, canvas.width, canvas.height)
  return canvas
}

async function canvasToPngBytes(canvas: HTMLCanvasElement): Promise<Uint8Array> {
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (result) => {
        if (result) resolve(result)
        else reject(new Error('Не вдалося конвертувати зображення'))
      },
      'image/png',
    )
  })
  return new Uint8Array(await blob.arrayBuffer())
}

function createThumbnailDataUrl(
  source: CanvasImageSource,
  width: number,
  height: number,
): string {
  const scale = Math.min(1, THUMBNAIL_MAX_SIDE / Math.max(width, height))
  const canvas = drawToCanvas(source, width * scale, height * scale)
  return canvas.toDataURL('image/jpeg', 0.8)
}

export async function createPageItemFromCanvas(
  canvas: HTMLCanvasElement,
  label: string,
): Promise<PageItem> {
  const imageBytes = await canvasToPngBytes(canvas)
  const thumbnailUrl = createThumbnailDataUrl(canvas, canvas.width, canvas.height)

  return {
    id: crypto.randomUUID(),
    type: 'image',
    label,
    thumbnailUrl,
    imageBytes,
    mimeType: 'image/png',
    width: canvas.width,
    height: canvas.height,
  }
}

export async function createPageItemFromBlob(
  blob: Blob,
  label: string,
): Promise<PageItem> {
  const url = URL.createObjectURL(blob)
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const image = new Image()
      image.onload = () => resolve(image)
      image.onerror = () => reject(new Error('Не вдалося декодувати зображення'))
      image.src = url
    })
    const canvas = drawToCanvas(img, img.naturalWidth, img.naturalHeight)
    return createPageItemFromCanvas(canvas, label)
  } finally {
    URL.revokeObjectURL(url)
  }
}

export function captureVideoFrame(video: HTMLVideoElement): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  canvas.width = video.videoWidth
  canvas.height = video.videoHeight
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    throw new Error('Не вдалося створити canvas')
  }
  ctx.drawImage(video, 0, 0)
  return canvas
}

export async function canvasToBlob(
  canvas: HTMLCanvasElement,
  type = 'image/jpeg',
  quality = 0.92,
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (result) => {
        if (result) resolve(result)
        else reject(new Error('Не вдалося конвертувати canvas'))
      },
      type,
      quality,
    )
  })
}
