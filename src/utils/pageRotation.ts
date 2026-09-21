export function normalizeRotation(degrees: number): number {
  return ((degrees % 360) + 360) % 360
}

export type ImageFitMode = 'contain' | 'cover'

export function getRotatedAspectRatio(
  width: number,
  height: number,
  rotation: number,
): number {
  const normalized = normalizeRotation(rotation)
  if (normalized === 90 || normalized === 270) {
    return height / width
  }
  return width / height
}

export function drawImageRotatedFit(
  ctx: CanvasRenderingContext2D,
  image: CanvasImageSource,
  containerWidth: number,
  containerHeight: number,
  rotationDeg: number,
  imageWidth: number,
  imageHeight: number,
  fit: ImageFitMode = 'contain',
  contentScale = 1,
): void {
  const rotation = normalizeRotation(rotationDeg)
  const zoom = Number.isFinite(contentScale) && contentScale > 0 ? contentScale : 1
  const scaleFn = fit === 'cover' ? Math.max : Math.min

  if (rotation === 0) {
    const scale = scaleFn(containerWidth / imageWidth, containerHeight / imageHeight) * zoom
    const width = imageWidth * scale
    const height = imageHeight * scale
    const x = (containerWidth - width) / 2
    const y = (containerHeight - height) / 2
    ctx.drawImage(image, x, y, width, height)
    return
  }

  const rad = (rotation * Math.PI) / 180
  const cos = Math.abs(Math.cos(rad))
  const sin = Math.abs(Math.sin(rad))
  const bboxWidth = imageWidth * cos + imageHeight * sin
  const bboxHeight = imageWidth * sin + imageHeight * cos
  const scale = scaleFn(containerWidth / bboxWidth, containerHeight / bboxHeight) * zoom
  const drawWidth = imageWidth * scale
  const drawHeight = imageHeight * scale

  ctx.save()
  ctx.translate(containerWidth / 2, containerHeight / 2)
  ctx.rotate(rad)
  ctx.drawImage(image, -drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight)
  ctx.restore()
}
