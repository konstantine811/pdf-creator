import { PDFDocument } from 'pdf-lib'
import type { FitMode, PageItem } from '../types'
import { A4 } from './pageSizes'

function fitDimensions(
  sourceWidth: number,
  sourceHeight: number,
  targetWidth: number,
  targetHeight: number,
): { width: number; height: number; x: number; y: number } {
  const scale = Math.min(targetWidth / sourceWidth, targetHeight / sourceHeight)
  const width = sourceWidth * scale
  const height = sourceHeight * scale
  return {
    width,
    height,
    x: (targetWidth - width) / 2,
    y: (targetHeight - height) / 2,
  }
}

async function drawPdfPage(
  outputDoc: PDFDocument,
  item: PageItem,
  fitMode: FitMode,
): Promise<void> {
  if (!item.pdfBytes || item.pageIndex === undefined) {
    throw new Error(`Некоректні дані PDF-сторінки: ${item.label}`)
  }

  const [embeddedPage] = await outputDoc.embedPdf(item.pdfBytes, [item.pageIndex])
  const pageSize =
    fitMode === 'a4-fit'
      ? { width: A4.width, height: A4.height }
      : embeddedPage.size()

  const page = outputDoc.addPage([pageSize.width, pageSize.height])

  if (fitMode === 'a4-fit') {
    const { width, height, x, y } = fitDimensions(
      embeddedPage.width,
      embeddedPage.height,
      A4.width,
      A4.height,
    )
    page.drawPage(embeddedPage, { x, y, width, height })
    return
  }

  page.drawPage(embeddedPage, {
    x: 0,
    y: 0,
    width: embeddedPage.width,
    height: embeddedPage.height,
  })
}

async function drawImagePage(
  outputDoc: PDFDocument,
  item: PageItem,
  fitMode: FitMode,
): Promise<void> {
  if (!item.imageBytes) {
    throw new Error(`Некоректні дані зображення: ${item.label}`)
  }

  const mime = item.mimeType ?? 'image/png'
  const image = mime.includes('jpeg') || mime.includes('jpg')
    ? await outputDoc.embedJpg(item.imageBytes)
    : await outputDoc.embedPng(item.imageBytes)

  const sourceWidth = image.width
  const sourceHeight = image.height
  const pageSize =
    fitMode === 'a4-fit'
      ? { width: A4.width, height: A4.height }
      : { width: sourceWidth, height: sourceHeight }

  const page = outputDoc.addPage([pageSize.width, pageSize.height])

  if (fitMode === 'a4-fit') {
    const { width, height, x, y } = fitDimensions(
      sourceWidth,
      sourceHeight,
      A4.width,
      A4.height,
    )
    page.drawImage(image, { x, y, width, height })
    return
  }

  page.drawImage(image, {
    x: 0,
    y: 0,
    width: sourceWidth,
    height: sourceHeight,
  })
}

export async function exportPagesToPdf(
  pages: PageItem[],
  fitMode: FitMode,
): Promise<Uint8Array> {
  if (pages.length === 0) {
    throw new Error('Додайте хоча б одну сторінку перед експортом')
  }

  const outputDoc = await PDFDocument.create()

  for (const item of pages) {
    if (item.type === 'pdf') {
      await drawPdfPage(outputDoc, item, fitMode)
    } else {
      await drawImagePage(outputDoc, item, fitMode)
    }
  }

  return outputDoc.save()
}

export function downloadPdf(bytes: Uint8Array, filename = 'document.pdf'): void {
  const blob = new Blob([bytes.buffer as ArrayBuffer], { type: 'application/pdf' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
}
