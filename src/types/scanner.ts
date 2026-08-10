export type ScanFilter = 'original' | 'enhanced' | 'grayscale' | 'black-white'

export type ScanRotation = 0 | 90 | 180 | 270

export interface ScanPoint {
  x: number
  y: number
}

export interface ScannedPage {
  id: string
  createdAt: number
  label: string
  originalBlob: Blob
  processedBlob: Blob
  corners: ScanPoint[]
  rotation: ScanRotation
  filter: ScanFilter
  addedToPages: boolean
}

export type ScanHint =
  | 'idle'
  | 'searching'
  | 'move-closer'
  | 'hold-steady'
  | 'too-blurry'
  | 'low-light'
  | 'ready'
  | 'capturing'

export interface DetectedDocument {
  corners: ScanPoint[]
  areaRatio: number
  sharpness: number
  found: boolean
}
