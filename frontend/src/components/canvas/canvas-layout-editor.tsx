"use client"

import React from 'react'
import { Stage, Layer, Rect, Group, Text as KonvaText, Image as KonvaImage, Transformer } from 'react-konva'
import Konva from 'konva'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { Trash2, Plus, Type, ImageIcon, LayoutTemplate } from 'lucide-react'

const DEFAULT_SCENE_WIDTH = 794 // A4 width at ~96 DPI
const DEFAULT_SCENE_HEIGHT = 1123 // A4 height at ~96 DPI

export type CanvasElementType = 'text' | 'image' | 'placeholder'

export interface CanvasElement {
  id: string
  type: CanvasElementType
  x: number
  y: number
  width: number
  height: number
  rotation?: number
  text?: string
  fontSize?: number
  fill?: string
  url?: string
  name?: string
  stroke?: string
  opacity?: number
}

export interface CanvasScene {
  width: number
  height: number
  elements: CanvasElement[]
}

export interface CanvasLayoutValue {
  scene: CanvasScene
  snapshot?: string | null
}

export const createEmptyCanvasScene = (overrides?: Partial<CanvasScene>): CanvasScene => {
  return {
    width: overrides?.width ?? DEFAULT_SCENE_WIDTH,
    height: overrides?.height ?? DEFAULT_SCENE_HEIGHT,
    elements: overrides?.elements ? [...overrides.elements] : [],
  }
}

interface CanvasLayoutEditorProps {
  value?: CanvasLayoutValue
  onChange?: (value: CanvasLayoutValue) => void
  className?: string
}

type SelectedElementState = {
  id: string | null
}

const generateId = () => `el_${Math.random().toString(36).slice(2, 10)}`

const useCanvasImage = (src?: string) => {
  const [image, setImage] = React.useState<HTMLImageElement | null>(null)

  React.useEffect(() => {
    if (!src) {
      setImage(null)
      return
    }

    let isCancelled = false
    const img = new window.Image()
    img.crossOrigin = 'anonymous'
    img.src = src
    img.onload = () => {
      if (!isCancelled) setImage(img)
    }
    img.onerror = () => {
      if (!isCancelled) setImage(null)
    }

    return () => {
      isCancelled = true
    }
  }, [src])

  return image
}

const CanvasImage: React.FC<{ element: CanvasElement }> = ({ element }) => {
  const image = useCanvasImage(element.url)

  if (!image) {
    return (
      <Group>
        <Rect
          width={element.width}
          height={element.height}
          fill="#f1f5f9"
          stroke="#9ca3af"
          dash={[6, 4]}
        />
        <KonvaText
          width={element.width}
          height={element.height}
          text={element.url ? 'Изображение не загружено' : 'Укажите URL изображения'}
          fill="#64748b"
          align="center"
          verticalAlign="middle"
          fontSize={14}
        />
      </Group>
    )
  }

  return (
    <KonvaImage
      image={image}
      width={element.width}
      height={element.height}
      opacity={element.opacity ?? 1}
    />
  )
}

