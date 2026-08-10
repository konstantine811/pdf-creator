import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import type { DrawStroke, FitMode, LoadProgress, PageItem, PageTextAnnotation } from '../types'
import { downloadPdf, exportPagesToPdf } from '../utils/pdfExporter'
import { loadPagesFromFiles } from '../utils/pdfLoader'
import { clearPageRenderCache } from '../utils/pageRenderer'
import { normalizeRotation } from '../utils/pageRotation'
import { reorderPages } from '../utils/reorderPages'

interface RemoveUndoEntry {
  page: PageItem
  index: number
}

const MAX_UNDO_STACK = 50

interface PagesContextValue {
  pages: PageItem[]
  fitMode: FitMode
  loading: boolean
  loadProgress: LoadProgress | null
  exporting: boolean
  error: string | null
  success: string | null
  canUndoRemove: boolean
  setFitMode: (mode: FitMode) => void
  setError: (message: string | null) => void
  setSuccess: (message: string | null) => void
  handleFilesSelected: (files: File[]) => Promise<void>
  addPages: (newPages: PageItem[]) => void
  handleReorder: (activeId: string, overId: string) => void
  handleRemove: (id: string) => void
  handleUndoRemove: () => void
  handleClear: () => void
  handleExport: () => Promise<void>
  rotatePage: (id: string, delta: number) => void
  updatePageAnnotations: (
    id: string,
    patch: {
      textAnnotations?: PageTextAnnotation[]
      drawStrokes?: DrawStroke[]
    },
  ) => void
}

const PagesContext = createContext<PagesContextValue | null>(null)

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  const tag = target.tagName
  return tag === 'TEXTAREA' || tag === 'INPUT' || target.isContentEditable
}

export function PagesProvider({ children }: { children: ReactNode }) {
  const [pages, setPages] = useState<PageItem[]>([])
  const [fitMode, setFitMode] = useState<FitMode>('a4-fit')
  const [loading, setLoading] = useState(false)
  const [loadProgress, setLoadProgress] = useState<LoadProgress | null>(null)
  const [exporting, setExporting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [undoStackSize, setUndoStackSize] = useState(0)
  const removeUndoStackRef = useRef<RemoveUndoEntry[]>([])

  const pushUndoEntry = useCallback((entry: RemoveUndoEntry) => {
    const stack = removeUndoStackRef.current
    stack.push(entry)
    if (stack.length > MAX_UNDO_STACK) {
      stack.shift()
    }
    setUndoStackSize(stack.length)
  }, [])

  const addPages = useCallback((newPages: PageItem[]) => {
    if (newPages.length === 0) return
    setPages((current) => [...current, ...newPages])
    setSuccess(`Додано ${newPages.length} сторінок`)
  }, [])

  const handleFilesSelected = useCallback(async (files: File[]) => {
    setLoading(true)
    setError(null)
    setLoadProgress({
      current: 0,
      total: Math.max(files.length, 1),
      percent: 0,
      fileName: '',
      stage: 'Підготовка файлів…',
    })
    try {
      const loaded = await loadPagesFromFiles(files, setLoadProgress)
      if (loaded.length === 0) {
        setError('Не знайдено підтримуваних файлів')
        return
      }
      setPages((current) => [...current, ...loaded])
      setSuccess(`Додано ${loaded.length} сторінок`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Помилка завантаження файлів')
    } finally {
      setLoading(false)
      setLoadProgress(null)
    }
  }, [])

  const handleReorder = useCallback((activeId: string, overId: string) => {
    setPages((current) => reorderPages(current, activeId, overId))
  }, [])

  const handleRemove = useCallback(
    (id: string) => {
      setPages((current) => {
        const index = current.findIndex((page) => page.id === id)
        if (index === -1) return current

        pushUndoEntry({ page: current[index], index })
        clearPageRenderCache([id])
        return current.filter((page) => page.id !== id)
      })
    },
    [pushUndoEntry],
  )

  const handleUndoRemove = useCallback(() => {
    const entry = removeUndoStackRef.current.pop()
    if (!entry) return

    setUndoStackSize(removeUndoStackRef.current.length)
    setPages((current) => {
      const next = [...current]
      const insertAt = Math.min(entry.index, next.length)
      next.splice(insertAt, 0, entry.page)
      return next
    })
    setSuccess(`Повернено: ${entry.page.label}`)
  }, [])

  const handleClear = useCallback(() => {
    clearPageRenderCache()
    removeUndoStackRef.current = []
    setUndoStackSize(0)
    setPages([])
  }, [])

  const rotatePage = useCallback((id: string, delta: number) => {
    clearPageRenderCache([id])
    setPages((current) =>
      current.map((page) =>
        page.id === id
          ? { ...page, rotation: normalizeRotation((page.rotation ?? 0) + delta) }
          : page,
      ),
    )
  }, [])

  const updatePageAnnotations = useCallback(
    (
      id: string,
      patch: {
        textAnnotations?: PageTextAnnotation[]
        drawStrokes?: DrawStroke[]
      },
    ) => {
      clearPageRenderCache([id])
      setPages((current) =>
        current.map((page) => (page.id === id ? { ...page, ...patch } : page)),
      )
    },
    [],
  )

  const handleExport = useCallback(async () => {
    setExporting(true)
    setError(null)
    try {
      const bytes = await exportPagesToPdf(pages, fitMode)
      downloadPdf(bytes, 'pdf-creator-export.pdf')
      setSuccess('PDF успішно експортовано')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Помилка експорту PDF')
    } finally {
      setExporting(false)
    }
  }, [pages, fitMode])

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const isUndo =
        (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z' && !event.shiftKey
      if (!isUndo) return
      if (removeUndoStackRef.current.length === 0) return
      if (isEditableTarget(event.target)) return

      event.preventDefault()
      handleUndoRemove()
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleUndoRemove])

  const value = useMemo(
    () => ({
      pages,
      fitMode,
      loading,
      loadProgress,
      exporting,
      error,
      success,
      canUndoRemove: undoStackSize > 0,
      setFitMode,
      setError,
      setSuccess,
      handleFilesSelected,
      addPages,
      handleReorder,
      handleRemove,
      handleUndoRemove,
      handleClear,
      handleExport,
      rotatePage,
      updatePageAnnotations,
    }),
    [
      pages,
      fitMode,
      loading,
      loadProgress,
      exporting,
      error,
      success,
      undoStackSize,
      handleFilesSelected,
      addPages,
      handleReorder,
      handleRemove,
      handleUndoRemove,
      handleClear,
      handleExport,
      rotatePage,
      updatePageAnnotations,
    ],
  )

  return <PagesContext.Provider value={value}>{children}</PagesContext.Provider>
}

export function usePages() {
  const context = useContext(PagesContext)
  if (!context) {
    throw new Error('usePages must be used within PagesProvider')
  }
  return context
}
