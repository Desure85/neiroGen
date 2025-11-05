'use client'

import React from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { Trash2, Plus, Type, ImageIcon, Printer, ChevronDown, ImagePlus, Minus, ArrowRight, Circle, Square, Hash, List, Table, CheckSquare, Shapes, ArrowUp, ArrowDown, ChevronsUp, ChevronsDown, X } from 'lucide-react'
import type Konva from 'konva'
import type { CanvasElement, CanvasLayoutValue, CanvasElementType, CanvasScene } from '@/components/worksheets/worksheet-layout-types'

interface WorksheetLayoutCanvasProps {
  value: CanvasLayoutValue
  onChange: (value: CanvasLayoutValue) => void
  className?: string
  exerciseType?: string
  exerciseData?: any
  instructions?: string[]
  onAddImageClick?: () => void
}


const generateId = () => `el_${Math.random().toString(36).slice(2, 10)}`

const useCanvasImage = (src?: string) => {
  const [image, setImage] = React.useState<HTMLImageElement | null>(null)

  React.useEffect(() => {
    if (!src) {
      setImage(null)
      return
    }

    let cancelled = false
    const img = new window.Image()
    img.crossOrigin = 'anonymous'
    img.src = src
    img.onload = () => {
      if (!cancelled) setImage(img)
    }
    img.onerror = () => {
      if (!cancelled) setImage(null)
    }

    return () => {
      cancelled = true
    }
  }, [src])

  return image
}

type ReactKonvaModule = typeof import('react-konva')

