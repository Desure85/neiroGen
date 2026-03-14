"use client"

import {
  ChangeEvent,
  Dispatch,
  FormEvent,
  SetStateAction,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react"
import type { CSSProperties } from "react"
import Link from "next/link"
import { notFound, useParams, useRouter } from "next/navigation"
import { useToast } from "@/components/ui/use-toast"
import {
  DndContext,
  DragEndEvent,
  DragStartEvent,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  DragOverlay,
  useSensor,
  useSensors,
} from "@dnd-kit/core"
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { ChevronDown, ChevronUp, GripVertical, Loader2, Pencil, Save, Trash2, X } from "lucide-react"
import {
  AdminExerciseTypeDetailDto,
  createExerciseTypeField,
  deleteExerciseType,
  deleteExerciseTypeField,
  fetchAdminExerciseTypeDetail,
  reorderExerciseTypeFields,
  updateExerciseType,
  updateExerciseTypeField,
  type CreateExerciseTypeFieldPayload,
  type ExerciseTypeFieldDto,
  type UpdateExerciseTypeFieldPayload,
  type UpdateExerciseTypePayload,
} from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import {
  ExerciseTypeForm,
  type ExerciseTypeFormChangeHandler,
  type ExerciseTypeFormState,
} from "@/components/admin/exercise-types/exercise-type-form"
import { PromptEditor } from "@/components/admin/exercise-types/prompt-editor"
import { DeliveryTypesEditor } from "@/components/admin/exercise-types/delivery-types-editor"

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

function DragOverlayCard({ field }: { field: ExerciseTypeFieldDto | null }) {
  if (!field) return null

  return (
    <div className="min-w-[220px] rounded-md border border-border bg-background px-3 py-2 shadow-lg">
      <div className="font-medium">{field.label}</div>
      <div className="font-mono text-xs text-muted-foreground">{field.key}</div>
      <div className="text-[10px] uppercase text-muted-foreground">{field.field_type}</div>
    </div>
  )
}

type FieldEditForm = NewFieldForm

const FIELD_TYPE_OPTIONS = ["string", "text", "integer", "number", "boolean", "enum", "array_enum", "json"] as const

type SortableFieldRowProps = {
  field: ExerciseTypeFieldDto
  index: number
  isEditing: boolean
  form: FieldEditForm | null
  reordering: boolean
  savingFieldId: number | null
  fieldEditError: string | null
  canMoveUp: boolean
  canMoveDown: boolean
  onEditChange: <K extends keyof FieldEditForm>(field: K, value: FieldEditForm[K]) => void
  onToggleRequired: (event: ChangeEvent<HTMLInputElement>) => void
  onReorder: (id: number, direction: "up" | "down") => void
  onSave: (id: number) => void
  onCancel: () => void
  onDelete: (id: number) => void
  onEdit: (id: number) => void
}

function SortableFieldRow(props: SortableFieldRowProps) {
  const {
    field,
    index,
    isEditing,
    form,
    reordering,
    savingFieldId,
    fieldEditError,
    canMoveUp,
    canMoveDown,
    onEditChange,
    onToggleRequired,
    onReorder,
    onSave,
    onCancel,
    onDelete,
    onEdit,
  } = props

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: field.id })

  const style: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
    background: isDragging ? "rgba(59,130,246,0.07)" : undefined,
  }

  return (
    <tr
      ref={setNodeRef}
      style={style}
      className="border-b border-border/60 last:border-b-0 align-top"
      data-testid={`field-row-${field.id}`}
    >
      <td className="px-3 py-3 text-muted-foreground">
        <button
          type="button"
          className="flex items-center gap-1 text-xs text-muted-foreground"
          {...attributes}
          {...listeners}
          data-testid="drag-handle"
        >
          <GripVertical className="h-4 w-4" />
          {index + 1}
        </button>
      </td>
      <td className="px-3 py-3 font-mono text-xs text-muted-foreground">
        {isEditing && form ? (
          <Input value={form.key} onChange={(event) => onEditChange("key", event.target.value)} className="h-8" />
        ) : (
          field.key
        )}
      </td>
      <td className="px-3 py-3">
        {isEditing && form ? (
          <div className="space-y-2">
            <Input
              data-testid="field-edit-label"
              value={form.label}
              onChange={(event) => onEditChange("label", event.target.value)}
              className="h-8"
            />
            <Textarea
              data-testid="field-edit-help-text"
              value={form.help_text}
              onChange={(event) => onEditChange("help_text", event.target.value)}
              rows={2}
              placeholder="Help text"
            />
          </div>
        ) : (
          <div className="space-y-1">
            <div className="text-foreground">{field.label}</div>
            {field.help_text ? <div className="text-xs text-muted-foreground">{field.help_text}</div> : null}
          </div>
        )}
      </td>
      <td className="px-3 py-3 text-muted-foreground">
        {isEditing && form ? (
          <select
            className="h-8 w-full rounded-md border border-input bg-background px-2 text-sm"
            value={form.field_type}
            onChange={(event) => onEditChange("field_type", event.target.value)}
          >
            {FIELD_TYPE_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        ) : (
          field.field_type
        )}
      </td>
      <td className="px-3 py-3 text-muted-foreground">
        {isEditing && form ? (
          <label className="flex items-center gap-2 text-xs">
            <input type="checkbox" checked={form.is_required} onChange={onToggleRequired} />
            Обязательно
          </label>
        ) : field.is_required ? (
          "Да"
        ) : (
          "Нет"
        )}
      </td>
      <td className="px-3 py-3 text-muted-foreground">
        {isEditing && form ? (
          <div className="space-y-2">
            <Input
              value={form.default_value}
              onChange={(event) => onEditChange("default_value", event.target.value)}
              placeholder='"text" или {"count":2}'
              className="h-8"
            />
            <div className="grid gap-2 sm:grid-cols-3">
              <Input
                value={form.min_value}
                onChange={(event) => onEditChange("min_value", event.target.value)}
                placeholder="min"
                className="h-8"
              />
              <Input
                value={form.max_value}
                onChange={(event) => onEditChange("max_value", event.target.value)}
                placeholder="max"
                className="h-8"
              />
              <Input
                value={form.step}
                onChange={(event) => onEditChange("step", event.target.value)}
                placeholder="step"
                className="h-8"
              />
            </div>
          </div>
        ) : (
          <div className="space-y-1">
            <div>{formatFieldDefault(field.default_value)}</div>
            {(field.min_value !== null || field.max_value !== null || field.step !== null) && (
              <div className="text-xs text-muted-foreground">
                {field.min_value !== null && field.min_value !== undefined ? `мин: ${field.min_value}` : null}
                {field.max_value !== null && field.max_value !== undefined
                  ? `${field.min_value !== null && field.min_value !== undefined ? ", " : ""}макс: ${field.max_value}`
                  : null}
                {field.step !== null && field.step !== undefined
                  ? `${field.min_value !== null || field.max_value !== null ? ", " : ""}шаг: ${field.step}`
                  : null}
              </div>
            )}
          </div>
        )}
      </td>
      <td className="px-3 py-3 text-muted-foreground">
        {isEditing && form ? (
          <Textarea
            value={form.options}
            onChange={(event) => onEditChange("options", event.target.value)}
            rows={2}
            placeholder='["var1", "var2"]'
          />
        ) : (
          formatFieldOptions(field.options)
        )}
      </td>
      <td className="px-3 py-3">
        <div className="flex flex-wrap items-center justify-end gap-1">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            disabled={!canMoveUp || reordering}
            onClick={() => onReorder(field.id, "up")}
            title="Выше"
            data-testid="field-move-up"
          >
            <ChevronUp className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            disabled={!canMoveDown || reordering}
            onClick={() => onReorder(field.id, "down")}
            title="Ниже"
            data-testid="field-move-down"
          >
            <ChevronDown className="h-4 w-4" />
          </Button>

          {isEditing ? (
            <>
              <Button
                type="button"
                size="icon"
                variant="secondary"
                disabled={savingFieldId === field.id}
                onClick={() => onSave(field.id)}
                title="Сохранить"
                data-testid="field-edit-save"
              >
                {savingFieldId === field.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              </Button>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                onClick={onCancel}
                title="Отмена"
                data-testid="field-edit-cancel"
              >
                <X className="h-4 w-4" />
              </Button>
            </>
          ) : (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => onEdit(field.id)}
              title="Редактировать"
              data-testid="field-edit-button"
            >
              <Pencil className="h-4 w-4" />
            </Button>
          )}

          <Button type="button" variant="ghost" size="icon" onClick={() => onDelete(field.id)} title="Удалить">
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
        {isEditing && fieldEditError ? <div className="mt-2 text-xs text-destructive">{fieldEditError}</div> : null}
      </td>
    </tr>
  )
}

