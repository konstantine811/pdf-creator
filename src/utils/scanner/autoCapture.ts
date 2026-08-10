import type { DetectedDocument, ScanHint } from '../../types/scanner'
import { cornersDistance } from './geometry'

const STABILITY_MS = 600
const MIN_AREA_RATIO = 0.10
const MIN_SHARPNESS = 45
const MAX_CORNER_DRIFT = 32

export interface AutoCaptureState {
  hint: ScanHint
  stableSince: number | null
}

export function evaluateAutoCapture(
  previous: AutoCaptureState,
  detection: DetectedDocument | null,
  previousCorners: DetectedDocument['corners'] | null,
  now = Date.now(),
): AutoCaptureState {
  if (!detection || !detection.found) {
    return { hint: 'searching', stableSince: null }
  }

  if (detection.sharpness === 0) {
    return { hint: 'low-light', stableSince: null }
  }

  if (detection.areaRatio < MIN_AREA_RATIO) {
    return { hint: 'move-closer', stableSince: null }
  }

  if (detection.sharpness < MIN_SHARPNESS) {
    return { hint: 'too-blurry', stableSince: null }
  }

  if (previousCorners) {
    const drift = cornersDistance(detection.corners, previousCorners)
    if (drift > MAX_CORNER_DRIFT) {
      return { hint: 'hold-steady', stableSince: null }
    }
  }

  const stableSince = previous.stableSince ?? now
  if (now - stableSince >= STABILITY_MS) {
    return { hint: 'ready', stableSince }
  }

  return { hint: 'hold-steady', stableSince }
}

export function hintToMessage(hint: ScanHint): string {
  switch (hint) {
    case 'searching':
      return 'Шукаємо документ…'
    case 'move-closer':
      return 'Наблизьте документ'
    case 'hold-steady':
      return 'Тримайте рівніше'
    case 'too-blurry':
      return 'Зображення розмите'
    case 'low-light':
      return 'Замало світла'
    case 'ready':
      return 'Готово до сканування'
    case 'capturing':
      return 'Сканування…'
    default:
      return 'Наведіть камеру на документ'
  }
}
