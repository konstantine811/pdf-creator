import * as pdfjs from 'pdfjs-dist'
import type { LoadProgress, PageItem } from '../types'
import { convertHeicToJpeg, isHeicFile } from './heic'

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString()

const THUMBNAIL_MAX_SIDE = 240

export type LoadProgressCallback = (progress: LoadProgress) => void

function createId(): string {
  return crypto.randomUUID()
}

function detectMimeType(file: File): string {
  if (file.type.startsWith('image/')) return file.type
  const lower = file.name.toLowerCase()
  if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg'
  if (lower.endsWith('.png')) return 'image/png'
  if (lower.endsWith('.webp')) return 'image/webp'
  if (lower.endsWith('.gif')) return 'image/gif'
  if (lower.endsWith('.bmp')) return 'image/bmp'
  if (lower.endsWith('.heic')) return 'image/heic'
  if (lower.endsWith('.heif')) return 'image/heif'
  return 'image/jpeg'
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

async function rasterizeImageBlob(blob: Blob): Promise<{
  canvas: HTMLCanvasElement
  width: number
  height: number
}> {
  // Bake EXIF/orientation into pixels so preview and PDF export match.
  const bitmap = await createImageBitmap(blob, {
    imageOrientation: 'from-image',
  })

  try {
    const canvas = document.createElement('canvas')
    canvas.width = Math.max(1, bitmap.width)
    canvas.height = Math.max(1, bitmap.height)
    const ctx = canvas.getContext('2d')
    if (!ctx) {
      throw new Error('Не вдалося створити canvas')
    }
    ctx.imageSmoothingEnabled = true
    ctx.imageSmoothingQuality = 'high'
    ctx.drawImage(bitmap, 0, 0)
    return {
      canvas,
      width: bitmap.width,
      height: bitmap.height,
    }
  } finally {
    bitmap.close()
  }
}

function createThumbnailFromCanvas(source: HTMLCanvasElement): string {
  const scale = Math.min(
    1,
    THUMBNAIL_MAX_SIDE / Math.max(source.width, source.height),
  )
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(source.width * scale))
  canvas.height = Math.max(1, Math.round(source.height * scale))
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    return source.toDataURL('image/jpeg', 0.8)
  }
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(source, 0, 0, canvas.width, canvas.height)
  return canvas.toDataURL('image/jpeg', 0.8)
}

async function prepareImageSource(
  file: File,
  onStage?: (stage: string) => void,
): Promise<{
  bytes: Uint8Array
  mimeType: string
}> {
  if (isHeicFile(file)) {
    onStage?.('Конвертація HEIC…')
    const { blob, mimeType } = await convertHeicToJpeg(file)
    return {
      bytes: new Uint8Array(await blob.arrayBuffer()),
      mimeType,
    }
  }

  onStage?.('Читання зображення…')
  return {
    bytes: Uint8Array.from(new Uint8Array(await file.arrayBuffer())),
    mimeType: detectMimeType(file),
  }
}

async function loadImagePage(
  file: File,
  onStage?: (stage: string) => void,
): Promise<{
  thumbnailUrl: string
  width: number
  height: number
  imageBytes: Uint8Array
  mimeType: string
}> {
  const { bytes: sourceBytes, mimeType } = await prepareImageSource(file, onStage)
  const blob = new Blob([Uint8Array.from(sourceBytes)], { type: mimeType })

  onStage?.('Нормалізація орієнтації фото…')
  const { canvas, width, height } = await rasterizeImageBlob(blob)

  onStage?.('Створення мініатюри…')
  const thumbnailUrl = createThumbnailFromCanvas(canvas)
  const imageBytes = await canvasToPngBytes(canvas)

  return {
    thumbnailUrl,
    width,
    height,
    imageBytes,
    mimeType: 'image/png',
  }
}

async function renderPdfPageThumbnail(
  pdfBytes: Uint8Array,
  pageIndex: number,
): Promise<{ thumbnailUrl: string; width: number; height: number }> {
  const loadingTask = pdfjs.getDocument({ data: pdfBytes.slice() })
  const pdf = await loadingTask.promise
  const page = await pdf.getPage(pageIndex + 1)
  const viewportFull = page.getViewport({ scale: 1 })
  const scale = THUMBNAIL_MAX_SIDE / Math.max(viewportFull.width, viewportFull.height)
  const viewport = page.getViewport({ scale: Math.min(scale, 1) })
  const canvas = document.createElement('canvas')
  canvas.width = viewport.width
  canvas.height = viewport.height
  const context = canvas.getContext('2d')
  if (!context) {
    throw new Error('Не вдалося створити canvas для попереднього перегляду')
  }
  await page.render({ canvas, canvasContext: context, viewport }).promise
  return {
    thumbnailUrl: canvas.toDataURL('image/jpeg', 0.8),
    width: viewportFull.width,
    height: viewportFull.height,
  }
}

function isPdfFile(file: File): boolean {
  return file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')
}

