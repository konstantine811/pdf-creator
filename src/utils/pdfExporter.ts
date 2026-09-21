import { PDFDocument } from 'pdf-lib'
import type { FitMode, PageItem } from '../types'
import { pageHasAnnotations } from './pageCompositor'
import { renderPagePreview } from './pageRenderer'
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

async function dataUrlToBytes(dataUrl: string): Promise<Uint8Array> {
  const response = await fetch(dataUrl)
  const buffer = await response.arrayBuffer()
  return new Uint8Array(buffer)
}

/**
 * Export a photo filling the whole A4 page (cover), or full-bleed original size.
 */
async function drawImageFullBleed(
  outputDoc: PDFDocument,
  item: PageItem,
  fitMode: FitMode,
): Promise<void> {
  if (fitMode === 'a4-fit') {
    // Rasterize into A4 with cover so the photo fills the page like in the editor.
    const dataUrl = await renderPagePreview(item, 1240, 'a4-fit', true)
    const bytes = await dataUrlToBytes(dataUrl)
    const image = await outputDoc.embedPng(bytes)
    const page = outputDoc.addPage([A4.width, A4.height])
    page.drawImage(image, {
      x: 0,
      y: 0,
      width: A4.width,
      height: A4.height,
    })
    return
  }

  const exportWidth = Math.max(item.width ?? 1240, 1240)
  const dataUrl = await renderPagePreview(item, exportWidth, 'original', true)
  const bytes = await dataUrlToBytes(dataUrl)
  const image = await outputDoc.embedPng(bytes)
  const page = outputDoc.addPage([image.width, image.height])
  page.drawImage(image, {
    x: 0,
    y: 0,
    width: image.width,
    height: image.height,
  })
}

async function drawAnnotatedPage(
  outputDoc: PDFDocument,
  item: PageItem,
  fitMode: FitMode,
): Promise<void> {
  const exportWidth = fitMode === 'a4-fit' ? 1240 : Math.max(item.width ?? 1240, 1240)
  const dataUrl = await renderPagePreview(item, exportWidth, fitMode)
  const bytes = await dataUrlToBytes(dataUrl)
  const image = await outputDoc.embedPng(bytes)

  const pageSize =
    fitMode === 'a4-fit'
      ? { width: A4.width, height: A4.height }
      : { width: image.width, height: image.height }

  const page = outputDoc.addPage([pageSize.width, pageSize.height])

  if (fitMode === 'a4-fit') {
    const { width, height, x, y } = fitDimensions(
      image.width,
      image.height,
      A4.width,
      A4.height,
    )
    page.drawImage(image, { x, y, width, height })
    return
  }

  page.drawImage(image, {
    x: 0,
    y: 0,
    width: image.width,
    height: image.height,
  })
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

export async function exportPagesToPdf(
  pages: PageItem[],
  fitMode: FitMode,
): Promise<Uint8Array> {
  if (pages.length === 0) {
    throw new Error('Додайте хоча б одну сторінку перед експортом')
  }

  const outputDoc = await PDFDocument.create()

  for (const item of pages) {
    // Photos: fill the entire page (no white margins), keep EXIF/rotation via raster path.
    if (item.type === 'image' && !pageHasAnnotations(item)) {
      await drawImageFullBleed(outputDoc, item, fitMode)
      continue
    }

    if (pageHasAnnotations(item) || (item.rotation ?? 0) !== 0 || (item.scale ?? 1) !== 1) {
      await drawAnnotatedPage(outputDoc, item, fitMode)
      continue
    }

    if (item.type === 'pdf') {
      await drawPdfPage(outputDoc, item, fitMode)
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
