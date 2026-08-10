import { useCallback, useEffect, useRef } from 'react'
import DragIndicatorIcon from '@mui/icons-material/DragIndicator'
import type {
  AnnotationTool,
  DrawPoint,
  DrawStroke,
  PageItem,
  PageTextAnnotation,
  TextStyle,
} from '../types'
import { drawStrokes } from '../utils/pageCompositor'

interface PageAnnotationLayerProps {
  page: PageItem
  tool: AnnotationTool
  selected: boolean
  penColor: string
  penWidth: number
  textStyle: TextStyle
  activeTextId: string | null
  editingTextId: string | null
  onActiveTextChange: (id: string | null) => void
  onEditingTextChange: (id: string | null) => void
  onDeselectText: () => void
  onUpdateStrokes: (strokes: DrawStroke[]) => void
  onUpdateTextAnnotations: (annotations: PageTextAnnotation[]) => void
}

interface TextDragState {
  id: string
  startX: number
  startY: number
  originX: number
  originY: number
}

function pointerToNormalized(
  event: React.PointerEvent | React.MouseEvent,
  element: HTMLElement,
): DrawPoint | null {
  const rect = element.getBoundingClientRect()
  if (rect.width <= 0 || rect.height <= 0) return null

  const x = (event.clientX - rect.left) / rect.width
  const y = (event.clientY - rect.top) / rect.height

  if (x < 0 || x > 1 || y < 0 || y > 1) return null
  return { x, y }
}

function clampPosition(x: number, y: number): DrawPoint {
  return {
    x: Math.max(0.01, Math.min(0.92, x)),
    y: Math.max(0.01, Math.min(0.92, y)),
  }
}

