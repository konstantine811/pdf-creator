import ClearAllIcon from '@mui/icons-material/ClearAll'
import DownloadIcon from '@mui/icons-material/Download'
import AspectRatioIcon from '@mui/icons-material/AspectRatio'
import {
  Alert,
  AppBar,
  Box,
  Button,
  Container,
  Snackbar,
  Stack,
  ToggleButton,
  ToggleButtonGroup,
  Toolbar,
  Typography,
} from '@mui/material'
import { useCallback, useState } from 'react'
import DocumentPreview from './components/DocumentPreview'
import FileUpload from './components/FileUpload'
import PageList from './components/PageList'
import type { FitMode, LoadProgress, PageItem } from './types'
import { downloadPdf, exportPagesToPdf } from './utils/pdfExporter'
import { loadPagesFromFiles } from './utils/pdfLoader'
import { clearPageRenderCache } from './utils/pageRenderer'
import { reorderPages } from './utils/reorderPages'
import './App.css'

export default function App() {
  const [pages, setPages] = useState<PageItem[]>([])
  const [fitMode, setFitMode] = useState<FitMode>('a4-fit')
  const [loading, setLoading] = useState(false)
  const [loadProgress, setLoadProgress] = useState<LoadProgress | null>(null)
  const [exporting, setExporting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

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

  const handleRemove = useCallback((id: string) => {
    clearPageRenderCache([id])
    setPages((current) => current.filter((page) => page.id !== id))
  }, [])

  const handleClear = useCallback(() => {
    clearPageRenderCache()
    setPages([])
  }, [])

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

  return (
    <Box className="app-shell">
      <AppBar position="sticky" elevation={0} color="transparent" className="app-bar">
        <Toolbar sx={{ gap: 2, flexWrap: 'wrap', py: 1 }}>
          <Stack spacing={0.25} sx={{ flex: 1, minWidth: 200 }}>
            <Typography variant="h6" component="h1" sx={{ fontWeight: 700 }}>
              PDF Creator
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Зберіть один PDF з файлів та фото, змініть порядок і експортуйте
            </Typography>
          </Stack>

          <ToggleButtonGroup
            size="small"
            exclusive
            value={fitMode}
            onChange={(_, value: FitMode | null) => {
              if (value) setFitMode(value)
            }}
            aria-label="Режим розміру сторінки"
          >
            <ToggleButton value="a4-fit">
              <AspectRatioIcon sx={{ mr: 0.75, fontSize: 18 }} />
              A4 (підігнати)
            </ToggleButton>
            <ToggleButton value="original">Оригінальний розмір</ToggleButton>
          </ToggleButtonGroup>

          <Button
            variant="outlined"
            color="inherit"
            startIcon={<ClearAllIcon />}
            disabled={pages.length === 0 || exporting}
            onClick={handleClear}
          >
            Очистити
          </Button>

          <Button
            variant="contained"
            startIcon={<DownloadIcon />}
            disabled={pages.length === 0 || exporting}
            onClick={handleExport}
          >
            {exporting ? 'Експорт…' : 'Експорт PDF'}
          </Button>
        </Toolbar>
      </AppBar>

      <Container maxWidth="xl" sx={{ py: 3 }}>
        <Stack spacing={3}>
          <FileUpload
            onFilesSelected={handleFilesSelected}
            loading={loading}
            progress={loadProgress}
          />

          <Stack
            direction="row"
            sx={{ justifyContent: 'space-between', alignItems: 'center' }}
          >
            <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
              Редактор документа
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {pages.length > 0
                ? `${pages.length} сторінок — змінюйте порядок у перегляді або мініатюрах`
                : 'Завантажте файли для початку роботи'}
            </Typography>
          </Stack>

          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', lg: 'minmax(0, 1fr) 320px' },
              gap: 3,
              alignItems: 'start',
            }}
          >
            <DocumentPreview
              pages={pages}
              fitMode={fitMode}
              onReorder={handleReorder}
              onRemove={handleRemove}
            />

            <Box sx={{ minWidth: 0 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1.5 }}>
                Мініатюри
              </Typography>
              <PageList pages={pages} onReorder={handleReorder} onRemove={handleRemove} />
            </Box>
          </Box>
        </Stack>
      </Container>

      <Snackbar
        open={Boolean(error)}
        autoHideDuration={6000}
        onClose={() => setError(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity="error" onClose={() => setError(null)} variant="filled">
          {error}
        </Alert>
      </Snackbar>

      <Snackbar
        open={Boolean(success)}
        autoHideDuration={3000}
        onClose={() => setSuccess(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity="success" onClose={() => setSuccess(null)} variant="filled">
          {success}
        </Alert>
      </Snackbar>
    </Box>
  )
}
