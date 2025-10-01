'use client'

import React from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { Trash2, Plus, Type, ImageIcon, LayoutTemplate } from 'lucide-react'
import type Konva from 'konva'
import type { CanvasElement, CanvasLayoutValue, CanvasElementType, CanvasScene } from '@/components/worksheets/worksheet-layout-types'

interface WorksheetLayoutCanvasProps {
  value: CanvasLayoutValue
  onChange: (value: CanvasLayoutValue) => void
  className?: string
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

export const WorksheetLayoutCanvas: React.FC<WorksheetLayoutCanvasProps> = ({ value, onChange, className }) => {
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

  React.useEffect(() => {
    setScene({
      ...value.scene,
      elements: value.scene.elements.map((el) => ({ ...el })),
    })
    setSnapshot(value.snapshot ?? null)
  }, [value.scene, value.snapshot])

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
      onChange({ scene: nextScene, snapshot: draftSnapshot })
    },
    [onChange]
  )

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
      const base: CanvasElement = {
        id: generateId(),
        type,
        x: 60,
        y: 60,
        width: type === 'text' ? 220 : 200,
        height: type === 'text' ? 80 : 120,
        rotation: 0,
        text: type === 'text' ? 'Новый текст' : undefined,
        fontSize: type === 'text' ? 20 : undefined,
        fill: type === 'placeholder' ? '#fef3c7' : undefined,
        stroke: type === 'placeholder' ? '#f59e0b' : undefined,
        name: type === 'placeholder' ? 'Placeholder' : undefined,
        url: type === 'image' ? '' : undefined,
        opacity: 1,
      }

      setScene((prev) => {
        const nextScene = { ...prev, elements: [...prev.elements, base] }
        const nextSnapshot = updateSnapshot()
        emitChange(nextScene, nextSnapshot)
        return nextScene
      })
      setSelectedId(base.id)
    },
    [emitChange, updateSnapshot]
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
    updateElement(id, { [key]: value } as Partial<CanvasElement>)
  }

  if (!konvaModule) {
    return (
      <div className={cn('flex min-h-[320px] items-center justify-center rounded-lg border border-border bg-muted/20 p-8 text-sm text-muted-foreground', className)}>
        Подготовка Canvas-редактора…
      </div>
    )
  }

  const { Stage: KonvaStage, Layer: KonvaLayer, Rect: KonvaRect, Group: KonvaGroup, Text: KonvaText, Image: KonvaImage, Transformer: KonvaTransformer } = konvaModule

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
      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" size="sm" variant="outline" onClick={() => addElement('text')}>
          <Type className="mr-2 h-4 w-4" /> Добавить текст
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={() => addElement('image')}>
          <ImageIcon className="mr-2 h-4 w-4" /> Добавить изображение
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={() => addElement('placeholder')}>
          <LayoutTemplate className="mr-2 h-4 w-4" /> Добавить placeholder
        </Button>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_260px]">
        <div ref={containerRef} className="relative overflow-hidden rounded-lg border border-border bg-muted/20 p-2">
          <KonvaStage
            ref={(instance) => {
              stageRef.current = instance as unknown as import('konva').Stage | null
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
                    const newWidth = Math.max(40, node.width() * scaleX)
                    const newHeight = Math.max(40, node.height() * scaleY)
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
                  transformerRef.current = instance as unknown as import('konva').Transformer | null
                }}
                rotateEnabled
                enabledAnchors={['top-left', 'top-right', 'bottom-left', 'bottom-right']}
                anchorSize={8}
                borderStroke="#2563eb"
                anchorStroke="#2563eb"
                anchorFill="#93c5fd"
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
                    <Input type="number" value={Math.round(selectedElement.width)} min={40} onChange={(event) => updateNumeric(selectedElement.id, 'width', Number(event.target.value))} />
                  </label>
                  <label className="space-y-1">
                    <span className="text-muted-foreground">Высота</span>
                    <Input type="number" value={Math.round(selectedElement.height)} min={40} onChange={(event) => updateNumeric(selectedElement.id, 'height', Number(event.target.value))} />
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
