import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import DeleteOutlineOutlinedIcon from '@mui/icons-material/DeleteOutlineOutlined'
import DragIndicatorIcon from '@mui/icons-material/DragIndicator'
import {
  Box,
  Chip,
  CircularProgress,
  IconButton,
  Paper,
  Stack,
  Typography,
} from '@mui/material'
import { useEffect, useRef, useState } from 'react'
import type { FitMode, PageItem } from '../types'
import { renderPagePreview } from '../utils/pageRenderer'
import { A4 } from '../utils/pageSizes'

const PREVIEW_MAX_WIDTH = 820

function getPageAspectRatio(page: PageItem, fitMode: FitMode): number {
  if (fitMode === 'a4-fit') {
    return A4.width / A4.height
  }
  if (page.width && page.height) {
    return page.width / page.height
  }
  return A4.width / A4.height
}

interface PreviewPageContentProps {
  page: PageItem
  fitMode: FitMode
  containerWidth: number
}

function PreviewPageContent({ page, fitMode, containerWidth }: PreviewPageContentProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setLoading(true)

    const contentWidth =
      fitMode === 'a4-fit'
        ? containerWidth
        : containerWidth

    renderPagePreview(page, Math.max(480, Math.round(contentWidth)))
      .then((url) => {
        if (!cancelled) {
          setPreviewUrl(url)
          setLoading(false)
        }
      })
      .catch(() => {
        if (!cancelled) {
          setPreviewUrl(page.thumbnailUrl)
          setLoading(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [page, fitMode, containerWidth])

  return (
    <Box
      sx={{
        position: 'relative',
        width: '100%',
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: '#fff',
        overflow: 'hidden',
      }}
    >
      {loading && (
        <CircularProgress size={28} sx={{ position: 'absolute' }} />
      )}
      {previewUrl && (
        <Box
          component="img"
          src={previewUrl}
          alt={page.label}
          sx={{
            width: '100%',
            height: '100%',
            objectFit: 'contain',
            opacity: loading ? 0 : 1,
            transition: 'opacity 0.2s',
            imageRendering: 'auto',
          }}
        />
      )}
    </Box>
  )
}

interface SortablePreviewPageProps {
  page: PageItem
  index: number
  fitMode: FitMode
  containerWidth: number
  onRemove: (id: string) => void
}

function SortablePreviewPage({
  page,
  index,
  fitMode,
  containerWidth,
  onRemove,
}: SortablePreviewPageProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: page.id })

  const aspectRatio = getPageAspectRatio(page, fitMode)

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.35 : 1,
  }

  return (
    <Box
      ref={setNodeRef}
      style={style}
      sx={{
        maxWidth: PREVIEW_MAX_WIDTH,
        width: '100%',
        mx: 'auto',
        mb: 3,
      }}
    >
      <Paper
        elevation={isDragging ? 0 : 4}
        className="document-page"
        sx={{
          overflow: 'hidden',
          border: '1px solid',
          borderColor: isDragging ? 'primary.main' : 'rgba(0,0,0,0.08)',
          bgcolor: '#fff',
        }}
      >
        <Stack
          direction="row"
          spacing={1}
          sx={{
            px: 1,
            py: 0.75,
            bgcolor: 'rgba(0,0,0,0.04)',
            borderBottom: '1px solid rgba(0,0,0,0.08)',
            alignItems: 'center',
          }}
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
              p: 0.5,
              borderRadius: 1,
              '&:hover': { bgcolor: 'rgba(0,0,0,0.06)' },
            }}
          >
            <DragIndicatorIcon fontSize="small" />
          </Box>
          <Chip size="small" label={`Сторінка ${index + 1}`} />
          <Typography
            variant="caption"
            sx={{
              flex: 1,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              color: 'text.secondary',
            }}
            title={page.label}
          >
            {page.label}
          </Typography>
          <IconButton
            size="small"
            aria-label="Видалити сторінку"
            onClick={() => onRemove(page.id)}
          >
            <DeleteOutlineOutlinedIcon fontSize="small" />
          </IconButton>
        </Stack>

        <Box
          sx={{
            width: '100%',
            aspectRatio: `${aspectRatio}`,
            display: 'flex',
            bgcolor: '#fff',
          }}
        >
          <PreviewPageContent
            page={page}
            fitMode={fitMode}
            containerWidth={containerWidth}
          />
        </Box>
      </Paper>
    </Box>
  )
}

