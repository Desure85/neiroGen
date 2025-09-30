"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import NextImage from "next/image"
import { Loader2, RefreshCw, Settings2, UploadCloud, Upload } from "lucide-react"

import { apiFetch } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import { GraphicDictationResult } from "./graphic-dictation/types"

interface GraphicDictationPayload {
  job_id: string
  status: string
  shards_total: number
  shards_completed: number
  result?: GraphicDictationResult
  error?: string | null
}

interface GraphicDictationGeneratorProps {
  onResult?: (result: GraphicDictationResult) => void
  onSvgGenerated?: (svgUrl: string | null) => void
  prompt?: string
  width?: number
  height?: number
}

interface FormState {
  description: string
  sourceImage: string
  gridWidth: number
  gridHeight: number
  cellSize: number
  difficulty: "easy" | "medium" | "hard"
  allowDiagonals: boolean
  shards: number
  useTemplate: boolean
}

const DIFFICULTY_OPTIONS: Array<{ value: FormState["difficulty"]; label: string }> = [
  { value: "easy", label: "Легко" },
  { value: "medium", label: "Средне" },
  { value: "hard", label: "Сложно" },
]

const POLL_INTERVAL_MS = 2500

async function fileToDataUrl(file: File): Promise<string> {
  return await new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result
      if (typeof result === "string") {
        resolve(result)
      } else {
        reject(new Error("Не удалось преобразовать файл"))
      }
    }
    reader.onerror = () => reject(new Error("Не удалось прочитать файл"))
    reader.readAsDataURL(file)
  })
}

