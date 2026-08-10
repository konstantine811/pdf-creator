export type PageSourceType = 'pdf' | 'image'

export type FitMode = 'a4-fit' | 'original'

export type AnnotationTool = 'select' | 'text' | 'pen'

export interface PageTextAnnotation {
  id: string
  content: string
  x: number
  y: number
  fontSize: number
  color: string
}

export interface DrawPoint {
  x: number
  y: number
}

export interface DrawStroke {
  id: string
  points: DrawPoint[]
  color: string
  width: number
}

export interface PageItem {
  id: string
  type: PageSourceType
  label: string
  thumbnailUrl: string
  pdfBytes?: Uint8Array
  pageIndex?: number
  imageBytes?: Uint8Array
  mimeType?: string
  width?: number
  height?: number
  rotation?: number
  textAnnotations?: PageTextAnnotation[]
  drawStrokes?: DrawStroke[]
}

export interface PageSize {
  label: string
  width: number
  height: number
}

export interface LoadProgress {
  current: number
  total: number
  percent: number
  fileName: string
  stage: string
}

export interface TextStyle {
  fontSize: number
  color: string
}

export const DEFAULT_TEXT_STYLE: TextStyle = {
  fontSize: 18,
  color: '#000000',
}

export const DEFAULT_PEN = {
  color: '#000000',
  width: 3,
}
