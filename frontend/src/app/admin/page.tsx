"use client"

import { useEffect, useMemo, useState } from "react"
import { TrendingUp, Users, Wrench, Plus, Settings, AlertCircle } from "lucide-react"

import ProtectedRoute from "@/components/protected-route"
import { DashboardHeader } from "@/components/dashboard-header"
import { DashboardStatCard } from "@/components/dashboard-stat-card"
import { SectionCard } from "@/components/section-card"
import { ListHeader } from "@/components/list-header"
import { ExerciseTemplates } from "@/components/exercise-templates"
import { ComfyEmbed } from "@/components/comfy-embed"
import { EmptyState } from "@/components/ui/empty-state"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Skeleton } from "@/components/ui/skeleton"
import {
  listComfyPresets,
  createComfyPreset,
  updateComfyPreset,
  deleteComfyPreset,
  type ComfyPreset,
} from "@/lib/comfy"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { useAuth } from "@/lib/auth-context"
import { useToast } from "@/components/ui/use-toast"

type PresetFormState = {
  name: string
  description: string
  graph: string
  defaults: string
  enabled: boolean
}

function AdminContent() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [error, setError] = useState<string | null>(null)
  const [presets, setPresets] = useState<ComfyPreset[]>([])
  const [loadingPresets, setLoadingPresets] = useState(false)
  const [createOpen, setCreateOpen] = useState(false)
  const [form, setForm] = useState<PresetFormState>({
    name: '',
    description: '',
    graph: '{\n  "workflow": {"prompt": "{{prompt}}", "width": "{{width}}", "height": "{{height}}"}\n}',
    defaults: '{\n  "prompt": "",\n  "width": 512,\n  "height": 512\n}',
    enabled: true,
  })

  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        setLoadingPresets(true)
        const items = await listComfyPresets()
        if (mounted) {
          setPresets(items)
        }
      } catch (e: any) {
        if (mounted) {
          setError(e?.message || 'Не удалось загрузить пресеты')
        }
      } finally {
        if (mounted) {
          setLoadingPresets(false)
        }
      }
    })()
    return () => {
      mounted = false
    }
  }, [])

  const totalPresetsText = useMemo(
    () => `Всего: ${presets.length}${loadingPresets ? ' · загрузка…' : ''}`,
    [presets.length, loadingPresets],
  )

  const resetForm = () => {
    setForm({
      name: '',
      description: '',
      graph: '{\n  "workflow": {"prompt": "{{prompt}}", "width": "{{width}}", "height": "{{height}}"}\n}',
      defaults: '{\n  "prompt": "",\n  "width": 512,\n  "height": 512\n}',
      enabled: true,
    })
  }

  const handleCreatePreset = async () => {
    try {
      const graphParsed = JSON.parse(form.graph)
      const defaultsParsed = JSON.parse(form.defaults || '{}')
      const created = await createComfyPreset({
        name: form.name.trim(),
        description: form.description.trim() || undefined,
        graph: graphParsed,
        defaults: defaultsParsed,
        enabled: true,
      })
      setPresets(prev => [created, ...prev])
      setCreateOpen(false)
      resetForm()
      toast({
        title: "✅ Пресет создан",
        description: `"${created.name}" успешно добавлен`,
        duration: 3000,
      })
    } catch (e: any) {
      toast({
        variant: "destructive",
        title: "❌ Ошибка создания",
        description: e?.message || String(e),
        duration: 5000,
      })
    }
  }

  const handleTogglePreset = async (preset: ComfyPreset) => {
    try {
      const next = !preset.enabled
      setPresets(prev => prev.map(it => (it.id === preset.id ? { ...it, enabled: next } : it)))
      await updateComfyPreset(preset.id, { enabled: next })
      toast({
        title: next ? "✅ Пресет включен" : "⏸️ Пресет выключен",
        description: `"${preset.name}" ${next ? 'активирован' : 'деактивирован'}`,
        duration: 2000,
      })
    } catch (e: any) {
      toast({
        variant: "destructive",
        title: "❌ Ошибка переключения",
        description: e?.message || String(e),
        duration: 5000,
      })
      setPresets(prev => prev.map(it => (it.id === preset.id ? { ...it, enabled: preset.enabled } : it)))
    }
  }

  const handleDeletePreset = async (preset: ComfyPreset) => {
    if (!confirm(`Удалить пресет "${preset.name}"?`)) return
    const snapshot = [...presets]
    try {
      setPresets(prev => prev.filter(it => it.id !== preset.id))
      await deleteComfyPreset(preset.id)
      toast({
        title: "🗑️ Пресет удалён",
        description: `"${preset.name}" успешно удалён`,
        duration: 3000,
      })
    } catch (e: any) {
      toast({
        variant: "destructive",
        title: "❌ Ошибка удаления",
        description: e?.message || String(e),
        duration: 5000,
      })
      setPresets(snapshot)
    }
  }

  if (!user) {
    return null
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50 dark:from-gray-900 dark:to-gray-800">
      {/* Page Header */}
      <DashboardHeader
        badge="Панель администратора"
        title="Управление системой"
        description="Настройка шаблонов упражнений и генерации изображений"
        actions={
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Создать пресет
          </Button>
        }
      />

      {/* Main Content */}
      <div className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
        {/* Error State */}
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Ошибка загрузки</AlertTitle>
            <AlertDescription>
              {error}
            </AlertDescription>
          </Alert>
        )}
        {/* Шаблоны упражнений */}
        <SectionCard
          title="Шаблоны упражнений"
          description="Управление типами и шаблонами логопедических упражнений"
          contentClassName="space-y-6"
        >
          <ExerciseTemplates />
        </SectionCard>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <DashboardStatCard
            icon={<Settings className="h-6 w-6 text-blue-500" />}
            label="Активные пресеты"
            value={presets.filter((preset) => preset.enabled).length}
            hint="Количество включённых пресетов"
          />
          <DashboardStatCard
            icon={<TrendingUp className="h-6 w-6 text-emerald-500" />}
            label="Всего пресетов"
            value={presets.length}
            hint="Состояние каталога"
            loading={loadingPresets}
          />
          <DashboardStatCard
            icon={<Users className="h-6 w-6 text-purple-500" />}
            label="Типы упражнений"
            value="-"
            hint="В разработке"
          />
        </div>

        {/* ComfyUI Monitor & Stats */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <SectionCard 
            title="ComfyUI мониторинг" 
            description="Встраивание интерфейса для генерации изображений"
          >
            <ComfyEmbed />
          </SectionCard>
          
          <SectionCard
            title="Системная информация"
            description="Статус компонентов"
            contentClassName="space-y-4"
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between rounded-lg bg-muted/50 p-3">
                <span className="text-sm font-medium">ComfyUI</span>
                <span className="text-sm text-muted-foreground">Подключен</span>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-muted/50 p-3">
                <span className="text-sm font-medium">База данных</span>
                <span className="text-sm text-muted-foreground">Активна</span>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-muted/50 p-3">
                <span className="text-sm font-medium">Кэш</span>
                <span className="text-sm text-muted-foreground">Redis OK</span>
              </div>
            </div>
          </SectionCard>
        </div>

      <SectionCard
        className="w-full"
        contentClassName="space-y-6"
        actions={
          <Button onClick={() => setCreateOpen((state) => !state)}>
            {createOpen ? "Скрыть форму" : "Создать пресет"}
          </Button>
        }
      >
        <ListHeader
          title="ComfyUI пресеты"
          description="Список и создание пресетов для генерации"
          meta={totalPresetsText}
          className="gap-3"
          direction="row"
        />

        {createOpen && (
          <div className="rounded-lg border border-border bg-card p-6 shadow-sm">
            <h3 className="mb-4 text-lg font-semibold">Новый пресет ComfyUI</h3>
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium" htmlFor="preset-name">
                    Название <span className="text-destructive">*</span>
                  </label>
                  <Input
                    id="preset-name"
                    value={form.name}
                    onChange={(event) => setForm((state) => ({ ...state, name: event.target.value }))}
                    placeholder="Например: SD Simple"
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    Уникальное имя пресета
                  </p>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium" htmlFor="preset-description">
                    Описание
                  </label>
                  <Input
                    id="preset-description"
                    value={form.description}
                    onChange={(event) => setForm((state) => ({ ...state, description: event.target.value }))}
                    placeholder="Краткое описание пресета"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium" htmlFor="preset-defaults">
                    Defaults (JSON)
                  </label>
                  <Textarea
                    id="preset-defaults"
                    rows={8}
                    value={form.defaults}
                    onChange={(event) => setForm((state) => ({ ...state, defaults: event.target.value }))}
                    className="font-mono text-sm"
                  />
                  <p className="text-xs text-muted-foreground">
                    Значения по умолчанию для переменных
                  </p>
                </div>
              </div>
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium" htmlFor="preset-graph">
                    Graph (JSON) <span className="text-destructive">*</span>
                  </label>
                  <Textarea
                    id="preset-graph"
                    rows={20}
                    value={form.graph}
                    onChange={(event) => setForm((state) => ({ ...state, graph: event.target.value }))}
                    className="font-mono text-sm"
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    ComfyUI workflow с переменными
                  </p>
                </div>
              </div>
            </div>
            <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-end">
              <Button variant="outline" onClick={() => {
                setCreateOpen(false)
                resetForm()
              }}>
                Отмена
              </Button>
              <Button variant="outline" onClick={resetForm}>
                Очистить
              </Button>
              <Button onClick={handleCreatePreset} disabled={!form.name.trim()}>
                <Plus className="mr-2 h-4 w-4" />
                Создать пресет
              </Button>
            </div>
          </div>
        )}

        {/* Loading State */}
        {loadingPresets && (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex items-center justify-between rounded-lg border border-border bg-card p-4">
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-5 w-48" />
                  <Skeleton className="h-4 w-64" />
                  <Skeleton className="h-3 w-32" />
                </div>
                <div className="flex gap-2">
                  <Skeleton className="h-8 w-20" />
                  <Skeleton className="h-8 w-20" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Presets List */}
        {!loadingPresets && presets.length > 0 && (
          <div className="space-y-3">
            {presets.map((preset) => (
              <div
                key={preset.id}
                className="flex w-full flex-col gap-3 rounded-lg border border-border bg-card p-4 shadow-sm transition-shadow hover:shadow-md md:flex-row md:items-center md:justify-between"
              >
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <h4 className="font-medium text-foreground">
                      {preset.name}
                    </h4>
                    {!preset.enabled && (
                      <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                        Выключен
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {preset.description || "Без описания"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    ID: {preset.id} · Обновлён: {preset.updated_at?.replace("T", " ").slice(0, 19) || "—"}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" size="sm" onClick={() => handleTogglePreset(preset)}>
                    {preset.enabled ? "Выключить" : "Включить"}
                  </Button>
                  <Button variant="destructive" size="sm" onClick={() => handleDeletePreset(preset)}>
                    Удалить
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Empty State */}
        {!loadingPresets && presets.length === 0 && (
          <EmptyState
            icon={Settings}
            title="Нет пресетов ComfyUI"
            description="Создайте первый пресет для генерации изображений через ComfyUI"
            action={{
              label: "Создать пресет",
              onClick: () => setCreateOpen(true),
            }}
          />
        )}
      </SectionCard>
      </div>
    </div>
  )
}

export default function AdminPage() {
  return (
    <ProtectedRoute allowedRoles={['admin']} unauthorizedRedirectTo="/therapist">
      <AdminContent />
    </ProtectedRoute>
  )
}
