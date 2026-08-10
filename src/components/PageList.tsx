import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  rectSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import DeleteOutlineOutlinedIcon from '@mui/icons-material/DeleteOutlineOutlined'
import DragIndicatorIcon from '@mui/icons-material/DragIndicator'
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf'
import ImageIcon from '@mui/icons-material/Image'
import {
  Box,
  Chip,
  IconButton,
  Paper,
  Stack,
  Typography,
} from '@mui/material'
import type { PageItem } from '../types'
import { A4 } from '../utils/pageSizes'

interface PageCardProps {
  page: PageItem
  index: number
  onRemove: (id: string) => void
}

function SortablePageCard({ page, index, onRemove }: PageCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: page.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.85 : 1,
    zIndex: isDragging ? 2 : 1,
  }

  return (
    <Paper
      ref={setNodeRef}
      style={style}
      elevation={isDragging ? 8 : 1}
      sx={{
        overflow: 'hidden',
        border: '1px solid',
        borderColor: isDragging ? 'primary.main' : 'divider',
        bgcolor: 'background.paper',
      }}
    >
      <Box
        sx={{
          position: 'relative',
          aspectRatio: `${A4.width} / ${A4.height}`,
          bgcolor: '#fff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Box
          component="img"
          src={page.thumbnailUrl}
          alt={page.label}
          sx={{
            maxWidth: '100%',
            maxHeight: '100%',
            objectFit: 'contain',
            transform: page.rotation ? `rotate(${page.rotation}deg)` : undefined,
          }}
        />
        <Chip
          size="small"
          label={index + 1}
          sx={{
            position: 'absolute',
            top: 8,
            left: 8,
            fontWeight: 700,
          }}
        />
        <IconButton
          size="small"
          aria-label="Видалити сторінку"
          onClick={() => onRemove(page.id)}
          sx={{
            position: 'absolute',
            top: 4,
            right: 4,
            bgcolor: 'rgba(0,0,0,0.55)',
            color: '#fff',
            '&:hover': { bgcolor: 'error.main' },
          }}
        >
          <DeleteOutlineOutlinedIcon fontSize="small" />
        </IconButton>
      </Box>

      <Stack
        direction="row"
        spacing={1}
        sx={{ px: 1.25, py: 1, minHeight: 48, alignItems: 'center' }}
      >
        <Box
          {...attributes}
          {...listeners}
          sx={{
            display: 'flex',
            alignItems: 'center',
            cursor: isDragging ? 'grabbing' : 'grab',
            color: 'text.secondary',
            touchAction: 'none',
          }}
        >
          <DragIndicatorIcon fontSize="small" />
        </Box>
        {page.type === 'pdf' ? (
          <PictureAsPdfIcon fontSize="small" color="primary" />
        ) : (
          <ImageIcon fontSize="small" color="success" />
        )}
        <Typography
          variant="caption"
          sx={{
            flex: 1,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
          title={page.label}
        >
          {page.label}
        </Typography>
      </Stack>
    </Paper>
  )
}

interface PageListProps {
  pages: PageItem[]
  onReorder: (activeId: string, overId: string) => void
  onRemove: (id: string) => void
}

export default function PageList({ pages, onReorder, onRemove }: PageListProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  )

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return
    onReorder(String(active.id), String(over.id))
  }

  if (pages.length === 0) {
    return (
      <Paper
        sx={{
          p: 4,
          textAlign: 'center',
          border: '1px dashed',
          borderColor: 'divider',
          bgcolor: 'transparent',
        }}
      >
        <Typography color="text.secondary">
          Завантажте PDF або зображення, щоб почати збирати документ
        </Typography>
      </Paper>
    )
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={pages.map((p) => p.id)} strategy={rectSortingStrategy}>
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: {
              xs: '1fr',
              sm: 'repeat(2, 1fr)',
              md: 'repeat(3, 1fr)',
              lg: 'repeat(4, 1fr)',
            },
            gap: 2,
          }}
        >
          {pages.map((page, index) => (
            <SortablePageCard
              key={page.id}
              page={page}
              index={index}
              onRemove={onRemove}
            />
          ))}
        </Box>
      </SortableContext>
    </DndContext>
  )
}