interface DragPreviewProps {
  page: PageItem
  index: number
  fitMode: FitMode
  containerWidth: number
}

function DragPreview({ page, index, fitMode, containerWidth }: DragPreviewProps) {
  const aspectRatio = getPageAspectRatio(page, fitMode)

  return (
    <Paper
      elevation={12}
      className="document-page document-page--dragging"
      sx={{
        maxWidth: PREVIEW_MAX_WIDTH,
        width: containerWidth,
        overflow: 'hidden',
        border: '2px solid',
        borderColor: 'primary.main',
        bgcolor: '#fff',
        cursor: 'grabbing',
      }}
    >
      <Stack
        direction="row"
        spacing={1}
        sx={{
          px: 1,
          py: 0.75,
          bgcolor: 'primary.main',
          color: 'primary.contrastText',
          alignItems: 'center',
        }}
      >
        <DragIndicatorIcon fontSize="small" />
        <Typography variant="caption" sx={{ fontWeight: 600 }}>
          Сторінка {index + 1}
        </Typography>
      </Stack>
      <Box sx={{ width: '100%', aspectRatio: `${aspectRatio}`, bgcolor: '#fff' }}>
        <Box
          component="img"
          src={page.thumbnailUrl}
          alt={page.label}
          sx={{ width: '100%', height: '100%', objectFit: 'contain' }}
        />
      </Box>
    </Paper>
  )
}

interface DocumentPreviewProps {
  pages: PageItem[]
  fitMode: FitMode
  onReorder: (activeId: string, overId: string) => void
  onRemove: (id: string) => void
}

export default function DocumentPreview({
  pages,
  fitMode,
  onReorder,
  onRemove,
}: DocumentPreviewProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [containerWidth, setContainerWidth] = useState(PREVIEW_MAX_WIDTH)
  const [activeId, setActiveId] = useState<string | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  )

  useEffect(() => {
    const element = scrollRef.current
    if (!element) return

    const observer = new ResizeObserver(([entry]) => {
      const width = entry.contentRect.width - 48
      setContainerWidth(Math.min(PREVIEW_MAX_WIDTH, Math.max(280, width)))
    })
    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(String(event.active.id))
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    setActiveId(null)
    if (!over || active.id === over.id) return
    onReorder(String(active.id), String(over.id))
  }

  const activePage = activeId ? pages.find((p) => p.id === activeId) : undefined
  const activeIndex = activePage ? pages.findIndex((p) => p.id === activeId) : -1

  if (pages.length === 0) {
    return (
      <Paper
        className="document-preview-panel document-preview-panel--empty"
        sx={{
          p: 4,
          textAlign: 'center',
          border: '1px dashed',
          borderColor: 'divider',
          bgcolor: 'transparent',
          minHeight: 420,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Typography color="text.secondary">
          Перегляд документа зʼявиться після завантаження файлів
        </Typography>
      </Paper>
    )
  }

  return (
    <Paper className="document-preview-panel" elevation={0}>
      <Stack
        direction="row"
        sx={{
          px: 2,
          py: 1.25,
          borderBottom: '1px solid',
          borderColor: 'divider',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
          Перегляд документа
        </Typography>
        <Typography variant="caption" color="text.secondary">
          Перетягніть сторінки за ручку ≡, щоб змінити порядок
        </Typography>
      </Stack>

      <Box
        ref={scrollRef}
        className="document-preview-scroll"
        sx={{
          height: { xs: '55vh', lg: 'calc(100vh - 220px)' },
          overflowY: 'auto',
          overflowX: 'hidden',
          px: 2,
          py: 3,
        }}
      >
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={pages.map((p) => p.id)}
            strategy={verticalListSortingStrategy}
          >
            {pages.map((page, index) => (
              <SortablePreviewPage
                key={page.id}
                page={page}
                index={index}
                fitMode={fitMode}
                containerWidth={containerWidth}
                onRemove={onRemove}
              />
            ))}
          </SortableContext>

          <DragOverlay dropAnimation={{ duration: 220, easing: 'ease' }}>
            {activePage && activeIndex >= 0 ? (
              <DragPreview
                page={activePage}
                index={activeIndex}
                fitMode={fitMode}
                containerWidth={containerWidth}
              />
            ) : null}
          </DragOverlay>
        </DndContext>
      </Box>
    </Paper>
  )
}
