"use client"

import React, { useEffect, useMemo, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ExerciseTemplates } from '@/components/exercise-templates'
import { ComfyEmbed } from '@/components/comfy-embed'
import {
  listComfyPresets,
  createComfyPreset,
  updateComfyPreset,
  deleteComfyPreset,
  type ComfyPreset,
} from '@/lib/comfy'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { useAuth } from '@/lib/auth-context'
import ProtectedRoute from '@/components/protected-route'

type PresetFormState = {
  name: string
  description: string
  graph: string
  defaults: string
  enabled: boolean
}

function AdminContent() {
  const { user } = useAuth()
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
    } catch (e: any) {
      alert('Ошибка создания: ' + (e?.message || e))
    }
  }

  const handleTogglePreset = async (preset: ComfyPreset) => {
    try {
      const next = !preset.enabled
      setPresets(prev => prev.map(it => (it.id === preset.id ? { ...it, enabled: next } : it)))
      await updateComfyPreset(preset.id, { enabled: next })
    } catch (e: any) {
      alert('Ошибка переключения: ' + (e?.message || e))
      setPresets(prev => prev.map(it => (it.id === preset.id ? { ...it, enabled: preset.enabled } : it)))
    }
  }

  const handleDeletePreset = async (preset: ComfyPreset) => {
    if (!confirm(`Удалить пресет "${preset.name}"?`)) return
    const snapshot = [...presets]
    try {
      setPresets(prev => prev.filter(it => it.id !== preset.id))
      await deleteComfyPreset(preset.id)
    } catch (e: any) {
      alert('Ошибка удаления: ' + (e?.message || e))
      setPresets(snapshot)
    }
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 text-sm text-red-600">{error}</div>
    )
  }

  if (!user) {
    return null
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      <Card className="bg-card border border-border shadow-sm">
        <CardHeader>
          <CardTitle>Панель администратора</CardTitle>
          <CardDescription>Управление шаблонами и настройками</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground mb-4">
          </div>
          <ExerciseTemplates />
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="space-y-6">
          <ComfyEmbed />
        </div>
        <div className="space-y-6">
          <Card className="bg-card border border-border shadow-sm w-full">
            <CardHeader>
              <CardTitle>Статистика</CardTitle>
              <CardDescription>Мониторинг основных показателей</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-muted-foreground">В разработке</div>
            </CardContent>
          </Card>
        </div>
      </div>

      <Card className="bg-card border border-border shadow-sm w-full">
        <CardHeader>
          <CardTitle>ComfyUI пресеты</CardTitle>
          <CardDescription>Список и создание пресетов для генерации</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="text-sm text-muted-foreground">{totalPresetsText}</div>
            <Button onClick={() => setCreateOpen(s => !s)}>{createOpen ? 'Скрыть форму' : 'Создать пресет'}</Button>
          </div>
          {createOpen && (
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <div className="space-y-3">
                <label className="text-sm">Название</label>
                <Input value={form.name} onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Например: SD Simple" />
                <label className="text-sm">Описание</label>
                <Input value={form.description} onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Кратко" />
                <label className="text-sm">Defaults (JSON)</label>
                <Textarea rows={8} value={form.defaults} onChange={(e) => setForm(f => ({ ...f, defaults: e.target.value }))} />
              </div>
              <div className="space-y-3">
                <label className="text-sm">Graph (JSON)</label>
                <Textarea rows={16} value={form.graph} onChange={(e) => setForm(f => ({ ...f, graph: e.target.value }))} />
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={resetForm}>Очистить</Button>
                  <Button onClick={handleCreatePreset}>Сохранить</Button>
                </div>
              </div>
            </div>
          )}

          <div className="space-y-3">
            {presets.map(p => (
              <div key={p.id} className="flex flex-col gap-3 rounded-lg border border-border bg-muted/30 p-3 shadow-sm md:flex-row md:items-center md:justify-between w-full">
                <div className="space-y-1">
                  <div className="font-medium text-foreground">{p.name} {p.enabled ? '' : '(выключен)'}</div>
                  <div className="text-sm text-muted-foreground">ID: {p.id} · {p.description || 'Без описания'}</div>
                  <div className="text-xs text-muted-foreground">обновлён: {p.updated_at?.replace('T',' ').slice(0, 19) || '—'}</div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Button variant="outline" size="sm" onClick={() => handleTogglePreset(p)}>
                    {p.enabled ? 'Выключить' : 'Включить'}
                  </Button>
                  <Button variant="destructive" size="sm" onClick={() => handleDeletePreset(p)}>
                    Удалить
                  </Button>
                </div>
              </div>
            ))}
            {presets.length === 0 && (
              <div className="rounded-lg border border-dashed border-border/60 bg-muted/20 p-6 text-center text-sm text-muted-foreground w-full">
                Пока нет пресетов
              </div>
            )}
          </div>
        </CardContent>
      </Card>
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