export const WorksheetLayoutCanvas: React.FC<WorksheetLayoutCanvasProps> = ({ value, onChange, className, exerciseType, exerciseData, instructions, onAddImageClick }) => {
  const [konvaModule, setKonvaModule] = React.useState<ReactKonvaModule | null>(null)
  const [scene, setScene] = React.useState<CanvasScene>(() => ({
    ...value.scene,
    elements: value.scene.elements.map((el) => ({ ...el })),
  }))
  const [snapshot, setSnapshot] = React.useState<string | null>(value.snapshot ?? null)
  const [selectedId, setSelectedId] = React.useState<string | null>(null)
  const stageRef = React.useRef<Konva.Stage | null>(null)
  const transformerRef = React.useRef<Konva.Transformer | null>(null)
  const containerRef = React.useRef<HTMLDivElement | null>(null)
  const emitChangeTimeoutRef = React.useRef<NodeJS.Timeout | null>(null)
  const snapshotTimeoutRef = React.useRef<NodeJS.Timeout | null>(null)
  const [scale, setScale] = React.useState(1)

  React.useEffect(() => {
    let active = true
    ;(async () => {
      const mod = await import('react-konva')
      if (!active) return
      setKonvaModule(mod)
    })()
    return () => {
      active = false
    }
  }, [])

  // Синхронизация с внешним value только при изменении количества элементов или их ID
  const sceneKey = React.useMemo(() => 
    value.scene.elements.map(el => el.id).join(','),
    [value.scene.elements]
  )
  
  React.useEffect(() => {
    setScene({
      ...value.scene,
      elements: value.scene.elements.map((el) => ({ ...el })),
    })
    setSnapshot(value.snapshot ?? null)
  }, [sceneKey, value.snapshot])

  // Автообновление только данных упражнений при изменении (без изменения размеров!)
  React.useEffect(() => {
    setScene(prevScene => {
      let hasChanges = false
      const updatedElements = prevScene.elements.map(el => {
        // Обновляем инструкции из пропсов только если их еще нет
        if (el.type === 'instructions' && !el.instructionsList && instructions) {
          hasChanges = true
          return { ...el, instructionsList: instructions }
        }
        // Обновляем только данные упражнения, БЕЗ изменения размеров
        if (el.type === 'grid' && exerciseData && el.exerciseData !== exerciseData) {
          hasChanges = true
          const gridW = exerciseData?.grid?.width || el.gridSize?.width || 16
          const gridH = exerciseData?.grid?.height || el.gridSize?.height || 16
          return { 
            ...el, 
            exerciseData,
            gridSize: { width: gridW, height: gridH }
            // Не изменяем width/height - пользователь сам установит нужный размер
          }
        }
        if (el.type === 'exercise_field' && exerciseData && el.exerciseData !== exerciseData) {
          hasChanges = true
          return { ...el, exerciseData }
        }
        return el
      })
      
      // Обновляем только если действительно были изменения
      return hasChanges ? { ...prevScene, elements: updatedElements } : prevScene
    })
  }, [instructions, exerciseData])

  React.useEffect(() => {
    const node = containerRef.current
    if (!node) return

    const updateScale = () => {
      const rect = node.getBoundingClientRect()
      const nextScale = rect.width ? Math.min(rect.width / scene.width, 1) : 1
      setScale(Number.isFinite(nextScale) ? nextScale : 1)
    }

    updateScale()
    const observer = new ResizeObserver(updateScale)
    observer.observe(node)
    return () => {
      observer.disconnect()
    }
  }, [scene.width])

  React.useEffect(() => {
    if (!konvaModule) return
    const transformer = transformerRef.current
    const stage = stageRef.current
    if (!transformer || !stage) return

    if (selectedId) {
      const node = stage.findOne(`#${selectedId}`)
      if (node) {
        transformer.nodes([node])
        transformer.getLayer()?.batchDraw()
        return
      }
    }

    transformer.nodes([])
    transformer.getLayer()?.batchDraw()
  }, [konvaModule, selectedId, scene.elements])

  const emitChange = React.useCallback(
    (nextScene: CanvasScene, draftSnapshot: string | null) => {
      // Отменяем предыдущий таймер
      if (emitChangeTimeoutRef.current) {
        clearTimeout(emitChangeTimeoutRef.current)
      }
      
      // Задержка 500ms перед сохранением изменений
      emitChangeTimeoutRef.current = setTimeout(() => {
        onChange({ scene: nextScene, snapshot: draftSnapshot })
      }, 500)
    },
    [onChange]
  )
  
  // Очистка таймеров при размонтировании
  React.useEffect(() => {
    return () => {
      if (emitChangeTimeoutRef.current) {
        clearTimeout(emitChangeTimeoutRef.current)
      }
      if (snapshotTimeoutRef.current) {
        clearTimeout(snapshotTimeoutRef.current)
      }
    }
  }, [])

  const updateSnapshot = React.useCallback(() => {
    const stage = stageRef.current
    const nextSnapshot = stage ? stage.toDataURL({ pixelRatio: 2 }) : null
    setSnapshot(nextSnapshot)
    return nextSnapshot
  }, [])

  const updateElement = React.useCallback(
    (id: string, patch: Partial<CanvasElement>) => {
      setScene((prev) => {
        const elements = prev.elements.map((element) => (element.id === id ? { ...element, ...patch } : element))
        const nextScene = { ...prev, elements }
        // Не создаем snapshot сразу - это дорого, делаем это с задержкой
        emitChange(nextScene, null)
        return nextScene
      })
      
      // Создаем snapshot с задержкой после завершения редактирования
      if (snapshotTimeoutRef.current) {
        clearTimeout(snapshotTimeoutRef.current)
      }
      snapshotTimeoutRef.current = setTimeout(() => {
        const nextSnapshot = updateSnapshot()
        // Обновляем snapshot в state
        setSnapshot(nextSnapshot)
      }, 1000)
    },
    [emitChange, updateSnapshot]
  )

  const removeElement = React.useCallback(
    (id: string) => {
      setScene((prev) => {
        const elements = prev.elements.filter((element) => element.id !== id)
        const nextScene = { ...prev, elements }
        const nextSnapshot = updateSnapshot()
        emitChange(nextScene, nextSnapshot)
        return nextScene
      })
      setSelectedId(null)
    },
    [emitChange, updateSnapshot]
  )

  // Управление слоями
  const moveToFront = React.useCallback(
    (id: string) => {
      setScene((prev) => {
        const index = prev.elements.findIndex((el) => el.id === id)
        if (index === -1 || index === prev.elements.length - 1) return prev
        
        const elements = [...prev.elements]
        const [element] = elements.splice(index, 1)
        elements.push(element)
        
        const nextScene = { ...prev, elements }
        const nextSnapshot = updateSnapshot()
        emitChange(nextScene, nextSnapshot)
        return nextScene
      })
    },
    [emitChange, updateSnapshot]
  )

  const moveForward = React.useCallback(
    (id: string) => {
      setScene((prev) => {
        const index = prev.elements.findIndex((el) => el.id === id)
        if (index === -1 || index === prev.elements.length - 1) return prev
        
        const elements = [...prev.elements]
        const temp = elements[index]
        elements[index] = elements[index + 1]
        elements[index + 1] = temp
        
        const nextScene = { ...prev, elements }
        const nextSnapshot = updateSnapshot()
        emitChange(nextScene, nextSnapshot)
        return nextScene
      })
    },
    [emitChange, updateSnapshot]
  )

  const moveBackward = React.useCallback(
    (id: string) => {
      setScene((prev) => {
        const index = prev.elements.findIndex((el) => el.id === id)
        if (index === -1 || index === 0) return prev
        
        const elements = [...prev.elements]
        const temp = elements[index]
        elements[index] = elements[index - 1]
        elements[index - 1] = temp
        
        const nextScene = { ...prev, elements }
        const nextSnapshot = updateSnapshot()
        emitChange(nextScene, nextSnapshot)
        return nextScene
      })
    },
    [emitChange, updateSnapshot]
  )

  const moveToBack = React.useCallback(
    (id: string) => {
      setScene((prev) => {
        const index = prev.elements.findIndex((el) => el.id === id)
        if (index === -1 || index === 0) return prev
        
        const elements = [...prev.elements]
        const [element] = elements.splice(index, 1)
        elements.unshift(element)
        
        const nextScene = { ...prev, elements }
        const nextSnapshot = updateSnapshot()
        emitChange(nextScene, nextSnapshot)
        return nextScene
      })
    },
    [emitChange, updateSnapshot]
  )

  const addElement = React.useCallback(
    (type: CanvasElementType, shapeType?: 'circle' | 'rectangle' | 'ellipse') => {
      // Для сетки рассчитываем размеры на основе данных упражнения
      let gridWidth = 400
      let gridHeight = 400
      let gridSize = { width: 16, height: 16 }
      
      if (type === 'grid' && exerciseData?.grid) {
        const gridW = exerciseData.grid.width || 16
        const gridH = exerciseData.grid.height || 16
        const cellSize = 10 // 10px на клетку для читаемости
        gridWidth = gridW * cellSize
        gridHeight = gridH * cellSize
        gridSize = { width: gridW, height: gridH }
      }
      
      // Специальная обработка для новых графических инструментов
      let base: CanvasElement
      
      if (type === 'line') {
        base = {
          id: generateId(),
          type: 'line',
          lineStyle: 'solid',
          x: 100,
          y: 100,
          x2: 200,
          y2: 100,
          width: 100,
          height: 0,
          stroke: '#000000',
          strokeWidth: 2,
          opacity: 1,
        }
      } else if (type === 'shape') {
        const effectiveShapeType = shapeType || 'rectangle'
        base = {
          id: generateId(),
          type: 'shape',
          shapeType: effectiveShapeType,
          x: 100,
          y: 100,
          width: effectiveShapeType === 'circle' ? 100 : 150,
          height: effectiveShapeType === 'circle' ? 100 : 100,
          stroke: '#000000',
          strokeWidth: 2,
          fill: 'transparent',
          opacity: 1,
        }
      } else if (type === 'number') {
        base = {
          id: generateId(),
          type: 'number',
          x: 100,
          y: 100,
          width: 40,
          height: 40,
          numberValue: 1,
          fontSize: 24,
          fill: '#000000',
          stroke: '#000000',
          strokeWidth: 1,
          opacity: 1,
        }
      } else {
        // Обычные элементы
        base = {
          id: generateId(),
          type,
          x: 60,
          y: 60,
          width: type === 'text' ? 220 : type === 'instructions' ? 500 : type === 'grid' ? gridWidth : 200,
          height: type === 'text' ? 80 : type === 'instructions' ? 400 : type === 'grid' ? gridHeight : 120,
          rotation: 0,
          text: type === 'text' ? 'Новый текст' : undefined,
          fontSize: type === 'text' ? 20 : undefined,
          fill: type === 'placeholder' ? '#fef3c7' : type === 'answer_area' ? '#dbeafe' : type === 'instructions' ? '#ffffff' : undefined,
          stroke: type === 'placeholder' ? '#f59e0b' : type === 'grid' ? '#d1d5db' : type === 'answer_area' ? '#3b82f6' : type === 'instructions' ? '#000000' : undefined,
          strokeWidth: type === 'grid' ? 1 : type === 'answer_area' ? 2 : type === 'instructions' ? 1 : undefined,
          name: type === 'placeholder' ? 'Placeholder' : type === 'grid' ? 'Сетка' : type === 'instructions' ? 'Инструкции' : type === 'answer_area' ? 'Область ответов' : type === 'exercise_field' ? 'Игровое поле' : undefined,
          url: type === 'image' ? '' : undefined,
          opacity: 1,
          gridSize: type === 'grid' ? gridSize : undefined,
          cellSize: type === 'grid' ? 10 : undefined,
          showNumbers: type === 'instructions' ? true : undefined,
          instructionsList: type === 'instructions' && instructions ? instructions : undefined,
          exerciseData: (type === 'grid' || type === 'exercise_field') && exerciseData ? exerciseData : undefined,
        }
      }

      setScene((prev) => {
        const nextScene = { ...prev, elements: [...prev.elements, base] }
        const nextSnapshot = updateSnapshot()
        emitChange(nextScene, nextSnapshot)
        return nextScene
      })
      setSelectedId(base.id)
    },
    [emitChange, updateSnapshot, exerciseData, instructions]
  )

  const handleStagePointerDown = (event: any) => {
    const clickedOnEmpty = 
      event.target === event.target.getStage() || 
      event.target.name() === 'background'
    
    if (clickedOnEmpty) {
      setSelectedId(null)
    }
  }

  const selectedElement = React.useMemo(() => {
    if (!selectedId) return null
    return scene.elements.find((element) => element.id === selectedId) ?? null
  }, [selectedId, scene.elements])

  const updateNumeric = (id: string, key: keyof CanvasElement, value: number) => {
    if (!Number.isFinite(value)) return
    
    // Защита от нуля и отрицательных значений для размеров
    if ((key === 'width' || key === 'height') && value <= 0) return
    
    // Мягкие минимумы - только защита от слишком маленьких значений
    if (key === 'width') value = Math.max(20, value)
    if (key === 'height') value = Math.max(20, value)
    
    updateElement(id, { [key]: value } as Partial<CanvasElement>)
  }

  const handlePrintLayout = React.useCallback(() => {
    const stage = stageRef.current
    if (!stage) return

    // Временно убираем выделение для чистой печати
    const previousSelectedId = selectedId
    setSelectedId(null)
    
    // Даём время на обновление рендера
    setTimeout(() => {
      // Экспортируем canvas в изображение (высокое качество для печати)
      const dataURL = stage.toDataURL({ pixelRatio: 3 })
      
      // Восстанавливаем выделение
      setSelectedId(previousSelectedId)
      
      // Создаем новое окно для печати
      const printWindow = window.open('', '_blank')
      if (!printWindow) return
      
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Печать макета упражнения</title>
            <style>
              body {
                margin: 0;
                padding: 20px;
                display: flex;
                justify-content: center;
                align-items: center;
                min-height: 100vh;
              }
              img {
                max-width: 100%;
                height: auto;
              }
              @media print {
                body {
                  padding: 0;
                }
                img {
                  max-width: 100%;
                  page-break-inside: avoid;
                }
              }
            </style>
          </head>
          <body>
            <img src="${dataURL}" alt="Макет упражнения" onload="window.print();" />
          </body>
        </html>
      `)
      printWindow.document.close()
    }, 100)
  }, [selectedId])

  if (!konvaModule) {
    return (
      <div className={cn('flex min-h-[320px] items-center justify-center rounded-lg border border-border bg-muted/20 p-8 text-sm text-muted-foreground', className)}>
        Подготовка Canvas-редактора…
      </div>
    )
  }

  const { 
    Stage: KonvaStage, 
    Layer: KonvaLayer, 
    Rect: KonvaRect, 
    Group: KonvaGroup, 
    Text: KonvaText, 
    Image: KonvaImage, 
    Line: KonvaLine, 
    Arrow: KonvaArrow, 
    Circle: KonvaCircle, 
    Ellipse: KonvaEllipse,
    Star: KonvaStar,
    RegularPolygon: KonvaRegularPolygon,
    Transformer: KonvaTransformer 
  } = konvaModule

  const CanvasImageElement: React.FC<{ element: CanvasElement }> = ({ element }) => {
    const image = useCanvasImage(element.url)

    if (!image) {
      return (
        <KonvaGroup>
          <KonvaRect width={element.width} height={element.height} fill="#f1f5f9" stroke="#9ca3af" dash={[6, 4]} />
          <KonvaText
            width={element.width}
            height={element.height}
            text={element.url ? 'Изображение не загружено' : 'Укажите URL изображения'}
            fill="#64748b"
            align="center"
            verticalAlign="middle"
            fontSize={14}
          />
        </KonvaGroup>
      )
    }

    return <KonvaImage image={image} width={element.width} height={element.height} opacity={element.opacity ?? 1} />
  }

  return (
    <div className={cn('space-y-4 rounded-lg border border-border bg-card p-4 shadow-sm', className)}>
      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <div className="text-sm font-medium">Конструктор макета</div>
          <Button type="button" size="sm" variant="ghost" onClick={handlePrintLayout}>
            <Printer className="h-4 w-4" />
          </Button>
        </div>
        
        <div className="space-y-2">
          <div className="text-xs font-medium text-muted-foreground">Базовые</div>
          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" size="sm" variant="outline" onClick={() => addElement('text')}>
              <Type className="mr-1.5 h-3.5 w-3.5" /> Текст
            </Button>
            <Button type="button" size="sm" variant="outline" onClick={() => addElement('instructions')}>
              📝 Инструкции
            </Button>
            {exerciseType === 'graphic_dictation' && (
              <Button type="button" size="sm" variant="outline" onClick={() => addElement('grid')}>
                📐 Сетка
              </Button>
            )}
            {onAddImageClick && (
              <Button type="button" size="sm" variant="outline" onClick={onAddImageClick}>
                <ImagePlus className="mr-1.5 h-3.5 w-3.5" /> Из галереи
              </Button>
            )}
          </div>
          
          <div className="text-xs font-medium text-muted-foreground mt-3">Инструменты</div>
          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" size="sm" variant="outline" onClick={() => addElement('line')}>
              <Minus className="mr-1.5 h-3.5 w-3.5" /> Линия
            </Button>
            <Button type="button" size="sm" variant="outline" onClick={() => addElement('shape', 'rectangle')}>
              <Shapes className="mr-1.5 h-3.5 w-3.5" /> Фигура
            </Button>
            <Button type="button" size="sm" variant="outline" onClick={() => addElement('number')}>
              <Hash className="mr-1.5 h-3.5 w-3.5" /> Номер
            </Button>
            <Button type="button" size="sm" variant="outline" onClick={() => addElement('list')}>
              <List className="mr-1.5 h-3.5 w-3.5" /> Список
            </Button>
            <Button type="button" size="sm" variant="outline" onClick={() => addElement('checkbox')}>
              <CheckSquare className="mr-1.5 h-3.5 w-3.5" /> Чекбокс
            </Button>
            <Button type="button" size="sm" variant="outline" onClick={() => addElement('table')}>
              <Table className="mr-1.5 h-3.5 w-3.5" /> Таблица
            </Button>
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_260px]">
        <div ref={containerRef} className="relative overflow-hidden rounded-lg border border-border bg-muted/20 p-2">
          <KonvaStage
            ref={(instance) => {
              stageRef.current = instance as any
            }}
            width={scene.width}
            height={scene.height}
            scaleX={scale}
            scaleY={scale}
            className="mx-auto bg-white"
            onMouseDown={handleStagePointerDown}
            onTouchStart={handleStagePointerDown}
          >
            <KonvaLayer>
              <KonvaRect 
                name="background"
                width={scene.width} 
                height={scene.height} 
                fill="#ffffff" 
                stroke="#e2e8f0" 
                strokeWidth={2} 
              />
              {scene.elements.map((element) => {
                const isSelected = selectedId === element.id
                const commonHandlers = {
                  onClick: (event: any) => {
                    event.cancelBubble = true
                    setSelectedId(element.id)
                  },
                  onTap: (event: any) => {
                    event.cancelBubble = true
                    setSelectedId(element.id)
                  },
                  dragBoundFunc: (pos: any) => {
                    // Ограничить перемещение границами canvas
                    const newX = Math.max(0, Math.min(pos.x, scene.width - element.width))
                    const newY = Math.max(0, Math.min(pos.y, scene.height - element.height))
                    return { x: newX, y: newY }
                  },
                  onDragEnd: (event: any) => {
                    updateElement(element.id, {
                      x: event.target.x(),
                      y: event.target.y(),
                    })
                  },
                  onTransformEnd: (event: any) => {
                    const node = event.target
                    const scaleX = node.scaleX()
                    const scaleY = node.scaleY()
                    
                    // Используем исходные размеры элемента, а не node.width()
                    const newWidth = Math.max(20, element.width * scaleX)
                    const newHeight = Math.max(20, element.height * scaleY)
                    
                    // Сбрасываем scale после вычисления
                    node.scaleX(1)
                    node.scaleY(1)
                    
                    updateElement(element.id, {
                      x: node.x(),
                      y: node.y(),
                      width: newWidth,
                      height: newHeight,
                      rotation: node.rotation(),
                    })
                  },
                }

                if (element.type === 'text') {
                  return (
                    <KonvaGroup
                      key={element.id}
                      id={element.id}
                      draggable
                      x={element.x}
                      y={element.y}
                      rotation={element.rotation ?? 0}
                      {...commonHandlers}
                    >
                      <KonvaRect width={element.width} height={element.height} fill={isSelected ? '#e0f2fe' : 'transparent'} cornerRadius={4} />
                      <KonvaText
                        text={element.text ?? ''}
                        width={element.width}
                        height={element.height}
                        fontSize={element.fontSize ?? 24}
                        fontFamily={element.fontFamily ?? 'Arial'}
                        fill={element.fill ?? '#1f2937'}
                        padding={8}
                      />
                    </KonvaGroup>
                  )
                }

                if (element.type === 'placeholder') {
                  return (
                    <KonvaGroup
                      key={element.id}
                      id={element.id}
                      draggable
                      x={element.x}
                      y={element.y}
                      rotation={element.rotation ?? 0}
                      {...commonHandlers}
                    >
                      <KonvaRect
                        width={element.width}
                        height={element.height}
                        fill={element.fill ?? '#fef3c7'}
                        stroke={element.stroke ?? '#f59e0b'}
                        dash={[8, 4]}
                        cornerRadius={8}
                      />
                      <KonvaText
                        text={element.name ?? 'Placeholder'}
                        width={element.width}
                        height={element.height}
                        fontSize={18}
                        align="center"
                        verticalAlign="middle"
                        fill="#b45309"
                      />
                    </KonvaGroup>
                  )
                }

                // Инструкции
                if (element.type === 'instructions') {
                  const instructionsList = element.instructionsList || instructions || []
                  const showNumbers = element.showNumbers !== false
                  const instructionsText = instructionsList.length > 0 
                    ? instructionsList.map((instr, idx) => {
                        // Проверяем, есть ли уже номер в начале строки (например "1. ")
                        const hasNumber = /^\d+\.\s/.test(instr)
                        if (hasNumber) {
                          return instr // Уже есть номер
                        }
                        return showNumbers ? `${idx + 1}. ${instr}` : `• ${instr}`
                      }).join('\n')
                    : 'Инструкции к упражнению'
                  
                  return (
                    <KonvaGroup
                      key={element.id}
                      id={element.id}
                      draggable
                      x={element.x}
                      y={element.y}
                      rotation={element.rotation ?? 0}
                      {...commonHandlers}
                    >
                      <KonvaRect
                        width={element.width}
                        height={element.height}
                        fill={element.fill || "#ffffff"}
                        stroke={element.stroke || "#000000"}
                        strokeWidth={element.strokeWidth || 1}
                        cornerRadius={8}
                      />
                      <KonvaText
                        text="📝 ИНСТРУКЦИИ"
                        x={12}
                        y={12}
                        fontSize={14}
                        fontStyle="bold"
                        fill="#000000"
                      />
                      <KonvaText
                        text={instructionsText}
                        x={12}
                        y={40}
                        width={element.width - 24}
                        fontSize={14}
                        fill="#1f2937"
                        lineHeight={1.3}
                        fontFamily="monospace"
                      />
                    </KonvaGroup>
                  )
                }

                // Сетка для графического диктанта
                if (element.type === 'grid') {
                  const data = element.exerciseData || exerciseData
                  const gridW = data?.grid?.width || element.gridSize?.width || 16
                  const gridH = data?.grid?.height || element.gridSize?.height || 16
                  
                  return (
                    <KonvaGroup
                      key={element.id}
                      id={element.id}
                      draggable
                      x={element.x}
                      y={element.y}
                      rotation={element.rotation ?? 0}
                      {...commonHandlers}
                    >
                      <KonvaRect
                        width={element.width}
                        height={element.height}
                        fill="#ffffff"
                        stroke="#000000"
                        strokeWidth={1}
                      />
                      {/* Рисуем сетку */}
                      {Array.from({ length: gridW + 1 }).map((_, i) => (
                        <KonvaLine
                          key={`v-${i}`}
                          points={[
                            (i * element.width) / gridW, 0,
                            (i * element.width) / gridW, element.height
                          ]}
                          stroke="#000000"
                          strokeWidth={0.5}
                        />
                      ))}
                      {Array.from({ length: gridH + 1 }).map((_, i) => (
                        <KonvaLine
                          key={`h-${i}`}
                          points={[
                            0, (i * element.height) / gridH,
                            element.width, (i * element.height) / gridH
                          ]}
                          stroke="#000000"
                          strokeWidth={0.5}
                        />
                      ))}
                    </KonvaGroup>
                  )
                }

                // Игровое поле
                if (element.type === 'exercise_field') {
                  return (
                    <KonvaGroup
                      key={element.id}
                      id={element.id}
                      draggable
                      x={element.x}
                      y={element.y}
                      rotation={element.rotation ?? 0}
                      {...commonHandlers}
                    >
                      <KonvaRect
                        width={element.width}
                        height={element.height}
                        fill="#f0fdf4"
                        stroke="#22c55e"
                        strokeWidth={3}
                        cornerRadius={12}
                      />
                      <KonvaText
                        text="🎮"
                        x={element.width / 2 - 30}
                        y={element.height / 2 - 50}
                        fontSize={60}
                      />
                      <KonvaText
                        text="Игровое поле"
                        width={element.width}
                        y={element.height / 2 + 20}
                        fontSize={18}
                        fontStyle="bold"
                        align="center"
                        fill="#166534"
                      />
                      <KonvaText
                        text={exerciseType ? `Тип: ${exerciseType}` : 'Упражнение'}
                        width={element.width}
                        y={element.height / 2 + 45}
                        fontSize={12}
                        align="center"
                        fill="#16a34a"
                      />
                    </KonvaGroup>
                  )
                }

                // Область для ответов
                if (element.type === 'answer_area') {
                  return (
                    <KonvaGroup
                      key={element.id}
                      id={element.id}
                      draggable
                      x={element.x}
                      y={element.y}
                      rotation={element.rotation ?? 0}
                      {...commonHandlers}
                    >
                      <KonvaRect
                        width={element.width}
                        height={element.height}
                        fill="#dbeafe"
                        stroke="#3b82f6"
                        strokeWidth={element.strokeWidth || 2}
                        dash={[10, 5]}
                        cornerRadius={8}
                      />
                      <KonvaText
                        text="✍️ ОБЛАСТЬ ДЛЯ ОТВЕТОВ"
                        width={element.width}
                        y={element.height / 2 - 12}
                        fontSize={16}
                        fontStyle="bold"
                        align="center"
                        fill="#1e40af"
                      />
                      <KonvaText
                        text="Пациент записывает/рисует здесь"
                        width={element.width}
                        y={element.height / 2 + 12}
                        fontSize={12}
                        align="center"
                        fill="#60a5fa"
                      />
                    </KonvaGroup>
                  )
                }

                // Пример выполнения
                if (element.type === 'example') {
                  return (
                    <KonvaGroup
                      key={element.id}
                      id={element.id}
                      draggable
                      x={element.x}
                      y={element.y}
                      rotation={element.rotation ?? 0}
                      {...commonHandlers}
                    >
                      <KonvaRect
                        width={element.width}
                        height={element.height}
                        fill="#fef9c3"
                        stroke="#eab308"
                        strokeWidth={2}
                        cornerRadius={8}
                      />
                      <KonvaText
                        text="💡"
                        x={12}
                        y={12}
                        fontSize={24}
                      />
                      <KonvaText
                        text="ПРИМЕР"
                        x={48}
                        y={18}
                        fontSize={16}
                        fontStyle="bold"
                        fill="#854d0e"
                      />
                      <KonvaText
                        text="Здесь показан образец\nправильного выполнения"
                        x={12}
                        y={50}
                        width={element.width - 24}
                        fontSize={12}
                        fill="#713f12"
                        lineHeight={1.5}
                      />
                    </KonvaGroup>
                  )
                }

                // Линия (с поддержкой разных стилей)
                if (element.type === 'line') {
                  const points = [0, 0, element.x2! - element.x, element.y2! - element.y]
                  const lineStyle = element.lineStyle || 'solid'
                  const baseProps = {
                    key: element.id,
                    id: element.id,
                    points,
                    x: element.x,
                    y: element.y,
                    stroke: element.stroke || '#000000',
                    fill: element.fill || element.stroke || '#000000',
                    strokeWidth: element.strokeWidth || 2,
                    draggable: true,
                    ...commonHandlers,
                  }

                  // Стрелки
                  if (lineStyle === 'arrow-end') {
                    return <KonvaArrow {...baseProps} pointerLength={10} pointerWidth={10} />
                  }
                  if (lineStyle === 'arrow-both') {
                    return <KonvaArrow {...baseProps} pointerLength={10} pointerWidth={10} pointerAtBeginning />
                  }
                  if (lineStyle === 'arrow-dot') {
                    return (
                      <KonvaGroup key={element.id} draggable {...commonHandlers}>
                        <KonvaCircle
                          x={element.x}
                          y={element.y}
                          radius={element.strokeWidth || 2}
                          fill={element.stroke || '#000000'}
                        />
                        <KonvaArrow
                          {...baseProps}
                          draggable={false}
                          pointerLength={10}
                          pointerWidth={10}
                        />
                      </KonvaGroup>
                    )
                  }
                  // Пунктир
                  if (lineStyle === 'dashed') {
                    return <KonvaLine {...baseProps} dash={[10, 5]} />
                  }
                  if (lineStyle === 'dotted') {
                    return <KonvaLine {...baseProps} dash={[2, 4]} />
                  }
                  // Сплошная
                  return <KonvaLine {...baseProps} />
                }

                // Фигура (с поддержкой разных типов)
                if (element.type === 'shape') {
                  const shapeType = element.shapeType || 'rectangle'
                  const baseProps = {
                    key: element.id,
                    id: element.id,
                    stroke: element.stroke || '#000000',
                    strokeWidth: element.strokeWidth || 2,
                    fill: element.fill || 'transparent',
                    draggable: true,
                    ...commonHandlers,
                  }

                  // Круг (width === height)
                  if (shapeType === 'circle') {
                    const radius = Math.min(element.width, element.height) / 2
                    return (
                      <KonvaCircle
                        {...baseProps}
                        x={element.x}
                        y={element.y}
                        offsetX={-element.width / 2}
                        offsetY={-element.height / 2}
                        radius={radius}
                      />
                    )
                  }

                  // Эллипс
                  if (shapeType === 'ellipse') {
                    return (
                      <KonvaEllipse
                        {...baseProps}
                        x={element.x}
                        y={element.y}
                        offsetX={-element.width / 2}
                        offsetY={-element.height / 2}
                        radiusX={element.width / 2}
                        radiusY={element.height / 2}
                      />
                    )
                  }

                  // Прямоугольник
                  if (shapeType === 'rectangle') {
                    return (
                      <KonvaRect
                        {...baseProps}
                        x={element.x}
                        y={element.y}
                        width={element.width}
                        height={element.height}
                        cornerRadius={element.cornerRadius || 0}
                      />
                    )
                  }

                  // Треугольник
                  if (shapeType === 'triangle') {
                    const points = [
                      element.width / 2, 0,
                      element.width, element.height,
                      0, element.height,
                    ]
                    return (
                      <KonvaLine
                        {...baseProps}
                        x={element.x}
                        y={element.y}
                        points={points}
                        closed
                      />
                    )
                  }

                  // Звезда
                  if (shapeType === 'star') {
                    return (
                      <KonvaStar
                        {...baseProps}
                        x={element.x}
                        y={element.y}
                        offsetX={-element.width / 2}
                        offsetY={-element.height / 2}
                        numPoints={5}
                        innerRadius={Math.min(element.width, element.height) / 4}
                        outerRadius={Math.min(element.width, element.height) / 2}
                      />
                    )
                  }

                  // Шестиугольник
                  if (shapeType === 'hexagon') {
                    return (
                      <KonvaRegularPolygon
                        {...baseProps}
                        x={element.x}
                        y={element.y}
                        offsetX={-element.width / 2}
                        offsetY={-element.height / 2}
                        sides={6}
                        radius={Math.min(element.width, element.height) / 2}
                      />
                    )
                  }

                  // По умолчанию прямоугольник
                  return (
                    <KonvaRect
                      {...baseProps}
                      x={element.x}
                      y={element.y}
                      width={element.width}
                      height={element.height}
                    />
                  )
                }

                // Номер
                if (element.type === 'number') {
                  const numberShape = element.numberShape || 'circle'
                  return (
                    <KonvaGroup
                      key={element.id}
                      id={element.id}
                      draggable
                      x={element.x}
                      y={element.y}
                      {...commonHandlers}
                    >
                      {/* Форма контура */}
                      {numberShape === 'circle' && (
                        <KonvaCircle
                          x={element.width / 2}
                          y={element.height / 2}
                          radius={element.width / 2}
                          stroke={element.stroke || '#000000'}
                          strokeWidth={element.strokeWidth || 2}
                          fill="#ffffff"
                        />
                      )}
                      {numberShape === 'square' && (
                        <KonvaRect
                          width={element.width}
                          height={element.height}
                          stroke={element.stroke || '#000000'}
                          strokeWidth={element.strokeWidth || 2}
                          fill="#ffffff"
                        />
                      )}
                      {numberShape === 'triangle' && (
                        <KonvaLine
                          points={[
                            element.width / 2, 0,
                            element.width, element.height,
                            0, element.height,
                          ]}
                          closed
                          stroke={element.stroke || '#000000'}
                          strokeWidth={element.strokeWidth || 2}
                          fill="#ffffff"
                        />
                      )}
                      {numberShape === 'star' && (
                        <KonvaStar
                          x={element.width / 2}
                          y={element.height / 2}
                          numPoints={5}
                          innerRadius={element.width / 4}
                          outerRadius={element.width / 2}
                          stroke={element.stroke || '#000000'}
                          strokeWidth={element.strokeWidth || 2}
                          fill="#ffffff"
                        />
                      )}
                      {/* Текст номера */}
                      <KonvaText
                        text={String(element.numberValue || 1)}
                        width={element.width}
                        height={element.height}
                        fontSize={element.fontSize || 24}
                        fill={element.fill || '#000000'}
                        align="center"
                        verticalAlign="middle"
                        fontStyle="bold"
                      />
                    </KonvaGroup>
                  )
                }

                // Список
                if (element.type === 'list') {
                  const items = element.items || ['Пункт 1', 'Пункт 2', 'Пункт 3']
                  const listStyle = element.listStyle || 'numbered'
                  const lineHeight = 24
                  const topPadding = 10
                  const bottomPadding = 10
                  
                  // Ограничить количество отображаемых элементов
                  const maxVisibleItems = Math.floor((element.height - topPadding - bottomPadding) / lineHeight)
                  const visibleItems = items.slice(0, maxVisibleItems)
                  
                  return (
                    <KonvaGroup
                      key={element.id}
                      id={element.id}
                      draggable
                      x={element.x}
                      y={element.y}
                      clipFunc={(ctx: any) => {
                        ctx.rect(0, 0, element.width, element.height)
                      }}
                      {...commonHandlers}
                    >
                      <KonvaRect
                        width={element.width}
                        height={element.height}
                        stroke={element.stroke || '#d1d5db'}
                        strokeWidth={1}
                        fill={element.fill || '#ffffff'}
                      />
                      {visibleItems.map((item, index) => (
                        <KonvaText
                          key={index}
                          text={listStyle === 'numbered' ? `${index + 1}. ${item}` : listStyle === 'bulleted' ? `• ${item}` : `☐ ${item}`}
                          x={10}
                          y={topPadding + index * lineHeight}
                          width={element.width - 20}
                          fontSize={14}
                          fill="#000000"
                          ellipsis
                        />
                      ))}
                    </KonvaGroup>
                  )
                }

                // Чекбокс
                if (element.type === 'checkbox') {
                  const size = Math.min(element.width, element.height)
                  const isChecked = element.checkboxChecked ?? true
                  const symbol = element.checkboxSymbol || 'check'
                  
                  return (
                    <KonvaGroup
                      key={element.id}
                      id={element.id}
                      draggable
                      x={element.x}
                      y={element.y}
                      {...commonHandlers}
                    >
                      <KonvaRect
                        width={size}
                        height={size}
                        stroke={element.stroke || '#000000'}
                        strokeWidth={2}
                        fill={element.fill || '#ffffff'}
                        cornerRadius={4}
                      />
                      {/* Символ - только если отмечен */}
                      {isChecked && symbol === 'check' && (
                        <KonvaLine
                          points={[
                            size * 0.2, size * 0.5,
                            size * 0.4, size * 0.7,
                            size * 0.8, size * 0.3
                          ]}
                          stroke="#22c55e"
                          strokeWidth={3}
                          lineCap="round"
                          lineJoin="round"
                        />
                      )}
                      {isChecked && symbol === 'cross' && (
                        <>
                          <KonvaLine
                            points={[
                              size * 0.2, size * 0.2,
                              size * 0.8, size * 0.8
                            ]}
                            stroke="#ef4444"
                            strokeWidth={3}
                            lineCap="round"
                          />
                          <KonvaLine
                            points={[
                              size * 0.8, size * 0.2,
                              size * 0.2, size * 0.8
                            ]}
                            stroke="#ef4444"
                            strokeWidth={3}
                            lineCap="round"
                          />
                        </>
                      )}
                      {isChecked && symbol === 'dot' && (
                        <KonvaCircle
                          x={size / 2}
                          y={size / 2}
                          radius={size * 0.2}
                          fill="#3b82f6"
                        />
                      )}
                    </KonvaGroup>
                  )
                }

                // Таблица
                if (element.type === 'table') {
                  const rows = element.tableRows || 3
                  const cols = element.tableCols || 3
                  const cellWidth = element.width / cols
                  const cellHeight = element.height / rows
                  
                  return (
                    <KonvaGroup
                      key={element.id}
                      id={element.id}
                      draggable
                      x={element.x}
                      y={element.y}
                      {...commonHandlers}
                    >
                      {/* Границы таблицы */}
                      <KonvaRect
                        width={element.width}
                        height={element.height}
                        stroke={element.stroke || '#000000'}
                        strokeWidth={2}
                        fill="transparent"
                      />
                      {/* Горизонтальные линии */}
                      {Array.from({ length: rows - 1 }).map((_, i) => (
                        <KonvaLine
                          key={`h-${i}`}
                          points={[0, (i + 1) * cellHeight, element.width, (i + 1) * cellHeight]}
                          stroke={element.stroke || '#000000'}
                          strokeWidth={1}
                        />
                      ))}
                      {/* Вертикальные линии */}
                      {Array.from({ length: cols - 1 }).map((_, i) => (
                        <KonvaLine
                          key={`v-${i}`}
                          points={[(i + 1) * cellWidth, 0, (i + 1) * cellWidth, element.height]}
                          stroke={element.stroke || '#000000'}
                          strokeWidth={1}
                        />
                      ))}
                    </KonvaGroup>
                  )
                }

                return (
                  <KonvaGroup
                    key={element.id}
                    id={element.id}
                    draggable
                    x={element.x}
                    y={element.y}
                    rotation={element.rotation ?? 0}
                    {...commonHandlers}
                  >
                    <CanvasImageElement element={element} />
                  </KonvaGroup>
                )
              })}
              {/* Кастомные точки для редактирования линий */}
              {selectedElement && selectedElement.type === 'line' && (
                <>
                  {/* Начальная точка */}
                  <KonvaCircle
                    x={selectedElement.x}
                    y={selectedElement.y}
                    radius={6}
                    fill="#2563eb"
                    stroke="#ffffff"
                    strokeWidth={2}
                    draggable
                    onDragMove={(e) => {
                      const node = e.target
                      updateElement(selectedElement.id, {
                        x: node.x(),
                        y: node.y(),
                      })
                    }}
                  />
                  {/* Конечная точка */}
                  <KonvaCircle
                    x={selectedElement.x2 || selectedElement.x + 100}
                    y={selectedElement.y2 || selectedElement.y}
                    radius={6}
                    fill="#2563eb"
                    stroke="#ffffff"
                    strokeWidth={2}
                    draggable
                    onDragMove={(e) => {
                      const node = e.target
                      updateElement(selectedElement.id, {
                        x2: node.x(),
                        y2: node.y(),
                      })
                    }}
                  />
                </>
              )}

              {/* Transformer для остальных элементов */}
              {selectedElement && selectedElement.type !== 'line' && (
                <KonvaTransformer
                  ref={(instance) => {
                    transformerRef.current = instance as any
                  }}
                  rotateEnabled
                  enabledAnchors={['top-left', 'top-center', 'top-right', 'middle-right', 'middle-left', 'bottom-left', 'bottom-center', 'bottom-right']}
                  anchorSize={8}
                  borderStroke="#2563eb"
                  anchorStroke="#2563eb"
                  anchorFill="#93c5fd"
                  boundBoxFunc={(oldBox, newBox) => {
                    // Мягкие минимумы - только защита от слишком маленьких значений
                    const minWidth = 20
                    const minHeight = 20
                    
                    // Если размеры меньше минимальных, корректируем
                    if (newBox.width < minWidth || newBox.height < minHeight) {
                      newBox.width = Math.max(newBox.width, minWidth)
                      newBox.height = Math.max(newBox.height, minHeight)
                    }
                    
                    return newBox
                  }}
                />
              )}
            </KonvaLayer>
          </KonvaStage>
        </div>

        <div className="space-y-4">
          {selectedElement ? (
            <div className="space-y-4 rounded-lg border border-border bg-muted/20 p-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs uppercase text-muted-foreground">Выбрано</div>
                  <div className="text-sm font-medium">
                    {selectedElement.type === 'text' && 'Текстовый блок'}
                    {selectedElement.type === 'image' && 'Изображение'}
                    {selectedElement.type === 'placeholder' && 'Placeholder'}
                    {selectedElement.type === 'instructions' && '📝 Инструкции'}
                    {selectedElement.type === 'grid' && '📐 Сетка'}
                    {selectedElement.type === 'exercise_field' && '🎮 Игровое поле'}
                    {selectedElement.type === 'answer_area' && '✍️ Область ответов'}
                    {selectedElement.type === 'example' && '💡 Пример'}
                    {selectedElement.type === 'line' && '— Линия'}
                    {selectedElement.type === 'shape' && '○ Фигура'}
                    {selectedElement.type === 'number' && '# Номер'}
                    {selectedElement.type === 'list' && '≡ Список'}
                    {selectedElement.type === 'checkbox' && '☑ Чекбокс'}
                    {selectedElement.type === 'table' && '⊞ Таблица'}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Button type="button" variant="ghost" size="icon" onClick={() => removeElement(selectedElement.id)} aria-label="Удалить элемент" title="Удалить">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Управление слоями */}
              <div className="rounded border border-border bg-background p-2">
                <div className="text-xs font-medium text-muted-foreground mb-2">Порядок слоёв</div>
                <div className="grid grid-cols-4 gap-1">
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="sm" 
                    className="h-8 px-2"
                    onClick={() => moveToFront(selectedElement.id)}
                    title="На передний план"
                  >
                    <ChevronsUp className="h-3.5 w-3.5" />
                  </Button>
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="sm"
                    className="h-8 px-2"
                    onClick={() => moveForward(selectedElement.id)}
                    title="Вперёд"
                  >
                    <ArrowUp className="h-3.5 w-3.5" />
                  </Button>
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="sm"
                    className="h-8 px-2"
                    onClick={() => moveBackward(selectedElement.id)}
                    title="Назад"
                  >
                    <ArrowDown className="h-3.5 w-3.5" />
                  </Button>
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="sm"
                    className="h-8 px-2"
                    onClick={() => moveToBack(selectedElement.id)}
                    title="На задний план"
                  >
                    <ChevronsDown className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>

              <div className="space-y-3">
                {/* Для линии — редактируем начало и конец */}
                {selectedElement.type === 'line' ? (
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <label className="space-y-1">
                      <span className="text-muted-foreground">Начало X</span>
                      <Input type="number" value={Math.round(selectedElement.x)} onChange={(event) => updateNumeric(selectedElement.id, 'x', Number(event.target.value))} />
                    </label>
                    <label className="space-y-1">
                      <span className="text-muted-foreground">Начало Y</span>
                      <Input type="number" value={Math.round(selectedElement.y)} onChange={(event) => updateNumeric(selectedElement.id, 'y', Number(event.target.value))} />
                    </label>
                    <label className="space-y-1">
                      <span className="text-muted-foreground">Конец X</span>
                      <Input type="number" value={Math.round(selectedElement.x2 ?? selectedElement.x)} onChange={(event) => updateNumeric(selectedElement.id, 'x2', Number(event.target.value))} />
                    </label>
                    <label className="space-y-1">
                      <span className="text-muted-foreground">Конец Y</span>
                      <Input type="number" value={Math.round(selectedElement.y2 ?? selectedElement.y)} onChange={(event) => updateNumeric(selectedElement.id, 'y2', Number(event.target.value))} />
                    </label>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <label className="space-y-1">
                      <span className="text-muted-foreground">X</span>
                      <Input type="number" value={Math.round(selectedElement.x)} onChange={(event) => updateNumeric(selectedElement.id, 'x', Number(event.target.value))} />
                    </label>
                    <label className="space-y-1">
                      <span className="text-muted-foreground">Y</span>
                      <Input type="number" value={Math.round(selectedElement.y)} onChange={(event) => updateNumeric(selectedElement.id, 'y', Number(event.target.value))} />
                    </label>
                    <label className="space-y-1">
                      <span className="text-muted-foreground">Ширина</span>
                      <Input type="number" value={Math.round(selectedElement.width)} min={20} onChange={(event) => updateNumeric(selectedElement.id, 'width', Number(event.target.value))} />
                    </label>
                    <label className="space-y-1">
                      <span className="text-muted-foreground">Высота</span>
                      <Input type="number" value={Math.round(selectedElement.height)} min={20} onChange={(event) => updateNumeric(selectedElement.id, 'height', Number(event.target.value))} />
                    </label>
                    {selectedElement.type !== 'shape' && (
                      <label className="space-y-1 col-span-2">
                        <span className="text-muted-foreground">Поворот</span>
                        <Input type="number" value={Math.round(selectedElement.rotation ?? 0)} onChange={(event) => updateNumeric(selectedElement.id, 'rotation', Number(event.target.value))} />
                      </label>
                    )}
                  </div>
                )}

                {selectedElement.type === 'text' && (
                  <div className="space-y-3">
                    <label className="space-y-1 text-xs">
                      <span className="text-muted-foreground">Текст</span>
                      <Input value={selectedElement.text ?? ''} onChange={(event) => updateElement(selectedElement.id, { text: event.target.value })} />
                    </label>
                    <label className="space-y-1 text-xs">
                      <span className="text-muted-foreground">Шрифт</span>
                      <select
                        className="w-full rounded border border-border bg-background px-2 py-1.5 text-sm"
                        value={selectedElement.fontFamily ?? 'Arial'}
                        onChange={(event) => updateElement(selectedElement.id, { fontFamily: event.target.value })}
                      >
                        <option value="Arial">Arial</option>
                        <option value="Times New Roman">Times New Roman</option>
                        <option value="Courier New">Courier New</option>
                        <option value="Georgia">Georgia</option>
                        <option value="Verdana">Verdana</option>
                        <option value="Comic Sans MS">Comic Sans MS</option>
                        <option value="Impact">Impact</option>
                        <option value="monospace">Monospace</option>
                      </select>
                    </label>
                    <label className="space-y-1 text-xs">
                      <span className="text-muted-foreground">Размер шрифта</span>
                      <Input
                        type="number"
                        min={8}
                        max={96}
                        value={Math.round(selectedElement.fontSize ?? 20)}
                        onChange={(event) => updateNumeric(selectedElement.id, 'fontSize', Number(event.target.value))}
                      />
                    </label>
                    <label className="space-y-1 text-xs">
                      <span className="text-muted-foreground">Цвет</span>
                      <input
                        type="color"
                        className="h-8 w-full rounded border border-border"
                        value={selectedElement.fill ?? '#1f2937'}
                        onChange={(event) => updateElement(selectedElement.id, { fill: event.target.value })}
                      />
                    </label>
                  </div>
                )}

                {selectedElement.type === 'image' && (
                  <div className="space-y-3 text-xs">
                    <label className="space-y-1">
                      <span className="text-muted-foreground">URL изображения</span>
                      <Input
                        placeholder="https://..."
                        value={selectedElement.url ?? ''}
                        onChange={(event) => updateElement(selectedElement.id, { url: event.target.value })}
                      />
                    </label>
                    <label className="space-y-1">
                      <span className="text-muted-foreground">Прозрачность</span>
                      <Input
                        type="number"
                        step="0.1"
                        min={0}
                        max={1}
                        value={Number(selectedElement.opacity ?? 1).toFixed(1)}
                        onChange={(event) => updateElement(selectedElement.id, { opacity: Number(event.target.value) })}
                      />
                    </label>
                  </div>
                )}

                {/* Контролы для линии */}
                {selectedElement.type === 'line' && (
                  <div className="space-y-3 text-xs">
                    <label className="space-y-1">
                      <span className="text-muted-foreground">Тип линии</span>
                      <select
                        className="w-full rounded border border-border bg-background px-2 py-1.5 text-sm"
                        value={selectedElement.lineStyle ?? 'solid'}
                        onChange={(event) => updateElement(selectedElement.id, { lineStyle: event.target.value as any })}
                      >
                        <option value="solid">Сплошная</option>
                        <option value="dashed">Пунктир</option>
                        <option value="dotted">Точки</option>
                        <option value="arrow-end">Стрелка →</option>
                        <option value="arrow-both">Двунаправленная ⟷</option>
                        <option value="arrow-dot">Стрелка с точкой •→</option>
                      </select>
                    </label>
                    <label className="space-y-1">
                      <span className="text-muted-foreground">Цвет линии</span>
                      <input
                        type="color"
                        className="h-8 w-full rounded border border-border"
                        value={selectedElement.stroke ?? '#000000'}
                        onChange={(event) => updateElement(selectedElement.id, { stroke: event.target.value, fill: event.target.value })}
                      />
                    </label>
                    <label className="space-y-1">
                      <span className="text-muted-foreground">Толщина</span>
                      <Input
                        type="number"
                        min={1}
                        max={20}
                        value={selectedElement.strokeWidth ?? 2}
                        onChange={(event) => updateNumeric(selectedElement.id, 'strokeWidth', Number(event.target.value))}
                      />
                    </label>
                  </div>
                )}

                {/* Контролы для фигуры */}
                {selectedElement.type === 'shape' && (
                  <div className="space-y-3 text-xs">
                    <label className="space-y-1">
                      <span className="text-muted-foreground">Тип фигуры</span>
                      <select
                        className="w-full rounded border border-border bg-background px-2 py-1.5 text-sm"
                        value={selectedElement.shapeType ?? 'rectangle'}
                        onChange={(event) => updateElement(selectedElement.id, { shapeType: event.target.value as any })}
                      >
                        <option value="rectangle">Прямоугольник</option>
                        <option value="circle">Круг</option>
                        <option value="ellipse">Эллипс</option>
                        <option value="triangle">Треугольник</option>
                        <option value="star">Звезда</option>
                        <option value="hexagon">Шестиугольник</option>
                      </select>
                    </label>
                    <label className="space-y-1">
                      <span className="text-muted-foreground">Цвет обводки</span>
                      <input
                        type="color"
                        className="h-8 w-full rounded border border-border"
                        value={selectedElement.stroke ?? '#000000'}
                        onChange={(event) => updateElement(selectedElement.id, { stroke: event.target.value })}
                      />
                    </label>
                    <label className="space-y-1">
                      <span className="text-muted-foreground">Толщина обводки</span>
                      <Input
                        type="number"
                        min={1}
                        max={20}
                        value={selectedElement.strokeWidth ?? 2}
                        onChange={(event) => updateNumeric(selectedElement.id, 'strokeWidth', Number(event.target.value))}
                      />
                    </label>
                    <label className="space-y-1">
                      <span className="text-muted-foreground">Заливка</span>
                      <select
                        className="w-full rounded border border-border bg-background px-2 py-1.5 text-sm"
                        value={selectedElement.fill === 'transparent' ? 'transparent' : 'color'}
                        onChange={(event) => updateElement(selectedElement.id, { fill: event.target.value === 'transparent' ? 'transparent' : '#ffffff' })}
                      >
                        <option value="transparent">Прозрачная</option>
                        <option value="color">Цветная</option>
                      </select>
                    </label>
                    {selectedElement.fill !== 'transparent' && (
                      <input
                        type="color"
                        className="h-8 w-full rounded border border-border"
                        value={selectedElement.fill ?? '#ffffff'}
                        onChange={(event) => updateElement(selectedElement.id, { fill: event.target.value })}
                      />
                    )}
                    {selectedElement.shapeType === 'rectangle' && (
                      <label className="space-y-1">
                        <span className="text-muted-foreground">Скругление углов</span>
                        <Input
                          type="number"
                          min={0}
                          max={50}
                          value={selectedElement.cornerRadius ?? 0}
                          onChange={(event) => updateNumeric(selectedElement.id, 'cornerRadius', Number(event.target.value))}
                        />
                      </label>
                    )}
                  </div>
                )}


                {/* Контролы для номера */}
                {selectedElement.type === 'number' && (
                  <div className="space-y-3 text-xs">
                    <label className="space-y-1">
                      <span className="text-muted-foreground">Форма контура</span>
                      <select
                        className="w-full rounded border border-border bg-background px-2 py-1.5 text-sm"
                        value={selectedElement.numberShape ?? 'circle'}
                        onChange={(event) => updateElement(selectedElement.id, { numberShape: event.target.value as any })}
                      >
                        <option value="circle">Круг</option>
                        <option value="square">Квадрат</option>
                        <option value="triangle">Треугольник</option>
                        <option value="star">Звезда</option>
                        <option value="none">Без контура</option>
                      </select>
                    </label>
                    <label className="space-y-1">
                      <span className="text-muted-foreground">Номер</span>
                      <Input
                        type="number"
                        min={1}
                        max={999}
                        value={selectedElement.numberValue ?? 1}
                        onChange={(event) => updateNumeric(selectedElement.id, 'numberValue', Number(event.target.value))}
                      />
                    </label>
                    <label className="space-y-1">
                      <span className="text-muted-foreground">Размер шрифта</span>
                      <Input
                        type="number"
                        min={12}
                        max={72}
                        value={selectedElement.fontSize ?? 24}
                        onChange={(event) => updateNumeric(selectedElement.id, 'fontSize', Number(event.target.value))}
                      />
                    </label>
                    <label className="space-y-1">
                      <span className="text-muted-foreground">Цвет текста</span>
                      <input
                        type="color"
                        className="h-8 w-full rounded border border-border"
                        value={selectedElement.fill ?? '#000000'}
                        onChange={(event) => updateElement(selectedElement.id, { fill: event.target.value })}
                      />
                    </label>
                    {selectedElement.numberShape !== 'none' && (
                      <label className="space-y-1">
                        <span className="text-muted-foreground">Цвет контура</span>
                        <input
                          type="color"
                          className="h-8 w-full rounded border border-border"
                          value={selectedElement.stroke ?? '#000000'}
                          onChange={(event) => updateElement(selectedElement.id, { stroke: event.target.value })}
                        />
                      </label>
                    )}
                  </div>
                )}

                {/* Контролы для списка */}
                {selectedElement.type === 'list' && (
                  <div className="space-y-3 text-xs">
                    <label className="space-y-1">
                      <span className="text-muted-foreground">Стиль списка</span>
                      <select
                        className="w-full rounded border border-border bg-background px-2 py-1.5 text-sm"
                        value={selectedElement.listStyle ?? 'numbered'}
                        onChange={(event) => updateElement(selectedElement.id, { listStyle: event.target.value as any })}
                      >
                        <option value="numbered">Нумерованный (1. 2. 3.)</option>
                        <option value="bulleted">Маркированный (• • •)</option>
                        <option value="checkbox">Чекбоксы (☐ ☐ ☐)</option>
                      </select>
                    </label>
                    <div className="space-y-1">
                      <div className="text-muted-foreground text-xs">Элементы списка:</div>
                      <div className="max-h-48 overflow-y-auto space-y-1 pr-1">
                        {(selectedElement.items || ['Пункт 1', 'Пункт 2', 'Пункт 3']).map((item, index) => (
                          <div key={index} className="flex gap-1">
                            <Input
                              value={item}
                              onChange={(e) => {
                                const newItems = [...(selectedElement.items || ['Пункт 1', 'Пункт 2', 'Пункт 3'])]
                                newItems[index] = e.target.value
                                updateElement(selectedElement.id, { items: newItems })
                              }}
                              className="text-xs h-7"
                            />
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 px-2"
                              onClick={() => {
                                const newItems = (selectedElement.items || ['Пункт 1', 'Пункт 2', 'Пункт 3']).filter((_, i) => i !== index)
                                updateElement(selectedElement.id, { items: newItems })
                              }}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        ))}
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        className="w-full h-7 text-xs"
                        onClick={() => {
                          const newItems = [...(selectedElement.items || ['Пункт 1', 'Пункт 2', 'Пункт 3']), `Пункт ${(selectedElement.items?.length || 3) + 1}`]
                          updateElement(selectedElement.id, { items: newItems })
                        }}
                      >
                        <Plus className="h-3 w-3 mr-1" /> Добавить
                      </Button>
                    </div>
                    <label className="space-y-1">
                      <span className="text-muted-foreground">Цвет обводки</span>
                      <input
                        type="color"
                        className="h-8 w-full rounded border border-border"
                        value={selectedElement.stroke ?? '#d1d5db'}
                        onChange={(event) => updateElement(selectedElement.id, { stroke: event.target.value })}
                      />
                    </label>
                    <label className="space-y-1">
                      <span className="text-muted-foreground">Цвет фона</span>
                      <input
                        type="color"
                        className="h-8 w-full rounded border border-border"
                        value={selectedElement.fill ?? '#ffffff'}
                        onChange={(event) => updateElement(selectedElement.id, { fill: event.target.value })}
                      />
                    </label>
                  </div>
                )}

                {/* Контролы для чекбокса */}
                {selectedElement.type === 'checkbox' && (
                  <div className="space-y-3 text-xs">
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={selectedElement.checkboxChecked ?? true}
                        onChange={(event) => updateElement(selectedElement.id, { checkboxChecked: event.target.checked })}
                        className="h-4 w-4"
                      />
                      <span className="text-muted-foreground">Отмечен</span>
                    </label>
                    <label className="space-y-1">
                      <span className="text-muted-foreground">Символ отметки</span>
                      <select
                        className="w-full rounded border border-border bg-background px-2 py-1.5 text-sm"
                        value={selectedElement.checkboxSymbol ?? 'check'}
                        onChange={(event) => updateElement(selectedElement.id, { checkboxSymbol: event.target.value as any })}
                      >
                        <option value="check">Галочка ✓</option>
                        <option value="cross">Крестик ✕</option>
                        <option value="dot">Точка •</option>
                      </select>
                    </label>
                    <label className="space-y-1">
                      <span className="text-muted-foreground">Цвет обводки</span>
                      <input
                        type="color"
                        className="h-8 w-full rounded border border-border"
                        value={selectedElement.stroke ?? '#000000'}
                        onChange={(event) => updateElement(selectedElement.id, { stroke: event.target.value })}
                      />
                    </label>
                    <label className="space-y-1">
                      <span className="text-muted-foreground">Цвет фона</span>
                      <input
                        type="color"
                        className="h-8 w-full rounded border border-border"
                        value={selectedElement.fill ?? '#ffffff'}
                        onChange={(event) => updateElement(selectedElement.id, { fill: event.target.value })}
                      />
                    </label>
                  </div>
                )}

                {/* Контролы для таблицы */}
                {selectedElement.type === 'table' && (
                  <div className="space-y-3 text-xs">
                    <label className="space-y-1">
                      <span className="text-muted-foreground">Количество строк</span>
                      <Input
                        type="number"
                        min={1}
                        max={10}
                        value={selectedElement.tableRows ?? 3}
                        onChange={(event) => updateNumeric(selectedElement.id, 'tableRows', Number(event.target.value))}
                      />
                    </label>
                    <label className="space-y-1">
                      <span className="text-muted-foreground">Количество столбцов</span>
                      <Input
                        type="number"
                        min={1}
                        max={10}
                        value={selectedElement.tableCols ?? 3}
                        onChange={(event) => updateNumeric(selectedElement.id, 'tableCols', Number(event.target.value))}
                      />
                    </label>
                    <label className="space-y-1">
                      <span className="text-muted-foreground">Цвет линий</span>
                      <input
                        type="color"
                        className="h-8 w-full rounded border border-border"
                        value={selectedElement.stroke ?? '#000000'}
                        onChange={(event) => updateElement(selectedElement.id, { stroke: event.target.value })}
                      />
                    </label>
                  </div>
                )}

                {selectedElement.type === 'placeholder' && (
                  <div className="space-y-3 text-xs">
                    <label className="space-y-1">
                      <span className="text-muted-foreground">Название</span>
                      <Input value={selectedElement.name ?? 'Placeholder'} onChange={(event) => updateElement(selectedElement.id, { name: event.target.value })} />
                    </label>
                    <label className="space-y-1">
                      <span className="text-muted-foreground">Фон</span>
                      <input
                        type="color"
                        className="h-8 w-full rounded border border-border"
                        value={selectedElement.fill ?? '#fef3c7'}
                        onChange={(event) => updateElement(selectedElement.id, { fill: event.target.value })}
                      />
                    </label>
                    <label className="space-y-1">
                      <span className="text-muted-foreground">Цвет рамки</span>
                      <input
                        type="color"
                        className="h-8 w-full rounded border border-border"
                        value={selectedElement.stroke ?? '#f59e0b'}
                        onChange={(event) => updateElement(selectedElement.id, { stroke: event.target.value })}
                      />
                    </label>
                  </div>
                )}
                
                {/* Настройки оформления для инструкций и других элементов */}
                {(selectedElement.type === 'instructions' || selectedElement.type === 'placeholder' || selectedElement.type === 'grid' || selectedElement.type === 'answer_area' || selectedElement.type === 'example') && (
                  <div className="space-y-2 text-xs pt-2 border-t border-border">
                    <div className="text-xs font-medium text-foreground mb-2">Оформление</div>
                    <div className="grid grid-cols-2 gap-2">
                      <label className="space-y-1">
                        <span className="text-muted-foreground">Цвет фона</span>
                        <input
                          type="color" 
                          value={selectedElement.fill || "#ffffff"} 
                          onChange={(e) => updateElement(selectedElement.id, { fill: e.target.value })}
                          className="h-8 w-full rounded border border-border"
                        />
                      </label>
                      <label className="space-y-1">
                        <span className="text-muted-foreground">Цвет рамки</span>
                        <input
                          type="color" 
                          value={selectedElement.stroke || "#000000"} 
                          onChange={(e) => updateElement(selectedElement.id, { stroke: e.target.value })}
                          className="h-8 w-full rounded border border-border"
                        />
                      </label>
                    </div>
                    <label className="space-y-1">
                      <span className="text-muted-foreground">Толщина рамки</span>
                      <Input
                        type="number"
                        min={0}
                        max={10}
                        step={0.5}
                        value={selectedElement.strokeWidth ?? 1}
                        onChange={(e) => updateNumeric(selectedElement.id, 'strokeWidth', Number(e.target.value))}
                      />
                    </label>
                  </div>
                )}
                
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border bg-muted/20 p-6 text-center text-xs text-muted-foreground">
              <Plus className="mb-2 h-5 w-5" />
              <div>Выберите элемент на макете,<br/>чтобы изменить его параметры</div>
            </div>
          )}

          <div className="rounded-lg border border-border bg-muted/20 p-3 text-xs text-muted-foreground">
            <div className="font-medium text-foreground">Снимок макета</div>
            {snapshot ? (
              <div className="mt-2 overflow-hidden rounded border border-border">
                <img src={snapshot} alt="Предпросмотр макета" className="h-auto w-full" />
              </div>
            ) : (
              <p className="mt-2">Добавьте элементы, чтобы увидеть предпросмотр.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

WorksheetLayoutCanvas.displayName = 'WorksheetLayoutCanvas'