function stringifyFieldValue(value: unknown): string {
  if (value === null || value === undefined) {
    return ""
  }

  if (typeof value === "string") {
    return value
  }

  try {
    return JSON.stringify(value)
  } catch {
    return ""
  }
}

function parseNumberField(value: string, label: string, setError: Dispatch<SetStateAction<string | null>>): number | null {
  const trimmed = value.trim()
  if (!trimmed) return null

  const parsed = Number(trimmed)
  if (Number.isNaN(parsed)) {
    setError(`${label} должно быть числом`)
    throw new Error("invalid-number")
  }

  return parsed
}

function normalizeKey(value: string): string {
  return value.trim().replace(/\s+/g, "_").toLowerCase()
}

function formatFieldDefault(value: unknown): string {
  if (value === null || value === undefined) {
    return "—"
  }

  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return String(value)
  }

  try {
    return JSON.stringify(value)
  } catch {
    return "—"
  }
}

function formatFieldOptions(value: unknown): JSX.Element | string {
  if (value === null || value === undefined) {
    return "—"
  }

  if (typeof value === "string") {
    return value
  }

  try {
    return (
      <pre className="max-h-16 overflow-auto rounded-md bg-muted p-2 text-xs">
        {JSON.stringify(value, null, 2)}
      </pre>
    )
  } catch {
    return "—"
  }
}

