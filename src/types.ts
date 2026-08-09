export type PageSourceType = 'pdf' | 'image'

export type FitMode = 'a4-fit' | 'original'

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
