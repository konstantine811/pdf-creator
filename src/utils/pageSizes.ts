import type { PageSize } from '../types.ts'

/** A4 in PDF points (72 pt/inch) */
export const A4: PageSize = {
  label: 'A4',
  width: 595.28,
  height: 841.89,
}

export const PAGE_SIZES: PageSize[] = [A4]

export function getPreviewAspectRatio(size: PageSize): number {
  return size.width / size.height
}
