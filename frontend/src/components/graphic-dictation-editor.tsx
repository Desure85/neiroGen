"use client"

import { useCallback, useRef, useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Undo2, Redo2, Trash2, Save, Download, Upload, ZoomIn, ZoomOut, MoveUp, MoveDown, MoveLeft, MoveRight, Maximize2 } from "lucide-react"
import { apiFetch } from "@/lib/api"

interface Point {
  row: number
  col: number
}

interface Command {
  action: string
  direction?: string
  steps?: number
}

interface GraphicDictationPayload {
  grid: {
    width: number
    height: number
    cell_size_mm: number
  }
  start: Point
  points: Point[]
  commands: Command[]
  instructions?: string[]
}

interface GraphicDictationEditorProps {
  onSave?: (payload: GraphicDictationPayload) => void
  initialPayload?: GraphicDictationPayload
}

// Определяем тип пути между двумя точками
function getPathType(from: Point, to: Point): 'horizontal' | 'vertical' | 'diagonal' | 'staircase' {
  const dx = Math.abs(to.col - from.col)
  const dy = Math.abs(to.row - from.row)
  
  if (dx === 0) return 'vertical'
  if (dy === 0) return 'horizontal'
  if (dx === dy) return 'diagonal' // Чистая диагональ
  return 'staircase' // Кривая диагональ → делаем лесенку
}

// Генерируем промежуточные точки для "лесенки" (когда диагональ не проходит через узлы)
// Делим на 2 прямых отрезка: сначала более длинный отрезок, потом короткий
function generateStaircasePath(from: Point, to: Point): Point[] {
  const path: Point[] = []
  const dx = Math.abs(to.col - from.col)
  const dy = Math.abs(to.row - from.row)
  
  // Если горизонтальное смещение больше - сначала идем горизонтально
  if (dx >= dy) {
    path.push({ row: from.row, col: to.col })
  } else {
    // Иначе сначала вертикально
    path.push({ row: to.row, col: from.col })
  }
  
  // Финальная точка
  path.push(to)
  
  return path
}

