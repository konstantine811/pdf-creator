import ClearAllIcon from '@mui/icons-material/ClearAll'
import DocumentScannerIcon from '@mui/icons-material/DocumentScanner'
import DownloadIcon from '@mui/icons-material/Download'
import AspectRatioIcon from '@mui/icons-material/AspectRatio'
import EditNoteIcon from '@mui/icons-material/EditNote'
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
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { usePages } from '../../context/PagesContext'
import type { FitMode } from '../../types'
import '../../App.css'

export default function AppLayout() {
  const location = useLocation()
  const isScanner = location.pathname.startsWith('/scanner')
  const {
    pages,
    fitMode,
    exporting,
    error,
    success,
    setFitMode,
    setError,
    setSuccess,
    handleClear,
    handleExport,
  } = usePages()

  return (
    <Box className="app-shell">
      <AppBar position="sticky" elevation={0} color="transparent" className="app-bar">
        <Toolbar sx={{ gap: 2, flexWrap: 'wrap', py: 1 }}>
          <Stack spacing={0.25} sx={{ flex: 1, minWidth: 200 }}>
            <Typography variant="h6" component="h1" sx={{ fontWeight: 700 }}>
              PDF Creator
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Зберіть один PDF з файлів, фото та сканів
            </Typography>
          </Stack>

          <Stack direction="row" spacing={1}>
            <Button
              component={NavLink}
              to="/"
              variant={isScanner ? 'outlined' : 'contained'}
              startIcon={<EditNoteIcon />}
              color={isScanner ? 'inherit' : 'primary'}
            >
              Редактор
            </Button>
            <Button
              component={NavLink}
              to="/scanner"
              variant={isScanner ? 'contained' : 'outlined'}
              startIcon={<DocumentScannerIcon />}
              color={isScanner ? 'primary' : 'inherit'}
            >
              Сканер
            </Button>
          </Stack>

          {!isScanner && (
            <>
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
                onClick={() => void handleExport()}
              >
                {exporting ? 'Експорт…' : 'Експорт PDF'}
              </Button>
            </>
          )}
        </Toolbar>
      </AppBar>

      <Container maxWidth="xl" sx={{ py: 3 }}>
        <Outlet />
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
