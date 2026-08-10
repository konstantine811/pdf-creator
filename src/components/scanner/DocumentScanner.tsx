import CheckIcon from '@mui/icons-material/Check'
import CloseIcon from '@mui/icons-material/Close'
import ReplayIcon from '@mui/icons-material/Replay'
import {
  Alert,
  Box,
  Button,
  Paper,
  Stack,
  Typography,
} from '@mui/material'
import { useCallback, useEffect, useRef, useState } from 'react'
import { usePages } from '../../context/PagesContext'
import type {
  ScanFilter,
  ScanPoint,
  ScanRotation,
  ScannedPage,
} from '../../types/scanner'
import {
  canvasToBlob,
  createPageItemFromBlob,
} from '../../utils/imageCapture'
import {
  evaluateAutoCapture,
  hintToMessage,
  type AutoCaptureState,
} from '../../utils/scanner/autoCapture'
import { defaultCorners } from '../../utils/scanner/geometry'
import { applyScanFilter, rotateCanvas } from '../../utils/scanner/imageFilters'
import { detectDocumentFromCapture } from '../../utils/scanner/jscanifyDetection'
import { loadJscanify } from '../../utils/scanner/jscanifyLoader'
import { warpPerspectiveWithCanvas } from '../../utils/scanner/perspectiveTransform'
import {
  deleteScannedPage,
  listScannedPages,
  markScannedPageAdded,
  saveScannedPage,
} from '../../utils/scanner/scanStorage'
import { useDocumentDetection } from '../../hooks/useDocumentDetection'
import CameraView from './CameraView'
import SavedScansList from './SavedScansList'
import CornerEditor, { FilterControls } from './ScanEditor'

type ScannerStep = 'camera' | 'editor'

