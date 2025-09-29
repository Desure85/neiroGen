"use client"

import React from 'react'
import { Play, Search, Save, Printer, Download, RefreshCw, Trash2, Check, Star, ChevronDown } from 'lucide-react'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { apiFetch } from '@/lib/api'
import { cn } from '@/lib/utils'
import { RichTextEditor } from '@/components/worksheets/rich-text-editor'

type Exercise = {
  id: number
  title: string
  description?: string | null
  type: string
  difficulty: 'easy' | 'medium' | 'hard'
  content: any
}

type SelectedWorksheetItem = {
  key: string
  exercise?: Exercise
  customTitle: string
  instructions: string[]
  snapshot: Record<string, any>
}

type WorksheetFieldState = {
  childName: string
  sessionDate: string
  therapistNotes: string
}

type WorksheetPresetField = {
  key: string
  label: string
  value: string | null
}

type WorksheetPreset = {
  id: number
  name: string
  fields: WorksheetPresetField[]
  is_default?: boolean
}

type WorksheetLayout = {
  id: number
  name: string
  header_html: string | null
  footer_html: string | null
  meta?: Record<string, any> | null
  is_default?: boolean
}

type ChildContext = {
  id: number
  name: string
  age?: number
  avatar?: string
}

const DEFAULT_FIELDS: WorksheetFieldState = {
  childName: '',
  sessionDate: new Date().toISOString().substring(0, 10),
  therapistNotes: '',
}

const generateKey = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return Math.random().toString(36).slice(2)
}

export type WorksheetGeneratorProps = {
  childContext?: ChildContext | null
  initialWorksheetId?: number | null
  onWorksheetLoaded?: (worksheetId: number) => void
}

