"use client"

import { type FormEvent, type ReactNode } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"

export type ExerciseTypeFormState = {
  name: string
  key: string
  domain: string | null
  icon: string | null
  description: string | null
  display_order: number
  is_active: boolean
}

export type ExerciseTypeFormProps = {
  title: string
  description?: string
  value: ExerciseTypeFormState
  error?: string | null
  disabled?: boolean
  submitLabel: string
  cancelLabel?: string
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
  onChange: ExerciseTypeFormChangeHandler
  onCancel?: () => void
  footerSlot?: ReactNode
  headerSlot?: ReactNode
}

export type ExerciseTypeFormChangeHandler = <K extends keyof ExerciseTypeFormState>(
  field: K,
  value: ExerciseTypeFormState[K],
) => void

export function ExerciseTypeForm({
  title,
  description,
  value,
  error,
  disabled,
  submitLabel,
  cancelLabel = "Отмена",
  onSubmit,
  onChange,
  onCancel,
  footerSlot,
  headerSlot,
}: ExerciseTypeFormProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>{title}</CardTitle>
            {description ? <CardDescription>{description}</CardDescription> : null}
          </div>
          {headerSlot}
        </div>
      </CardHeader>
      <CardContent>
        <form className="grid gap-6" onSubmit={onSubmit} noValidate>
          <div className="grid gap-2">
            <label className="text-sm font-medium" htmlFor="exercise-type-name">
              Название
            </label>
            <Input
              id="exercise-type-name"
              required
              value={value.name}
              onChange={(event) => onChange("name", event.target.value)}
              placeholder="Например: Графический диктант"
            />
          </div>

          <div className="grid gap-2">
            <label className="text-sm font-medium" htmlFor="exercise-type-key">
              Ключ
            </label>
            <Input
              id="exercise-type-key"
              required
              value={value.key}
              onChange={(event) => onChange("key", event.target.value.replace(/\s+/g, "_"))}
              placeholder="snake_case"
              autoCorrect="off"
              autoCapitalize="none"
              spellCheck={false}
            />
            <p className="text-xs text-muted-foreground">
              Ключ используется в API и базе данных. Разрешены латиница, цифры и подчёркивания.
            </p>
          </div>

          <div className="grid gap-2 sm:grid-cols-3">
            <div className="grid gap-2">
              <label className="text-sm font-medium" htmlFor="exercise-type-domain">
                Домен
              </label>
              <Input
                id="exercise-type-domain"
                value={value.domain ?? ""}
                onChange={(event) => onChange("domain", event.target.value)}
                placeholder="neuro / speech / behavioral"
              />
            </div>
            <div className="grid gap-2">
              <label className="text-sm font-medium" htmlFor="exercise-type-icon">
                Иконка
              </label>
              <Input
                id="exercise-type-icon"
                value={value.icon ?? ""}
                onChange={(event) => onChange("icon", event.target.value)}
                placeholder="Emoji или emoji-код"
              />
            </div>
            <div className="grid gap-2">
              <label className="text-sm font-medium" htmlFor="exercise-type-display-order">
                Порядок отображения
              </label>
              <Input
                id="exercise-type-display-order"
                type="number"
                value={value.display_order}
                onChange={(event) =>
                  onChange("display_order", Number.isNaN(Number(event.target.value)) ? 0 : Number(event.target.value))
                }
              />
            </div>
          </div>

          <div className="grid gap-2">
            <label className="text-sm font-medium" htmlFor="exercise-type-description">
              Описание
            </label>
            <Textarea
              id="exercise-type-description"
              value={value.description ?? ""}
              onChange={(event) => onChange("description", event.target.value)}
              rows={4}
              placeholder="Краткое объяснение для терапевтов"
            />
          </div>

          <label className="flex items-center gap-3 text-sm font-medium">
            <input
              type="checkbox"
              className="h-4 w-4"
              checked={value.is_active}
              onChange={(event) => onChange("is_active", event.target.checked)}
            />
            Тип активен и доступен для выбора
          </label>

          {error ? (
            <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          ) : null}

          <div className="flex items-center justify-end gap-3">
            {onCancel ? (
              <Button type="button" variant="outline" disabled={disabled} onClick={onCancel}>
                {cancelLabel}
              </Button>
            ) : null}
            <Button type="submit" disabled={disabled}>
              {disabled ? "Сохраняю..." : submitLabel}
            </Button>
          </div>
          {footerSlot}
        </form>
      </CardContent>
    </Card>
  )
}