export function GraphicDictationGenerator({ onResult, onSvgGenerated, prompt, width, height }: GraphicDictationGeneratorProps) {
  const [form, setForm] = useState<FormState>(() => ({
    description: typeof prompt === "string" ? prompt : "",
    sourceImage: "",
    gridWidth: typeof width === "number" && width > 0 ? Math.round(width) : 16,
    gridHeight: typeof height === "number" && height > 0 ? Math.round(height) : 16,
    cellSize: 10,
    difficulty: "medium",
    allowDiagonals: false,
    shards: 4,
    useTemplate: true,
  }))
  const latestProps = useRef<{ prompt?: string; width?: number; height?: number }>({ prompt, width, height })
  const [jobId, setJobId] = useState<string | null>(null)
  const [status, setStatus] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<GraphicDictationResult | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isPolling, setIsPolling] = useState(false)
  const [localFile, setLocalFile] = useState<File | null>(null)
  const [localPreview, setLocalPreview] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const hasResult = useMemo(() => Boolean(result?.commands?.length), [result])

  useEffect(() => {
    const changedPrompt = prompt !== latestProps.current.prompt
    const changedWidth = width !== latestProps.current.width
    const changedHeight = height !== latestProps.current.height
    if (changedPrompt || changedWidth || changedHeight) {
      setForm((prev) => ({
        ...prev,
        description: typeof prompt === "string" && prompt.length ? prompt : prev.description,
        gridWidth: typeof width === "number" && width > 0 ? Math.round(width) : prev.gridWidth,
        gridHeight: typeof height === "number" && height > 0 ? Math.round(height) : prev.gridHeight,
      }))
      latestProps.current = { prompt, width, height }
    }
  }, [prompt, width, height])

  const reset = useCallback(() => {
    setJobId(null)
    setStatus(null)
    setError(null)
    setResult(null)
    setIsPolling(false)
    onSvgGenerated?.(null)
  }, [onSvgGenerated])

  const submit = useCallback(async () => {
    setIsSubmitting(true)
    setResult(null)
    setStatus(null)

    try {
      let sourceImage = form.sourceImage.trim()
      if (localFile) {
        const dataUrl = await fileToDataUrl(localFile)
        sourceImage = dataUrl
      }

      // Template mode validation
      if (form.useTemplate) {
        if (!form.description.trim()) {
          throw new Error("Введите описание фигуры для генерации")
        }
      } else if (!sourceImage) {
        throw new Error("Добавьте изображение через URL или загрузите файл")
      }

      const response = await apiFetch("/api/generator/graphic-dictation", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          description: form.useTemplate ? form.description.trim() : undefined,
          source_image: !form.useTemplate ? sourceImage : undefined,
          grid_width: Number(form.gridWidth),
          grid_height: Number(form.gridHeight),
          cell_size_mm: Number(form.cellSize),
          difficulty: form.difficulty,
          allow_diagonals: form.allowDiagonals,
          shard: Number(form.shards),
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
      onSvgGenerated?.(null)
    } finally {
      setIsSubmitting(false)
    }
  }, [form, localFile, onSvgGenerated])

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
          const svgUrl = data.result.preview_svg_url ?? null
          if (svgUrl) {
            onSvgGenerated?.(svgUrl)
          } else {
            onSvgGenerated?.(null)
          }
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
  }, [jobId, isPolling, onResult, onSvgGenerated])

  const instructionsText = useMemo(() => {
    if (!result?.instructions?.length) return ""
    return result.instructions.join("\n")
  }, [result])

  const clearLocalFile = useCallback(() => {
    if (localPreview) {
      URL.revokeObjectURL(localPreview)
    }
    setLocalFile(null)
    setLocalPreview(null)
  }, [localPreview])

  useEffect(() => () => clearLocalFile(), [clearLocalFile])

  const validateAndSetFile = useCallback(
    async (file: File | undefined | null) => {
      if (!file) {
        return
      }

      if (!file.type.startsWith("image/")) {
        setError("Поддерживаются только изображения")
        return
      }

      if (file.size > 50 * 1024 * 1024) {
        setError("Максимальный размер файла 50 МБ")
        return
      }

      const imageUrl = URL.createObjectURL(file)
      const img = new window.Image()
      const loadPromise = new Promise<void>((resolve, reject) => {
        img.onload = () => {
          if (img.width > 1024 || img.height > 1024) {
            reject(new Error("Максимальное разрешение 1024x1024"))
            return
          }
          resolve()
        }
        img.onerror = () => reject(new Error("Не удалось прочитать изображение"))
        img.src = imageUrl
      })

      try {
        await loadPromise
        clearLocalFile()
        setLocalFile(file)
        setLocalPreview(imageUrl)
        setForm((prev) => ({ ...prev, sourceImage: `[локальный файл] ${file.name}` }))
        setError(null)
      } catch (validationErr: any) {
        URL.revokeObjectURL(imageUrl)
        setError(validationErr?.message || "Файл не принят")
      }
    },
    [clearLocalFile]
  )

  const onFileInputChange = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0]
      await validateAndSetFile(file)
      event.target.value = ""
    },
    [validateAndSetFile]
  )

  const onDrop = useCallback(
    async (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault()
      event.stopPropagation()
      const file = event.dataTransfer.files?.[0]
      await validateAndSetFile(file)
    },
    [validateAndSetFile]
  )

  const onPaste = useCallback(
    async (event: React.ClipboardEvent<HTMLDivElement>) => {
      const file = Array.from(event.clipboardData.files).find((item) => item.type.startsWith("image/"))
      if (file) {
        await validateAndSetFile(file)
      }
    },
    [validateAndSetFile]
  )

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
        {/* Mode Toggle */}
        <div className="flex items-center gap-4 p-4 bg-muted/20 rounded-md">
          <Label htmlFor="gd-mode-toggle" className="text-sm font-medium">
            Режим генерации:
          </Label>
          <div className="flex gap-2">
            <Button
              type="button"
              variant={form.useTemplate ? "default" : "outline"}
              size="sm"
              onClick={() => setForm((prev) => ({ ...prev, useTemplate: true }))}
            >
              По описанию
            </Button>
            <Button
              type="button"
              variant={!form.useTemplate ? "default" : "outline"}
              size="sm"
              onClick={() => setForm((prev) => ({ ...prev, useTemplate: false }))}
            >
              Из изображения
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 space-y-3">
            {form.useTemplate ? (
              // Template mode: description input
              <>
                <Label htmlFor="gd-description">Описание фигуры</Label>
                <Textarea
                  id="gd-description"
                  placeholder="Например: домик, машинка, робот, ёлка, собачка, бетономешалка..."
                  value={form.description}
                  onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
                  rows={3}
                  disabled={isSubmitting}
                />
                <p className="text-xs text-muted-foreground">
                  Введите название фигуры или описание того, что хотите нарисовать. 
                  Доступны готовые шаблоны (домик, дерево, машинка, робот, собачка, кошка) 
                  или AI создаст новую фигуру по вашему описанию.
                </p>
              </>
            ) : (
              // Image mode: file upload
              <>
                <Label htmlFor="gd-source">Источник изображения</Label>
                <Input
                  id="gd-source"
                  placeholder="URL или локальный файл"
                  value={form.sourceImage}
                  onChange={(e) => {
                    clearLocalFile()
                    setForm((prev) => ({ ...prev, sourceImage: e.target.value }))
                  }}
                  disabled={isSubmitting}
                />
                <p className="text-xs text-muted-foreground">
                  Можно указать URL, путь до файла на сервере или загрузить изображение (drag & drop / Ctrl+V).
                  Поддерживаемые файлы ≤ 1024×1024 и до 50 МБ.
                </p>
              </>
            )}
            {!form.useTemplate && (
              <div
                onDragOver={(event) => {
                  event.preventDefault()
                  event.stopPropagation()
                }}
                onDragEnter={(event) => {
                  event.preventDefault()
                  event.stopPropagation()
                }}
                onDrop={onDrop}
                onPaste={onPaste}
                className={cn(
                  "flex flex-col items-center justify-center rounded-md border border-dashed border-border bg-muted/20 px-4 py-6 text-center transition" ,
                  "hover:border-primary/60 hover:bg-muted/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                )}
                role="button"
                tabIndex={0}
              >
              <Upload className="mb-3 h-6 w-6 text-muted-foreground" />
              <p className="text-sm font-medium">Перетащите изображение или выберите файл</p>
              <p className="mt-1 text-xs text-muted-foreground">Поддерживаются PNG, JPEG, WEBP. До 1024×1024, 50 МБ.</p>
              <div className="mt-4 flex flex-wrap justify-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isSubmitting}
                >
                  Выбрать файл
                </Button>
                {localFile && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      clearLocalFile()
                      setForm((prev) => ({ ...prev, sourceImage: "" }))
                    }}
                  >
                    Удалить файл
                  </Button>
                )}
              </div>
              {localFile && (
                <p className="mt-3 text-xs text-muted-foreground">
                  Выбрано: {localFile.name} ({Math.round(localFile.size / 1024)} КБ)
                </p>
              )}
              </div>
            )}
            {!form.useTemplate && (
              <>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="hidden"
                  onChange={onFileInputChange}
                />
                {localPreview && (
                  <div className="relative mt-3 h-48 overflow-hidden rounded-md border border-border bg-background">
                    <NextImage src={localPreview} alt="Превью локального файла" fill className="object-contain" />
                  </div>
                )}
              </>
            )}
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
          <input
            id="gd-diagonals"
            type="checkbox"
            className="h-5 w-5 cursor-pointer rounded border border-border text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            checked={form.allowDiagonals}
            onChange={(event) => setForm((prev) => ({ ...prev, allowDiagonals: event.target.checked }))}
          />
        </div>

        {error && (
          <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="flex flex-wrap gap-3">
          <Button 
            onClick={submit} 
            disabled={
              isSubmitting || 
              (form.useTemplate ? !form.description.trim() : (!form.sourceImage.trim() && !localFile))
            }
          >
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
                    <NextImage
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
