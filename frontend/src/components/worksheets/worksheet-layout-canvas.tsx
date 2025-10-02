'use client'

import React from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { Trash2, Plus, Type, ImageIcon, LayoutTemplate, Printer } from 'lucide-react'
import type Konva from 'konva'
import type { CanvasElement, CanvasLayoutValue, CanvasElementType, CanvasScene } from '@/components/worksheets/worksheet-layout-types'

interface WorksheetLayoutCanvasProps {
  value: CanvasLayoutValue
  onChange: (value: CanvasLayoutValue) => void
  className?: string
  exerciseType?: string
  exerciseData?: any
  instructions?: string[]
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

export const WorksheetLayoutCanvas: React.FC<WorksheetLayoutCanvasProps> = ({ value, onChange, className, exerciseType, exerciseData, instructions }) => {
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
  
  // Очистка таймера при размонтировании
  React.useEffect(() => {
    return () => {
      if (emitChangeTimeoutRef.current) {
        clearTimeout(emitChangeTimeoutRef.current)
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
        const nextSnapshot = updateSnapshot()
        emitChange(nextScene, nextSnapshot)
        return nextScene
      })
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

  const addElement = React.useCallback(
    (type: CanvasElementType) => {
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
      
      const base: CanvasElement = {
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
    if (event.target === event.target.getStage()) {
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
    
    // Минимальные размеры
    if (key === 'width') value = Math.max(100, value)
    if (key === 'height') value = Math.max(60, value)
    
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

  const { Stage: KonvaStage, Layer: KonvaLayer, Rect: KonvaRect, Group: KonvaGroup, Text: KonvaText, Image: KonvaImage, Line: KonvaLine, Transformer: KonvaTransformer } = konvaModule

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
      <div className="space-y-2">
        <div className="flex justify-between items-center mb-3">
          <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Визуальный макет упражнения</div>
          <Button type="button" size="sm" variant="default" onClick={handlePrintLayout}>
            <Printer className="mr-2 h-4 w-4" /> Печать макета
          </Button>
        </div>
        
        <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Базовые элементы</div>
        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" size="sm" variant="outline" onClick={() => addElement('text')}>
            <Type className="mr-2 h-4 w-4" /> Текст
          </Button>
          <Button type="button" size="sm" variant="outline" onClick={() => addElement('image')}>
            <ImageIcon className="mr-2 h-4 w-4" /> Изображение
          </Button>
          <Button type="button" size="sm" variant="outline" onClick={() => addElement('placeholder')}>
            <LayoutTemplate className="mr-2 h-4 w-4" /> Placeholder
          </Button>
        </div>
        
        <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide mt-3">Элементы упражнения</div>
        <div className="flex flex-wrap items-center gap-2">
          {/* Инструкции - для всех типов */}
          <Button type="button" size="sm" variant="outline" onClick={() => addElement('instructions')}>
            📝 Инструкции
          </Button>
          
          {/* Сетка - только для графического диктанта */}
          {exerciseType === 'graphic_dictation' && (
            <Button type="button" size="sm" variant="outline" onClick={() => addElement('grid')}>
              📐 Сетка
            </Button>
          )}
          
          {/* Игровое поле - для всех кроме графического диктанта */}
          {exerciseType !== 'graphic_dictation' && (
            <Button type="button" size="sm" variant="outline" onClick={() => addElement('exercise_field')}>
              🎮 Игровое поле
            </Button>
          )}
          
          {/* Область ответов - для всех кроме графического диктанта */}
          {exerciseType !== 'graphic_dictation' && (
            <Button type="button" size="sm" variant="outline" onClick={() => addElement('answer_area')}>
              ✍️ Область ответов
            </Button>
          )}
          
          {/* Пример - для всех кроме графического диктанта */}
          {exerciseType !== 'graphic_dictation' && (
            <Button type="button" size="sm" variant="outline" onClick={() => addElement('example')}>
              💡 Пример
            </Button>
          )}
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
              <KonvaRect width={scene.width} height={scene.height} fill="#ffffff" stroke="#e2e8f0" strokeWidth={2} />
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
                    node.scaleX(1)
                    node.scaleY(1)
                    const newWidth = Math.max(100, node.width() * scaleX)
                    const newHeight = Math.max(60, node.height() * scaleY)
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
                  // Минимальные размеры
                  const minWidth = 100
                  const minHeight = 60
                  
                  // Если размеры меньше минимальных, корректируем
                  if (newBox.width < minWidth || newBox.height < minHeight) {
                    newBox.width = Math.max(newBox.width, minWidth)
                    newBox.height = Math.max(newBox.height, minHeight)
                  }
                  
                  return newBox
                }}
              />
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
                  </div>
                </div>
                <Button type="button" variant="ghost" size="icon" onClick={() => removeElement(selectedElement.id)} aria-label="Удалить элемент">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>

              <div className="space-y-3">
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
                    <Input type="number" value={Math.round(selectedElement.width)} min={100} onChange={(event) => updateNumeric(selectedElement.id, 'width', Number(event.target.value))} />
                  </label>
                  <label className="space-y-1">
                    <span className="text-muted-foreground">Высота</span>
                    <Input type="number" value={Math.round(selectedElement.height)} min={60} onChange={(event) => updateNumeric(selectedElement.id, 'height', Number(event.target.value))} />
                  </label>
                  <label className="space-y-1 col-span-2">
                    <span className="text-muted-foreground">Поворот</span>
                    <Input type="number" value={Math.round(selectedElement.rotation ?? 0)} onChange={(event) => updateNumeric(selectedElement.id, 'rotation', Number(event.target.value))} />
                  </label>
                </div>

                {selectedElement.type === 'text' && (
                  <div className="space-y-3">
                    <label className="space-y-1 text-xs">
                      <span className="text-muted-foreground">Текст</span>
                      <Input value={selectedElement.text ?? ''} onChange={(event) => updateElement(selectedElement.id, { text: event.target.value })} />
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
                
                {/* Настройки цвета для инструкций */}
                {selectedElement.type === 'instructions' && (
                  <div className="space-y-2 text-xs pt-2 border-t border-border">
                    <div className="grid grid-cols-2 gap-2">
                      <label className="space-y-1">
                        <span className="text-muted-foreground">Цвет фона</span>
                        <Input 
                          type="color" 
                          value={selectedElement.fill || "#ffffff"} 
                          onChange={(e) => updateElement(selectedElement.id, { fill: e.target.value })}
                          className="h-8"
                        />
                      </label>
                      <label className="space-y-1">
                        <span className="text-muted-foreground">Цвет рамки</span>
                        <Input 
                          type="color" 
                          value={selectedElement.stroke || "#000000"} 
                          onChange={(e) => updateElement(selectedElement.id, { stroke: e.target.value })}
                          className="h-8"
                        />
                      </label>
                    </div>
                  </div>
                )}
                
                {/* Настройки для элементов упражнений */}
                {(selectedElement.type === 'instructions' || selectedElement.type === 'grid' || selectedElement.type === 'exercise_field' || selectedElement.type === 'answer_area' || selectedElement.type === 'example') && (
                  <div className="space-y-2 text-xs pt-2 border-t border-border">
                    <div className="flex items-center space-x-2">
                      <input 
                        type="checkbox"
                        id={`scale-${selectedElement.id}`}
                        checked={selectedElement.scaleContent !== false}
                        onChange={(e) => updateElement(selectedElement.id, { scaleContent: e.target.checked })}
                        className="h-4 w-4 rounded border-gray-300"
                      />
                      <label htmlFor={`scale-${selectedElement.id}`} className="text-sm font-medium cursor-pointer">
                        Масштабировать содержимое
                      </label>
                    </div>
                    <p className="text-muted-foreground text-xs">
                      Когда выключено, текст выводится в оригинальном размере
                    </p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex h-full flex-col items-center justify-center rounded-lg border border-dashed border-border bg-muted/20 p-3 text-center text-xs text-muted-foreground">
              <Plus className="mb-2 h-5 w-5" />
              Выберите элемент на макете, чтобы изменить его параметры
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