function isImageFile(file: File): boolean {
  const lowerName = file.name.toLowerCase()
  return (
    file.type.startsWith('image/') ||
    isHeicFile(file) ||
    /\.(jpe?g|png|webp|gif|bmp|heic|heif)$/i.test(lowerName)
  )
}

function isWordFile(file: File): boolean {
  const lower = file.name.toLowerCase()
  return (
    lower.endsWith('.doc') ||
    lower.endsWith('.docx') ||
    file.type === 'application/msword' ||
    file.type ===
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  )
}

function reportProgress(
  onProgress: LoadProgressCallback | undefined,
  current: number,
  total: number,
  fileName: string,
  stage: string,
): void {
  if (!onProgress) return
  const safeTotal = Math.max(total, 1)
  const clamped = Math.min(current, safeTotal)
  onProgress({
    current: clamped,
    total: safeTotal,
    percent: Math.round((clamped / safeTotal) * 100),
    fileName,
    stage,
  })
}

async function estimateWorkUnits(files: File[]): Promise<{
  supported: File[]
  totalUnits: number
  pdfPageCounts: Map<string, number>
}> {
  const supported: File[] = []
  const pdfPageCounts = new Map<string, number>()
  let totalUnits = 0

  for (const file of files) {
    if (isPdfFile(file)) {
      supported.push(file)
      const pdfBytes = new Uint8Array(await file.arrayBuffer())
      const loadingTask = pdfjs.getDocument({ data: pdfBytes.slice() })
      const pdf = await loadingTask.promise
      pdfPageCounts.set(file.name + file.size + file.lastModified, pdf.numPages)
      totalUnits += Math.max(pdf.numPages, 1)
      continue
    }

    if (isImageFile(file)) {
      supported.push(file)
      totalUnits += 1
    }
  }

  return { supported, totalUnits: Math.max(totalUnits, 1), pdfPageCounts }
}

export async function loadPagesFromFiles(
  files: File[],
  onProgress?: LoadProgressCallback,
): Promise<PageItem[]> {
  const items: PageItem[] = []
  let completed = 0

  reportProgress(onProgress, 0, files.length, '', 'Підготовка файлів…')

  const hasWordOnly =
    files.some(isWordFile) &&
    !files.some((file) => isPdfFile(file) || isImageFile(file))

  const { supported, totalUnits, pdfPageCounts } = await estimateWorkUnits(files)

  if (supported.length === 0) {
    if (hasWordOnly || files.some(isWordFile)) {
      throw new Error(
        'Файли Word (.doc/.docx) не підтримуються напряму. У Word збережіть документ як PDF (Файл → Зберегти як → PDF) і завантажте цей PDF.',
      )
    }
    reportProgress(onProgress, 0, 1, '', 'Немає підтримуваних файлів')
    return items
  }

  reportProgress(onProgress, 0, totalUnits, supported[0]?.name ?? '', 'Початок обробки…')

  for (const file of supported) {
    if (isPdfFile(file)) {
      reportProgress(
        onProgress,
        completed,
        totalUnits,
        file.name,
        'Читання PDF…',
      )

      const pdfBytes = new Uint8Array(await file.arrayBuffer())
      const key = file.name + file.size + file.lastModified
      const pageCount =
        pdfPageCounts.get(key) ??
        (await pdfjs.getDocument({ data: pdfBytes.slice() }).promise).numPages

      for (let pageIndex = 0; pageIndex < pageCount; pageIndex += 1) {
        reportProgress(
          onProgress,
          completed,
          totalUnits,
          file.name,
          `Рендер сторінки ${pageIndex + 1} з ${pageCount}…`,
        )

        const { thumbnailUrl, width, height } = await renderPdfPageThumbnail(
          pdfBytes,
          pageIndex,
        )
        const pageLabel =
          pageCount > 1
            ? `${file.name} — стор. ${pageIndex + 1}`
            : file.name

        items.push({
          id: createId(),
          type: 'pdf',
          label: pageLabel,
          thumbnailUrl,
          pdfBytes,
          pageIndex,
          width,
          height,
        })

        completed += 1
        reportProgress(
          onProgress,
          completed,
          totalUnits,
          file.name,
          `Готово: сторінка ${pageIndex + 1} з ${pageCount}`,
        )
      }
      continue
    }

    reportProgress(onProgress, completed, totalUnits, file.name, 'Обробка зображення…')

    const { thumbnailUrl, width, height, imageBytes, mimeType } =
      await loadImagePage(file, (stage) => {
        reportProgress(onProgress, completed, totalUnits, file.name, stage)
      })

    items.push({
      id: createId(),
      type: 'image',
      label: file.name,
      thumbnailUrl,
      imageBytes,
      mimeType,
      width,
      height,
    })

    completed += 1
    reportProgress(
      onProgress,
      completed,
      totalUnits,
      file.name,
      'Зображення додано',
    )
  }

  reportProgress(onProgress, totalUnits, totalUnits, '', 'Завантаження завершено')
  return items
}

export function revokePageThumbnails(pages: PageItem[]): void {
  for (const page of pages) {
    if (page.thumbnailUrl.startsWith('blob:')) {
      URL.revokeObjectURL(page.thumbnailUrl)
    }
  }
}
