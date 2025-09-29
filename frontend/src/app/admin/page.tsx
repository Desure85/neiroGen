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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <Card className="bg-card border border-border">
        <CardHeader>
          <CardTitle>Панель администратора</CardTitle>
          <CardDescription>Управление шаблонами и настройками</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground mb-4">
            Вы вошли как: {user.name} · {user.email}
          </div>
          <ExerciseTemplates />
        </CardContent>
      </Card>

      <ComfyEmbed />

      <Card className="bg-card border border-border">
        <CardHeader>
          <CardTitle>ComfyUI пресеты</CardTitle>
          <CardDescription>Список и создание пресетов для генерации</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex justify-between items-center mb-4">
            <div className="text-sm text-muted-foreground">{totalPresetsText}</div>
            <Button onClick={() => setCreateOpen(s => !s)}>{createOpen ? 'Скрыть форму' : 'Создать пресет'}</Button>
          </div>
          {createOpen && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div className="space-y-2">
                <label className="text-sm">Название</label>
                <Input value={form.name} onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Например: SD Simple" />
                <label className="text-sm">Описание</label>
                <Input value={form.description} onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Кратко" />
                <label className="text-sm">Defaults (JSON)</label>
                <Textarea rows={8} value={form.defaults} onChange={(e) => setForm(f => ({ ...f, defaults: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <label className="text-sm">Graph (JSON)</label>
                <Textarea rows={16} value={form.graph} onChange={(e) => setForm(f => ({ ...f, graph: e.target.value }))} />
                <div className="text-right">
                  <Button onClick={handleCreatePreset}>Сохранить</Button>
                </div>
              </div>
            </div>
          )}

          <div className="space-y-3">
            {presets.map(p => (
              <div key={p.id} className="p-3 rounded border border-border flex items-center justify-between">
                <div>
                  <div className="font-medium">{p.name} {p.enabled ? '' : '(выключен)'}</div>
                  <div className="text-sm text-muted-foreground">ID: {p.id} · {p.description || 'Без описания'}</div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    className="inline-flex items-center justify-center whitespace-nowrap rounded-md border px-3 py-1 text-sm"
                    onClick={() => handleTogglePreset(p)}
                  >
                    {p.enabled ? 'Выключить' : 'Включить'}
                  </button>
                  <button
                    className="inline-flex items-center justify-center whitespace-nowrap rounded-md border px-3 py-1 text-sm text-red-600"
                    onClick={() => handleDeletePreset(p)}
                  >
                    Удалить
                  </button>
                  <div className="text-xs text-muted-foreground ml-2">обновлён: {p.updated_at?.replace('T',' ').slice(0, 19) || '—'}</div>
                </div>
              </div>
            ))}
            {presets.length === 0 && !loadingPresets && (
              <div className="text-sm text-muted-foreground">Пока нет пресетов</div>
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