export const CanvasLayoutEditor: React.FC<CanvasLayoutEditorProps> = ({ value, onChange, className }) => {
  const [scene, setScene] = React.useState<CanvasScene>(() => value?.scene ? { ...value.scene, elements: value.scene.elements.map((el) => ({ ...el })) } : createEmptyCanvasScene())
  const [snapshot, setSnapshot] = React.useState<string | null>(value?.snapshot ?? null)
  const [selected, setSelected] = React.useState<SelectedElementState>({ id: null })
  const stageRef = React.useRef<Konva.Stage | null>(null)
  const transformerRef = React.useRef<Konva.Transformer | null>(null)
  const containerRef = React.useRef<HTMLDivElement | null>(null)
  const [scale, setScale] = React.useState(1)

  React.useEffect(() => {
    if (!value?.scene) return
    setScene({ ...value.scene, elements: value.scene.elements.map((el) => ({ ...el })) })
    setSnapshot(value.snapshot ?? null)
  }, [value?.scene, value?.snapshot])

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
    const transformer = transformerRef.current
    const stage = stageRef.current
    if (!transformer || !stage) return

    if (selected.id) {
      const node = stage.findOne(`#${selected.id}`)
      if (node) {
        transformer.nodes([node as Konva.Node])
        transformer.getLayer()?.batchDraw()
        return
      }
    }

    transformer.nodes([])
    transformer.getLayer()?.batchDraw()
  }, [selected, scene.elements])

  const emitChange = React.useCallback((nextScene: CanvasScene) => {
    requestAnimationFrame(() => {
      const stage = stageRef.current
      const nextSnapshot = stage ? stage.toDataURL({ pixelRatio: 2 }) : null
      setSnapshot(nextSnapshot)
      onChange?.({ scene: nextScene, snapshot: nextSnapshot })
    })
  }, [onChange])

  const updateElement = React.useCallback((id: string, patch: Partial<CanvasElement>) => {
    setScene((prev) => {
      const elements = prev.elements.map((element) => (element.id === id ? { ...element, ...patch } : element))
      const nextScene = { ...prev, elements }
      emitChange(nextScene)
      return nextScene
    })
  }, [emitChange])

  const removeElement = React.useCallback((id: string) => {
    setScene((prev) => {
      const elements = prev.elements.filter((element) => element.id !== id)
      const nextScene = { ...prev, elements }
      emitChange(nextScene)
      return nextScene
    })
    setSelected({ id: null })
  }, [emitChange])

  const addElement = React.useCallback((type: CanvasElementType) => {
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
      emitChange(nextScene)
      return nextScene
    })
    setSelected({ id: base.id })
  }, [emitChange])

  const handleStageMouseDown = (event: Konva.KonvaEventObject<MouseEvent>) => {
    if (event.target === event.target.getStage()) {
      setSelected({ id: null })
    }
  }

  const selectedElement = React.useMemo(() => {
    if (!selected.id) return null
    return scene.elements.find((element) => element.id === selected.id) ?? null
  }, [selected.id, scene.elements])

  const updateNumeric = (id: string, key: keyof CanvasElement, value: number) => {
    if (!Number.isFinite(value)) return
    updateElement(id, { [key]: value } as Partial<CanvasElement>)
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
          <Stage
            ref={(node) => {
              stageRef.current = node as Konva.Stage | null
            }}
            width={scene.width}
            height={scene.height}
            scaleX={scale}
            scaleY={scale}
            className="mx-auto bg-white"
            onMouseDown={handleStageMouseDown}
            onTouchStart={handleStageMouseDown}
          >
            <Layer>
              <Rect width={scene.width} height={scene.height} fill="#ffffff" stroke="#e2e8f0" strokeWidth={2} />
              {scene.elements.map((element) => {
                const isSelected = selected.id === element.id
                const commonHandlers = {
                  onClick: (event: Konva.KonvaEventObject<MouseEvent>) => {
                    event.cancelBubble = true
                    setSelected({ id: element.id })
                  },
                  onTap: (event: Konva.KonvaEventObject<TouchEvent>) => {
                    event.cancelBubble = true
                    setSelected({ id: element.id })
                  },
                  onDragEnd: (event: Konva.KonvaEventObject<DragEvent>) => {
                    updateElement(element.id, {
                      x: event.target.x(),
                      y: event.target.y(),
                    })
                  },
                  onTransformEnd: (event: Konva.KonvaEventObject<Event>) => {
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
                    <Group
                      key={element.id}
                      id={element.id}
                      draggable
                      x={element.x}
                      y={element.y}
                      rotation={element.rotation ?? 0}
                      {...commonHandlers}
                    >
                      <Rect
                        width={element.width}
                        height={element.height}
                        fill={isSelected ? '#e0f2fe' : 'transparent'}
                        cornerRadius={4}
                      />
                      <KonvaText
                        text={element.text ?? ''}
                        width={element.width}
                        height={element.height}
                        fontSize={element.fontSize ?? 24}
                        fill={element.fill ?? '#1f2937'}
                        padding={8}
                      />
                    </Group>
                  )
                }

                if (element.type === 'placeholder') {
                  return (
                    <Group
                      key={element.id}
                      id={element.id}
                      draggable
                      x={element.x}
                      y={element.y}
                      rotation={element.rotation ?? 0}
                      {...commonHandlers}
                    >
                      <Rect
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
                    </Group>
                  )
                }

                return (
                  <Group
                    key={element.id}
                    id={element.id}
                    draggable
                    x={element.x}
                    y={element.y}
                    rotation={element.rotation ?? 0}
                    {...commonHandlers}
                  >
                    <CanvasImage element={element} />
                  </Group>
                )
              })}
              <Transformer
                ref={transformerRef}
                rotateEnabled
                enabledAnchors={["top-left", "top-right", "bottom-left", "bottom-right"]}
                anchorSize={8}
                borderStroke="#2563eb"
                anchorStroke="#2563eb"
                anchorFill="#93c5fd"
              />
            </Layer>
          </Stage>
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
                    <Input
                      type="number"
                      value={Math.round(selectedElement.x)}
                      onChange={(event) => updateNumeric(selectedElement.id, 'x', Number(event.target.value))}
                    />
                  </label>
                  <label className="space-y-1">
                    <span className="text-muted-foreground">Y</span>
                    <Input
                      type="number"
                      value={Math.round(selectedElement.y)}
                      onChange={(event) => updateNumeric(selectedElement.id, 'y', Number(event.target.value))}
                    />
                  </label>
                  <label className="space-y-1">
                    <span className="text-muted-foreground">Ширина</span>
                    <Input
                      type="number"
                      value={Math.round(selectedElement.width)}
                      min={40}
                      onChange={(event) => updateNumeric(selectedElement.id, 'width', Number(event.target.value))}
                    />
                  </label>
                  <label className="space-y-1">
                    <span className="text-muted-foreground">Высота</span>
                    <Input
                      type="number"
                      value={Math.round(selectedElement.height)}
                      min={40}
                      onChange={(event) => updateNumeric(selectedElement.id, 'height', Number(event.target.value))}
                    />
                  </label>
                  <label className="space-y-1 col-span-2">
                    <span className="text-muted-foreground">Поворот</span>
                    <Input
                      type="number"
                      value={Math.round(selectedElement.rotation ?? 0)}
                      onChange={(event) => updateNumeric(selectedElement.id, 'rotation', Number(event.target.value))}
                    />
                  </label>
                </div>

                {selectedElement.type === 'text' && (
                  <div className="space-y-3">
                    <label className="space-y-1 text-xs">
                      <span className="text-muted-foreground">Текст</span>
                      <Input
                        value={selectedElement.text ?? ''}
                        onChange={(event) => updateElement(selectedElement.id, { text: event.target.value })}
                      />
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
                      <Input
                        value={selectedElement.name ?? 'Placeholder'}
                        onChange={(event) => updateElement(selectedElement.id, { name: event.target.value })}
                      />
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

CanvasLayoutEditor.displayName = 'CanvasLayoutEditor'
