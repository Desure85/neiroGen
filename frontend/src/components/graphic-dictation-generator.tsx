"use client"

import { GraphicDictationEditor } from "./graphic-dictation-editor"

interface GraphicDictationGeneratorProps {
  onResult?: (payload: any) => void
  initialPayload?: any
}

export function GraphicDictationGenerator({ onResult, initialPayload }: GraphicDictationGeneratorProps) {
  return <GraphicDictationEditor onSave={onResult} initialPayload={initialPayload} />
}
