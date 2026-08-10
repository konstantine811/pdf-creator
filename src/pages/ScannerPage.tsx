import { Suspense, lazy } from 'react'
import { CircularProgress, Stack, Typography } from '@mui/material'

const LazyDocumentScanner = lazy(() => import('../components/scanner/DocumentScanner'))

function ScannerFallback() {
  return (
    <Stack sx={{ alignItems: 'center', py: 6 }}>
      <CircularProgress size={32} />
    </Stack>
  )
}

export default function ScannerPage() {
  return (
    <Stack spacing={2}>
      <Stack spacing={0.5}>
        <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
          Сканування документів
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Скани зберігаються локально на пристрої. Після підтвердження їх можна одразу
          додати до документа або об&apos;єднати з фото пізніше в редакторі.
        </Typography>
      </Stack>
      <Suspense fallback={<ScannerFallback />}>
        <LazyDocumentScanner />
      </Suspense>
    </Stack>
  )
}
