"use client"

import React from 'react'

import { WorksheetLayoutCanvas } from '@/components/worksheets/worksheet-layout-canvas'
import {
  createEmptyCanvasScene,
  type CanvasLayoutValue,
  type CanvasScene,
  type CanvasElement,
  type CanvasElementType,
} from '@/components/worksheets/worksheet-layout-types'

interface WorksheetLayoutEditorProps {
  value?: CanvasLayoutValue
  onChange?: (value: CanvasLayoutValue) => void
  className?: string
}

const cloneLayoutValue = (layout: CanvasLayoutValue): CanvasLayoutValue => ({
  scene: {
    ...layout.scene,
    elements: layout.scene.elements.map((element) => ({ ...element })),
  },
  snapshot: layout.snapshot ?? null,
})

const createDefaultLayout = (): CanvasLayoutValue => ({
  scene: createEmptyCanvasScene(),
  snapshot: null,
})

export const WorksheetLayoutEditor: React.FC<WorksheetLayoutEditorProps> = ({ value, onChange, className }) => {
  const [internal, setInternal] = React.useState<CanvasLayoutValue>(() => (value ? cloneLayoutValue(value) : createDefaultLayout()))

  React.useEffect(() => {
    if (!value) return
    setInternal(cloneLayoutValue(value))
  }, [value])

  const handleChange = React.useCallback(
    (next: CanvasLayoutValue) => {
      setInternal(next)
      onChange?.(next)
    },
    [onChange]
  )

  return <WorksheetLayoutCanvas value={internal} onChange={handleChange} className={className} />
}

WorksheetLayoutEditor.displayName = 'WorksheetLayoutEditor'

export { createEmptyCanvasScene } from '@/components/worksheets/worksheet-layout-types'
export type { CanvasLayoutValue, CanvasScene, CanvasElement, CanvasElementType } from '@/components/worksheets/worksheet-layout-types'
