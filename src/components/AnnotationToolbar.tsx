import CreateIcon from '@mui/icons-material/Create'
import DeleteOutlineOutlinedIcon from '@mui/icons-material/DeleteOutlineOutlined'
import DeleteSweepIcon from '@mui/icons-material/DeleteSweep'
import PanToolAltIcon from '@mui/icons-material/PanToolAlt'
import TextFieldsIcon from '@mui/icons-material/TextFields'
import {
  Box,
  IconButton,
  MenuItem,
  Paper,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
} from '@mui/material'
import type { AnnotationTool, TextStyle } from '../types'
import { DEFAULT_PEN, DEFAULT_TEXT_STYLE } from '../types'

const FONT_SIZES = [12, 14, 16, 18, 24, 32, 40]

const COLOR_SWATCHES = [
  '#000000',
  '#ffffff',
  '#d32f2f',
  '#1976d2',
  '#2e7d32',
  '#ed6c02',
  '#9c27b0',
]

interface AnnotationToolbarProps {
  tool: AnnotationTool
  onToolChange: (tool: AnnotationTool) => void
  textStyle: TextStyle
  onTextStyleChange: (style: TextStyle) => void
  selectedTextContent: string
  onSelectedTextContentChange: (content: string) => void
  penColor: string
  penWidth: number
  onPenColorChange: (color: string) => void
  onPenWidthChange: (width: number) => void
  selectedPageIndex: number | null
  hasActiveText: boolean
  onDeleteActiveText: () => void
  onClearDrawing: () => void
  disabled?: boolean
}

function ColorSwatches({
  value,
  onChange,
  label,
}: {
  value: string
  onChange: (color: string) => void
  label: string
}) {
  return (
    <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
      <Typography variant="caption" color="text.secondary" sx={{ minWidth: 42 }}>
        {label}
      </Typography>
      {COLOR_SWATCHES.map((color) => (
        <Box
          key={color}
          onClick={() => onChange(color)}
          sx={{
            width: 24,
            height: 24,
            borderRadius: '50%',
            bgcolor: color,
            border: '2px solid',
            borderColor: value === color ? 'primary.main' : 'rgba(0,0,0,0.15)',
            cursor: 'pointer',
            boxShadow: value === color ? '0 0 0 2px rgba(214, 215, 133, 0.35)' : 'none',
          }}
        />
      ))}
      <Box
        component="input"
        type="color"
        value={value}
        onChange={(event: React.ChangeEvent<HTMLInputElement>) => onChange(event.target.value)}
        aria-label={`${label} custom`}
        sx={{
          width: 36,
          height: 28,
          p: 0,
          border: '1px solid rgba(0,0,0,0.15)',
          borderRadius: 1,
          cursor: 'pointer',
          bgcolor: 'transparent',
        }}
      />
    </Stack>
  )
}