function buildCreateFieldPayload(
  form: FieldEditForm,
  setError: Dispatch<SetStateAction<string | null>>,
): CreateExerciseTypeFieldPayload | null {
  setError(null)

  const label = form.label.trim()
  const key = normalizeKey(form.key)

  if (!label || !key) {
    setError("Название и ключ поля обязательны")
    return null
  }

  const defaultRaw = form.default_value.trim()
  let defaultValue: unknown = null
  if (defaultRaw) {
    try {
      defaultValue = JSON.parse(defaultRaw)
    } catch {
      defaultValue = defaultRaw
    }
  }

  const optionsRaw = form.options.trim()
  let options: unknown = undefined

  if (optionsRaw) {
    try {
      options = JSON.parse(optionsRaw)
    } catch {
      setError("Опции поля должны быть валидным JSON")
      return null
    }
  }

  const minValue = parseNumberField(form.min_value, "Минимум", setError)
  const maxValue = parseNumberField(form.max_value, "Максимум", setError)
  const stepValue = parseNumberField(form.step, "Шаг", setError)

  const payload: CreateExerciseTypeFieldPayload = {
    label,
    key,
    field_type: form.field_type,
    is_required: form.is_required,
    default_value: defaultValue,
    min_value: minValue,
    max_value: maxValue,
    step: stepValue,
    options,
    help_text: form.help_text.trim() ? form.help_text.trim() : null,
  }

  return payload
}

function buildUpdateFieldPayload(
  form: FieldEditForm,
  setError: Dispatch<SetStateAction<string | null>>,
): UpdateExerciseTypeFieldPayload | null {
  try {
    const payload = buildCreateFieldPayload(form, setError)
    if (!payload) {
      return null
    }

    return payload
  } catch (err) {
    if (err instanceof Error && err.message === "invalid-number") {
      return null
    }
    throw err
  }
}

function fillFormFromField(field: ExerciseTypeFieldDto): FieldEditForm {
  return {
    label: field.label ?? "",
    key: field.key ?? "",
    field_type: field.field_type ?? "string",
    is_required: Boolean(field.is_required),
    default_value: stringifyFieldValue(field.default_value),
    min_value: field.min_value === null || field.min_value === undefined ? "" : String(field.min_value),
    max_value: field.max_value === null || field.max_value === undefined ? "" : String(field.max_value),
    step: field.step === null || field.step === undefined ? "" : String(field.step),
    options: stringifyFieldValue(field.options),
    help_text: field.help_text ?? "",
  }
}

