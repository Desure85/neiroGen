"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Image from "next/image"
import { Loader2, RefreshCw, Settings2, UploadCloud } from "lucide-react"

import { apiFetch } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"

interface GraphicDictationPayload {
  job_id: string
  status: string
  shards_total: number
  shards_completed: number
  result?: GraphicDictationResult
  error?: string | null
}

export interface GraphicDictationResult {
  commands: Array<{ direction: string; steps: number }>
  preview_image_url?: string | null
  preview_svg_url?: string | null
  instructions?: string[]
  start_row?: number | null
  start_col?: number | null
  error?: string | null
}

interface GraphicDictationGeneratorProps {
  onResult?: (result: GraphicDictationResult) => void
}

interface FormState {
  sourceImage: string
  gridWidth: number
  gridHeight: number
  cellSize: number
  difficulty: "easy" | "medium" | "hard"
  allowDiagonals: boolean
  shards: number
}

const DIFFICULTY_OPTIONS: Array<{ value: FormState["difficulty"]; label: string }> = [
  { value: "easy", label: "Легко" },
  { value: "medium", label: "Средне" },
  { value: "hard", label: "Сложно" },
]

const POLL_INTERVAL_MS = 2500

export function GraphicDictationGenerator({ onResult }: GraphicDictationGeneratorProps) {
  const [form, setForm] = useState<FormState>({
    sourceImage: "",
    gridWidth: 16,
    gridHeight: 16,
    cellSize: 10,
    difficulty: "medium",
    allowDiagonals: false,
    shards: 4,
  })
  const [jobId, setJobId] = useState<string | null>(null)
  const [status, setStatus] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<GraphicDictationResult | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isPolling, setIsPolling] = useState(false)

  const hasResult = useMemo(() => Boolean(result?.commands?.length), [result])

  const reset = useCallback(() => {
    setJobId(null)
    setStatus(null)
    setError(null)
    setResult(null)
    setIsPolling(false)
  }, [])

  const submit = useCallback(async () => {
    setIsSubmitting(true)
    setError(null)
    setResult(null)
    setStatus(null)

    try {
      const response = await apiFetch("/api/generator/graphic-dictation", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          source_image: form.sourceImage.trim(),
          grid_width: Number(form.gridWidth),
          grid_height: Number(form.gridHeight),
          cell_size_mm: Number(form.cellSize),
          difficulty: form.difficulty,
          allow_diagonals: form.allowDiagonals,
          shards: Number(form.shards),
        }),
      })

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}))
        throw new Error(payload?.message || `Ошибка ${response.status}`)
      }

      const payload = (await response.json()) as { job_id: string; status: string }
      setJobId(payload.job_id)
      setStatus(payload.status)
      setIsPolling(true)
    } catch (err: any) {
      setError(err?.message || "Не удалось отправить задачу")
    } finally {
      setIsSubmitting(false)
    }
  }, [form])

  useEffect(() => {
    if (!jobId || !isPolling) {
      return
    }

    let isCancelled = false
    const timer = setInterval(async () => {
      try {
        const response = await apiFetch(`/api/generator/graphic-dictation/${jobId}`)
        if (!response.ok) {
          throw new Error(`Ошибка ${response.status}`)
        }
        const data = (await response.json()) as GraphicDictationPayload
        if (isCancelled) return
        setStatus(data.status)

        if (data.status === "failed") {
          setError(data.error || "Ошибка генерации")
          setIsPolling(false)
          return
        }

        if (data.status === "completed" && data.result) {
          setResult(data.result)
          setIsPolling(false)
          onResult?.(data.result)
        }
      } catch (err: any) {
        if (isCancelled) return
        setError(err?.message || "Ошибка при получении статуса")
        setIsPolling(false)
      }
    }, POLL_INTERVAL_MS)

    return () => {
      isCancelled = true
      clearInterval(timer)
    }
  }, [jobId, isPolling, onResult])

  const instructionsText = useMemo(() => {
    if (!result?.instructions?.length) return ""
    return result.instructions.join("\n")
  }, [result])

  return (
    <Card className="border border-border">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings2 className="h-5 w-5" />
          Генератор графического диктанта
        </CardTitle>
        <CardDescription>
          Задайте параметры поля и укажите источник изображения. Генерация асинхронная, результат появится ниже.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2 space-y-3">
            <Label htmlFor="gd-source">URL исходного изображения</Label>
            <Input
              id="gd-source"
              placeholder="Например: /storage/images/sample.png"
              value={form.sourceImage}
              onChange={(e) => setForm((prev) => ({ ...prev, sourceImage: e.target.value }))}
            />
            <p className="text-xs text-muted-foreground">
              Изображение должно быть доступно серверу. Используйте путь до файла или прямой URL.
            </p>
          </div>
          <div className="space-y-3">
            <Label htmlFor="gd-shards">Шардов</Label>
            <Input
              id="gd-shards"
              type="number"
              min={1}
              max={16}
              value={form.shards}
              onChange={(e) => setForm((prev) => ({ ...prev, shards: Number(e.target.value || 1) }))}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <Label htmlFor="gd-width">Ширина сетки</Label>
            <Input
              id="gd-width"
              type="number"
              min={4}
              max={64}
              value={form.gridWidth}
              onChange={(e) => setForm((prev) => ({ ...prev, gridWidth: Number(e.target.value || 4) }))}
            />
          </div>
          <div>
            <Label htmlFor="gd-height">Высота сетки</Label>
            <Input
              id="gd-height"
              type="number"
              min={4}
              max={64}
              value={form.gridHeight}
              onChange={(e) => setForm((prev) => ({ ...prev, gridHeight: Number(e.target.value || 4) }))}
            />
          </div>
          <div>
            <Label htmlFor="gd-cell">Размер клетки (мм)</Label>
            <Input
              id="gd-cell"
              type="number"
              min={5}
              max={20}
              value={form.cellSize}
              onChange={(e) => setForm((prev) => ({ ...prev, cellSize: Number(e.target.value || 10) }))}
            />
          </div>
          <div>
            <Label htmlFor="gd-difficulty">Сложность</Label>
            <select
              id="gd-difficulty"
              className="w-full rounded-md border border-border bg-background p-2 text-sm"
              value={form.difficulty}
              onChange={(e) => setForm((prev) => ({ ...prev, difficulty: e.target.value as FormState["difficulty"] }))}
            >
              {DIFFICULTY_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex items-center justify-between rounded-md border border-dashed border-border bg-muted/30 px-3 py-2">
          <div className="space-y-1">
            <Label htmlFor="gd-diagonals">Разрешить диагональные шаги</Label>
            <p className="text-xs text-muted-foreground">Включает диагональные движения в инструкции диктанта</p>
          </div>
          <Switch
            id="gd-diagonals"
            checked={form.allowDiagonals}
            onCheckedChange={(checked) => setForm((prev) => ({ ...prev, allowDiagonals: checked }))}
          />
        </div>

        {error && (
          <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="flex flex-wrap gap-3">
          <Button onClick={submit} disabled={isSubmitting || !form.sourceImage.trim()}>
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Отправка...
              </>
            ) : (
              <>
                <UploadCloud className="mr-2 h-4 w-4" />
                Сгенерировать
              </>
            )}
          </Button>
          <Button type="button" variant="outline" onClick={reset} disabled={!jobId && !result}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Сбросить
          </Button>
          {status && (
            <span className="inline-flex items-center rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
              Статус: {status}
            </span>
          )}
        </div>

        {isPolling && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Выполняется генерация...
          </div>
        )}

        {hasResult && result && (
          <div className="space-y-4">
            <Card className="border border-primary/40">
              <CardHeader>
                <CardTitle className="text-base">Готовый диктант</CardTitle>
                <CardDescription>
                  Используйте инструкции и превью для формирования задания. Стартовая клетка: строка {" "}
                  {(result.start_row ?? 0) + 1}, колонка {(result.start_col ?? 0) + 1}.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {result.preview_svg_url && (
                  <div className="rounded-md border border-border bg-white p-3">
                    <iframe
                      src={result.preview_svg_url}
                      title="Превью SVG"
                      className="h-80 w-full rounded-md border border-dashed border-border bg-muted/10"
                    />
                  </div>
                )}
                {!result.preview_svg_url && result.preview_image_url && (
                  <div className="relative h-80 overflow-hidden rounded-md border border-border bg-white">
                    <Image
                      src={result.preview_image_url}
                      alt="Превью графического диктанта"
                      fill
                      className="object-contain"
                    />
                  </div>
                )}
                <div>
                  <Label className="mb-2 block text-sm text-muted-foreground">Инструкции</Label>
                  <Textarea value={instructionsText} readOnly rows={Math.max(4, result.instructions?.length || 4)} />
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