export function WorksheetGenerator({ childContext = null, initialWorksheetId = null, onWorksheetLoaded }: WorksheetGeneratorProps): JSX.Element {
  const steps = React.useMemo(
    () => [
      {
        key: 'select',
        title: 'Выбор упражнений',
        description: 'Подберите упражнения и сформируйте список заданий.'
      },
      {
        key: 'configure',
        title: 'Настройка листа',
        description: 'Заполните поля листа, отредактируйте задания и макет.'
      },
      {
        key: 'preview',
        title: 'Предпросмотр и экспорт',
        description: 'Проверьте итоговый вид и выполните сохранение или экспорт.'
      }
    ],
    []
  )

  const [exercises, setExercises] = React.useState<Exercise[]>([])
  const [exercisesLoading, setExercisesLoading] = React.useState(false)
  const [exercisesError, setExercisesError] = React.useState<string | null>(null)
  const [search, setSearch] = React.useState('')
  const [selectedType, setSelectedType] = React.useState<string>('all')
  const [selectedItems, setSelectedItems] = React.useState<SelectedWorksheetItem[]>([])
  const [currentStep, setCurrentStep] = React.useState(0)
  const [fields, setFields] = React.useState<WorksheetFieldState>(DEFAULT_FIELDS)
  const [childContextLocked, setChildContextLocked] = React.useState<boolean>(Boolean(childContext))
  const [worksheetTitle, setWorksheetTitle] = React.useState('Рабочий лист')
  const [worksheetNotes, setWorksheetNotes] = React.useState('')
  const [worksheetStatus, setWorksheetStatus] = React.useState<'draft' | 'ready' | 'archived'>('draft')
  const [worksheetFormat, setWorksheetFormat] = React.useState<'A4' | 'A5'>('A4')
  const [worksheetCopies, setWorksheetCopies] = React.useState(1)
  const [worksheetFeedback, setWorksheetFeedback] = React.useState<string | null>(null)
  const [presetFeedback, setPresetFeedback] = React.useState<string | null>(null)
  const [layoutFeedback, setLayoutFeedback] = React.useState<string | null>(null)
  const [savedWorksheetId, setSavedWorksheetId] = React.useState<number | null>(null)
  const [saving, setSaving] = React.useState(false)
  const [downloading, setDownloading] = React.useState(false)
  const [maxStepReached, setMaxStepReached] = React.useState(0)
  const [loadingWorksheet, setLoadingWorksheet] = React.useState(false)

  const [headerHtml, setHeaderHtml] = React.useState('')
  const [footerHtml, setFooterHtml] = React.useState('')
  const [layouts, setLayouts] = React.useState<WorksheetLayout[]>([])
  const [layoutsLoading, setLayoutsLoading] = React.useState(false)
  const [layoutsError, setLayoutsError] = React.useState<string | null>(null)
  const [selectedLayoutId, setSelectedLayoutId] = React.useState<string>('')
  const [layoutName, setLayoutName] = React.useState('')
  const [layoutSaving, setLayoutSaving] = React.useState(false)
  const [layoutDeleting, setLayoutDeleting] = React.useState(false)
  const [layoutUpdating, setLayoutUpdating] = React.useState(false)
  const [layoutDefaulting, setLayoutDefaulting] = React.useState(false)
  const [layoutPanelOpen, setLayoutPanelOpen] = React.useState(false)
  const [layoutSearchQuery, setLayoutSearchQuery] = React.useState('')
  const layoutPanelRef = React.useRef<HTMLDivElement | null>(null)

  const [presets, setPresets] = React.useState<WorksheetPreset[]>([])
  const [presetsLoading, setPresetsLoading] = React.useState(false)
  const [presetsError, setPresetsError] = React.useState<string | null>(null)
  const [selectedPresetId, setSelectedPresetId] = React.useState<string>('')
  const [presetName, setPresetName] = React.useState('')
  const [presetSaving, setPresetSaving] = React.useState(false)
  const [presetDeleting, setPresetDeleting] = React.useState(false)
  const [presetUpdating, setPresetUpdating] = React.useState(false)
  const [presetDefaulting, setPresetDefaulting] = React.useState(false)
  const [presetPanelOpen, setPresetPanelOpen] = React.useState(false)
  const [presetSearchQuery, setPresetSearchQuery] = React.useState('')
  const presetPanelRef = React.useRef<HTMLDivElement | null>(null)

  const defaultLayoutAppliedRef = React.useRef(false)
  const defaultPresetAppliedRef = React.useRef(false)

  React.useEffect(() => {
    if (!childContext) {
      setChildContextLocked(false)
      return
    }

    setFields((prev) => ({
      ...prev,
      childName: childContext.name ?? prev.childName,
    }))
    setChildContextLocked(true)
  }, [childContext])

  const handleUnlockChildName = React.useCallback(() => {
    setChildContextLocked(false)
  }, [])

  const handleRelockChildName = React.useCallback(() => {
    if (!childContext) return
    setFields((prev) => ({
      ...prev,
      childName: childContext.name ?? prev.childName,
    }))
    setChildContextLocked(true)
  }, [childContext])

  const selectedLayout = React.useMemo(
    () =>
      selectedLayoutId
        ? layouts.find((layout) => String(layout.id) === selectedLayoutId) ?? null
        : null,
    [layouts, selectedLayoutId]
  )

  const selectedPreset = React.useMemo(
    () =>
      selectedPresetId
        ? presets.find((preset) => String(preset.id) === selectedPresetId) ?? null
        : null,
    [presets, selectedPresetId]
  )

  React.useEffect(() => {
    if (!initialWorksheetId) {
      return
    }

    let cancelled = false

    const loadWorksheet = async () => {
      setLoadingWorksheet(true)
      try {
        const response = await apiFetch(`/api/worksheets/${initialWorksheetId}`)
        if (!response.ok) throw new Error(`HTTP ${response.status}`)
        const body = await response.json()
        const worksheet = body?.data ?? body

        if (cancelled || !worksheet) return

        setWorksheetTitle(worksheet.title ?? 'Рабочий лист')
        setWorksheetStatus((worksheet.status as any) ?? 'draft')
        setWorksheetFormat((worksheet.format as any) ?? 'A4')
        setWorksheetCopies(Number(worksheet.copies ?? 1) || 1)
        setWorksheetNotes(worksheet.notes ?? '')
        setSavedWorksheetId(worksheet.id ?? null)

        setHeaderHtml(worksheet.header_html ?? '')
        setFooterHtml(worksheet.footer_html ?? '')

        setSelectedLayoutId(worksheet.worksheet_layout_id ? String(worksheet.worksheet_layout_id) : '')

        const snapshot = Array.isArray(worksheet.fields_snapshot) ? worksheet.fields_snapshot : []
        const getField = (key: string) => snapshot.find((field: any) => field?.key === key)?.value ?? ''
        setFields({
          childName: String(getField('child_name') || ''),
          sessionDate: String(getField('session_date') || new Date().toISOString().substring(0, 10)),
          therapistNotes: String(getField('therapist_notes') || ''),
        })

        const items = Array.isArray(worksheet.items) ? worksheet.items : []
        setSelectedItems(
          items.map((item: any, index: number) => ({
            key: generateKey(),
            exercise: undefined,
            customTitle: item.title ?? item.content_snapshot?.title ?? `Задание ${index + 1}`,
            instructions: Array.isArray(item.instructions) ? item.instructions : [],
            snapshot: item.content_snapshot ?? {},
          }))
        )

        setWorksheetFeedback(`Загружен рабочий лист «${worksheet.title ?? 'Без названия'}».`)
        setCurrentStep(1)
        setMaxStepReached(2)
        if (onWorksheetLoaded) {
          onWorksheetLoaded(Number(worksheet.id))
        }
      } catch (error: any) {
        if (!cancelled) {
          setWorksheetFeedback(error?.message ?? 'Не удалось загрузить рабочий лист.')
        }
      } finally {
        if (!cancelled) {
          setLoadingWorksheet(false)
        }
      }
    }

    void loadWorksheet()

    return () => {
      cancelled = true
    }
  }, [initialWorksheetId, onWorksheetLoaded])

  const defaultLayout = React.useMemo(() => layouts.find((layout) => layout.is_default), [layouts])
  const defaultPreset = React.useMemo(() => presets.find((preset) => preset.is_default), [presets])

  const layoutSearchValue = layoutSearchQuery.trim()
  const normalizedLayoutSearch = layoutSearchValue.toLowerCase()
  const filteredLayouts = React.useMemo(() => {
    if (!normalizedLayoutSearch) {
      return layouts
    }
    return layouts.filter((layout) => layout.name.toLowerCase().includes(normalizedLayoutSearch))
  }, [layouts, normalizedLayoutSearch])
  const layoutNameValue = layoutName.trim()
  const isLayoutNameDuplicate = React.useMemo(() => {
    if (!layoutNameValue) return false
    const lowered = layoutNameValue.toLowerCase()
    return layouts.some(
      (layout) => layout.name.trim().toLowerCase() === lowered && String(layout.id) !== selectedLayoutId
    )
  }, [layoutNameValue, layouts, selectedLayoutId])
  const layoutPanelTargetName = layoutNameValue
  const canSaveLayoutFromPanel = layoutPanelTargetName.length > 0 && !isLayoutNameDuplicate

  const presetSearchValue = presetSearchQuery.trim()
  const normalizedPresetSearch = presetSearchValue.toLowerCase()
  const filteredPresets = React.useMemo(() => {
    if (!normalizedPresetSearch) {
      return presets
    }
    return presets.filter((preset) => preset.name.toLowerCase().includes(normalizedPresetSearch))
  }, [presets, normalizedPresetSearch])
  const presetNameValue = presetName.trim()
  const isPresetNameDuplicate = React.useMemo(() => {
    if (!presetNameValue) return false
    const lowered = presetNameValue.toLowerCase()
    return presets.some(
      (preset) => preset.name.trim().toLowerCase() === lowered && String(preset.id) !== selectedPresetId
    )
  }, [presetNameValue, presets, selectedPresetId])
  const presetPanelTargetName = presetNameValue
  const canSavePresetFromPanel = presetPanelTargetName.length > 0 && !isPresetNameDuplicate

  React.useEffect(() => {
    if (!layoutPanelOpen) {
      return
    }
    const handleClick = (event: MouseEvent) => {
      if (layoutPanelRef.current && !layoutPanelRef.current.contains(event.target as Node)) {
        setLayoutPanelOpen(false)
      }
    }
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setLayoutPanelOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('mousedown', handleClick)
      document.removeEventListener('keydown', handleKey)
    }
  }, [layoutPanelOpen])

  React.useEffect(() => {
    if (!presetPanelOpen) {
      return
    }
    const handleClick = (event: MouseEvent) => {
      if (presetPanelRef.current && !presetPanelRef.current.contains(event.target as Node)) {
        setPresetPanelOpen(false)
      }
    }
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setPresetPanelOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('mousedown', handleClick)
      document.removeEventListener('keydown', handleKey)
    }
  }, [presetPanelOpen])

  const buildPresetPayload = React.useCallback(
    (nameValue: string) => ({
      name: nameValue,
      fields: [
        { key: 'child_name', label: 'Имя ребёнка', value: fields.childName },
        { key: 'session_date', label: 'Дата занятия', value: fields.sessionDate },
        { key: 'therapist_notes', label: 'Заметки логопеда', value: fields.therapistNotes },
        { key: 'worksheet_notes', label: 'Заметки листа', value: worksheetNotes },
        { key: 'layout_header', label: 'Шапка', value: headerHtml },
        { key: 'layout_footer', label: 'Футер', value: footerHtml },
      ],
    }),
    [fields.childName, fields.sessionDate, fields.therapistNotes, worksheetNotes, headerHtml, footerHtml]
  )

  React.useEffect(() => {
    if (selectedLayout) {
      setLayoutName(selectedLayout.name)
    } else {
      setLayoutName('')
    }
  }, [selectedLayout])

  React.useEffect(() => {
    if (selectedPreset) {
      setPresetName(selectedPreset.name)
    } else {
      setPresetName('')
    }
  }, [selectedPreset])

  const canProceed = React.useMemo(() => {
    if (currentStep === 0) {
      return selectedItems.length > 0
    }

    return true
  }, [currentStep, selectedItems.length])

  const nextStepLabel = steps[currentStep + 1]?.title ?? ''

  const handleStepChange = (index: number) => {
    if (index < 0 || index >= steps.length || index === currentStep) {
      return
    }

    const isForward = index > currentStep

    if (isForward) {
      if (index === currentStep + 1 && canProceed) {
        setCurrentStep(index)
        setMaxStepReached((previous) => Math.max(previous, index))
        return
      }

      if (index <= maxStepReached) {
        setCurrentStep(index)
        return
      }

      return
    }

    setCurrentStep(index)
  }

  React.useEffect(() => {
    const loadExercises = async () => {
      setExercisesLoading(true)
      setExercisesError(null)
      try {
        const response = await apiFetch('/api/exercises?per_page=100')
        if (!response.ok) {
          throw new Error(`Ошибка ${response.status}`)
        }
        const data = await response.json()
        const rows: Exercise[] = Array.isArray(data?.data) ? data.data : data
        setExercises(rows)
      } catch (error: any) {
        setExercisesError(error?.message ?? 'Не удалось загрузить упражнения')
      } finally {
        setExercisesLoading(false)
      }
    }

    loadExercises()
  }, [])

  const filteredExercises = React.useMemo(() => {
    const term = search.trim().toLowerCase()
    return exercises.filter((exercise) => {
      const matchesSearch = !term
        || exercise.title.toLowerCase().includes(term)
        || (exercise.description ?? '').toLowerCase().includes(term)
      const matchesType = selectedType === 'all' || exercise.type === selectedType
      return matchesSearch && matchesType
    })
  }, [exercises, search, selectedType])

  React.useEffect(() => {
    const loadPresets = async () => {
      setPresetsLoading(true)
      setPresetsError(null)
      try {
        const response = await apiFetch('/api/worksheet-presets?per_page=100')
        if (!response.ok) throw new Error(`Ошибка ${response.status}`)
        const data = await response.json()
        const items: WorksheetPreset[] = Array.isArray(data?.data) ? data.data : Array.isArray(data) ? data : []
        setPresets(items)
        defaultPresetAppliedRef.current = false
      } catch (error: any) {
        setPresetsError(error?.message ?? 'Не удалось загрузить пресеты')
      } finally {
        setPresetsLoading(false)
      }
    }
    loadPresets()
  }, [])

  const applyPresetById = React.useCallback(
    (presetId: string, options: { silent?: boolean } = {}) => {
      const { silent = false } = options
      if (!presetId) {
        if (!silent) setPresetFeedback('Выберите пресет для применения.')
        return
      }
      const preset = presets.find((p) => String(p.id) === presetId)
      if (!preset) {
        if (!silent) setPresetFeedback('Пресет не найден.')
        return
      }
      setSelectedPresetId(String(preset.id))
      setPresetName(preset.name)

      preset.fields.forEach((field) => {
        const value = field.value ?? ''
        switch (field.key) {
          case 'child_name':
            setFields((prev) => ({ ...prev, childName: value }))
            break
          case 'session_date':
            setFields((prev) => ({ ...prev, sessionDate: value || DEFAULT_FIELDS.sessionDate }))
            break
          case 'therapist_notes':
            setFields((prev) => ({ ...prev, therapistNotes: value }))
            break
          case 'worksheet_notes':
            setWorksheetNotes(value)
            break
          case 'layout_header':
            setHeaderHtml(value)
            break
          case 'layout_footer':
            setFooterHtml(value)
            break
        }
      })
      if (!silent) {
        setPresetFeedback(`Пресет «${preset.name}» применён.`)
      }
    },
    [presets, fields, setWorksheetNotes]
  )

  const applyPreset = React.useCallback(() => applyPresetById(selectedPresetId), [applyPresetById, selectedPresetId])

  React.useEffect(() => {
    const loadLayouts = async () => {
      setLayoutsLoading(true)
      setLayoutsError(null)
      try {
        const response = await apiFetch('/api/worksheet-layouts?per_page=100')
        if (!response.ok) throw new Error(`Ошибка ${response.status}`)
        const data = await response.json()
        const items: WorksheetLayout[] = Array.isArray(data?.data) ? data.data : Array.isArray(data) ? data : []
        setLayouts(items)
        defaultLayoutAppliedRef.current = false
      } catch (error: any) {
        setLayoutsError(error?.message ?? 'Не удалось загрузить макеты')
      } finally {
        setLayoutsLoading(false)
      }
    }
    loadLayouts()
  }, [])

  const applyLayoutById = React.useCallback(
    (layoutId: string, options: { silent?: boolean } = {}) => {
      const { silent = false } = options
      if (!layoutId) {
        if (!silent) setLayoutFeedback('Выберите макет для применения.')
        return
      }

      const layout = layouts.find((l) => String(l.id) === layoutId)
      if (!layout) {
        if (!silent) setLayoutFeedback('Макет не найден.')
        return
      }

      setSelectedLayoutId(String(layout.id))
      setLayoutName(layout.name)
      setHeaderHtml(layout.header_html ?? '')
      setFooterHtml(layout.footer_html ?? '')
      if (!silent) {
        setLayoutFeedback(`Макет «${layout.name}» применён.`)
      }
    },
    [layouts]
  )

  const applyLayout = React.useCallback(() => applyLayoutById(selectedLayoutId), [applyLayoutById, selectedLayoutId])

  React.useEffect(() => {
    if (layoutsLoading) return
    if (!defaultLayoutAppliedRef.current && defaultLayout) {
      defaultLayoutAppliedRef.current = true
      applyLayoutById(String(defaultLayout.id), { silent: true })
    }
  }, [applyLayoutById, defaultLayout, layoutsLoading])

  React.useEffect(() => {
    if (presetsLoading) return
    if (!defaultPresetAppliedRef.current && defaultPreset) {
      defaultPresetAppliedRef.current = true
      applyPresetById(String(defaultPreset.id), { silent: true })
    }
  }, [applyPresetById, defaultPreset, presetsLoading])

  const handleSaveLayout = async (overrideName?: string): Promise<boolean> => {
    const rawName = overrideName ?? layoutName
    const name = rawName.trim()
    if (!name) {
      setLayoutFeedback('Введите название макета.')
      return false
    }

    if (rawName !== layoutName) {
      setLayoutName(name)
    }

    const existingLayout = layouts.find(
      (layout) => layout.name.trim().toLowerCase() === name.toLowerCase()
    )

    if (existingLayout) {
      setLayoutSaving(true)
      setLayoutFeedback(null)
      try {
        const payload = {
          name,
          header_html: headerHtml,
          footer_html: footerHtml,
          meta: existingLayout.meta ?? {},
        }

        const response = await apiFetch(`/api/worksheet-layouts/${existingLayout.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })

        if (!response.ok) throw new Error(`Ошибка обновления макета: ${response.status}`)

        const data = await response.json()
        const layout: WorksheetLayout = data?.data ?? data
        setLayouts((prev) =>
          prev.map((item) =>
            String(item.id) === String(layout.id) ? { ...item, ...layout } : item
          )
        )
        setSelectedLayoutId(String(layout.id))
        setLayoutName(layout.name)
        setLayoutFeedback(`Макет «${layout.name}» обновлён.`)
        return true
      } catch (error: any) {
        setLayoutFeedback(error?.message ?? 'Не удалось обновить макет.')
        return false
      } finally {
        setLayoutSaving(false)
      }
    }

    setLayoutSaving(true)
    setLayoutFeedback(null)
    try {
      const payload = {
        name,
        header_html: headerHtml,
        footer_html: footerHtml,
        meta: {},
      }
      const response = await apiFetch('/api/worksheet-layouts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!response.ok) throw new Error(`Ошибка сохранения макета: ${response.status}`)
      const data = await response.json()
      const layout: WorksheetLayout = data?.data ?? data
      setLayouts((prev) => [layout, ...prev])
      setSelectedLayoutId(String(layout.id))
      setLayoutFeedback(`Макет «${layout.name}» сохранён.`)
      return true
    } catch (error: any) {
      setLayoutFeedback(error?.message ?? 'Не удалось сохранить макет.')
      return false
    } finally {
      setLayoutSaving(false)
    }
  }

  const handleUpdateLayout = async (overrideName?: string) => {
    if (!selectedLayoutId) {
      setLayoutFeedback('Выберите макет для обновления.')
      return false
    }

    const rawName = overrideName ?? layoutName
    const name = rawName.trim() || selectedLayout?.name || 'Без названия'

    if (overrideName && overrideName !== layoutName) {
      setLayoutName(name)
    }

    const duplicate = layouts.find(
      (layout) =>
        layout.name.trim().toLowerCase() === name.toLowerCase() &&
        String(layout.id) !== selectedLayoutId
    )
    if (duplicate) {
      setLayoutFeedback('Макет с таким названием уже существует.')
      return false
    }

    setLayoutUpdating(true)
    setLayoutFeedback(null)
    try {
      const payload = {
        name,
        header_html: headerHtml,
        footer_html: footerHtml,
        meta: selectedLayout?.meta ?? {},
      }

      const response = await apiFetch(`/api/worksheet-layouts/${selectedLayoutId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!response.ok) throw new Error(`Ошибка обновления макета: ${response.status}`)

      const data = await response.json()
      const layout: WorksheetLayout = data?.data ?? data
      setLayouts((prev) =>
        prev.map((item) =>
          String(item.id) === String(layout.id) ? { ...item, ...layout } : item
        )
      )
      setLayoutName(layout.name)
      setLayoutFeedback(`Макет «${layout.name}» обновлён.`)
      return true
    } catch (error: any) {
      setLayoutFeedback(error?.message ?? 'Не удалось обновить макет.')
      return false
    } finally {
      setLayoutUpdating(false)
    }
  }

  const handleSetDefaultLayout = async (layoutId?: string) => {
    const targetId = layoutId ?? selectedLayoutId
    if (!targetId) {
      setLayoutFeedback('Выберите макет для назначения по умолчанию.')
      return
    }

    setLayoutDefaulting(true)
    setLayoutFeedback(null)
    try {
      const response = await apiFetch(`/api/worksheet-layouts/${targetId}/default`, {
        method: 'POST',
      })

      if (!response.ok) throw new Error(`Ошибка назначения макета: ${response.status}`)

      const data = await response.json()
      const layout: WorksheetLayout = data?.data ?? data
      setLayouts((prev) =>
        prev.map((item) =>
          String(item.id) === String(layout.id)
            ? { ...item, ...layout, is_default: true }
            : { ...item, is_default: false }
        )
      )
      setSelectedLayoutId(String(layout.id))
      setLayoutFeedback(`Макет «${layout.name}» установлен по умолчанию.`)
    } catch (error: any) {
      setLayoutFeedback(error?.message ?? 'Не удалось назначить макет по умолчанию.')
    } finally {
      setLayoutDefaulting(false)
    }
  }

  const handleDeleteLayout = async (layoutId?: string) => {
    const targetId = layoutId ?? selectedLayoutId
    if (!targetId) {
      setLayoutFeedback('Выберите макет для удаления.')
      return
    }

    setLayoutDeleting(true)
    setLayoutFeedback(null)
    try {
      const response = await apiFetch(`/api/worksheet-layouts/${targetId}`, {
        method: 'DELETE',
      })
      if (!response.ok && response.status !== 204) {
        throw new Error(`Ошибка удаления макета: ${response.status}`)
      }
      setLayouts((prev) => prev.filter((layout) => String(layout.id) !== targetId))
      if (selectedLayoutId === targetId) {
        setSelectedLayoutId('')
        setLayoutName('')
      }
      setLayoutFeedback('Макет удалён.')
    } catch (error: any) {
      setLayoutFeedback(error?.message ?? 'Не удалось удалить макет.')
    } finally {
      setLayoutDeleting(false)
    }
  }

  const handleSavePreset = async (overrideName?: string): Promise<boolean> => {
    const rawName = overrideName ?? presetName
    const name = rawName.trim()
    if (!name) {
      setPresetFeedback('Введите название для пресета.')
      return false
    }

    if (rawName !== presetName) {
      setPresetName(name)
    }

    setPresetSaving(true)
    try {
      const payload = {
        name,
        fields: [
          { key: 'child_name', label: 'Имя ребёнка', value: fields.childName },
          { key: 'session_date', label: 'Дата занятия', value: fields.sessionDate },
          { key: 'therapist_notes', label: 'Заметки логопеда', value: fields.therapistNotes },
          { key: 'worksheet_notes', label: 'Заметки листа', value: worksheetNotes },
          { key: 'layout_header', label: 'Шапка', value: headerHtml },
          { key: 'layout_footer', label: 'Футер', value: footerHtml },
        ],
      }

      const response = await apiFetch('/api/worksheet-presets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!response.ok) throw new Error(`Ошибка сохранения пресета: ${response.status}`)

      const data = await response.json()
      const preset: WorksheetPreset = data?.data ?? data
      setPresets((prev) => [preset, ...prev])
      setSelectedPresetId(String(preset.id))
      setPresetFeedback(`Пресет «${preset.name}» сохранён.`)
      return true
    } catch (error: any) {
      setPresetFeedback(error?.message ?? 'Не удалось сохранить пресет.')
      return false
    } finally {
      setPresetSaving(false)
    }
  }

  const handleUpdatePreset = async () => {
    if (!selectedPresetId) {
      setPresetFeedback('Выберите пресет для обновления.')
      return
    }

    setPresetUpdating(true)
    setPresetFeedback(null)
    try {
      const payload = {
        name: selectedPreset?.name ?? 'Пресет',
        fields: [
          { key: 'child_name', label: 'Имя ребёнка', value: fields.childName },
          { key: 'session_date', label: 'Дата занятия', value: fields.sessionDate },
          { key: 'therapist_notes', label: 'Заметки логопеда', value: fields.therapistNotes },
          { key: 'worksheet_notes', label: 'Заметки листа', value: worksheetNotes },
          { key: 'layout_header', label: 'Шапка', value: headerHtml },
          { key: 'layout_footer', label: 'Футер', value: footerHtml },
        ],
      }

      const response = await apiFetch(`/api/worksheet-presets/${selectedPresetId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!response.ok) throw new Error(`Ошибка обновления пресета: ${response.status}`)

      const data = await response.json()
      const preset: WorksheetPreset = data?.data ?? data
      setPresets((prev) =>
        prev.map((item) =>
          String(item.id) === String(preset.id) ? { ...item, ...preset } : item
        )
      )
      setPresetName(preset.name)
      setPresetFeedback(`Пресет «${preset.name}» обновлён.`)
    } catch (error: any) {
      setPresetFeedback(error?.message ?? 'Не удалось обновить пресет.')
    } finally {
      setPresetUpdating(false)
    }
  }

  const handleDeletePreset = async (presetId?: string) => {
    const targetId = presetId ?? selectedPresetId
    if (!targetId) {
      setPresetFeedback('Выберите пресет для удаления.')
      return
    }

    setPresetDeleting(true)
    setPresetFeedback(null)
    try {
      const response = await apiFetch(`/api/worksheet-presets/${targetId}`, {
        method: 'DELETE',
      })
      if (!response.ok && response.status !== 204) {
        throw new Error(`Ошибка удаления пресета: ${response.status}`)
      }
      setPresets((prev) => prev.filter((preset) => String(preset.id) !== targetId))
      if (selectedPresetId === targetId) {
        setSelectedPresetId('')
        setPresetName('')
      }
      setPresetFeedback('Пресет удалён.')
    } catch (error: any) {
      setPresetFeedback(error?.message ?? 'Не удалось удалить пресет.')
    } finally {
      setPresetDeleting(false)
    }
  }

  const handleSetDefaultPreset = async (presetId?: string) => {
    const targetId = presetId ?? selectedPresetId
    if (!targetId) {
      setPresetFeedback('Выберите пресет для назначения по умолчанию.')
      return
    }

    setPresetDefaulting(true)
    setPresetFeedback(null)
    try {
      const response = await apiFetch(`/api/worksheet-presets/${targetId}/default`, {
        method: 'POST',
      })

      if (!response.ok) throw new Error(`Ошибка назначения пресета: ${response.status}`)

      const data = await response.json()
      const preset: WorksheetPreset = data?.data ?? data
      setPresets((prev) =>
        prev.map((item) =>
          String(item.id) === String(preset.id)
            ? { ...item, ...preset, is_default: true }
            : { ...item, is_default: false }
        )
      )
      setSelectedPresetId(String(preset.id))
      setPresetFeedback(`Пресет «${preset.name}» установлен по умолчанию.`)
    } catch (error: any) {
      setPresetFeedback(error?.message ?? 'Не удалось назначить пресет по умолчанию.')
    } finally {
      setPresetDefaulting(false)
    }
  }

  const addExerciseToWorksheet = (exercise: Exercise) => {
    setSelectedItems((prev) => [
      ...prev,
      {
        key: generateKey(),
        exercise,
        customTitle: exercise.title,
        instructions: Array.isArray(exercise.content?.instructions)
          ? exercise.content.instructions.filter(Boolean)
          : [],
        snapshot: {
          type: exercise.type,
          difficulty: exercise.difficulty,
          title: exercise.title,
          description: exercise.description,
          content: exercise.content,
        },
      },
    ])
    setWorksheetFeedback(null)
  }

  const removeItem = (key: string) => {
    setSelectedItems((prev) => prev.filter((item) => item.key !== key))
  }

  const updateItem = (key: string, patch: Partial<SelectedWorksheetItem>) => {
    setSelectedItems((prev) =>
      prev.map((item) => (item.key === key ? { ...item, ...patch } : item))
    )
  }

  const handleSaveWorksheet = async () => {
    if (selectedItems.length === 0) {
      setWorksheetFeedback('Добавьте хотя бы одно упражнение в лист.')
      return
    }

    setSaving(true)
    setWorksheetFeedback(null)

    try {
      const payload = {
        title: worksheetTitle.trim() || 'Рабочий лист',
        status: worksheetStatus,
        format: worksheetFormat,
        copies: worksheetCopies,
        notes: worksheetNotes.trim() || null,
        worksheet_layout_id: selectedLayoutId ? Number(selectedLayoutId) : null,
        header_html: headerHtml || null,
        footer_html: footerHtml || null,
        fields_snapshot: [
          { key: 'child_name', label: 'Имя ребёнка', value: fields.childName },
          { key: 'session_date', label: 'Дата занятия', value: fields.sessionDate },
          { key: 'therapist_notes', label: 'Заметки логопеда', value: fields.therapistNotes },
          { key: 'child_id', label: 'ID ребёнка', value: childContext ? String(childContext.id) : null },
        ],
        child_id: childContext?.id ?? null,
        meta: {
          language: 'ru',
          child: childContext
            ? {
                id: childContext.id,
                name: childContext.name,
                avatar: childContext.avatar ?? null,
                age: childContext.age ?? null,
              }
            : null,
        },
        items: selectedItems.map((item, index) => ({
          exercise_id: item.exercise?.id ?? null,
          title: item.customTitle || item.snapshot?.title || `Задание ${index + 1}`,
          instructions: item.instructions,
          content_snapshot: item.snapshot,
          can_regenerate: Boolean(item.exercise?.id),
        })),
      }

      const targetId = savedWorksheetId ?? initialWorksheetId ?? null
      const isUpdating = Boolean(targetId)

      const response = await apiFetch(isUpdating ? `/api/worksheets/${targetId}` : '/api/worksheets', {
        method: isUpdating ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        throw new Error(`Ошибка сохранения: ${response.status}`)
      }

      const data = await response.json()
      const worksheetId = data?.data?.id ?? data?.id ?? targetId ?? null
      setSavedWorksheetId(worksheetId)
      setWorksheetFeedback(isUpdating ? 'Лист обновлён.' : 'Лист сохранён успешно.')
    } catch (error: any) {
      setWorksheetFeedback(error?.message ?? 'Не удалось сохранить лист.')
    } finally {
      setSaving(false)
    }
  }

  const handleDownloadPdf = async () => {
    if (selectedItems.length === 0) {
      setWorksheetFeedback('Добавьте упражнения перед экспортом PDF.')
      return
    }

    setDownloading(true)
    setWorksheetFeedback(null)

    try {
      const response = await apiFetch('/api/worksheets/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          exercise_ids: selectedItems
            .map((item) => item.exercise?.id)
            .filter((id): id is number => Boolean(id)),
          format: worksheetFormat,
          copies: worksheetCopies,
        }),
      })

      if (!response.ok) {
        throw new Error(`Ошибка генерации PDF: ${response.status}`)
      }

      const data = await response.json()
      if (data?.url) {
        window.open(data.url, '_blank', 'noopener')
        setWorksheetFeedback('PDF сформирован. Ссылка открыта в новой вкладке.')
      } else {
        setWorksheetFeedback('Ответ сервера не содержит URL PDF.')
      }
    } catch (error: any) {
      setWorksheetFeedback(error?.message ?? 'Не удалось сформировать PDF.')
    } finally {
      setDownloading(false)
    }
  }

  const handleRegenerateItem = async (item: SelectedWorksheetItem) => {
    if (!item.exercise) {
      // если нет исходного упражнения — только локальное обновление инструкций
      updateItem(item.key, {
        snapshot: {
          ...item.snapshot,
          regeneratedAt: new Date().toISOString(),
        },
      })
      return
    }

    try {
      const response = await apiFetch(`/api/exercises/${item.exercise.id}`)
      if (!response.ok) {
        throw new Error(`Ошибка ${response.status}`)
      }
      const data = await response.json()
      updateItem(item.key, {
        snapshot: {
          type: data.type,
          difficulty: data.difficulty,
          title: data.title,
          description: data.description,
          content: data.content,
          regeneratedAt: new Date().toISOString(),
        },
        instructions: Array.isArray(data.content?.instructions)
          ? data.content.instructions.filter(Boolean)
          : [],
      })
      setWorksheetFeedback('Контент задания обновлён.')
    } catch (error: any) {
      setWorksheetFeedback(error?.message ?? 'Не удалось обновить задание.')
    }
  }

  const handlePrint = () => {
    window.print()
  }

  const exercisesList = (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Выбор упражнений</CardTitle>
        <CardDescription>
          Найдите упражнения и добавьте их в лист. Выбрано: {selectedItems.length}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Поиск по названию или описанию"
              className="pl-8"
            />
          </div>
          <select
            value={selectedType}
            onChange={(event: React.ChangeEvent<HTMLSelectElement>) => setSelectedType(event.target.value)}
            className="h-10 w-[140px] rounded-md border border-border bg-background px-3 text-sm"
          >
            <option value="all">Все типы</option>
            <option value="pronunciation">Произношение</option>
            <option value="articulation">Артикуляция</option>
            <option value="rhythm">Ритм</option>
            <option value="memory">Память</option>
            <option value="other">Прочее</option>
          </select>
        </div>

        {exercisesLoading ? (
          <p className="text-sm text-muted-foreground">Загрузка упражнений...</p>
        ) : exercisesError ? (
          <p className="text-sm text-destructive">{exercisesError}</p>
        ) : (
          <div className="h-[420px] space-y-3 overflow-y-auto pr-4">
            {filteredExercises.length === 0 ? (
              <p className="text-sm text-muted-foreground">Упражнения не найдены. Попробуйте изменить фильтры.</p>
            ) : (
              filteredExercises.map((exercise) => (
                <div
                  key={exercise.id}
                  className="rounded-lg border border-border bg-card p-4 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold text-foreground">{exercise.title}</h4>
                        <Badge variant="secondary">{exercise.type}</Badge>
                        <Badge variant="outline">{exercise.difficulty}</Badge>
                      </div>
                      {exercise.description ? (
                        <p className="text-sm text-muted-foreground line-clamp-3">
                          {exercise.description}
                        </p>
                      ) : null}
                    </div>
                    <Button size="sm" onClick={() => addExerciseToWorksheet(exercise)}>
                      <Play className="mr-2 h-4 w-4" />
                      Добавить
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )

  const selectionSummary = (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Выбранные задания</CardTitle>
        <CardDescription>
          Управляйте списком заданий перед переходом к настройке. Выбрано: {selectedItems.length}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {selectedItems.length === 0 ? (
          <div className="rounded-md border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            Добавленные упражнения появятся здесь.
          </div>
        ) : (
          selectedItems.map((item, index) => (
            <div key={item.key} className="flex flex-col gap-3 rounded-lg border border-border bg-background p-4 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="space-y-1">
                  <p className="font-medium text-foreground">
                    {index + 1}. {item.customTitle || item.exercise?.title || 'Задание'}
                  </p>
                  <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                    {item.exercise?.type ? <span>Тип: {item.exercise.type}</span> : null}
                    {item.exercise?.difficulty ? <span>Сложность: {item.exercise.difficulty}</span> : null}
                    {item.exercise?.id ? <span>ID: {item.exercise.id}</span> : null}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeItem(item.key)}
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Удалить
                </Button>
              </div>
              {item.instructions.length ? (
                <div className="rounded-md bg-muted/40 p-3 text-xs text-muted-foreground">
                  <p className="font-medium text-foreground">Инструкции:</p>
                  <ul className="list-disc pl-4">
                    {item.instructions.map((instruction, idx) => (
                      <li key={idx}>{instruction}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          ))
        )}
      </CardContent>
    </Card>
  )

  const worksheetDetailsCard = (
    <Card className="h-full">
      <CardHeader className="space-y-5">
        <div className="space-y-1">
          <CardTitle>Превью рабочего листа</CardTitle>
          <CardDescription>
            Настройте поля и макет. Финальное сохранение и экспорт находятся на шаге «Предпросмотр и экспорт».
          </CardDescription>
        </div>

        <div className="rounded-md border border-primary/30 bg-primary/5 p-3 text-sm text-muted-foreground">
          После внесения изменений перейдите на следующий шаг, чтобы просмотреть итоговый лист, сохранить его или выгрузить PDF.
        </div>

        <div className="grid gap-4 rounded-md border border-border bg-background p-4">
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-medium text-foreground">Макеты</p>
                {defaultLayout ? (
                  <Badge variant="outline" className="text-xs">
                    По умолчанию: {defaultLayout.name}
                  </Badge>
                ) : null}
              </div>

              <div className="relative" ref={layoutPanelRef}>
                <button
                  type="button"
                  className={cn(
                    'flex h-10 w-full items-center justify-between rounded-md border border-border bg-background px-3 text-sm transition hover:border-primary focus:outline-none focus:ring-2 focus:ring-primary',
                    layoutPanelOpen ? 'border-primary' : ''
                  )}
                  onClick={() => {
                    setPresetPanelOpen(false)
                    setLayoutPanelOpen((prev) => !prev)
                  }}
                  aria-expanded={layoutPanelOpen}
                >
                  <span className="truncate">
                    {selectedLayout?.name || (defaultLayout ? `${defaultLayout.name} (по умолчанию)` : 'Без макета')}
                  </span>
                  <ChevronDown className={cn('h-4 w-4 transition-transform', layoutPanelOpen ? 'rotate-180' : '')} />
                </button>

                {layoutPanelOpen ? (
                  <div className="absolute z-20 mt-2 w-full space-y-3 rounded-lg border border-border bg-card p-3 shadow-xl">
                    <Input
                      autoFocus
                      value={layoutSearchQuery}
                      onChange={(event) => setLayoutSearchQuery(event.target.value)}
                      placeholder="Поиск макета или новое название"
                      className="h-9"
                    />

                    <div className="max-h-56 overflow-y-auto rounded-md border border-dashed border-border/60">
                      {filteredLayouts.length === 0 ? (
                        <div className="p-3 text-sm text-muted-foreground">
                          Макеты не найдены.
                          {layoutSearchValue ? (
                            <div className="mt-1 text-xs text-foreground">
                              Используйте кнопку ниже, чтобы создать «{layoutSearchValue}».
                            </div>
                          ) : null}
                        </div>
                      ) : (
                        <ul className="divide-y divide-border/60 text-sm">
                          {filteredLayouts.map((layout) => (
                            <li
                              key={layout.id}
                              className={cn(
                                'flex items-center justify-between gap-2 p-2 transition hover:bg-muted',
                                String(layout.id) === selectedLayoutId ? 'bg-muted/60' : ''
                              )}
                            >
                              <button
                                type="button"
                                className="flex flex-1 flex-col items-start text-left"
                                onClick={() => {
                                  applyLayoutById(String(layout.id))
                                  setLayoutPanelOpen(false)
                                }}
                              >
                                <span className="font-medium text-foreground">{layout.name}</span>
                                {layout.is_default ? (
                                  <span className="mt-1 text-xs text-muted-foreground">Макет по умолчанию</span>
                                ) : null}
                              </button>
                              <div className="flex items-center gap-2">
                                <div className="flex items-center gap-1">
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    onClick={(event) => {
                                      event.stopPropagation()
                                      setSelectedLayoutId(String(layout.id))
                                      setLayoutName(layout.name)
                                      void handleUpdateLayout(layout.name)
                                      setLayoutPanelOpen(false)
                                    }}
                                    title="Обновить макет из текущих данных"
                                    aria-label="Обновить макет"
                                    disabled={layoutUpdating}
                                  >
                                    <RefreshCw className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    onClick={(event) => {
                                      event.stopPropagation()
                                      void handleSetDefaultLayout(String(layout.id))
                                    }}
                                    title="Сделать макет по умолчанию"
                                    aria-label="Сделать макет по умолчанию"
                                    disabled={layoutDefaulting || layout.is_default}
                                  >
                                    <Star className={cn('h-4 w-4', layout.is_default ? 'text-amber-500' : '')} />
                                  </Button>
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    className="text-destructive hover:text-destructive"
                                    onClick={(event) => {
                                      event.stopPropagation()
                                      void handleDeleteLayout(String(layout.id))
                                    }}
                                    disabled={layoutDeleting}
                                    title="Удалить макет"
                                    aria-label="Удалить макет"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </div>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>

                    <div className="border-t border-border/60 pt-3">
                      <div className="flex flex-col gap-2">
                        <Input
                          value={layoutName}
                          onChange={(event) => setLayoutName(event.target.value)}
                          placeholder="Название макета"
                          className="h-9"
                        />
                        <Button
                          size="sm"
                          onClick={() => {
                            if (!layoutPanelTargetName) return
                            void handleSaveLayout(layoutPanelTargetName)
                          }}
                          disabled={layoutSaving || !canSaveLayoutFromPanel}
                        >
                          {layoutSaving
                            ? 'Сохранение…'
                            : 'Сохранить как новый'}
                        </Button>
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>
              {layoutFeedback ? (
                <p
                  className={cn(
                    'text-xs',
                    layoutFeedback.toLowerCase().includes('ошибка') || layoutFeedback.toLowerCase().includes('не удалось')
                      ? 'text-destructive'
                      : 'text-muted-foreground'
                  )}
                >
                  {layoutFeedback}
                </p>
              ) : null}
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-medium text-foreground">Пресеты полей</p>
                {defaultPreset ? (
                  <Badge variant="outline" className="text-xs">
                    По умолчанию: {defaultPreset.name}
                  </Badge>
                ) : null}
              </div>

              <div className="relative" ref={presetPanelRef}>
                <button
                  type="button"
                  className={cn(
                    'flex h-10 w-full items-center justify_between rounded-md border border-border bg-background px-3 text-sm transition hover:border-primary focus:outline-none focus:ring-2 focus:ring-primary',
                    presetPanelOpen ? 'border-primary' : ''
                  )}
                  onClick={() => {
                    setLayoutPanelOpen(false)
                    setPresetPanelOpen((prev) => !prev)
                  }}
                  aria-expanded={presetPanelOpen}
                >
                  <span className="truncate">
                    {selectedPreset?.name || (defaultPreset ? `${defaultPreset.name} (по умолчанию)` : 'Без пресета')}
                  </span>
                  <ChevronDown className={cn('h-4 w-4 transition-transform', presetPanelOpen ? 'rotate-180' : '')} />
                </button>

                {presetPanelOpen ? (
                  <div className="absolute z-20 mt-2 w-full space-y-3 rounded-lg border border-border bg-card p-3 shadow-xl">
                    <Input
                      autoFocus
                      value={presetSearchQuery}
                      onChange={(event) => setPresetSearchQuery(event.target.value)}
                      placeholder="Поиск пресета или новое название"
                      className="h-9"
                    />

                    <div className="max-h-56 overflow-y-auto rounded-md border border-dashed border-border/60">
                      {filteredPresets.length === 0 ? (
                        <div className="p-3 text-sm text-muted-foreground">
                          Пресеты не найдены.
                          {presetSearchValue ? (
                            <div className="mt-1 text-xs text-foreground">
                              Используйте кнопку ниже, чтобы создать «{presetSearchValue}».
                            </div>
                          ) : null}
                        </div>
                      ) : (
                        <ul className="divide-y divide-border/60 text-sm">
                          {filteredPresets.map((preset) => (
                            <li
                              key={preset.id}
                              className={cn(
                                'flex items-center justify-between gap-2 p-2 transition hover:bg-muted',
                                String(preset.id) === selectedPresetId ? 'bg-muted/60' : ''
                              )}
                            >
                              <button
                                type="button"
                                className="flex flex-1 flex-col items-start text-left"
                                onClick={() => {
                                  applyPresetById(String(preset.id))
                                  setPresetPanelOpen(false)
                                }}
                              >
                                <span className="font-medium text-foreground">{preset.name}</span>
                                {preset.is_default ? (
                                  <span className="mt-1 text-xs text-muted-foreground">Пресет по умолчанию</span>
                                ) : null}
                              </button>
                              <div className="flex items-center gap-2">
                                <div className="flex items-center gap-1">
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    onClick={(event) => {
                                      event.stopPropagation()
                                      applyPresetById(String(preset.id))
                                      void handleUpdatePreset()
                                      setPresetPanelOpen(false)
                                    }}
                                    title="Обновить пресет из текущих данных"
                                    aria-label="Обновить пресет"
                                    disabled={presetUpdating}
                                  >
                                    <RefreshCw className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    onClick={(event) => {
                                      event.stopPropagation()
                                      void handleSetDefaultPreset(String(preset.id))
                                    }}
                                    title="Сделать пресет по умолчанию"
                                    aria-label="Сделать пресет по умолчанию"
                                    disabled={presetDefaulting || preset.is_default}
                                  >
                                    <Star className={cn('h-4 w-4', preset.is_default ? 'text-amber-500' : '')} />
                                  </Button>
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    className="text-destructive hover:text-destructive"
                                    onClick={(event) => {
                                      event.stopPropagation()
                                      void handleDeletePreset(String(preset.id))
                                    }}
                                    disabled={presetDeleting}
                                    title="Удалить пресет"
                                    aria-label="Удалить пресет"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </div>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>

                    <div className="border-t border-border/60 pt-3">
                      <div className="flex flex-col gap-2">
                        <Input
                          value={presetName}
                          onChange={(event) => setPresetName(event.target.value)}
                          placeholder="Название пресета"
                          className="h-9"
                        />
                        <Button
                          size="sm"
                          onClick={() => {
                            if (!presetPanelTargetName) return
                            void handleSavePreset(presetPanelTargetName)
                          }}
                          disabled={presetSaving || !canSavePresetFromPanel}
                        >
                          {presetSaving
                            ? 'Сохранение…'
                            : 'Сохранить как новый'}
                        </Button>
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>

              {presetFeedback ? (
                <p
                  className={cn(
                    'text-xs',
                    presetFeedback.toLowerCase().includes('ошибка') || presetFeedback.toLowerCase().includes('не удалось')
                      ? 'text-destructive'
                      : 'text-muted-foreground'
                  )}
                >
                  {presetFeedback}
                </p>
              ) : null}
            </div>
          </div>
        </div>

        <Accordion
          type="multiple"
          defaultValue={["basics"]}
          className="rounded-md border border-border bg-muted/10 divide-y divide-border"
        >
          <AccordionItem value="basics">
            <AccordionTrigger>Основные параметры</AccordionTrigger>
            <AccordionContent>
              <div className="grid gap-3 md:grid-cols-2 py-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Название листа</label>
                  <Input value={worksheetTitle} onChange={(event) => setWorksheetTitle(event.target.value)} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Статус</label>
                  <select
                    value={worksheetStatus}
                    onChange={(event: React.ChangeEvent<HTMLSelectElement>) =>
                      setWorksheetStatus(event.target.value as 'draft' | 'ready' | 'archived')
                    }
                    className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm"
                  >
                    <option value="draft">Черновик</option>
                    <option value="ready">Готов</option>
                    <option value="archived">Архив</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Формат</label>
                  <select
                    value={worksheetFormat}
                    onChange={(event: React.ChangeEvent<HTMLSelectElement>) =>
                      setWorksheetFormat(event.target.value as 'A4' | 'A5')
                    }
                    className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm"
                  >
                    <option value="A4">A4</option>
                    <option value="A5">A5</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Количество копий</label>
                  <Input
                    type="number"
                    min={1}
                    max={10}
                    value={worksheetCopies}
                    onChange={(event) => setWorksheetCopies(Number(event.target.value) || 1)}
                  />
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="session">
            <AccordionTrigger>Информация о занятии</AccordionTrigger>
            <AccordionContent>
              <div className="space-y-3 py-2">
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-sm font-medium flex items-center gap-2">
                      Имя ребёнка
                      {childContext ? (
                        <Badge variant="outline" className="text-xs">
                          Подставлено из выбранного ребёнка
                        </Badge>
                      ) : null}
                    </label>
                    <div className="flex gap-2">
                      <Input
                        value={fields.childName}
                        onChange={(event) => setFields((prev) => ({ ...prev, childName: event.target.value }))}
                        placeholder="Например: Илья"
                        disabled={childContextLocked}
                      />
                      {childContext ? (
                        childContextLocked ? (
                          <Button variant="outline" size="sm" onClick={handleUnlockChildName}>
                            Изменить
                          </Button>
                        ) : (
                          <Button variant="outline" size="sm" onClick={handleRelockChildName}>
                            Вернуть
                          </Button>
                        )
                      ) : null}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Дата занятия</label>
                    <Input
                      type="date"
                      value={fields.sessionDate}
                      onChange={(event) => setFields((prev) => ({ ...prev, sessionDate: event.target.value }))}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Заметки логопеда</label>
                  <Textarea
                    value={fields.therapistNotes}
                    onChange={(event) => setFields((prev) => ({ ...prev, therapistNotes: event.target.value }))}
                    placeholder="Впечатления от занятия, дополнительные инструкции"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Заметки листа</label>
                  <Textarea
                    value={worksheetNotes}
                    onChange={(event) => setWorksheetNotes(event.target.value)}
                    placeholder="Комментарий логопеда для печатного листа"
                  />
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="layout">
            <AccordionTrigger>Макет (шапка/футер)</AccordionTrigger>
            <AccordionContent>
              <div className="space-y-4 py-2">
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Шапка листа</label>
                    <RichTextEditor
                      value={headerHtml}
                      onChange={setHeaderHtml}
                      placeholder="Добавьте логотип, название, дату и другие элементы для верхней части листа"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Футер листа</label>
                    <RichTextEditor
                      value={footerHtml}
                      onChange={setFooterHtml}
                      placeholder="Контакты, подпись или юридическая информация внизу листа"
                    />
                  </div>
                </div>
                <div className="rounded-lg border border-border bg-background p-4 shadow-sm">
                  <p className="text-sm font-medium text-foreground">Мини-превью макета</p>
                  <p className="text-xs text-muted-foreground">Макет рендерится приблизительно. Финальный вид зависит от генератора PDF.</p>
                  <div className="mt-3 grid gap-3 md:grid-cols-2">
                    <div className="space-y-2">
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">Шапка</p>
                      <div
                        className="min-h-[120px] rounded-md border border-dashed border-border bg-muted/20 p-3 text-sm"
                        dangerouslySetInnerHTML={{ __html: headerHtml || '<span class="text-muted-foreground">Шапка ещё не заполнена</span>' }}
                      />
                    </div>
                    <div className="space-y-2">
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">Футер</p>
                      <div
                        className="min-h-[120px] rounded-md border border-dashed border-border bg-muted/20 p-3 text-sm"
                        dangerouslySetInnerHTML={{ __html: footerHtml || '<span class="text-muted-foreground">Футер ещё не заполнен</span>' }}
                      />
                    </div>
                  </div>
                  {layoutFeedback ? (
                    <p
                      className={cn(
                        'mt-3 text-xs',
                        layoutFeedback.toLowerCase().includes('ошибка') || layoutFeedback.toLowerCase().includes('не удалось')
                          ? 'text-destructive'
                          : 'text-muted-foreground'
                      )}
                    >
                      {layoutFeedback}
                    </p>
                  ) : null}
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>

        </Accordion>

        {worksheetFeedback ? (
          <p
            className={cn(
              'text-sm',
              worksheetFeedback.toLowerCase().includes('ошибка') || worksheetFeedback.toLowerCase().includes('не удалось')
                ? 'text-destructive'
                : 'text-muted-foreground'
            )}
          >
            {worksheetFeedback}
          </p>
        ) : null}
      </CardHeader>

      <CardContent className="space-y-4">
        {selectedItems.length === 0 ? (
          <div className="rounded-md border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            Добавьте упражнения из списка слева, чтобы сформировать печатный лист.
          </div>
        ) : (
          <div className="space-y-3">
            {selectedItems.map((item, index) => (
              <div
                key={item.key}
                className="rounded-lg border border-border bg-background p-4 shadow-sm transition-shadow hover:shadow-md"
              >
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">Задание {index + 1}</Badge>
                      {item.exercise ? <Badge variant="secondary">ID {item.exercise.id}</Badge> : null}
                    </div>
                    <Input
                      value={item.customTitle}
                      onChange={(event) => updateItem(item.key, { customTitle: event.target.value })}
                    />
                    <Textarea
                      value={item.instructions.join('\n')}
                      onChange={(event) =>
                        updateItem(item.key, {
                          instructions: event.target.value
                            .split('\n')
                            .map((line) => line.trim())
                            .filter(Boolean),
                        })
                      }
                      placeholder="Инструкции для задания (каждая строка — отдельный пункт)"
                    />
                    <details className="rounded bg-muted/30 p-3 text-xs text-muted-foreground">
                      <summary className="cursor-pointer font-medium">Показать данные задания</summary>
                      <pre className="mt-2 max-h-40 overflow-auto whitespace-pre-wrap">
{JSON.stringify(item.snapshot, null, 2)}
                      </pre>
                    </details>
                  </div>
                  <div className="flex flex-col gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleRegenerateItem(item)}
                    >
                      <RefreshCw className="mr-2 h-4 w-4" />
                      Обновить
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeItem(item.key)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Удалить
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )

  const finalPreviewCard = (
    <Card className="h-full">
      <CardHeader className="space-y-4">
        <div className="space-y-1">
          <CardTitle>Итоговый вид рабочего листа</CardTitle>
          <CardDescription>
            Проверьте данные перед сохранением или экспортом. Все изменения ещё можно внести на предыдущих шагах.
          </CardDescription>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <div className="space-y-1 text-sm">
            <p className="text-muted-foreground">Название</p>
            <p className="font-medium text-foreground">{worksheetTitle.trim() || 'Рабочий лист'}</p>
          </div>
          <div className="space-y-1 text-sm">
            <p className="text-muted-foreground">Статус</p>
            <p className="font-medium text-foreground">{worksheetStatus === 'draft' ? 'Черновик' : worksheetStatus === 'ready' ? 'Готов' : 'Архив'}</p>
          </div>
          <div className="space-y-1 text-sm">
            <p className="text-muted-foreground">Формат</p>
            <p className="font-medium text-foreground">{worksheetFormat}</p>
          </div>
          <div className="space-y-1 text-sm">
            <p className="text-muted-foreground">Копии</p>
            <p className="font-medium text-foreground">{worksheetCopies}</p>
          </div>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <div className="space-y-1 text-sm">
            <p className="text-muted-foreground">Имя ребёнка</p>
            <p className="font-medium text-foreground">{fields.childName || '—'}</p>
          </div>
          <div className="space-y-1 text-sm">
            <p className="text-muted-foreground">Дата занятия</p>
            <p className="font-medium text-foreground">{fields.sessionDate || '—'}</p>
          </div>
          <div className="space-y-1 text-sm md:col-span-2">
            <p className="text-muted-foreground">Заметки логопеда</p>
            <p className="whitespace-pre-wrap text-foreground">{fields.therapistNotes || '—'}</p>
          </div>
          <div className="space-y-1 text-sm md:col-span-2">
            <p className="text-muted-foreground">Заметки листа</p>
            <p className="whitespace-pre-wrap text-foreground">{worksheetNotes || '—'}</p>
          </div>
        </div>
        <div className="space-y-3 text-sm">
          <div className="space-y-1">
            <p className="text-muted-foreground">Применённый макет</p>
            <p className="font-medium text-foreground">{selectedLayout?.name ?? 'Без макета'}</p>
          </div>
          {headerHtml ? (
            <div className="space-y-2">
              <p className="text-muted-foreground">Шапка</p>
              <div
                className="prose max-w-none rounded-md border border-border bg-background p-3 text-sm"
                dangerouslySetInnerHTML={{ __html: headerHtml }}
              />
            </div>
          ) : null}
          {footerHtml ? (
            <div className="space-y-2">
              <p className="text-muted-foreground">Футер</p>
              <div
                className="prose max-w-none rounded-md border border-border bg-background p-3 text-sm"
                dangerouslySetInnerHTML={{ __html: footerHtml }}
              />
            </div>
          ) : null}
        </div>
        {worksheetFeedback ? (
          <p
            className={cn(
              'text-sm',
              worksheetFeedback.toLowerCase().includes('ошибка') || worksheetFeedback.toLowerCase().includes('не удалось')
                ? 'text-destructive'
                : 'text-muted-foreground'
            )}
          >
            {worksheetFeedback}
          </p>
        ) : null}
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <h3 className="text-base font-semibold text-foreground">Задания</h3>
          {selectedItems.length === 0 ? (
            <div className="rounded-md border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
              В лист не добавлены задания.
            </div>
          ) : (
            selectedItems.map((item, index) => (
              <div key={item.key} className="space-y-2 rounded-lg border border-border bg-background p-4 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-medium text-foreground">
                    {index + 1}. {item.customTitle || item.exercise?.title || 'Задание'}
                  </p>
                  <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                    {item.exercise?.type ? <span>Тип: {item.exercise.type}</span> : null}
                    {item.exercise?.difficulty ? <span>Сложность: {item.exercise.difficulty}</span> : null}
                  </div>
                </div>
                {item.instructions.length ? (
                  <ul className="list-disc pl-4 text-sm text-muted-foreground">
                    {item.instructions.map((instruction, idx) => (
                      <li key={idx}>{instruction}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-muted-foreground">Инструкции не указаны.</p>
                )}
              </div>
            ))
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={handleSaveWorksheet} disabled={saving}>
            <Save className="mr-2 h-4 w-4" />
            {saving ? 'Сохранение...' : 'Сохранить лист'}
          </Button>
          <Button variant="outline" onClick={handlePrint}>
            <Printer className="mr-2 h-4 w-4" />
            Печать
          </Button>
          <Button variant="outline" onClick={handleDownloadPdf} disabled={downloading}>
            <Download className="mr-2 h-4 w-4" />
            {downloading ? 'Загрузка...' : 'PDF'}
          </Button>
          {savedWorksheetId ? (
            <span className="self-center text-xs text-muted-foreground">
              ID сохранённого листа: {savedWorksheetId}
            </span>
          ) : null}
        </div>
      </CardContent>
    </Card>
  )

  const renderStepContent = () => {
    if (currentStep === 0) {
      return (
        <div className="grid gap-6 lg:grid-cols-[2fr,3fr]">
          {exercisesList}
          {selectionSummary}
        </div>
      )
    }

    if (currentStep === 1) {
      return worksheetDetailsCard
    }

    return finalPreviewCard
  }

  return (
    <div className="space-y-6">
      <ol className="grid gap-3 md:grid-cols-3">
        {steps.map((step, index) => {
          const isActive = index === currentStep
          const isCompleted = (index < currentStep) || (index <= maxStepReached && index !== currentStep)
          const isAccessible = isActive || index <= maxStepReached || (index === currentStep + 1 && canProceed)
          return (
            <li key={step.key}>
              <button
                type="button"
                onClick={() => handleStepChange(index)}
                disabled={!isAccessible}
                className={cn(
                  'flex w-full items-start gap-3 rounded-lg border p-4 text-left transition-colors',
                  isActive && 'border-primary bg-primary/5',
                  isCompleted && !isActive && 'border-primary/50 bg-muted/50',
                  !isActive && !isCompleted && 'border-border text-muted-foreground'
                )}
              >
                <span
                  className={cn(
                    'flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-sm font-medium',
                    isActive ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-background',
                    isCompleted && !isActive && 'border-primary text-primary'
                  )}
                >
                  {isCompleted && !isActive ? <Check className="h-4 w-4" /> : index + 1}
                </span>
                <div className="space-y-1">
                  <p className="font-medium text-foreground">{step.title}</p>
                  <p className="text-sm text-muted-foreground">{step.description}</p>
                </div>
              </button>
            </li>
          )
        })}
      </ol>

      {renderStepContent()}

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
        <Button
          variant="outline"
          onClick={() => handleStepChange(currentStep - 1)}
          disabled={currentStep === 0}
        >
          Назад
        </Button>

        <div className="flex flex-col items-end gap-2 sm:flex-row sm:items-center">
          {currentStep === 0 && !selectedItems.length ? (
            <span className="text-sm text-destructive">Добавьте минимум одно упражнение, чтобы продолжить.</span>
          ) : null}
          {currentStep > 0 && selectedItems.length === 0 ? (
            <span className="text-sm text-destructive">В листе нет заданий — добавьте их на первом шаге перед сохранением.</span>
          ) : null}
          {currentStep < steps.length - 1 ? (
            <Button onClick={() => handleStepChange(currentStep + 1)} disabled={!canProceed}>
              Далее{nextStepLabel ? `: ${nextStepLabel}` : ''}
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  )
}
