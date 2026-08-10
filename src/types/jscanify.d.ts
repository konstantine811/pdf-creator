import type { ScanPoint } from './scanner'

export interface JscanifyCornerPoints {
  topLeftCorner?: ScanPoint
  topRightCorner?: ScanPoint
  bottomLeftCorner?: ScanPoint
  bottomRightCorner?: ScanPoint
}

export interface JscanifyHighlightOptions {
  color?: string
  thickness?: number
}

export interface JscanifyInstance {
  findPaperContour(img: unknown): unknown | null
  getCornerPoints(contour: unknown): JscanifyCornerPoints
  highlightPaper(
    image: HTMLCanvasElement | HTMLImageElement,
    options?: JscanifyHighlightOptions,
  ): HTMLCanvasElement
  extractPaper(
    image: HTMLCanvasElement | HTMLImageElement,
    resultWidth: number,
    resultHeight: number,
    cornerPoints?: JscanifyCornerPoints,
  ): HTMLCanvasElement | null
}

declare global {
  interface Window {
    jscanify: new () => JscanifyInstance
    cv: {
      Mat: new (...args: unknown[]) => unknown
      imread: (canvas: HTMLCanvasElement) => unknown
      onRuntimeInitialized?: () => void
    }
  }
}

export {}