export default function PageAnnotationLayer({
  page,
  tool,
  selected,
  penColor,
  penWidth,
  textStyle,
  activeTextId,
  editingTextId,
  onActiveTextChange,
  onEditingTextChange,
  onDeselectText,
  onUpdateStrokes,
  onUpdateTextAnnotations,
}: PageAnnotationLayerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const layerRef = useRef<HTMLDivElement>(null)
  const drawingRef = useRef(false)
  const draggingTextRef = useRef<TextDragState | null>(null)
  const currentStrokeRef = useRef<DrawStroke | null>(null)
  const strokesRef = useRef<DrawStroke[]>(page.drawStrokes ?? [])
  const textAnnotations = page.textAnnotations ?? []

  const canEditText = selected && (tool === 'text' || tool === 'select')

  useEffect(() => {
    strokesRef.current = page.drawStrokes ?? []
  }, [page.drawStrokes])

  const paint = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    if (rect.width <= 0 || rect.height <= 0) return

    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    canvas.width = Math.max(1, Math.round(rect.width * dpr))
    canvas.height = Math.max(1, Math.round(rect.height * dpr))
    canvas.style.width = `${rect.width}px`
    canvas.style.height = `${rect.height}px`

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, rect.width, rect.height)

    const strokes = [...strokesRef.current]
    if (currentStrokeRef.current) {
      strokes.push(currentStrokeRef.current)
    }

    drawStrokes(ctx, strokes, rect.width, rect.height)
  }, [])

  useEffect(() => {
    paint()
  }, [paint, page.drawStrokes, penColor, penWidth])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return undefined

    const observer = new ResizeObserver(() => paint())
    observer.observe(canvas.parentElement ?? canvas)
    return () => observer.disconnect()
  }, [paint])

  const updateAnnotations = useCallback(
    (next: PageTextAnnotation[]) => {
      onUpdateTextAnnotations(next)
    },
    [onUpdateTextAnnotations],
  )

  const updateAnnotation = useCallback(
    (id: string, patch: Partial<PageTextAnnotation>) => {
      updateAnnotations(
        textAnnotations.map((item) => (item.id === id ? { ...item, ...patch } : item)),
      )
    },
    [textAnnotations, updateAnnotations],
  )

  const handleLayerClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!selected || !layerRef.current) return
    if ((event.target as HTMLElement).closest('[data-text-annotation]')) return

    if (tool === 'text') {
      const point = pointerToNormalized(event, layerRef.current)
      if (!point) return

      const position = clampPosition(point.x, point.y)

      const newAnnotation: PageTextAnnotation = {
        id: crypto.randomUUID(),
        content: '',
        x: position.x,
        y: position.y,
        fontSize: textStyle.fontSize,
        color: textStyle.color,
      }

      updateAnnotations([...textAnnotations, newAnnotation])
      onActiveTextChange(newAnnotation.id)
      onEditingTextChange(newAnnotation.id)
      return
    }

    if (tool === 'select' && activeTextId) {
      onDeselectText()
    }
  }

  const handleTextDragStart = (
    event: React.PointerEvent<HTMLElement>,
    annotation: PageTextAnnotation,
  ) => {
    if (!canEditText) return

    event.stopPropagation()
    event.preventDefault()

    draggingTextRef.current = {
      id: annotation.id,
      startX: event.clientX,
      startY: event.clientY,
      originX: annotation.x,
      originY: annotation.y,
    }
    onActiveTextChange(annotation.id)
    onEditingTextChange(null)
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  const handleTextDragMove = (event: React.PointerEvent<HTMLElement>) => {
    const drag = draggingTextRef.current
    const layer = layerRef.current
    if (!drag || !layer) return

    const rect = layer.getBoundingClientRect()
    const dx = (event.clientX - drag.startX) / rect.width
    const dy = (event.clientY - drag.startY) / rect.height
    const next = clampPosition(drag.originX + dx, drag.originY + dy)

    updateAnnotation(drag.id, next)
  }

  const handleTextDragEnd = (event: React.PointerEvent<HTMLElement>) => {
    if (!draggingTextRef.current) return
    draggingTextRef.current = null
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
  }

  const handlePointerDown = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (tool !== 'pen' || !selected) return

    const point = pointerToNormalized(event, event.currentTarget)
    if (!point) return

    drawingRef.current = true
    currentStrokeRef.current = {
      id: crypto.randomUUID(),
      points: [point],
      color: penColor,
      width: penWidth,
    }
    event.currentTarget.setPointerCapture(event.pointerId)
    paint()
  }

  const handlePointerMove = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current || !currentStrokeRef.current) return

    const point = pointerToNormalized(event, event.currentTarget)
    if (!point) return

    const points = currentStrokeRef.current.points
    const last = points[points.length - 1]
    if (last && Math.hypot(point.x - last.x, point.y - last.y) < 0.002) return

    currentStrokeRef.current = {
      ...currentStrokeRef.current,
      points: [...points, point],
    }
    paint()
  }

  const finishStroke = () => {
    if (!drawingRef.current || !currentStrokeRef.current) return

    drawingRef.current = false
    const stroke = currentStrokeRef.current
    currentStrokeRef.current = null

    if (stroke.points.length >= 2) {
      const next = [...strokesRef.current, stroke]
      strokesRef.current = next
      onUpdateStrokes(next)
    }

    paint()
  }

  return (
    <div
      ref={layerRef}
      onClick={handleLayerClick}
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: 2,
        cursor: tool === 'text' && selected ? 'text' : 'default',
      }}
    >
      {textAnnotations.map((annotation) => {
        const isActive = activeTextId === annotation.id
        const isEditing = editingTextId === annotation.id
        const showHighlight = canEditText && isActive

        return (
          <div
            key={annotation.id}
            data-text-annotation
            onClick={(event) => {
              event.stopPropagation()
              if (!canEditText) return
              onActiveTextChange(annotation.id)
              if (tool === 'text') {
                onEditingTextChange(annotation.id)
              }
            }}
            onDoubleClick={(event) => {
              event.stopPropagation()
              if (!canEditText) return
              onActiveTextChange(annotation.id)
              onEditingTextChange(annotation.id)
            }}
            style={{
              position: 'absolute',
              left: `${annotation.x * 100}%`,
              top: `${annotation.y * 100}%`,
              maxWidth: '88%',
              minWidth: isActive ? 140 : undefined,
              zIndex: isActive ? 5 : 4,
              pointerEvents: canEditText ? 'auto' : 'none',
            }}
          >
            <div
              style={{
                border: showHighlight
                  ? '2px solid #d6d785'
                  : '2px solid transparent',
                borderRadius: 6,
                background: isActive ? 'rgba(214, 215, 133, 0.16)' : 'rgba(255,255,255,0.04)',
                overflow: 'hidden',
                boxShadow: isActive ? '0 0 0 1px rgba(214, 215, 133, 0.25)' : 'none',
              }}
            >
              {canEditText && (
                <div
                  onPointerDown={(event) => handleTextDragStart(event, annotation)}
                  onPointerMove={handleTextDragMove}
                  onPointerUp={handleTextDragEnd}
                  onPointerCancel={handleTextDragEnd}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 4,
                    height: 22,
                    cursor: draggingTextRef.current?.id === annotation.id ? 'grabbing' : 'grab',
                    background: 'rgba(214, 215, 133, 0.22)',
                    borderBottom: '1px solid rgba(214, 215, 133, 0.35)',
                    touchAction: 'none',
                    userSelect: 'none',
                  }}
                >
                  <DragIndicatorIcon sx={{ fontSize: 16, color: 'rgba(0,0,0,0.55)' }} />
                </div>
              )}

              <div style={{ padding: '4px 8px' }}>
                {isEditing ? (
                  <textarea
                    autoFocus
                    value={annotation.content}
                    placeholder="Введіть текст…"
                    onChange={(event) =>
                      updateAnnotation(annotation.id, { content: event.target.value })
                    }
                    onBlur={(event) => {
                      const value = event.currentTarget.value
                      window.setTimeout(() => {
                        if (!value.trim()) {
                          updateAnnotations(
                            textAnnotations.filter((item) => item.id !== annotation.id),
                          )
                          onDeselectText()
                          return
                        }
                        onEditingTextChange(null)
                      }, 120)
                    }}
                    style={{
                      width: '100%',
                      minWidth: 120,
                      minHeight: 32,
                      border: 'none',
                      outline: 'none',
                      resize: 'both',
                      background: 'transparent',
                      color: annotation.color,
                      fontSize: annotation.fontSize,
                      fontWeight: 600,
                      fontFamily: 'system-ui, -apple-system, sans-serif',
                      lineHeight: 1.3,
                    }}
                  />
                ) : (
                  annotation.content.trim() && (
                    <span
                      style={{
                        color: annotation.color,
                        fontSize: annotation.fontSize,
                        fontWeight: 600,
                        fontFamily: 'system-ui, -apple-system, sans-serif',
                        lineHeight: 1.3,
                        whiteSpace: 'pre-wrap',
                        wordBreak: 'break-word',
                      }}
                    >
                      {annotation.content}
                    </span>
                  )
                )}
              </div>
            </div>
          </div>
        )
      })}

      <canvas
        ref={canvasRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={finishStroke}
        onPointerCancel={finishStroke}
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          zIndex: 3,
          pointerEvents: tool === 'pen' && selected ? 'auto' : 'none',
          cursor: tool === 'pen' && selected ? 'crosshair' : 'default',
          touchAction: tool === 'pen' && selected ? 'none' : 'auto',
        }}
      />
    </div>
  )
}