export default function ExerciseTypeDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { toast } = useToast()
  const [data, setData] = useState<AdminExerciseTypeDetailDto | null>(null)
  const [formState, setFormState] = useState<ExerciseTypeFormState | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [fieldSaving, setFieldSaving] = useState(false)
  const [fieldError, setFieldError] = useState<string | null>(null)
  const [fieldEditError, setFieldEditError] = useState<string | null>(null)
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
  const [editingFieldId, setEditingFieldId] = useState<number | null>(null)
  const [editingFieldForm, setEditingFieldForm] = useState<FieldEditForm | null>(null)
  const [savingFieldId, setSavingFieldId] = useState<number | null>(null)
  const [draggingFieldId, setDraggingFieldId] = useState<number | null>(null)
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )
  const [reordering, setReordering] = useState(false)

  const fieldsSorted = useMemo(() => {
    if (!data?.fields) return []
    return [...data.fields].sort((a, b) => a.display_order - b.display_order)
  }, [data])

  const activeField = useMemo(
    () => fieldsSorted.find((field) => field.id === draggingFieldId) ?? null,
    [fieldsSorted, draggingFieldId],
  )

  const commitReorder = useCallback(
    async (reordered: ExerciseTypeFieldDto[], origin: ExerciseTypeFieldDto[]) => {
      if (!data) return

      const normalized = reordered.map((field, idx) => ({ ...field, display_order: idx }))
      const order = normalized.map((field) => field.id)

      setReordering(true)
      setData((prev) => (prev ? { ...prev, fields: normalized } : prev))
      setFieldError(null)

      try {
        await reorderExerciseTypeFields(data.id, order)
      } catch (err) {
        const message = err instanceof Error ? err.message : "Не удалось изменить порядок"
        setFieldError(message)
        setData((prev) => (prev ? { ...prev, fields: origin } : prev))
        toast({
          title: "Ошибка",
          description: message,
          variant: "destructive",
        })
        return
      } finally {
        setReordering(false)
      }

      toast({
        title: "Порядок обновлён",
        description: "Последовательность полей сохранена.",
      })
    },
    [data, toast],
  )

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setDraggingFieldId(Number(event.active.id))
  }, [])

  const handleDragCancel = useCallback(() => {
    setDraggingFieldId(null)
  }, [])

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      setDraggingFieldId(null)
      if (!event.over) return

      const activeId = Number(event.active.id)
      const overId = Number(event.over.id)
      if (Number.isNaN(activeId) || Number.isNaN(overId) || activeId === overId) {
        return
      }

      const original = [...fieldsSorted]
      const oldIndex = original.findIndex((field) => field.id === activeId)
      const newIndex = original.findIndex((field) => field.id === overId)
      if (oldIndex === -1 || newIndex === -1) {
        return
      }

      const reordered = arrayMove(original, oldIndex, newIndex)
      void commitReorder(reordered, original)
    },
    [fieldsSorted, commitReorder],
  )

  const handleReorder = useCallback(
    async (fieldId: number, direction: "up" | "down") => {
      const original = [...fieldsSorted]
      const index = original.findIndex((field) => field.id === fieldId)
      if (index === -1) return

      const targetIndex = direction === "up" ? index - 1 : index + 1
      if (targetIndex < 0 || targetIndex >= original.length) return

      const reordered = arrayMove(original, index, targetIndex)
      await commitReorder(reordered, original)
    },
    [fieldsSorted, commitReorder],
  )

  const detailToFormState = useCallback(
    (detail: AdminExerciseTypeDetailDto): ExerciseTypeFormState => ({
      name: detail.name,
      key: detail.key,
      domain: detail.domain ?? "",
      icon: detail.icon ?? "",
      description: detail.description ?? "",
      display_order: detail.display_order ?? 0,
      is_active: detail.is_active,
    }),
    [],
  )

  const loadDetail = useCallback(
    async ({ signal }: { signal?: AbortSignal } = {}) => {
      try {
        setLoading(true)
        const detail = await fetchAdminExerciseTypeDetail(id, { signal })
        setData(detail)
        setFormState(detailToFormState(detail))
        setError(null)
      } catch (err) {
        if (err instanceof Error && err.message === "not_found") {
          notFound()
          return
        }

        if (err instanceof DOMException && err.name === "AbortError") {
          return
        }

        const message = err instanceof Error ? err.message : "Не удалось загрузить тип"
        setError(message)
        toast({
          title: "Ошибка",
          description: message,
          variant: "destructive",
        })
      } finally {
        if (!signal?.aborted) {
          setLoading(false)
        }
      }
    },
    [detailToFormState, id, toast],
  )

  useEffect(() => {
    const controller = new AbortController()
    loadDetail({ signal: controller.signal })

    return () => {
      controller.abort()
    }
  }, [loadDetail])

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

    const payload = buildCreateFieldPayload(newFieldForm, setFieldError)
    if (!payload) {
      return
    }

    try {
      setFieldSaving(true)
      setFieldError(null)
      const createdField = await createExerciseTypeField(data.id, payload)
      setData((prev) =>
        prev
          ? {
              ...prev,
              fields: [...(prev.fields ?? []), createdField].sort((a, b) => a.display_order - b.display_order),
            }
          : prev,
      )
      resetFieldForm()
      toast({
        title: "Поле добавлено",
        description: `Поле «${createdField.label}» добавлено к типу.`,
      })
    } catch (err) {
      const message = err instanceof Error ? err.message : "Не удалось создать поле"
      setFieldError(message)
      toast({
        title: "Ошибка",
        description: message,
        variant: "destructive",
      })
    } finally {
      setFieldSaving(false)
    }
  }

  const handleDeleteField = async (fieldId: number) => {
    if (!data) return
    if (!confirm("Удалить поле?")) return

    try {
      await deleteExerciseTypeField(data.id, fieldId)
      setData((prev) =>
        prev
          ? { ...prev, fields: prev.fields.filter((field) => field.id !== fieldId) }
          : prev,
      )
      toast({
        title: "Поле удалено",
        description: "Поле удалено из типа упражнений.",
      })
    } catch (err) {
      const message = err instanceof Error ? err.message : "Не удалось удалить поле"
      setFieldError(message)
      toast({
        title: "Ошибка",
        description: message,
        variant: "destructive",
      })
    }
  }

  const openFieldEditor = (fieldId: number) => {
    if (!data) return
    const field = data.fields.find((item) => item.id === fieldId)
    if (!field) return
    setEditingFieldId(field.id)
    setFieldEditError(null)
    setEditingFieldForm(fillFormFromField(field))
  }

  const cancelFieldEdit = () => {
    setEditingFieldId(null)
    setEditingFieldForm(null)
    setFieldEditError(null)
  }

  const handleFieldEditChange = <K extends keyof FieldEditForm>(field: K, value: FieldEditForm[K]) => {
    setEditingFieldForm((prev) => (prev ? { ...prev, [field]: value } : prev))
  }

  const handleSaveField = async (fieldId: number) => {
    if (!data || !editingFieldForm) return
    const payload = buildUpdateFieldPayload(editingFieldForm, setFieldEditError)
    if (!payload) {
      return
    }

    try {
      setSavingFieldId(fieldId)
      setFieldEditError(null)
      const updated = await updateExerciseTypeField(data.id, fieldId, payload as UpdateExerciseTypeFieldPayload)
      setData((prev) =>
        prev
          ? {
              ...prev,
              fields: prev.fields
                .map((field) => (field.id === fieldId ? updated : field))
                .sort((a, b) => a.display_order - b.display_order),
            }
          : prev,
      )
      toast({
        title: "Поле обновлено",
        description: `Поле «${updated.label}» обновлено.`,
      })
      cancelFieldEdit()
    } catch (err) {
      const message = err instanceof Error ? err.message : "Не удалось сохранить поле"
      setFieldEditError(message)
      toast({
        title: "Ошибка",
        description: message,
        variant: "destructive",
      })
    } finally {
      setSavingFieldId(null)
    }
  }

  const handleToggleRequired = (event: ChangeEvent<HTMLInputElement>) => {
    const { checked } = event.target
    setEditingFieldForm((prev) => (prev ? { ...prev, is_required: checked } : prev))
  }

  const handleToggleActive = async () => {
    if (!data || !formState) return

    try {
      setSaving(true)
      const updated = await updateExerciseType(data.id, {
        name: formState.name,
        key: formState.key,
        domain: formState.domain,
        icon: formState.icon,
        description: formState.description,
        display_order: formState.display_order,
        is_active: !formState.is_active,
      })
      setData(updated)
      setFormState(detailToFormState(updated))
      toast({
        title: updated.is_active ? "Тип активирован" : "Тип скрыт",
        description: `Тип «${updated.name}» теперь ${updated.is_active ? "доступен" : "скрыт"}.`,
      })
    } catch (err) {
      const message = err instanceof Error ? err.message : "Не удалось изменить статус"
      setError(message)
      toast({
        title: "Ошибка",
        description: message,
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  const handleFormChange: ExerciseTypeFormChangeHandler = (field, value) => {
    setFormState((prev) => (prev ? { ...prev, [field]: value } : prev))
  }

  const handleSave = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!data || !formState) return
    if (!formState.name.trim() || !formState.key.trim()) {
      setError("Название и ключ обязательны")
      return
    }
    try {
      setSaving(true)
      setError(null)
      const payload: UpdateExerciseTypePayload = {
        name: formState.name.trim(),
        key: formState.key.trim(),
        domain: formState.domain?.trim() || null,
        icon: formState.icon?.trim() || null,
        description: formState.description?.trim() || null,
        display_order: Number(formState.display_order) || 0,
        is_active: formState.is_active,
      }
      const updated = await updateExerciseType(data.id, payload)
      setData(updated)
      setFormState(detailToFormState(updated))
      toast({
        title: "Изменения сохранены",
        description: "Настройки типа обновлены.",
      })
    } catch (err) {
      const message = err instanceof Error ? err.message : "Не удалось сохранить изменения"
      setError(message)
      toast({
        title: "Ошибка",
        description: message,
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!data) return
    if (!confirm("Удалить тип? Все упражнения должны быть перепривязаны.")) return
    try {
      setSaving(true)
      await deleteExerciseType(data.id)
      toast({
        title: "Тип удалён",
        description: "Тип упражнений успешно удалён.",
      })
      router.push("/admin/exercise-types")
    } catch (err) {
      const message = err instanceof Error ? err.message : "Не удалось удалить тип"
      setError(message)
      toast({
        title: "Ошибка",
        description: message,
        variant: "destructive",
      })
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
            <Badge
              variant={data.is_active ? "secondary" : "outline"}
              className={data.is_active ? "bg-emerald-100 text-emerald-900" : undefined}
            >
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
          <TabsTrigger value="prompts">AI Промпты</TabsTrigger>
          <TabsTrigger value="delivery">Выполнение</TabsTrigger>
          <TabsTrigger value="usage">Использование</TabsTrigger>
        </TabsList>

        <TabsContent value="details">
          <ExerciseTypeForm
            title="Основные данные"
            description="Задайте описание и порядок вывода типа в конструкторах упражнений."
            value={formState ?? detailToFormState(data)}
            error={error}
            disabled={saving}
            submitLabel="Сохранить изменения"
            onSubmit={handleSave}
            onChange={handleFormChange}
            footerSlot={null}
          />
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
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragStart={handleDragStart}
                  onDragCancel={handleDragCancel}
                  onDragEnd={handleDragEnd}
                >
                  <div className="overflow-x-auto">
                    <table
                      className="w-full min-w-[720px] table-fixed border-collapse"
                      data-testid="exercise-type-fields-table"
                    >
                      <thead>
                        <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                          <th className="px-3 py-2">#</th>
                          <th className="px-3 py-2">Ключ</th>
                          <th className="px-3 py-2">Заголовок</th>
                          <th className="px-3 py-2">Тип</th>
                          <th className="px-3 py-2">Обязательное</th>
                          <th className="px-3 py-2">Default</th>
                          <th className="px-3 py-2">Опции</th>
                          <th className="px-3 py-2 text-right">Действия</th>
                        </tr>
                      </thead>
                      <SortableContext items={fieldsSorted.map((field) => field.id)} strategy={verticalListSortingStrategy}>
                        <tbody className="text-sm">
                          {fieldsSorted.map((field, index) => {
                            const isEditing = editingFieldId === field.id
                            const form = isEditing ? editingFieldForm : null
                            const canMoveUp = index > 0
                            const canMoveDown = index < fieldsSorted.length - 1

                            return (
                              <SortableFieldRow
                                key={field.id}
                                field={field}
                                index={index}
                                isEditing={isEditing}
                                form={form}
                                reordering={reordering}
                                savingFieldId={savingFieldId}
                                fieldEditError={fieldEditError}
                                canMoveUp={canMoveUp}
                                canMoveDown={canMoveDown}
                                onEditChange={handleFieldEditChange}
                                onToggleRequired={handleToggleRequired}
                                onReorder={handleReorder}
                                onSave={handleSaveField}
                                onCancel={cancelFieldEdit}
                                onDelete={handleDeleteField}
                                onEdit={openFieldEditor}
                              />
                            )
                          })}
                        </tbody>
                      </SortableContext>
                    </table>
                  </div>
                  <DragOverlay>
                    <DragOverlayCard field={activeField} />
                  </DragOverlay>
                </DndContext>
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
                Упражнений с этим типом: <strong>{data.exercises_count ?? 0}</strong>. Перейдите в раздел &laquo;Упражнения&raquo;, чтобы увидеть детальный список и настроить параметры.
              </p>
              {data.updated_at && (
                <p className="mt-2 text-xs">Последнее обновление: {new Date(data.updated_at).toLocaleString()}</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="prompts">
          <PromptEditor exerciseTypeId={id} />
        </TabsContent>

        <TabsContent value="delivery">
          <DeliveryTypesEditor exerciseTypeId={id} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