export function GraphicDictationEditor({ onSave, initialPayload }: GraphicDictationEditorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [gridWidth, setGridWidth] = useState(initialPayload?.grid.width ?? 16)
  const [gridHeight, setGridHeight] = useState(initialPayload?.grid.height ?? 16)
  const [cellSizeMm, setCellSizeMm] = useState(initialPayload?.grid.cell_size_mm ?? 10)
  const [points, setPoints] = useState<Point[]>(initialPayload?.points ?? [])
  const [commands, setCommands] = useState<Command[]>(initialPayload?.commands ?? [])
  const [allowDiagonals, setAllowDiagonals] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [history, setHistory] = useState<Point[][]>([])
  const [historyIndex, setHistoryIndex] = useState(-1)
  const [hoveredPoint, setHoveredPoint] = useState<Point | null>(null)
  const [showGrid, setShowGrid] = useState(true)
  const [cellSize, setCellSize] = useState(32)
  const [backgroundImage, setBackgroundImage] = useState<HTMLImageElement | null>(null)
  const [imagePosition, setImagePosition] = useState({ x: 0, y: 0 })
  const [imageScale, setImageScale] = useState(1)
  const [imageOpacity, setImageOpacity] = useState(0.5)
  const [startPoint, setStartPoint] = useState<Point>(initialPayload?.start ?? { row: 0, col: 0 })
  const [isDraggingStart, setIsDraggingStart] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const CANVAS_PADDING = 40

  useEffect(() => {
    drawCanvas()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [points, gridWidth, gridHeight, hoveredPoint, showGrid, cellSize, backgroundImage, imagePosition, imageScale, imageOpacity, startPoint, isDraggingStart])

  // Recenter image when grid size or scale changes
  useEffect(() => {
    if (backgroundImage) {
      centerImage()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gridWidth, gridHeight, cellSize, imageScale])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+Z / Cmd+Z - Undo
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault()
        handleUndo()
      }
      // Ctrl+Shift+Z / Cmd+Shift+Z or Ctrl+Y / Cmd+Y - Redo
      if (((e.ctrlKey || e.metaKey) && e.key === 'z' && e.shiftKey) || ((e.ctrlKey || e.metaKey) && e.key === 'y')) {
        e.preventDefault()
        handleRedo()
      }
      // Delete / Backspace - Clear (with confirmation)
      if ((e.key === 'Delete' || e.key === 'Backspace') && points.length > 0) {
        if (confirm('Очистить все точки?')) {
          handleClear()
        }
      }
      // Ctrl+S / Cmd+S - Save
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault()
        handleSave()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [historyIndex, history, points])

  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const width = gridWidth * cellSize + CANVAS_PADDING * 2
    const height = gridHeight * cellSize + CANVAS_PADDING * 2

    canvas.width = width
    canvas.height = height

    // Clear
    ctx.fillStyle = "#ffffff"
    ctx.fillRect(0, 0, width, height)

    // Draw background image if present
    if (backgroundImage) {
      ctx.save()
      ctx.globalAlpha = imageOpacity
      const imgWidth = backgroundImage.width * imageScale
      const imgHeight = backgroundImage.height * imageScale
      ctx.drawImage(
        backgroundImage,
        CANVAS_PADDING + imagePosition.x,
        CANVAS_PADDING + imagePosition.y,
        imgWidth,
        imgHeight
      )
      ctx.restore()
    }

    // Draw grid
    if (showGrid) {
      ctx.strokeStyle = "#e5e7eb"
      ctx.lineWidth = 1
      for (let i = 0; i <= gridWidth; i++) {
        const x = CANVAS_PADDING + i * cellSize
        ctx.beginPath()
        ctx.moveTo(x, CANVAS_PADDING)
        ctx.lineTo(x, CANVAS_PADDING + gridHeight * cellSize)
        ctx.stroke()
      }
      for (let i = 0; i <= gridHeight; i++) {
        const y = CANVAS_PADDING + i * cellSize
        ctx.beginPath()
        ctx.moveTo(CANVAS_PADDING, y)
        ctx.lineTo(CANVAS_PADDING + gridWidth * cellSize, y)
        ctx.stroke()
      }
    }

    // Draw grid points (intersections)
    ctx.fillStyle = "#9ca3af"
    for (let row = 0; row <= gridHeight; row++) {
      for (let col = 0; col <= gridWidth; col++) {
        const x = CANVAS_PADDING + col * cellSize
        const y = CANVAS_PADDING + row * cellSize
        ctx.beginPath()
        ctx.arc(x, y, 2, 0, Math.PI * 2)
        ctx.fill()
      }
    }

    // Draw path lines
    if (points.length > 1) {
      ctx.strokeStyle = "#3b82f6"
      ctx.lineWidth = 3
      ctx.lineCap = "round"
      ctx.lineJoin = "round"
      ctx.beginPath()
      const firstPoint = points[0]
      ctx.moveTo(
        CANVAS_PADDING + firstPoint.col * cellSize,
        CANVAS_PADDING + firstPoint.row * cellSize
      )
      for (let i = 1; i < points.length; i++) {
        const point = points[i]
        ctx.lineTo(
          CANVAS_PADDING + point.col * cellSize,
          CANVAS_PADDING + point.row * cellSize
        )
      }
      ctx.stroke()
    }

    // Draw start point marker (always visible)
    const startX = CANVAS_PADDING + startPoint.col * cellSize
    const startY = CANVAS_PADDING + startPoint.row * cellSize
    ctx.fillStyle = isDraggingStart ? "#f59e0b" : "#ef4444"
    ctx.beginPath()
    ctx.arc(startX, startY, 8, 0, Math.PI * 2)
    ctx.fill()
    ctx.strokeStyle = "#ffffff"
    ctx.lineWidth = 2
    ctx.stroke()
    // Draw "S" for start
    ctx.fillStyle = "#ffffff"
    ctx.font = "bold 10px sans-serif"
    ctx.textAlign = "center"
    ctx.textBaseline = "middle"
    ctx.fillText("S", startX, startY)

    // Draw points
    points.forEach((point, index) => {
      const x = CANVAS_PADDING + point.col * cellSize
      const y = CANVAS_PADDING + point.row * cellSize

      if (index === 0) {
        // First point - green (different from start)
        ctx.fillStyle = "#10b981"
        ctx.beginPath()
        ctx.arc(x, y, 6, 0, Math.PI * 2)
        ctx.fill()
        ctx.strokeStyle = "#ffffff"
        ctx.lineWidth = 2
        ctx.stroke()
      } else {
        // Regular point - blue
        ctx.fillStyle = "#3b82f6"
        ctx.beginPath()
        ctx.arc(x, y, 5, 0, Math.PI * 2)
        ctx.fill()
      }

      // Point number
      ctx.fillStyle = "#ffffff"
      ctx.font = "bold 10px sans-serif"
      ctx.textAlign = "center"
      ctx.textBaseline = "middle"
      ctx.fillText(String(index), x, y)
    })

    // Draw preview line from last point to hovered point
    if (hoveredPoint && points.length > 0 && !isDraggingStart) {
      const lastPoint = points[points.length - 1]
      const pathType = getPathType(lastPoint, hoveredPoint)
      
      // Генерируем путь (с лесенкой если нужно)
      let previewPath: Point[] = []
      if (pathType === 'staircase') {
        previewPath = generateStaircasePath(lastPoint, hoveredPoint)
      } else {
        previewPath = [hoveredPoint]
      }
      
      // Рисуем превью пунктиром
      ctx.strokeStyle = pathType === 'staircase' ? "#f59e0b" : "#10b981"
      ctx.lineWidth = 2
      ctx.setLineDash([5, 5]) // Пунктир
      ctx.lineCap = "round"
      ctx.lineJoin = "round"
      ctx.beginPath()
      ctx.moveTo(
        CANVAS_PADDING + lastPoint.col * cellSize,
        CANVAS_PADDING + lastPoint.row * cellSize
      )
      
      for (const point of previewPath) {
        ctx.lineTo(
          CANVAS_PADDING + point.col * cellSize,
          CANVAS_PADDING + point.row * cellSize
        )
      }
      ctx.stroke()
      ctx.setLineDash([]) // Сброс пунктира
      
      // Рисуем промежуточные точки лесенки
      if (pathType === 'staircase') {
        ctx.fillStyle = "rgba(245, 158, 11, 0.5)" // Полупрозрачный оранжевый
        previewPath.forEach((point, idx) => {
          if (idx < previewPath.length - 1) { // Не рисуем последнюю (она будет как hovered)
            const x = CANVAS_PADDING + point.col * cellSize
            const y = CANVAS_PADDING + point.row * cellSize
            ctx.beginPath()
            ctx.arc(x, y, 3, 0, Math.PI * 2)
            ctx.fill()
          }
        })
      }
    }

    // Draw hovered point
    if (hoveredPoint) {
      const x = CANVAS_PADDING + hoveredPoint.col * cellSize
      const y = CANVAS_PADDING + hoveredPoint.row * cellSize
      
      // Цвет зависит от типа пути
      if (points.length > 0 && !isDraggingStart) {
        const lastPoint = points[points.length - 1]
        const pathType = getPathType(lastPoint, hoveredPoint)
        ctx.strokeStyle = pathType === 'staircase' ? "#f59e0b" : "#10b981"
      } else {
        ctx.strokeStyle = "#10b981"
      }
      
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.arc(x, y, 8, 0, Math.PI * 2)
      ctx.stroke()
    }
  }, [points, gridWidth, gridHeight, hoveredPoint, showGrid, cellSize, CANVAS_PADDING, backgroundImage, imagePosition, imageScale, imageOpacity, startPoint, isDraggingStart])

  const getGridPoint = useCallback(
    (clientX: number, clientY: number): Point | null => {
      const canvas = canvasRef.current
      if (!canvas) return null

      const rect = canvas.getBoundingClientRect()
      const x = clientX - rect.left - CANVAS_PADDING
      const y = clientY - rect.top - CANVAS_PADDING

      const col = Math.round(x / cellSize)
      const row = Math.round(y / cellSize)

      if (row >= 0 && row <= gridHeight && col >= 0 && col <= gridWidth) {
        return { row, col }
      }
      return null
    },
    [gridWidth, gridHeight, cellSize, CANVAS_PADDING]
  )

  const handleCanvasClick = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const point = getGridPoint(e.clientX, e.clientY)
      if (!point) return

      // Check if Alt/Option key is pressed for moving start point
      if (e.altKey) {
        setStartPoint(point)
        setIsDraggingStart(false)
        return
      }

      // If in drag mode, move start point to clicked position
      if (isDraggingStart) {
        setStartPoint(point)
        setIsDraggingStart(false)
        return
      }

      // Check if clicking on start point
      const isStartPoint = startPoint.row === point.row && startPoint.col === point.col
      if (isStartPoint) {
        // Check if we have a path and first point matches start (can close contour)
        const firstPointMatchesStart = points.length > 0 && 
                                       points[0].row === startPoint.row && 
                                       points[0].col === startPoint.col
        
        if (firstPointMatchesStart && points.length >= 2) {
          // Check if contour is already closed (last point matches first)
          const lastPoint = points[points.length - 1]
          const isAlreadyClosed = lastPoint.row === points[0].row && lastPoint.col === points[0].col
          
          if (isAlreadyClosed) {
            // Contour already closed, do nothing
            return
          }
          
          // Close contour by adding duplicate of first point
          const newPoints = [...points, point]
          setPoints(newPoints)
          addToHistory(newPoints)
          return
        } else {
          // Start point doesn't match path start, enter drag mode
          setIsDraggingStart(true)
          return
        }
      }

      // Check if clicking on first point to close contour (separate from start point)
      const isFirstPoint = points.length > 0 && points[0].row === point.row && points[0].col === point.col
      if (isFirstPoint && points.length >= 2) {
        // Check if contour is already closed
        const lastPoint = points[points.length - 1]
        const isAlreadyClosed = lastPoint.row === points[0].row && lastPoint.col === points[0].col
        
        if (isAlreadyClosed) {
          // Contour already closed, do nothing
          return
        }
        
        // Close contour by adding duplicate of first point
        const newPoints = [...points, point]
        setPoints(newPoints)
        addToHistory(newPoints)
        return
      }

      // Check if clicking on existing point to remove it
      const existingIndex = points.findIndex(p => p.row === point.row && p.col === point.col)
      if (existingIndex !== -1) {
        // Remove any point
        const newPoints = [...points]
        newPoints.splice(existingIndex, 1)
        setPoints(newPoints)
        addToHistory(newPoints)
        return
      }

      // Check if point already exists (prevent duplicates)
      const isDuplicate = points.some(p => p.row === point.row && p.col === point.col)
      if (isDuplicate) return

      // Add new point (with intermediate points if staircase needed)
      let pointsToAdd: Point[] = [point]
      
      if (points.length > 0) {
        const lastPoint = points[points.length - 1]
        const pathType = getPathType(lastPoint, point)
        
        // Если это "лесенка", добавляем промежуточные точки
        if (pathType === 'staircase') {
          pointsToAdd = generateStaircasePath(lastPoint, point)
        }
      }
      
      const newPoints = [...points, ...pointsToAdd]
      setPoints(newPoints)
      addToHistory(newPoints)
    },
    [points, getGridPoint, startPoint, isDraggingStart]
  )

  const handleCanvasMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const point = getGridPoint(e.clientX, e.clientY)
      setHoveredPoint(point)
    },
    [getGridPoint]
  )

  const handleCanvasMouseLeave = useCallback(() => {
    setHoveredPoint(null)
  }, [])

  const addToHistory = useCallback((newPoints: Point[]) => {
    setHistory(prev => {
      const newHistory = prev.slice(0, historyIndex + 1)
      newHistory.push([...newPoints])
      return newHistory.slice(-50) // Keep last 50 states
    })
    setHistoryIndex(prev => Math.min(prev + 1, 49))
  }, [historyIndex])

  const handleUndo = useCallback(() => {
    if (historyIndex > 0) {
      setHistoryIndex(prev => prev - 1)
      setPoints(history[historyIndex - 1])
    }
  }, [history, historyIndex])

  const handleRedo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex(prev => prev + 1)
      setPoints(history[historyIndex + 1])
    }
  }, [history, historyIndex])

  const handleGenerateCommands = useCallback(async () => {
    if (points.length < 2) {
      setError("Необходимо минимум 2 точки для генерации команд")
      return
    }

    setIsGenerating(true)
    setError(null)

    try {
      const response = await apiFetch("/api/generator/graphic-dictation/generate-commands", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          points,
          allow_diagonals: allowDiagonals,
        }),
      })

      if (!response.ok) {
        // Для 422 показываем детали валидации
        if (response.status === 422) {
          const errorData = await response.json()
          const errorMessages = errorData.errors 
            ? Object.values(errorData.errors).flat().join(', ')
            : errorData.message || 'Ошибка валидации'
          throw new Error(`Ошибка валидации: ${errorMessages}`)
        }
        throw new Error(`Ошибка ${response.status}`)
      }

      const data = await response.json()
      setCommands(data.commands ?? [])
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось сгенерировать команды")
    } finally {
      setIsGenerating(false)
    }
  }, [points, allowDiagonals])

  const formatDirectionRu = (direction: string): string => {
    const map: Record<string, string> = {
      'up': '↑',
      'down': '↓',
      'left': '←',
      'right': '→',
      'up-left': '↖',
      'up-right': '↗',
      'down-left': '↙',
      'down-right': '↘',
    }
    return map[direction] || direction
  }

  const handleSave = useCallback(() => {
    if (commands.length === 0) {
      setError("Сначала сгенерируйте команды")
      return
    }

    // Формируем инструкции для пациента - все команды в одной строке
    const commandsText = commands.map((cmd) => {
      const steps = cmd.steps ?? 1
      return `${formatDirectionRu(cmd.direction ?? 'unknown')}${steps}`
    }).join(', ')
    
    const instructions: string[] = [
      `Карандаш: (${startPoint.row + 1},${startPoint.col + 1}), ${commandsText}`
    ]

    const payload: GraphicDictationPayload = {
      grid: {
        width: gridWidth,
        height: gridHeight,
        cell_size_mm: cellSizeMm,
      },
      start: startPoint,
      points,
      commands,
      instructions,
    }

    onSave?.(payload)
  }, [commands, gridWidth, gridHeight, cellSizeMm, startPoint, points, onSave])

  const handleClear = useCallback(() => {
    setPoints([])
    setCommands([])
    setError(null)
    setHistory([])
    setHistoryIndex(-1)
  }, [])

  const handleExport = useCallback(() => {
    if (points.length === 0) {
      setError("Добавьте хотя бы одну точку")
      return
    }

    const payload: GraphicDictationPayload = {
      grid: { width: gridWidth, height: gridHeight, cell_size_mm: cellSizeMm },
      start: points[0],
      points,
      commands,
    }
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `graphic-dictation-${Date.now()}.json`
    a.click()
    URL.revokeObjectURL(url)
  }, [gridWidth, gridHeight, cellSizeMm, points, commands])

  const handleImport = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      try {
        const payload = JSON.parse(event.target?.result as string) as GraphicDictationPayload
        setGridWidth(payload.grid.width)
        setGridHeight(payload.grid.height)
        setCellSizeMm(payload.grid.cell_size_mm)
        setPoints(payload.points)
        setCommands(payload.commands)
        setHistory([])
        setHistoryIndex(-1)
        if (payload.points.length > 0) {
          addToHistory(payload.points)
        }
      } catch (err) {
        setError("Не удалось загрузить файл")
      }
    }
    reader.readAsText(file)
    e.target.value = ""
  }, [addToHistory])

  const handleImageUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      const img = new Image()
      img.onload = () => {
        setBackgroundImage(img)
        centerImage(img)
      }
      img.src = event.target?.result as string
    }
    reader.readAsDataURL(file)
    e.target.value = ""
  }, [])

  const centerImage = useCallback((img?: HTMLImageElement) => {
    const image = img || backgroundImage
    if (!image) return
    
    const canvasWidth = gridWidth * cellSize
    const canvasHeight = gridHeight * cellSize
    setImagePosition({
      x: (canvasWidth - image.width * imageScale) / 2,
      y: (canvasHeight - image.height * imageScale) / 2,
    })
  }, [backgroundImage, gridWidth, gridHeight, cellSize, imageScale])

  const handleZoomIn = useCallback(() => {
    setImageScale(prev => Math.min(5, prev * 1.2))
  }, [])

  const handleZoomOut = useCallback(() => {
    setImageScale(prev => Math.max(0.1, prev / 1.2))
  }, [])

  const handleMoveImage = useCallback((direction: 'up' | 'down' | 'left' | 'right') => {
    const step = 10 // Smaller step for smoother control
    setImagePosition(prev => {
      switch (direction) {
        case 'up': return { ...prev, y: prev.y - step }
        case 'down': return { ...prev, y: prev.y + step }
        case 'left': return { ...prev, x: prev.x - step }
        case 'right': return { ...prev, x: prev.x + step }
      }
    })
  }, [])

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Редактор графического диктанта</CardTitle>
              <CardDescription>
                Кликайте по узлам сетки, чтобы построить путь. Линии рисуются автоматически.
              </CardDescription>
            </div>
            {points.length > 0 && (
              <div className="text-right">
                <div className="text-2xl font-bold text-blue-600">{points.length}</div>
                <div className="text-xs text-gray-500">точек</div>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Info Banner */}
          {points.length === 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm">
              <p className="font-semibold text-blue-900 mb-1">💡 Подсказка:</p>
              <ul className="text-blue-800 space-y-1 ml-4 list-disc">
                <li>Красная точка <strong>"S"</strong> — начальная позиция диктанта</li>
                <li>Кликните на любой узел сетки, чтобы начать рисование пути</li>
                <li>Первая точка пути будет <strong className="text-green-600">зелёной</strong></li>
                <li><strong className="text-green-600">Зелёная линия</strong> (пунктир) — превью прямой линии/диагонали</li>
                <li><strong className="text-orange-600">Оранжевая линия</strong> (пунктир) — превью "лесенки" (диагональ не через узлы)</li>
                <li>Кликните на существующую точку пути, чтобы удалить её</li>
                <li>Чтобы <strong>замкнуть контур</strong>: кликните на первую (зелёную) точку или на "S" если путь начинается с неё</li>
                <li>Чтобы <strong>переместить "S"</strong>: кликните на "S" (если путь не начинается с неё) или Alt+клик</li>
              </ul>
            </div>
          )}
          
          {isDraggingStart && (
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 text-sm">
              <p className="font-semibold text-orange-900">🔸 Режим перемещения начальной точки</p>
              <p className="text-orange-700 text-xs mt-1">Кликните на нужный узел сетки, чтобы переместить стартовую позицию "S"</p>
            </div>
          )}
          
          {points.length >= 2 && points[0].row === startPoint.row && points[0].col === startPoint.col && (() => {
            const lastPoint = points[points.length - 1]
            const isContourClosed = lastPoint.row === points[0].row && lastPoint.col === points[0].col
            
            if (isContourClosed) {
              return (
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 text-sm">
                  <p className="font-semibold text-purple-900">🔒 Контур замкнут!</p>
                  <p className="text-purple-700 text-xs mt-1">Можно генерировать команды или продолжить редактирование</p>
                </div>
              )
            }
            
            return (
              <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm">
                <p className="font-semibold text-green-900">✓ Путь начинается с точки "S"</p>
                <p className="text-green-700 text-xs mt-1">Кликните на красную точку "S" чтобы замкнуть контур</p>
              </div>
            )
          })()}

          {/* Toolbar */}
          <div className="flex items-center justify-between gap-2 p-2 bg-muted/30 rounded-md">
            <div className="flex gap-1">
              <Button
                size="sm"
                variant="ghost"
                onClick={handleUndo}
                disabled={historyIndex <= 0}
                title="Отменить (Ctrl+Z)"
              >
                <Undo2 className="h-4 w-4" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={handleRedo}
                disabled={historyIndex >= history.length - 1}
                title="Повторить (Ctrl+Y)"
              >
                <Redo2 className="h-4 w-4" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={handleClear}
                title="Очистить"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex gap-1">
              <Button size="sm" variant="ghost" onClick={handleExport} title="Экспорт JSON">
                <Download className="h-4 w-4" />
              </Button>
              <Button size="sm" variant="ghost" asChild title="Импорт JSON">
                <label>
                  <Upload className="h-4 w-4" />
                  <input
                    type="file"
                    accept=".json"
                    className="hidden"
                    onChange={handleImport}
                  />
                </label>
              </Button>
              <Button size="sm" variant="ghost" asChild title="Загрузить изображение-подложку">
                <label>
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                    <circle cx="8.5" cy="8.5" r="1.5"/>
                    <polyline points="21 15 16 10 5 21"/>
                  </svg>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleImageUpload}
                  />
                </label>
              </Button>
            </div>
          </div>

          {/* Settings */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div>
              <Label htmlFor="grid-width" className="text-xs">Ширина</Label>
              <Input
                id="grid-width"
                type="number"
                min={4}
                max={32}
                value={gridWidth}
                onChange={(e) => setGridWidth(Number(e.target.value))}
                className="h-8"
              />
            </div>
            <div>
              <Label htmlFor="grid-height" className="text-xs">Высота</Label>
              <Input
                id="grid-height"
                type="number"
                min={4}
                max={32}
                value={gridHeight}
                onChange={(e) => setGridHeight(Number(e.target.value))}
                className="h-8"
              />
            </div>
            <div>
              <Label htmlFor="cell-size-mm" className="text-xs">Размер (мм)</Label>
              <Input
                id="cell-size-mm"
                type="number"
                min={5}
                max={20}
                value={cellSizeMm}
                onChange={(e) => setCellSizeMm(Number(e.target.value))}
                className="h-8"
              />
            </div>
            <div>
              <Label htmlFor="cell-size-px" className="text-xs">Масштаб</Label>
              <Input
                id="cell-size-px"
                type="number"
                min={16}
                max={64}
                step={4}
                value={cellSize}
                onChange={(e) => setCellSize(Number(e.target.value))}
                className="h-8"
              />
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <input
                id="allow-diagonals"
                type="checkbox"
                checked={allowDiagonals}
                onChange={(e) => setAllowDiagonals(e.target.checked)}
                className="h-4 w-4"
              />
              <Label htmlFor="allow-diagonals" className="text-sm">Диагонали</Label>
            </div>
            <div className="flex items-center gap-2">
              <input
                id="show-grid"
                type="checkbox"
                checked={showGrid}
                onChange={(e) => setShowGrid(e.target.checked)}
                className="h-4 w-4"
              />
              <Label htmlFor="show-grid" className="text-sm">Показать сетку</Label>
            </div>
          </div>

          {/* Background Image Controls */}
          {backgroundImage && (
            <div className="flex flex-col gap-3 p-3 bg-blue-50 border border-blue-200 rounded-md">
              <div className="flex items-center gap-3">
                <div className="flex-1">
                  <div className="font-medium text-blue-900 text-sm">Изображение загружено</div>
                  <div className="text-xs text-blue-700">
                    Используйте кнопки для позиционирования и масштабирования
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setBackgroundImage(null)
                    setImagePosition({ x: 0, y: 0 })
                    setImageScale(1)
                  }}
                  title="Удалить изображение"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
              
              <div className="grid grid-cols-3 gap-3">
                {/* Zoom controls */}
                <div className="space-y-2">
                  <Label className="text-xs text-blue-900">Масштаб ({imageScale.toFixed(1)}x)</Label>
                  <div className="flex gap-1">
                    <Button size="sm" variant="outline" onClick={handleZoomOut} className="flex-1">
                      <ZoomOut className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="outline" onClick={handleZoomIn} className="flex-1">
                      <ZoomIn className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* Position controls */}
                <div className="space-y-2">
                  <Label className="text-xs text-blue-900">Позиция</Label>
                  <div className="grid grid-cols-3 gap-1">
                    <div />
                    <Button size="sm" variant="outline" onClick={() => handleMoveImage('up')}>
                      <MoveUp className="h-4 w-4" />
                    </Button>
                    <div />
                    <Button size="sm" variant="outline" onClick={() => handleMoveImage('left')}>
                      <MoveLeft className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => centerImage()} title="По центру">
                      <Maximize2 className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => handleMoveImage('right')}>
                      <MoveRight className="h-4 w-4" />
                    </Button>
                    <div />
                    <Button size="sm" variant="outline" onClick={() => handleMoveImage('down')}>
                      <MoveDown className="h-4 w-4" />
                    </Button>
                    <div />
                  </div>
                </div>

                {/* Opacity control */}
                <div className="space-y-2">
                  <Label htmlFor="image-opacity" className="text-xs text-blue-900">Прозрачность</Label>
                  <Input
                    id="image-opacity"
                    type="range"
                    min={0}
                    max={1}
                    step={0.1}
                    value={imageOpacity}
                    onChange={(e) => setImageOpacity(Number(e.target.value))}
                    className="w-full"
                  />
                  <div className="text-xs text-center text-blue-700">{Math.round(imageOpacity * 100)}%</div>
                </div>
              </div>
            </div>
          )}

          {/* Canvas */}
          <div className="border rounded-md p-4 bg-muted/10">
            <div className="overflow-auto max-h-[600px]">
              <canvas
                ref={canvasRef}
                onClick={handleCanvasClick}
                onMouseMove={handleCanvasMouseMove}
                onMouseLeave={handleCanvasMouseLeave}
                className={isDraggingStart ? "cursor-move mx-auto" : "cursor-crosshair mx-auto"}
                style={{ display: "block" }}
              />
            </div>
          </div>

          {/* Stats */}
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <div>
              Точек: <span className="font-medium text-foreground">{points.length}</span>
              {commands.length > 0 && (
                <>
                  {" | "}
                  Команд: <span className="font-medium text-foreground">{commands.length}</span>
                </>
              )}
            </div>
            {hoveredPoint && (
              <div className="text-xs">
                Позиция: ({hoveredPoint.col}, {hoveredPoint.row})
              </div>
            )}
          </div>

          {/* Error */}
          {error && (
            <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2">
            <Button
              onClick={handleGenerateCommands}
              disabled={isGenerating || points.length < 2}
              className="flex-1"
            >
              {isGenerating ? "Генерация..." : "Сгенерировать команды"}
            </Button>
            <Button
              onClick={handleSave}
              variant="default"
              disabled={commands.length === 0}
              className="flex-1"
            >
              <Save className="h-4 w-4 mr-2" />
              Сохранить
            </Button>
          </div>

          {/* Commands preview */}
          {commands.length > 0 && (
            <div className="rounded-md border p-3 bg-muted/10">
              <div className="text-sm font-medium mb-2">Команды диктанта:</div>
              <div className="text-xs space-y-1">
                {commands.map((cmd, i) => (
                  <div key={i} className="font-mono">
                    {i + 1}. {cmd.direction} — {cmd.steps} {cmd.steps === 1 ? "шаг" : "шага"}
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Help */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Подсказки</CardTitle>
        </CardHeader>
        <CardContent className="text-sm space-y-2 text-muted-foreground">
          <div>• <span className="font-medium text-foreground">Клик по узлу</span> — добавить точку в конец пути</div>
          <div>• <span className="font-medium text-foreground">Клик по существующей точке</span> — удалить её</div>
          <div>• <span className="font-medium text-foreground">Клик по красной точке (≥2 точек)</span> — замкнуть контур</div>
          <div>• <span className="font-medium text-foreground">Красная точка</span> — начало диктанта (первая точка)</div>
          <div>• <span className="font-medium text-foreground">Синие точки</span> — путь по порядку</div>
          <div>• <span className="font-medium text-foreground">Зелёный круг</span> — подсветка при наведении</div>
          <div>• <span className="font-medium text-foreground">Кнопки +/−</span> — масштабировать подложку</div>
          <div>• <span className="font-medium text-foreground">Стрелки</span> — двигать подложку</div>
          <div>• <span className="font-medium text-foreground">Центр</span> — выровнять подложку по центру</div>
        </CardContent>
      </Card>
    </div>
  )
}
