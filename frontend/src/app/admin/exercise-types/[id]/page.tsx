"use client"

import { FormEvent, useEffect, useMemo, useState } from "react"
import { notFound, useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { apiFetch } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"

interface ExerciseTypeField {
  id: number
  key: string
  label: string
  field_type: string
  is_required: boolean
  default_value?: any
  min_value?: number | null
  max_value?: number | null
  step?: number | null
  options?: any
  display_order: number
  help_text?: string | null
}

interface ExerciseTypeDetail {
  id: number
  key: string
  name: string
  domain: string | null
  icon?: string | null
  description?: string | null
  is_active: boolean
  display_order: number
  meta?: Record<string, any> | null
  fields: ExerciseTypeField[]
  exercises_count?: number
  updated_at?: string | null
  created_at?: string | null
}

interface NewFieldForm {
  label: string
  key: string
  field_type: string
  is_required: boolean
  default_value: string
  min_value: string
  max_value: string
  step: string
  options: string
  help_text: string
}

export default function ExerciseTypeDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [data, setData] = useState<ExerciseTypeDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [fieldSaving, setFieldSaving] = useState(false)
  const [fieldError, setFieldError] = useState<string | null>(null)
  const [newFieldForm, setNewFieldForm] = useState<NewFieldForm>({
    label: "",
    key: "",
    field_type: "string",
    is_required: false,
    default_value: "",
    min_value: "",
    max_value: "",
    step: "",
    options: "",
    help_text: "",
  })

  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        setLoading(true)
        const res = await apiFetch(`/api/admin/exercise-types/${id}`)
        if (res.status === 404) {
          notFound()
          return
        }

  const handleToggleActive = async () => {
    if (!data) return
    try {
      setSaving(true)
      const res = await apiFetch(`/api/admin/exercise-types/${data.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: data.name,
          key: data.key,
          domain: data.domain,
          icon: data.icon,
          description: data.description,
          display_order: data.display_order,
          is_active: !data.is_active,
        }),
      })
      if (!res.ok) {
        const payload = await res.json().catch(() => null)
        throw new Error(payload?.message || "Не удалось изменить статус")
      }
      const payload = await res.json()
      setData(payload.data ?? payload)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось изменить статус")
    } finally {
      setSaving(false)
    }
  }

  const resetFieldForm = () => {
    setNewFieldForm({
      label: "",
      key: "",
      field_type: "string",
      is_required: false,
      default_value: "",
      min_value: "",
      max_value: "",
      step: "",
      options: "",
      help_text: "",
    })
  }

  const handleCreateField = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!data) return
    if (!newFieldForm.label.trim() || !newFieldForm.key.trim()) {
      setFieldError("Название и ключ поля обязательны")
      return
    }

    let parsedDefault: any = newFieldForm.default_value.trim()
    if (parsedDefault) {
      try {
        parsedDefault = JSON.parse(parsedDefault)
      } catch {
        // оставляем как строку
      }
    } else {
      parsedDefault = null
    }

    let parsedOptions: any = undefined
    if (newFieldForm.options.trim()) {
      try {
        parsedOptions = JSON.parse(newFieldForm.options)
      } catch (err) {
        setFieldError("Опции поля должны быть корректным JSON")
        return
      }
    }

    try {
      setFieldSaving(true)
      setFieldError(null)
      const res = await apiFetch(`/api/admin/exercise-types/${data.id}/fields`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          label: newFieldForm.label.trim(),
          key: newFieldForm.key.trim(),
          field_type: newFieldForm.field_type,
          is_required: newFieldForm.is_required,
          default_value: parsedDefault,
          min_value: newFieldForm.min_value ? Number(newFieldForm.min_value) : null,
          max_value: newFieldForm.max_value ? Number(newFieldForm.max_value) : null,
          step: newFieldForm.step ? Number(newFieldForm.step) : null,
          options: parsedOptions,
          help_text: newFieldForm.help_text.trim() || null,
        }),
      })
      if (!res.ok) {
        const payload = await res.json().catch(() => null)
        throw new Error(payload?.message || `Ошибка создания поля (${res.status})`)
      }
      const payload = await res.json()
      const createdField = payload.data ?? payload
      setData((prev) => (prev ? { ...prev, fields: [...(prev.fields ?? []), createdField] } : prev))
      resetFieldForm()
    } catch (err) {
      setFieldError(err instanceof Error ? err.message : "Не удалось создать поле")
    } finally {
      setFieldSaving(false)
    }
  }

  const handleDeleteField = async (fieldId: number) => {
    if (!data) return
    if (!confirm("Удалить поле?")) return
    try {
      const res = await apiFetch(`/api/admin/exercise-types/${data.id}/fields/${fieldId}`, {
        method: "DELETE",
      })
      if (!res.ok) {
        const payload = await res.json().catch(() => null)
        throw new Error(payload?.message || `Ошибка удаления поля (${res.status})`)
      }
      setData((prev) => (prev ? { ...prev, fields: prev.fields.filter((f) => f.id !== fieldId) } : prev))
    } catch (err) {
      setFieldError(err instanceof Error ? err.message : "Не удалось удалить поле")
    }
  }
        if (!res.ok) {
          throw new Error(`Ошибка загрузки (${res.status})`)
        }
        const payload = await res.json()
        if (mounted) {
          setData(payload.data ?? payload)
        }
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err.message : "Не удалось загрузить тип")
        }
      } finally {
        if (mounted) setLoading(false)
      }
    })()
    return () => {
      mounted = false
    }
  }, [id])

  const fieldsSorted = useMemo(() => {
    if (!data?.fields) return []
    return [...data.fields].sort((a, b) => a.display_order - b.display_order)
  }, [data])

  const updateForm = (field: keyof ExerciseTypeDetail, value: any) => {
    setData((prev) => (prev ? { ...prev, [field]: value } : prev))
  }

  const handleSave = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!data) return
    if (!data.name.trim() || !data.key.trim()) {
      setError("Название и ключ обязательны")
      return
    }
    try {
      setSaving(true)
      setError(null)
      const res = await apiFetch(`/api/admin/exercise-types/${data.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: data.name.trim(),
          key: data.key.trim(),
          domain: data.domain?.trim() || null,
          icon: data.icon?.trim() || null,
          description: data.description?.trim() || null,
          display_order: Number(data.display_order) || 0,
          is_active: data.is_active,
        }),
      })
      if (!res.ok) {
        const payload = await res.json().catch(() => null)
        throw new Error(payload?.message || `Ошибка сохранения (${res.status})`)
      }
      const payload = await res.json()
      setData(payload.data ?? payload)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось сохранить изменения")
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!data) return
    if (!confirm("Удалить тип? Все упражнения должны быть перепривязаны.")) return
    try {
      setSaving(true)
      const res = await apiFetch(`/api/admin/exercise-types/${data.id}`, { method: "DELETE" })
      if (res.status === 409) {
        const payload = await res.json().catch(() => null)
        throw new Error(payload?.message || "Нельзя удалить тип с привязанными упражнениями")
      }
      if (!res.ok) {
        const payload = await res.json().catch(() => null)
        throw new Error(payload?.message || `Ошибка удаления (${res.status})`)
      }
      router.push("/admin/exercise-types")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось удалить тип")
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-3/4" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  if (!data) {
    return (
      <div className="rounded-md border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
        {error ?? "Тип не найден"}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Link href="/admin/exercise-types" className="text-primary hover:underline">
              ← Вернуться к списку
            </Link>
            <span>·</span>
            <span>ID: {data.id}</span>
            {data.created_at && <span>· создан: {new Date(data.created_at).toLocaleString()}</span>}
          </div>
          <h2 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
            <span className="text-3xl">{data.icon || "📄"}</span>
            {data.name}
            <Badge variant={data.is_active ? "success" : "outline"}>
              {data.is_active ? "активен" : "скрыт"}
            </Badge>
          </h2>
          <p className="text-sm text-muted-foreground">
            Ключ: <span className="font-mono">{data.key}</span> · Домен: {data.domain || "—"}
            {data.exercises_count !== undefined && ` · упражнений: ${data.exercises_count}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" disabled={saving} onClick={handleToggleActive}>
            {data.is_active ? "Скрыть" : "Сделать активным"}
          </Button>
          <Button variant="destructive" disabled={saving} onClick={handleDelete}>
            Удалить
          </Button>
        </div>
      </div>

      <Tabs defaultValue="details" className="space-y-4">
        <TabsList>
          <TabsTrigger value="details">Основное</TabsTrigger>
          <TabsTrigger value="fields">Поля ({fieldsSorted.length})</TabsTrigger>
          <TabsTrigger value="usage">Использование</TabsTrigger>
        </TabsList>

        <TabsContent value="details">
          <Card>
            <CardHeader>
              <CardTitle>Основные данные</CardTitle>
              <CardDescription>Задайте описание и порядок вывода типа в конструкторе упражнений.</CardDescription>
            </CardHeader>
            <CardContent>
              <form className="grid gap-6" onSubmit={handleSave}>
                <div className="grid gap-2">
                  <label className="text-sm font-medium" htmlFor="name">Название</label>
                  <Input
                    id="name"
                    required
                    value={data.name}
                    onChange={(e) => updateForm("name", e.target.value)}
                  />
                </div>

                <div className="grid gap-2">
                  <label className="text-sm font-medium" htmlFor="key">Ключ</label>
                  <Input
                    id="key"
                    required
                    value={data.key}
                    onChange={(e) => updateForm("key", e.target.value.replace(/\s+/g, "_"))}
                  />
                  <p className="text-xs text-muted-foreground">Изменение ключа может потребовать обновления существующих упражнений.</p>
                </div>

                <div className="grid gap-2 sm:grid-cols-3">
                  <div className="grid gap-2">
                    <label className="text-sm font-medium" htmlFor="domain">Домен</label>
                    <Input
                      id="domain"
                      value={data.domain ?? ""}
                      onChange={(e) => updateForm("domain", e.target.value)}
                    />
                  </div>
                  <div className="grid gap-2">
                    <label className="text-sm font-medium" htmlFor="icon">Иконка</label>
                    <Input
                      id="icon"
                      value={data.icon ?? ""}
                      onChange={(e) => updateForm("icon", e.target.value)}
                    />
                  </div>
                  <div className="grid gap-2">
                    <label className="text-sm font-medium" htmlFor="display_order">Порядок</label>
                    <Input
                      id="display_order"
                      type="number"
                      value={data.display_order}
                      onChange={(e) => updateForm("display_order", Number(e.target.value) || 0)}
                    />
                  </div>
                </div>

                <div className="grid gap-2">
                  <label className="text-sm font-medium" htmlFor="description">Описание</label>
                  <Textarea
                    id="description"
                    value={data.description ?? ""}
                    onChange={(e) => updateForm("description", e.target.value)}
                    rows={4}
                  />
                </div>

                {error && (
                  <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
                    {error}
                  </div>
                )}

                <div className="flex items-center justify-end gap-2">
                  <Button type="submit" disabled={saving}>
                    {saving ? "Сохраняю..." : "Сохранить изменения"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="fields">
          <Card>
            <CardHeader>
              <CardTitle>Поля типа</CardTitle>
              <CardDescription>
                Управляйте схемой данных для упражнений этого типа. Добавьте новые поля и удаляйте устаревшие.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <form className="grid gap-4 rounded-lg border border-border/60 bg-muted/20 p-4" onSubmit={handleCreateField}>
                <div className="grid gap-1 sm:grid-cols-2">
                  <div className="grid gap-1">
                    <label className="text-xs font-medium" htmlFor="field-label">Заголовок поля</label>
                    <Input
                      id="field-label"
                      required
                      value={newFieldForm.label}
                      onChange={(e) => setNewFieldForm((prev) => ({ ...prev, label: e.target.value }))}
                    />
                  </div>
                  <div className="grid gap-1">
                    <label className="text-xs font-medium" htmlFor="field-key">Ключ</label>
                    <Input
                      id="field-key"
                      required
                      value={newFieldForm.key}
                      onChange={(e) =>
                        setNewFieldForm((prev) => ({ ...prev, key: e.target.value.replace(/\s+/g, "_") }))
                      }
                    />
                  </div>
                </div>
                <div className="grid gap-1 sm:grid-cols-3">
                  <div className="grid gap-1">
                    <label className="text-xs font-medium" htmlFor="field-type">Тип</label>
                    <select
                      id="field-type"
                      className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                      value={newFieldForm.field_type}
                      onChange={(e) => setNewFieldForm((prev) => ({ ...prev, field_type: e.target.value }))}
                    >
                      <option value="string">string</option>
                      <option value="text">text</option>
                      <option value="integer">integer</option>
                      <option value="number">number</option>
                      <option value="boolean">boolean</option>
                      <option value="enum">enum</option>
                      <option value="array_enum">array_enum</option>
                      <option value="json">json</option>
                    </select>
                  </div>
                  <div className="grid gap-1">
                    <label className="text-xs font-medium" htmlFor="field-default">Default (JSON)</label>
                    <Input
                      id="field-default"
                      value={newFieldForm.default_value}
                      onChange={(e) => setNewFieldForm((prev) => ({ ...prev, default_value: e.target.value }))}
                      placeholder={"например: \"text\" или {\"min\":1}"}
                    />
                  </div>
                  <div className="grid gap-1">
                    <label className="text-xs font-medium" htmlFor="field-options">Опции (JSON)</label>
                    <Input
                      id="field-options"
                      value={newFieldForm.options}
                      onChange={(e) => setNewFieldForm((prev) => ({ ...prev, options: e.target.value }))}
                      placeholder='["вариант1", "вариант2"]'
                    />
                  </div>
                </div>
                <div className="grid gap-1 sm:grid-cols-3">
                  <div className="grid gap-1">
                    <label className="text-xs font-medium">Минимум</label>
                    <Input
                      value={newFieldForm.min_value}
                      onChange={(e) => setNewFieldForm((prev) => ({ ...prev, min_value: e.target.value }))}
                      placeholder=""
                    />
                  </div>
                  <div className="grid gap-1">
                    <label className="text-xs font-medium">Максимум</label>
                    <Input
                      value={newFieldForm.max_value}
                      onChange={(e) => setNewFieldForm((prev) => ({ ...prev, max_value: e.target.value }))}
                      placeholder=""
                    />
                  </div>
                  <div className="grid gap-1">
                    <label className="text-xs font-medium">Шаг</label>
                    <Input
                      value={newFieldForm.step}
                      onChange={(e) => setNewFieldForm((prev) => ({ ...prev, step: e.target.value }))}
                      placeholder=""
                    />
                  </div>
                </div>
                <div className="grid gap-1">
                  <label className="text-xs font-medium" htmlFor="field-help">Подсказка</label>
                  <Textarea
                    id="field-help"
                    rows={2}
                    value={newFieldForm.help_text}
                    onChange={(e) => setNewFieldForm((prev) => ({ ...prev, help_text: e.target.value }))}
                    placeholder="Краткое описание для терапевта"
                  />
                </div>
                <label className="flex items-center gap-2 text-xs font-medium">
                  <input
                    type="checkbox"
                    className="h-4 w-4"
                    checked={newFieldForm.is_required}
                    onChange={(e) => setNewFieldForm((prev) => ({ ...prev, is_required: e.target.checked }))}
                  />
                  Поле обязательное
                </label>

                {fieldError && (
                  <div className="rounded-md border border-destructive/40 bg-destructive/10 p-2 text-xs text-destructive">
                    {fieldError}
                  </div>
                )}

                <div className="flex items-center justify-end gap-2">
                  <Button type="submit" size="sm" disabled={fieldSaving}>
                    {fieldSaving ? "Добавляю..." : "Добавить поле"}
                  </Button>
                </div>
              </form>

              {fieldsSorted.length === 0 ? (
                <div className="rounded-md border border-dashed border-border/60 bg-muted/20 p-6 text-sm text-muted-foreground">
                  Пока нет полей. Добавьте первое поле через форму выше.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[720px] table-fixed border-collapse">
                    <thead>
                      <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                        <th className="px-3 py-2">#</th>
                        <th className="px-3 py-2">Ключ</th>
                        <th className="px-3 py-2">Заголовок</th>
                        <th className="px-3 py-2">Тип</th>
                        <th className="px-3 py-2">Обязательное</th>
                        <th className="px-3 py-2">Default</th>
                        <th className="px-3 py-2 text-right">Действия</th>
                      </tr>
                    </thead>
                    <tbody className="text-sm">
                      {fieldsSorted.map((field, index) => (
                        <tr key={field.id} className="border-b border-border/60 last:border-b-0">
                          <td className="px-3 py-3 text-muted-foreground">{index + 1}</td>
                          <td className="px-3 py-3 font-mono text-xs text-muted-foreground">{field.key}</td>
                          <td className="px-3 py-3 text-foreground">{field.label}</td>
                          <td className="px-3 py-3 text-muted-foreground">{field.field_type}</td>
                          <td className="px-3 py-3 text-muted-foreground">{field.is_required ? "Да" : "Нет"}</td>
                          <td className="px-3 py-3 text-muted-foreground">
                            {field.default_value === null || field.default_value === undefined
                              ? "—"
                              : JSON.stringify(field.default_value)}
                          </td>
                          <td className="px-3 py-3 text-right">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteField(field.id)}
                            >
                              Удалить
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="usage">
          <Card>
            <CardHeader>
              <CardTitle>Использование</CardTitle>
              <CardDescription>
                Сводка по упражнениям и листам, использующим данный тип. Подробная аналитика будет добавлена позже.
              </CardDescription>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              <p>
                Упражнений с этим типом: <strong>{data.exercises_count ?? 0}</strong>. Перейдите в раздел "Упражнения", чтобы увидеть детальный список и настроить параметры.
              </p>
              {data.updated_at && (
                <p className="mt-2 text-xs">Последнее обновление: {new Date(data.updated_at).toLocaleString()}</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
