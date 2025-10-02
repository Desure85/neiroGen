"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { GraphicDictationEditor } from "./graphic-dictation-editor"

interface GraphicDictationGeneratorProps {
  onResult?: (payload: any) => void
}

export function GraphicDictationGenerator({ onResult }: GraphicDictationGeneratorProps) {
  const [savedPayload, setSavedPayload] = useState<any>(null)

  const handleSave = (payload: any) => {
    setSavedPayload(payload)
    onResult?.(payload)
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Генератор графических диктантов</CardTitle>
          <CardDescription>
            Создавайте графические диктанты с помощью интерактивного редактора.
            Все данные хранятся в формате JSON.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <GraphicDictationEditor onSave={handleSave} />
        </CardContent>
      </Card>

      {savedPayload && (
        <Card>
          <CardHeader>
            <CardTitle>Сохранённый диктант</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="text-xs bg-muted p-4 rounded-md overflow-auto max-h-96">
              {JSON.stringify(savedPayload, null, 2)}
            </pre>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