export default function AnnotationToolbar({
  tool,
  onToolChange,
  textStyle,
  onTextStyleChange,
  selectedTextContent,
  onSelectedTextContentChange,
  penColor,
  penWidth,
  onPenColorChange,
  onPenWidthChange,
  selectedPageIndex,
  hasActiveText,
  onDeleteActiveText,
  onClearDrawing,
  disabled = false,
}: AnnotationToolbarProps) {
  const pageLabel =
    selectedPageIndex === null ? 'Оберіть сторінку' : `Сторінка ${selectedPageIndex + 1}`

  const showTextControls = tool === 'text' || (tool === 'select' && hasActiveText)

  return (
    <Paper
      variant="outlined"
      sx={{
        p: 1.5,
        borderColor: 'rgba(214, 215, 133, 0.22)',
        bgcolor: 'rgba(0,0,0,0.18)',
      }}
    >
      <Stack spacing={1.5}>
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={1.5}
          sx={{ alignItems: { sm: 'center' }, justifyContent: 'space-between' }}
        >
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
            <ToggleButtonGroup
              exclusive
              size="small"
              value={tool}
              onChange={(_, value: AnnotationTool | null) => {
                if (value) onToolChange(value)
              }}
              disabled={disabled}
            >
              <ToggleButton value="select" aria-label="Вибір">
                <Tooltip title="Вибір / перетягування">
                  <PanToolAltIcon fontSize="small" />
                </Tooltip>
              </ToggleButton>
              <ToggleButton value="text" aria-label="Текст">
                <Tooltip title="Текст на сторінці">
                  <TextFieldsIcon fontSize="small" />
                </Tooltip>
              </ToggleButton>
              <ToggleButton value="pen" aria-label="Олівець">
                <Tooltip title="Олівець / рукопис">
                  <CreateIcon fontSize="small" />
                </Tooltip>
              </ToggleButton>
            </ToggleButtonGroup>
            <Typography variant="caption" color="text.secondary">
              {pageLabel}
            </Typography>
          </Stack>

          {hasActiveText && (tool === 'text' || tool === 'select') && (
            <Tooltip title="Видалити виділений текст (Delete)">
              <span>
                <IconButton
                  size="small"
                  onClick={onDeleteActiveText}
                  disabled={disabled}
                  aria-label="Видалити текст"
                >
                  <DeleteOutlineOutlinedIcon fontSize="small" />
                </IconButton>
              </span>
            </Tooltip>
          )}

          {tool === 'pen' && (
            <Tooltip title="Очистити малюнок на сторінці">
              <span>
                <IconButton
                  size="small"
                  onClick={onClearDrawing}
                  disabled={disabled || selectedPageIndex === null}
                  aria-label="Очистити малюнок"
                >
                  <DeleteSweepIcon fontSize="small" />
                </IconButton>
              </span>
            </Tooltip>
          )}
        </Stack>

        {showTextControls && (
          <Stack spacing={1.25}>
            <Typography variant="caption" color="text.secondary">
              {hasActiveText
                ? 'Редагуйте виділений текст. Delete — видалити блок. Перетягніть за ≡ зверху.'
                : 'Клікніть на сторінку для нового тексту. Перетягніть рамку за смужку ≡'}
            </Typography>

            {hasActiveText && (
              <TextField
                size="small"
                fullWidth
                label="Текст"
                placeholder="Введіть або змініть текст…"
                value={selectedTextContent}
                onChange={(event) => onSelectedTextContentChange(event.target.value)}
                disabled={disabled}
              />
            )}

            <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5}>
              <TextField
                select
                size="small"
                label="Розмір шрифту"
                value={textStyle.fontSize}
                onChange={(event) =>
                  onTextStyleChange({
                    ...textStyle,
                    fontSize: Number(event.target.value),
                  })
                }
                disabled={disabled || (hasActiveText ? false : selectedPageIndex === null)}
                sx={{ minWidth: 140 }}
              >
                {FONT_SIZES.map((size) => (
                  <MenuItem key={size} value={size}>
                    {size}px
                  </MenuItem>
                ))}
              </TextField>
              <ColorSwatches
                label="Колір"
                value={textStyle.color}
                onChange={(color) => onTextStyleChange({ ...textStyle, color })}
              />
            </Stack>
          </Stack>
        )}

        {tool === 'pen' && (
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5}>
            <TextField
              select
              size="small"
              label="Товщина"
              value={penWidth}
              onChange={(event) => onPenWidthChange(Number(event.target.value))}
              disabled={disabled}
              sx={{ minWidth: 120 }}
            >
              {[2, 3, 5, 8, 12].map((width) => (
                <MenuItem key={width} value={width}>
                  {width}px
                </MenuItem>
              ))}
            </TextField>
            <ColorSwatches
              label="Колір"
              value={penColor}
              onChange={onPenColorChange}
            />
          </Stack>
        )}
      </Stack>
    </Paper>
  )
}

export { DEFAULT_PEN, DEFAULT_TEXT_STYLE }
