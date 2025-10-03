"use client"

import { type FormEvent, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { useToast } from "@/components/ui/use-toast"
import {
  ExerciseTypeForm,
  type ExerciseTypeFormChangeHandler,
  type ExerciseTypeFormState,
} from "@/components/admin/exercise-types/exercise-type-form"
import { createExerciseType, type CreateExerciseTypePayload } from "@/lib/api"

export default function ExerciseTypeCreatePage() {
  const router = useRouter()
  const { toast } = useToast()
  const [form, setForm] = useState<ExerciseTypeFormState>({
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

  const updateField: ExerciseTypeFormChangeHandler = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!form.name.trim() || !form.key.trim()) {
      setError("Название и ключ обязательны")
      return
    }
    try {
      setSaving(true)
      setError(null)
      const payload: CreateExerciseTypePayload = {
        name: form.name.trim(),
        key: form.key.trim(),
        domain: form.domain?.trim() || null,
        icon: form.icon?.trim() || null,
        description: form.description?.trim() || null,
        display_order: Number(form.display_order) || 0,
        is_active: form.is_active,
      }

      const created = await createExerciseType(payload)
      toast({
        title: "Тип создан",
        description: `Тип «${created.name}» добавлен в справочник.`,
      })

      router.push(`/admin/exercise-types/${created.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось создать тип")
      toast({
        title: "Ошибка",
        description: err instanceof Error ? err.message : "Не удалось создать тип",
        variant: "destructive",
      })
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
            Определите базовые характеристики типа. Поля и схему можно добавить после сохранения.
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href="/admin/exercise-types">Назад к списку</Link>
        </Button>
      </div>

      <ExerciseTypeForm
        title="Основная информация"
        description="Название, ключ и описание используются в генераторах и интерфейсе терапевта."
        value={form}
        error={error}
        disabled={saving}
        submitLabel="Создать тип"
        onSubmit={handleSubmit}
        onChange={updateField}
        onCancel={() => router.back()}
      />
    </div>
  )
}
