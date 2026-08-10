import type { ScanFilter, ScanRotation } from '../../types/scanner'

export function rotateCanvas(
  canvas: HTMLCanvasElement,
  rotation: ScanRotation,
): HTMLCanvasElement {
  if (rotation === 0) return canvas

  const output = document.createElement('canvas')
  const ctx = output.getContext('2d')
  if (!ctx) {
    throw new Error('Не вдалося створити canvas')
  }

  const radians = (rotation * Math.PI) / 180
  if (rotation === 90 || rotation === 270) {
    output.width = canvas.height
    output.height = canvas.width
  } else {
    output.width = canvas.width
    output.height = canvas.height
  }

  ctx.translate(output.width / 2, output.height / 2)
  ctx.rotate(radians)
  ctx.drawImage(canvas, -canvas.width / 2, -canvas.height / 2)
  return output
}

export function applyScanFilter(
  canvas: HTMLCanvasElement,
  filter: ScanFilter,
): HTMLCanvasElement {
  if (filter === 'original') {
    return canvas
  }

  const output = document.createElement('canvas')
  output.width = canvas.width
  output.height = canvas.height
  const ctx = output.getContext('2d')
  if (!ctx) {
    throw new Error('Не вдалося створити canvas')
  }

  ctx.drawImage(canvas, 0, 0)
  const imageData = ctx.getImageData(0, 0, output.width, output.height)
  const { data } = imageData

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i]
    const g = data[i + 1]
    const b = data[i + 2]

    if (filter === 'grayscale') {
      const gray = 0.299 * r + 0.587 * g + 0.114 * b
      data[i] = gray
      data[i + 1] = gray
      data[i + 2] = gray
      continue
    }

    if (filter === 'black-white') {
      const gray = 0.299 * r + 0.587 * g + 0.114 * b
      const value = gray > 165 ? 255 : 0
      data[i] = value
      data[i + 1] = value
      data[i + 2] = value
      continue
    }

    if (filter === 'enhanced') {
      const contrast = 1.25
      const brightness = 12
      data[i] = clamp((r - 128) * contrast + 128 + brightness)
      data[i + 1] = clamp((g - 128) * contrast + 128 + brightness)
      data[i + 2] = clamp((b - 128) * contrast + 128 + brightness)
    }
  }

  ctx.putImageData(imageData, 0, 0)
  return output
}

function clamp(value: number): number {
  return Math.max(0, Math.min(255, Math.round(value)))
}

export const FILTER_LABELS: Record<ScanFilter, string> = {
  original: 'Оригінал',
  enhanced: 'Покращено',
  grayscale: 'Сірий',
  'black-white': 'Ч/Б',
}
