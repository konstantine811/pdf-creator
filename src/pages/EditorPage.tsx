import { Box, Stack, Typography } from '@mui/material'
import { useCallback, useEffect, useMemo, useState } from 'react'
import AnnotationToolbar, {
  DEFAULT_PEN,
  DEFAULT_TEXT_STYLE,
} from '../components/AnnotationToolbar'
import DocumentPreview from '../components/DocumentPreview'
import FileUpload from '../components/FileUpload'
import PageList from '../components/PageList'
import { usePages } from '../context/PagesContext'
import type {
  AnnotationTool,
  DrawStroke,
  PageTextAnnotation,
  TextStyle,
} from '../types'

export default function EditorPage() {
  const {
    pages,
    fitMode,
    loading,
    loadProgress,
    handleFilesSelected,
    handleReorder,
    handleRemove,
    rotatePage,
    updatePageAnnotations,
  } = usePages()

  const [tool, setTool] = useState<AnnotationTool>('select')
  const [selectedPageId, setSelectedPageId] = useState<string | null>(null)
  const [activeTextId, setActiveTextId] = useState<string | null>(null)
  const [editingTextId, setEditingTextId] = useState<string | null>(null)
  const [textStyle, setTextStyle] = useState<TextStyle>(DEFAULT_TEXT_STYLE)
  const [penColor, setPenColor] = useState(DEFAULT_PEN.color)
  const [penWidth, setPenWidth] = useState(DEFAULT_PEN.width)

  const selectedPageIndex = selectedPageId
    ? pages.findIndex((page) => page.id === selectedPageId)
    : null

  const selectedPage = selectedPageId
    ? pages.find((page) => page.id === selectedPageId)
    : null

  const activeAnnotation = useMemo(
    () => selectedPage?.textAnnotations?.find((item) => item.id === activeTextId) ?? null,
    [activeTextId, selectedPage?.textAnnotations],
  )

  useEffect(() => {
    if (pages.length === 0) {
      setSelectedPageId(null)
      setActiveTextId(null)
      setEditingTextId(null)
      return
    }
    if (!selectedPageId || !pages.some((page) => page.id === selectedPageId)) {
      setSelectedPageId(pages[0].id)
      setActiveTextId(null)
      setEditingTextId(null)
    }
  }, [pages, selectedPageId])

  useEffect(() => {
    if (!activeTextId) return
    const exists = selectedPage?.textAnnotations?.some((item) => item.id === activeTextId)
    if (!exists) {
      setActiveTextId(null)
      setEditingTextId(null)
    }
  }, [activeTextId, selectedPage?.textAnnotations])

  useEffect(() => {
    if (activeAnnotation) {
      setTextStyle({
        fontSize: activeAnnotation.fontSize,
        color: activeAnnotation.color,
      })
    }
  }, [activeAnnotation?.id, activeAnnotation?.fontSize, activeAnnotation?.color])

  const updateActiveAnnotation = useCallback(
    (patch: Partial<PageTextAnnotation>) => {
      if (!selectedPageId || !activeTextId) return
      const annotations = selectedPage?.textAnnotations ?? []
      updatePageAnnotations(selectedPageId, {
        textAnnotations: annotations.map((item) =>
          item.id === activeTextId ? { ...item, ...patch } : item,
        ),
      })
    },
    [activeTextId, selectedPage?.textAnnotations, selectedPageId, updatePageAnnotations],
  )

  const handleTextStyleChange = useCallback(
    (next: TextStyle) => {
      setTextStyle(next)
      if (activeTextId) {
        updateActiveAnnotation({ fontSize: next.fontSize, color: next.color })
      }
    },
    [activeTextId, updateActiveAnnotation],
  )

  const handleTextContentChange = useCallback(
    (content: string) => {
      if (activeTextId) {
        updateActiveAnnotation({ content })
      }
    },
    [activeTextId, updateActiveAnnotation],
  )

  const handleActiveTextChange = useCallback((id: string | null) => {
    setActiveTextId(id)
    if (!id) setEditingTextId(null)
  }, [])

  const handleUpdateStrokes = useCallback(
    (pageId: string, strokes: DrawStroke[]) => {
      updatePageAnnotations(pageId, { drawStrokes: strokes })
    },
    [updatePageAnnotations],
  )

  const handleUpdateTextAnnotations = useCallback(
    (pageId: string, annotations: PageTextAnnotation[]) => {
      updatePageAnnotations(pageId, { textAnnotations: annotations })
    },
    [updatePageAnnotations],
  )

  const handleClearDrawing = useCallback(() => {
    if (!selectedPageId) return
    updatePageAnnotations(selectedPageId, { drawStrokes: [] })
  }, [selectedPageId, updatePageAnnotations])

  const handleDeleteActiveText = useCallback(() => {
    if (!selectedPageId || !activeTextId) return
    const annotations = (selectedPage?.textAnnotations ?? []).filter(
      (item) => item.id !== activeTextId,
    )
    updatePageAnnotations(selectedPageId, { textAnnotations: annotations })
    setActiveTextId(null)
    setEditingTextId(null)
  }, [activeTextId, selectedPage?.textAnnotations, selectedPageId, updatePageAnnotations])

  const handleSelectPage = useCallback((id: string) => {
    setSelectedPageId(id)
    setActiveTextId(null)
    setEditingTextId(null)
  }, [])

  const handleDeselectText = useCallback(() => {
    setActiveTextId(null)
    setEditingTextId(null)
  }, [])

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Delete' && event.key !== 'Backspace') return
      if (!activeTextId) return

      const target = event.target as HTMLElement
      const tag = target.tagName
      if (tag === 'TEXTAREA' || tag === 'INPUT' || target.isContentEditable) {
        return
      }

      event.preventDefault()
      handleDeleteActiveText()
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [activeTextId, handleDeleteActiveText])

  return (
    <Stack spacing={3}>
      <FileUpload
        onFilesSelected={(files) => void handleFilesSelected(files)}
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
            ? `${pages.length} сторінок — додайте текст або малюнок перед експортом`
            : 'Завантажте файли або додайте скани для початку роботи'}
        </Typography>
      </Stack>

      {pages.length > 0 && (
        <AnnotationToolbar
          tool={tool}
          onToolChange={setTool}
          textStyle={textStyle}
          onTextStyleChange={handleTextStyleChange}
          selectedTextContent={activeAnnotation?.content ?? ''}
          onSelectedTextContentChange={handleTextContentChange}
          penColor={penColor}
          penWidth={penWidth}
          onPenColorChange={setPenColor}
          onPenWidthChange={setPenWidth}
          selectedPageIndex={
            selectedPageIndex !== null && selectedPageIndex >= 0 ? selectedPageIndex : null
          }
          hasActiveText={Boolean(activeTextId)}
          onDeleteActiveText={handleDeleteActiveText}
          onClearDrawing={handleClearDrawing}
        />
      )}

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
          tool={tool}
          selectedPageId={selectedPageId}
          penColor={penColor}
          penWidth={penWidth}
          textStyle={textStyle}
          activeTextId={activeTextId}
          editingTextId={editingTextId}
          onReorder={handleReorder}
          onRemove={handleRemove}
          onRotatePage={rotatePage}
          onSelectPage={handleSelectPage}
          onActiveTextChange={handleActiveTextChange}
          onEditingTextChange={setEditingTextId}
          onDeselectText={handleDeselectText}
          onUpdateStrokes={handleUpdateStrokes}
          onUpdateTextAnnotations={handleUpdateTextAnnotations}
        />

        <Box sx={{ minWidth: 0 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1.5 }}>
            Мініатюри
          </Typography>
          <PageList pages={pages} onReorder={handleReorder} onRemove={handleRemove} />
        </Box>
      </Box>
    </Stack>
  )
}
