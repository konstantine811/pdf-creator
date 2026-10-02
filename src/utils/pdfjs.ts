import * as pdfjs from 'pdfjs-dist'

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString()

// PDF.js appends asset filenames, so each directory must end with a slash.
const assetBase = `${import.meta.env.BASE_URL}pdfjs/`

export function createPdfDocumentOptions(pdfBytes: Uint8Array) {
  return {
    data: pdfBytes.slice(),
    cMapUrl: `${assetBase}cmaps/`,
    cMapPacked: true,
    standardFontDataUrl: `${assetBase}standard_fonts/`,
    wasmUrl: `${assetBase}wasm/`,
  }
}

export { pdfjs }
