import AddIcon from '@mui/icons-material/Add'
import DeleteOutlineOutlinedIcon from '@mui/icons-material/DeleteOutlineOutlined'
import {
  Box,
  Button,
  Chip,
  IconButton,
  Paper,
  Stack,
  Typography,
} from '@mui/material'
import type { ScannedPage } from '../../types/scanner'

interface SavedScansListProps {
  scans: ScannedPage[]
  onAddToDocument: (scan: ScannedPage) => void
  onDelete: (id: string) => void
}

export default function SavedScansList({
  scans,
  onAddToDocument,
  onDelete,
}: SavedScansListProps) {
  if (scans.length === 0) {
    return (
      <Paper variant="outlined" sx={{ p: 2.5 }}>
        <Typography variant="body2" color="text.secondary">
          Збережених сканів поки немає. Після підтвердження скан з&apos;явиться тут і його
          можна буде додати до документа пізніше.
        </Typography>
      </Paper>
    )
  }

  return (
    <Stack spacing={1.5}>
      {scans.map((scan) => (
        <Paper key={scan.id} variant="outlined" sx={{ p: 1.5 }}>
          <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
            <Box
              component="img"
              src={URL.createObjectURL(scan.processedBlob)}
              alt={scan.label}
              onLoad={(event) => URL.revokeObjectURL(event.currentTarget.src)}
              sx={{
                width: 72,
                height: 96,
                objectFit: 'cover',
                borderRadius: 1,
                bgcolor: '#222',
              }}
            />
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography variant="body2" sx={{ fontWeight: 600 }} noWrap>
                {scan.label}
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                {new Date(scan.createdAt).toLocaleString('uk-UA')}
              </Typography>
              <Stack direction="row" spacing={0.75} sx={{ mt: 0.75 }}>
                <Chip size="small" label={scan.filter} />
                {scan.addedToPages && (
                  <Chip size="small" color="success" label="У документі" />
                )}
              </Stack>
            </Box>
            <Stack direction="row" spacing={0.5}>
              <Button
                size="small"
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => onAddToDocument(scan)}
              >
                Додати
              </Button>
              <IconButton
                size="small"
                color="error"
                aria-label="Видалити скан"
                onClick={() => onDelete(scan.id)}
              >
                <DeleteOutlineOutlinedIcon fontSize="small" />
              </IconButton>
            </Stack>
          </Stack>
        </Paper>
      ))}
    </Stack>
  )
}