export default function DocumentScanner() {
  const { addPages, setError, setSuccess } = usePages()
  const videoRef = useRef<HTMLVideoElement>(null)
  const [step, setStep] = useState<ScannerStep>('camera')
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [cameraLoading, setCameraLoading] = useState(true)
  const [cameraError, setCameraError] = useState<string | null>(null)
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment')
  const autoCaptureStateRef = useRef<AutoCaptureState>({
    hint: 'idle',
    stableSince: null,
  })
  const previousCornersRef = useRef<ScanPoint[] | null>(null)
  const captureLockRef = useRef(false)
  const streamRef = useRef<MediaStream | null>(null)
  const detectionRef = useRef<{ found: boolean; corners: ScanPoint[] } | null>(null)

  const [originalCanvas, setOriginalCanvas] = useState<HTMLCanvasElement | null>(null)
  const [originalUrl, setOriginalUrl] = useState<string | null>(null)
  const [corners, setCorners] = useState<ScanPoint[]>([])
  const [filter, setFilter] = useState<ScanFilter>('enhanced')
  const [rotation, setRotation] = useState<ScanRotation>(0)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [savedScans, setSavedScans] = useState<ScannedPage[]>([])
  const [processing, setProcessing] = useState(false)
  const [analyzing, setAnalyzing] = useState(false)
  const [documentFound, setDocumentFound] = useState(false)
  const hintRef = useRef('Завантаження сканера…')
  const [hint, setHint] = useState('Завантаження сканера…')

  const cameraActive = step === 'camera' && Boolean(stream) && !cameraLoading

  const { detection, scannerReady, scannerLoading, scannerError, captureFrame } =
    useDocumentDetection(videoRef, cameraActive)

  useEffect(() => {
    detectionRef.current = detection?.found
      ? { found: true, corners: detection.corners }
      : null
  }, [detection])

  useEffect(() => {
    void loadJscanify()
    void listScannedPages().then(setSavedScans)
  }, [])

  useEffect(() => {
    let cancelled = false

    void (async () => {
      setCameraLoading(true)
      setCameraError(null)
      streamRef.current?.getTracks().forEach((track) => track.stop())
      streamRef.current = null
      if (!cancelled) setStream(null)

      try {
        const media = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode,
            width: { ideal: 1280, max: 1280 },
            height: { ideal: 720, max: 720 },
            frameRate: { ideal: 15, max: 24 },
          },
          audio: false,
        })
        if (cancelled) {
          media.getTracks().forEach((track) => track.stop())
          return
        }
        streamRef.current = media
        setStream(media)
      } catch {
        if (!cancelled) {
          setCameraError(
            'Не вдалося отримати доступ до камери. Перевірте дозволи та HTTPS.',
          )
        }
      } finally {
        if (!cancelled) setCameraLoading(false)
      }
    })()

    return () => {
      cancelled = true
      streamRef.current?.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }
  }, [facingMode])

  const resetEditorUrls = useCallback(() => {
    if (originalUrl) URL.revokeObjectURL(originalUrl)
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setOriginalUrl(null)
    setPreviewUrl(null)
  }, [originalUrl, previewUrl])

  const buildProcessedCanvas = useCallback(
    (source: HTMLCanvasElement, sourceCorners: ScanPoint[]) => {
      const warped = warpPerspectiveWithCanvas(source, sourceCorners)
      const rotated = rotateCanvas(warped, rotation)
      return applyScanFilter(rotated, filter)
    },
    [filter, rotation],
  )

  const updatePreview = useCallback(
    async (source: HTMLCanvasElement, sourceCorners: ScanPoint[]) => {
      const processed = buildProcessedCanvas(source, sourceCorners)
      const blob = await canvasToBlob(processed)
      const url = URL.createObjectURL(blob)
      setPreviewUrl((current) => {
        if (current) URL.revokeObjectURL(current)
        return url
      })
    },
    [buildProcessedCanvas],
  )

  useEffect(() => {
    if (!originalCanvas || corners.length !== 4) return
    void updatePreview(originalCanvas, corners)
  }, [originalCanvas, corners, filter, rotation, updatePreview])

  const finishCapture = useCallback(
    async (frame: HTMLCanvasElement, nextCorners: ScanPoint[], found: boolean) => {
      resetEditorUrls()
      const blob = await canvasToBlob(frame)
      setOriginalUrl(URL.createObjectURL(blob))
      setOriginalCanvas(frame)
      setCorners(nextCorners)
      setDocumentFound(found)
      setFilter('enhanced')
      setRotation(0)
      setStep('editor')
      setAnalyzing(false)
      captureLockRef.current = false
      autoCaptureStateRef.current = { hint: 'idle', stableSince: null }
      hintRef.current = hintToMessage('idle')
      setHint(hintRef.current)
      previousCornersRef.current = null
    },
    [resetEditorUrls],
  )

  const handleCapture = useCallback(
    async (detectedCorners?: ScanPoint[], fromAuto = false) => {
      const frame = captureFrame()
      if (!frame) {
        captureLockRef.current = false
        return
      }

      const live = detectionRef.current
      const liveCorners =
        live?.found && live.corners.length === 4
          ? live.corners
          : detectedCorners && detectedCorners.length === 4 && detection?.found
            ? detectedCorners
            : null

      if (liveCorners) {
        await finishCapture(frame, liveCorners, true)
        return
      }

      if (fromAuto) {
        captureLockRef.current = false
        return
      }

      setAnalyzing(true)
      await new Promise<void>((resolve) => {
        requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
      })

      try {
        const scanner = await loadJscanify()
        const result = detectDocumentFromCapture(scanner, frame)
        resetEditorUrls()
        const blob = await canvasToBlob(frame)
        setOriginalUrl(URL.createObjectURL(blob))
        setOriginalCanvas(frame)
        setCorners(result.corners)
        setDocumentFound(result.found)
        setFilter('enhanced')
        setRotation(0)
        setStep('editor')
      } catch {
        resetEditorUrls()
        const blob = await canvasToBlob(frame)
        setOriginalUrl(URL.createObjectURL(blob))
        setOriginalCanvas(frame)
        setCorners(defaultCorners(frame.width, frame.height))
        setDocumentFound(false)
        setFilter('enhanced')
        setRotation(0)
        setStep('editor')
      } finally {
        setAnalyzing(false)
        captureLockRef.current = false
        autoCaptureStateRef.current = { hint: 'idle', stableSince: null }
        previousCornersRef.current = null
      }
    },
    [captureFrame, detection, finishCapture, resetEditorUrls],
  )

  const handleRedetectDocument = useCallback(async () => {
    if (!originalCanvas) return
    setAnalyzing(true)
    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
    })
    try {
      const scanner = await loadJscanify()
      const result = detectDocumentFromCapture(scanner, originalCanvas)
      setCorners(result.corners)
      setDocumentFound(result.found)
    } catch {
      setDocumentFound(false)
    } finally {
      setAnalyzing(false)
    }
  }, [originalCanvas])

  useEffect(() => {
    if (!cameraActive || !scannerReady || !detection || captureLockRef.current) {
      if (cameraActive && scannerLoading) {
        const loadingHint = 'Завантаження сканера…'
        if (hintRef.current !== loadingHint) {
          hintRef.current = loadingHint
          setHint(loadingHint)
        }
      }
      return
    }

    const next = evaluateAutoCapture(
      autoCaptureStateRef.current,
      detection,
      previousCornersRef.current,
    )
    autoCaptureStateRef.current = next
    previousCornersRef.current = detection.found ? detection.corners : null

    const nextHint = hintToMessage(next.hint)
    if (hintRef.current !== nextHint) {
      hintRef.current = nextHint
      setHint(nextHint)
    }

    if (next.hint === 'ready' && detection.found) {
      captureLockRef.current = true
      autoCaptureStateRef.current = { hint: 'capturing', stableSince: null }
      const capturingHint = hintToMessage('capturing')
      hintRef.current = capturingHint
      setHint(capturingHint)
      void handleCapture(detection.corners, true)
    }
  }, [cameraActive, detection, handleCapture, scannerLoading, scannerReady])

  const handleRetake = useCallback(() => {
    resetEditorUrls()
    setOriginalCanvas(null)
    setCorners([])
    setStep('camera')
    captureLockRef.current = false
    previousCornersRef.current = null
    autoCaptureStateRef.current = { hint: 'idle', stableSince: null }
    hintRef.current = scannerReady ? hintToMessage('searching') : 'Завантаження сканера…'
    setHint(hintRef.current)
  }, [scannerReady, resetEditorUrls])

  const handleConfirm = useCallback(async () => {
    if (!originalCanvas || corners.length !== 4) return
    setProcessing(true)
    try {
      const processedCanvas = buildProcessedCanvas(originalCanvas, corners)
      const originalBlob = await canvasToBlob(originalCanvas)
      const processedBlob = await canvasToBlob(processedCanvas)
      const label = `Скан ${new Date().toLocaleString('uk-UA')}`

      const scanned: ScannedPage = {
        id: crypto.randomUUID(),
        createdAt: Date.now(),
        label,
        originalBlob,
        processedBlob,
        corners,
        rotation,
        filter,
        addedToPages: true,
      }

      await saveScannedPage(scanned)
      const pageItem = await createPageItemFromBlob(processedBlob, label)
      addPages([pageItem])
      await markScannedPageAdded(scanned.id)
      setSavedScans(await listScannedPages())
      setSuccess('Скан збережено та додано до документа')
      handleRetake()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Помилка збереження скану')
    } finally {
      setProcessing(false)
    }
  }, [
    addPages,
    buildProcessedCanvas,
    corners,
    filter,
    handleRetake,
    originalCanvas,
    rotation,
    setError,
    setSuccess,
  ])

  const handleAddSavedScan = useCallback(
    async (scan: ScannedPage) => {
      try {
        const pageItem = await createPageItemFromBlob(scan.processedBlob, scan.label)
        addPages([pageItem])
        await markScannedPageAdded(scan.id)
        setSavedScans(await listScannedPages())
        setSuccess('Скан додано до документа')
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Помилка додавання скану')
      }
    },
    [addPages, setError, setSuccess],
  )

  const handleDeleteSavedScan = useCallback(async (id: string) => {
    await deleteScannedPage(id)
    setSavedScans(await listScannedPages())
  }, [])

  const cameraHint = cameraLoading
    ? 'Запуск камери…'
    : scannerLoading
      ? 'Завантаження сканера…'
      : scannerReady
        ? hint
        : 'Підготовка сканера…'

  return (
    <Stack spacing={3}>
      {scannerError && (
        <Alert severity="warning">
          Сканер не завантажився: {scannerError}. Автопошук недоступний — використовуйте
          ручне фото.
        </Alert>
      )}

      {step === 'camera' ? (
        <>
          <Box sx={{ maxWidth: 520, mx: 'auto', width: '100%', position: 'relative' }}>
            {analyzing && (
              <Box
                sx={{
                  position: 'absolute',
                  inset: 0,
                  zIndex: 3,
                  bgcolor: 'rgba(0,0,0,0.72)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: 2,
                }}
              >
                <Stack spacing={1} sx={{ alignItems: 'center' }}>
                  <Typography color="common.white" sx={{ fontWeight: 600 }}>
                    Шукаємо межі документа…
                  </Typography>
                </Stack>
              </Box>
            )}
            <CameraView
              videoRef={videoRef}
              stream={stream}
              loading={cameraLoading}
              error={cameraError}
              hint={cameraHint}
              detection={detection}
              scannerReady={scannerReady}
              onManualCapture={() => void handleCapture(detection?.corners)}
              onSwitchCamera={() =>
                setFacingMode((current) =>
                  current === 'environment' ? 'user' : 'environment',
                )
              }
              disabled={analyzing}
            />
          </Box>
          <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center' }}>
            Наведіть камеру на документ — рамка з&apos;явиться навколо нього. Коли межі
            стабільні, знімок зробиться автоматично. Або натисніть кнопку камери вручну.
          </Typography>
        </>
      ) : (
        <Paper variant="outlined" sx={{ p: 2.5 }}>
          <Stack spacing={2.5}>
            {!documentFound && (
              <Alert severity="info">
                Межі документа не знайдено автоматично — підкоригуйте кути вручну або
                натисніть «Знайти документ».
              </Alert>
            )}

            <Stack
              direction={{ xs: 'column', md: 'row' }}
              spacing={2}
              sx={{ alignItems: 'stretch' }}
            >
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                  Обрізання
                </Typography>
                {originalUrl && (
                  <CornerEditor
                    imageUrl={originalUrl}
                    corners={corners}
                    onChange={setCorners}
                  />
                )}
              </Box>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                  Попередній перегляд
                </Typography>
                <Box
                  sx={{
                    borderRadius: 2,
                    overflow: 'hidden',
                    border: '1px solid rgba(214, 215, 133, 0.18)',
                    bgcolor: '#111',
                    minHeight: 280,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {previewUrl ? (
                    <Box
                      component="img"
                      src={previewUrl}
                      alt="Попередній перегляд"
                      sx={{ width: '100%', height: 'auto', display: 'block' }}
                    />
                  ) : (
                    <Typography color="text.secondary">Обробка…</Typography>
                  )}
                </Box>
              </Box>
            </Stack>

            <FilterControls
              filter={filter}
              rotation={rotation}
              onFilterChange={setFilter}
              onRotate={() =>
                setRotation((current) => ((current + 90) % 360) as ScanRotation)
              }
            />

            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
              <Button
                variant="outlined"
                onClick={() => void handleRedetectDocument()}
                disabled={processing || analyzing}
              >
                {analyzing ? 'Пошук…' : 'Знайти документ'}
              </Button>
              <Button
                variant="outlined"
                startIcon={<ReplayIcon />}
                onClick={handleRetake}
                disabled={processing || analyzing}
              >
                Пересканувати
              </Button>
              <Button
                variant="outlined"
                startIcon={<CloseIcon />}
                onClick={handleRetake}
                disabled={processing || analyzing}
              >
                Скасувати
              </Button>
              <Box sx={{ flex: 1 }} />
              <Button
                variant="contained"
                startIcon={<CheckIcon />}
                onClick={() => void handleConfirm()}
                disabled={processing || analyzing || !previewUrl}
              >
                {processing ? 'Збереження…' : 'Підтвердити скан'}
              </Button>
            </Stack>
          </Stack>
        </Paper>
      )}

      <Box>
        <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1.5 }}>
          Збережені скани
        </Typography>
        <SavedScansList
          scans={savedScans}
          onAddToDocument={(scan) => void handleAddSavedScan(scan)}
          onDelete={(id) => void handleDeleteSavedScan(id)}
        />
      </Box>
    </Stack>
  )
}
