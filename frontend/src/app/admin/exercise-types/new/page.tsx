"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { apiFetch } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

interface ExerciseTypePayload {
  name: string
  key: string
  domain: string | null
  icon?: string | null
  description?: string | null
  display_order: number
  is_active: boolean
}

export default function ExerciseTypeCreatePage() {
  const router = useRouter()
  const [form, setForm] = useState<ExerciseTypePayload>({
    name: "",
    key: "",
    domain: "neuro",
    icon: "",
    description: "",
    display_order: 0,
    is_active: true,
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const updateField = <K extends keyof ExerciseTypePayload>(field: K, value: ExerciseTypePayload[K]) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!form.name.trim() || !form.key.trim()) {
      setError("Название и ключ обязательны")
      return
    }
    try {
      setSaving(true)
      setError(null)
      const res = await apiFetch("/api/admin/exercise-types", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          key: form.key.trim(),
          domain: form.domain?.trim() || null,
          icon: form.icon?.trim() || null,
          description: form.description?.trim() || null,
          display_order: Number(form.display_order) || 0,
          is_active: form.is_active,
        }),
      })
      if (!res.ok) {
        const payload = await res.json().catch(() => null)
        throw new Error(payload?.message || `Ошибка создания (${res.status})`)
      }
      const created = await res.json()
      const newId = created?.data?.id ?? created?.id
      router.push(newId ? `/admin/exercise-types/${newId}` : "/admin/exercise-types")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось создать тип")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Новый тип упражнения</h2>
          <p className="text-sm text-muted-foreground">
            Определите базовые характеристики типа. Поля и схема можно добавить после сохранения.
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href="/admin/exercise-types">Назад к списку</Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Основная информация</CardTitle>
          <CardDescription>Название, ключ и описание используются в генераторах и интерфейсе терапевта.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="grid gap-6" onSubmit={handleSubmit}>
            <div className="grid gap-2">
              <label className="text-sm font-medium" htmlFor="name">Название</label>
              <Input
                id="name"
                required
                value={form.name}
                onChange={(e) => updateField("name", e.target.value)}
                placeholder="Например: Графический диктант"
              />
            </div>

            <div className="grid gap-2">
              <label className="text-sm font-medium" htmlFor="key">Ключ</label>
              <Input
                id="key"
                required
                value={form.key}
                onChange={(e) => updateField("key", e.target.value.replace(/\s+/g, "_"))}
                placeholder="snake_case"
              />
              <p className="text-xs text-muted-foreground">Ключ используется в API и базе. Можно менять только латиницу, цифры и подчёркивания.</p>
            </div>

            <div className="grid gap-2 sm:grid-cols-3">
              <div className="grid gap-2">
                <label className="text-sm font-medium" htmlFor="domain">Домен</label>
                <Input
                  id="domain"
                  value={form.domain ?? ""}
                  onChange={(e) => updateField("domain", e.target.value)}
                  placeholder="neuro / speech / behavioral"
                />
              </div>
              <div className="grid gap-2">
                <label className="text-sm font-medium" htmlFor="icon">Иконка</label>
                <Input
                  id="icon"
                  value={form.icon ?? ""}
                  onChange={(e) => updateField("icon", e.target.value)}
                  placeholder="Emoji или emoji-код"
                />
              </div>
              <div className="grid gap-2">
                <label className="text-sm font-medium" htmlFor="display_order">Порядок отображения</label>
                <Input
                  id="display_order"
                  type="number"
                  value={form.display_order}
                  onChange={(e) => updateField("display_order", Number(e.target.value) || 0)}
                />
              </div>
            </div>

            <div className="grid gap-2">
              <label className="text-sm font-medium" htmlFor="description">Описание</label>
              <Textarea
                id="description"
                value={form.description ?? ""}
                onChange={(e) => updateField("description", e.target.value)}
                rows={4}
                placeholder="Краткое объяснение для терапевтов"
              />
            </div>

            <label className="flex items-center gap-3 text-sm font-medium">
              <input
                type="checkbox"
                className="h-4 w-4"
                checked={form.is_active}
                onChange={(e) => updateField("is_active", e.target.checked)}
              />
              Тип активен и доступен для выбора
            </label>

            {error && (
              <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </div>
            )}

            <div className="flex items-center justify-end gap-3">
              <Button type="button" variant="outline" disabled={saving} onClick={() => router.back()}>
                Отмена
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? "Сохраняю..." : "Создать тип"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
