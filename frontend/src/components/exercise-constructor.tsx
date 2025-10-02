"use client"

import React from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { useI18n } from '@/components/localization'
import { apiFetch } from '@/lib/api'
import { GraphicDictationGenerator } from '@/components/graphic-dictation-generator'
import type { GraphicDictationResult } from '@/components/graphic-dictation/types'
import {
  WorksheetLayoutEditor,
  type CanvasLayoutValue,
  createEmptyCanvasScene,
} from '@/components/worksheets/worksheet-layout-editor'
import { Star, StarOff, Settings2, ArrowRight, ArrowUp, ArrowDown, Eye, EyeOff, X } from 'lucide-react'

const CONSTRUCTOR_STEPS = [
  { id: 'type', label: 'Выбор типа', description: 'Определите формат и сценарий упражнения' },
  { id: 'configure', label: 'Настройка', description: 'Заполните параметры и подготовьте контент' },
  { id: 'layout', label: 'Макет', description: 'Размещение элементов задания' },
] as const

type ConstructorStepId = (typeof CONSTRUCTOR_STEPS)[number]['id']

type ExerciseTypeInfo = {
  key: string
  name: string
  domain: string
  icon: string
  description: string
}

const normalizeDomain = (domain?: string | null): string => {
  if (!domain) return 'Общее'
  const trimmed = domain.trim()
  return trimmed.length ? trimmed : 'Общее'
}

type ListSettingsPayload = {
  order: string[]
  hidden: string[]
}

type PreferenceSet = {
  favorites: string[]
  hidden: string[]
  order: string[]
}

type ConstructorPreferences = {
  categories: PreferenceSet
  types: PreferenceSet
}

const PREFERENCES_STORAGE_KEY = 'exercise-constructor:preferences'

interface TypeCardProps {
  typeItem: ExerciseTypeInfo
  isActive: boolean
  isFavorite: boolean
  isHidden?: boolean
  onSelect: () => void
  onToggleFavorite: () => void
  onToggleVisibility?: () => void
  onOpenEditor?: () => void
}

const TypeCard: React.FC<TypeCardProps> = ({ typeItem, isActive, isFavorite, isHidden, onSelect, onToggleFavorite, onToggleVisibility, onOpenEditor }) => {
  const isSelectable = !isHidden || isActive

  const handleSelect = () => {
    if (!isSelectable) return
    onSelect()
  }

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (!isSelectable) return
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      onSelect()
    }
  }

  return (
    <div
      role="button"
      tabIndex={isSelectable ? 0 : -1}
      aria-pressed={isActive}
      aria-disabled={!isSelectable}
      onClick={handleSelect}
      onKeyDown={handleKeyDown}
      className={cn(
        'relative flex h-full flex-col gap-2 rounded-lg border p-3 text-left outline-none transition-colors focus:ring-2 focus:ring-primary/40',
        isSelectable ? 'cursor-pointer' : 'cursor-not-allowed',
        isActive
          ? 'border-primary bg-primary/10 text-primary'
          : 'border-border bg-muted text-foreground/90 hover:bg-muted/70',
        isHidden && !isActive ? 'opacity-60' : undefined
      )}
    >
      <div className="absolute right-2 top-2 flex gap-1">
        <button
          type="button"
          aria-label={isFavorite ? 'Убрать из избранного' : 'Добавить в избранное'}
          className={cn(
            'rounded-full border border-transparent p-1 transition-colors',
            isFavorite ? 'bg-primary text-primary-foreground' : 'bg-muted/60 text-muted-foreground hover:bg-muted'
          )}
          onClick={(event) => {
            event.stopPropagation()
            onToggleFavorite()
          }}
        >
          {isFavorite ? <Star className="h-4 w-4 fill-current" /> : <StarOff className="h-4 w-4" />}
        </button>
        {onToggleVisibility && (
          <button
            type="button"
            aria-label={isHidden ? 'Показать упражнение' : 'Скрыть упражнение'}
            className={cn(
              'rounded-full border border-transparent p-1 transition-colors',
              isHidden ? 'bg-muted text-muted-foreground hover:bg-muted/80' : 'bg-muted/60 text-muted-foreground hover:bg-muted'
            )}
            onClick={(event) => {
              event.stopPropagation()
              onToggleVisibility()
            }}
          >
            {isHidden ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
          </button>
        )}
        {onOpenEditor && (
          <button
            type="button"
            aria-label="Перейти к настройке упражнения"
            className="rounded-full border border-transparent p-1 transition-colors bg-muted/60 text-muted-foreground hover:bg-muted"
            onClick={(event) => {
              event.stopPropagation()
              onOpenEditor()
            }}
          >
            <ArrowRight className="h-4 w-4" strokeWidth={3} />
          </button>
        )}
      </div>

      <div className="flex items-start gap-2">
        <span className="text-lg leading-none" aria-hidden="true">
          {typeItem.icon || '📘'}
        </span>
        <div className="flex-1">
          <div className="flex items-center gap-2 text-sm font-medium">
            <span>{typeItem.name}</span>
            {isHidden && !isActive && (
              <span className="flex items-center gap-1 rounded-full bg-muted/60 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                <EyeOff className="h-3 w-3" /> Скрыто
              </span>
            )}
          </div>
          {typeItem.description && (
            <div className="text-xs text-muted-foreground/90 line-clamp-2">{typeItem.description}</div>
          )}
        </div>
      </div>

      <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
        {normalizeDomain(typeItem.domain)}
      </div>

      {!isSelectable && (
        <div className="rounded border border-dashed border-border/60 bg-background/80 p-2 text-xs text-muted-foreground">
          Тип скрыт. Покажите его в настройках, чтобы использовать.
        </div>
      )}
    </div>
  )
}

interface CategorySettingsDialogProps {
  categories: string[]
  initialOrder: string[]
  hiddenCategories: string[]
  onCancel: () => void
  onApply: (payload: ListSettingsPayload) => void
}

const CategorySettingsDialog: React.FC<CategorySettingsDialogProps> = ({ categories, initialOrder, hiddenCategories, onCancel, onApply }) => {
  const buildOrder = React.useCallback(() => {
    const unique = new Set<string>()
    initialOrder.forEach((item) => {
      if (categories.includes(item)) unique.add(item)
    })
    categories.forEach((item) => unique.add(item))
    return Array.from(unique)
  }, [categories, initialOrder])

  const [orderState, setOrderState] = React.useState<string[]>(buildOrder)
  const [hiddenState, setHiddenState] = React.useState<string[]>(() => hiddenCategories.filter((item) => categories.includes(item)))

  React.useEffect(() => {
    setOrderState(buildOrder())
  }, [buildOrder])

  React.useEffect(() => {
    setHiddenState(hiddenCategories.filter((item) => categories.includes(item)))
  }, [hiddenCategories, categories])

  const moveCategory = (index: number, direction: -1 | 1) => {
    setOrderState((prev) => {
      const next = [...prev]
      const targetIndex = index + direction
      if (targetIndex < 0 || targetIndex >= next.length) return prev
      const [item] = next.splice(index, 1)
      next.splice(targetIndex, 0, item)
      return next
    })
  }

  const toggleHidden = (category: string) => {
    setHiddenState((prev) => (prev.includes(category) ? prev.filter((item) => item !== category) : [...prev, category]))
  }

  const handleApply = () => {
    onApply({ order: orderState, hidden: hiddenState })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/60 backdrop-blur-sm">
      <div className="w-full max-w-lg space-y-4 rounded-lg border border-border bg-card p-4 shadow-xl">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-lg font-semibold">Настроить категории</div>
            <div className="text-xs text-muted-foreground">Определите порядок отображения и видимость категорий</div>
          </div>
          <Button variant="ghost" size="icon" onClick={onCancel} aria-label="Закрыть настройки">
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="max-h-80 space-y-2 overflow-y-auto rounded-lg border border-border bg-muted/20 p-2">
          {orderState.map((category, index) => {
            const isHidden = hiddenState.includes(category)
            return (
              <div key={category} className="flex items-center justify-between rounded border border-border bg-background/80 px-3 py-2 text-sm">
                <div className="flex items-center gap-3">
                  <span className="font-medium">{category}</span>
                  <span className="text-xs text-muted-foreground">{isHidden ? 'скрыто' : 'видимо'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => moveCategory(index, -1)}
                    disabled={index === 0}
                    aria-label="Переместить вверх"
                  >
                    <ArrowUp className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => moveCategory(index, 1)}
                    disabled={index === orderState.length - 1}
                    aria-label="Переместить вниз"
                  >
                    <ArrowDown className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => toggleHidden(category)}
                  >
                    {isHidden ? (
                      <>
                        <Eye className="mr-2 h-4 w-4" /> Показать
                      </>
                    ) : (
                      <>
                        <EyeOff className="mr-2 h-4 w-4" /> Скрыть
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )
          })}
          {orderState.length === 0 && (
            <div className="rounded border border-dashed border-border bg-muted/40 p-4 text-sm text-muted-foreground">
              Нет доступных категорий.
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onCancel}>
            Отмена
          </Button>
          <Button onClick={handleApply}>
            Применить
          </Button>
        </div>
      </div>
    </div>
  )
}

interface TypeSettingsDialogProps {
  types: ExerciseTypeInfo[]
  favorites: string[]
  hidden: string[]
  order: string[]
  initialKey?: string | null
  onCancel: () => void
  onApply: (payload: PreferenceSet) => void
}

const TypeSettingsDialog: React.FC<TypeSettingsDialogProps> = ({ types, favorites, hidden, order, initialKey, onCancel, onApply }) => {
  const [orderState, setOrderState] = React.useState<string[]>(order)
  const [hiddenState, setHiddenState] = React.useState<string[]>(hidden)
  const [favoriteState, setFavoriteState] = React.useState<string[]>(favorites)
  const [selectedKey, setSelectedKey] = React.useState<string | null>(initialKey ?? null)
  const listRef = React.useRef<HTMLDivElement | null>(null)

  React.useEffect(() => {
    const sanitizedOrder = order.filter((key) => types.some((item) => item.key === key))
    const allKeys = types.map((item) => item.key)
    const merged = Array.from(new Set([...sanitizedOrder, ...allKeys]))
    setOrderState(merged)
  }, [order, types])

  React.useEffect(() => {
    setHiddenState(hidden.filter((key) => types.some((item) => item.key === key)))
  }, [hidden, types])

  React.useEffect(() => {
    setFavoriteState(favorites.filter((key) => types.some((item) => item.key === key)))
  }, [favorites, types])

  React.useEffect(() => {
    if (!initialKey) return
    setSelectedKey(initialKey)
    requestAnimationFrame(() => {
      const node = listRef.current?.querySelector<HTMLElement>(`[data-type-key="${initialKey}"]`)
      node?.scrollIntoView({ block: 'center', behavior: 'smooth' })
    })
  }, [initialKey])

  const moveType = (index: number, direction: -1 | 1) => {
    setOrderState((prev) => {
      const next = [...prev]
      const targetIndex = index + direction
      if (targetIndex < 0 || targetIndex >= next.length) return prev
      const [item] = next.splice(index, 1)
      next.splice(targetIndex, 0, item)
      return next
    })
  }

  const toggleHidden = (key: string) => {
    setHiddenState((prev) => (prev.includes(key) ? prev.filter((item) => item !== key) : [...prev, key]))
  }

  const toggleFavorite = (key: string) => {
    setFavoriteState((prev) => (prev.includes(key) ? prev.filter((item) => item !== key) : [...prev, key]))
  }

  const handleApply = () => {
    const payload: PreferenceSet = {
      favorites: favoriteState,
      hidden: hiddenState,
      order: orderState,
    }
    onApply(payload)
  }

  const typeMap = React.useMemo(() => {
    return types.reduce<Record<string, ExerciseTypeInfo>>((acc, item) => {
      acc[item.key] = item
      return acc
    }, {})
  }, [types])

  const visibleKeys = React.useMemo(() => {
    return orderState.filter((key) => typeMap[key])
  }, [orderState, typeMap])

  const displayKeys = React.useMemo(() => {
    const hiddenKeys = visibleKeys.filter((key) => hiddenState.includes(key))
    const shownKeys = visibleKeys.filter((key) => !hiddenState.includes(key))
    return [...hiddenKeys, ...shownKeys]
  }, [visibleKeys, hiddenState])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/60 backdrop-blur-sm">
      <div className="w-full max-w-2xl space-y-4 rounded-lg border border-border bg-card p-4 shadow-xl">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-lg font-semibold">Настроить типы упражнений</div>
            <div className="text-xs text-muted-foreground">Управляйте порядком, избранным и видимостью типов</div>
          </div>
          <Button variant="ghost" size="icon" onClick={onCancel} aria-label="Закрыть настройки">
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div ref={listRef} className="max-h-96 space-y-2 overflow-y-auto rounded-lg border border-border bg-muted/20 p-2">
          {visibleKeys.length === 0 ? (
            <div className="rounded border border-dashed border-border bg-muted/40 p-4 text-sm text-muted-foreground">
              Нет доступных типов.
            </div>
          ) : (
            displayKeys.map((key) => {
              const item = typeMap[key]
              if (!item) return null
              const isHidden = hiddenState.includes(key)
              const isFavorite = favoriteState.includes(key)
              const index = visibleKeys.indexOf(key)
              return (
                <div
                  key={key}
                  data-type-key={key}
                  role="button"
                  tabIndex={0}
                  onClick={() => setSelectedKey(key)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault()
                      setSelectedKey(key)
                    }
                  }}
                  className={cn(
                    'flex items-center justify-between rounded border px-3 py-2 text-sm transition-colors outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
                    selectedKey === key ? 'border-primary bg-primary/5 text-primary' : 'border-border bg-background/80'
                  )}
                >
                  <div className="flex flex-col">
                    <span className="font-medium">{item.name}</span>
                    <span className="text-xs text-muted-foreground">{normalizeDomain(item.domain)}</span>
                    <span className="text-xs text-muted-foreground/80">{isHidden ? 'Скрыт' : 'Отображается'} · {isFavorite ? 'Избранный' : 'Обычный'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => moveType(index, -1)}
                      disabled={index === 0}
                      aria-label="Переместить вверх"
                    >
                      <ArrowUp className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => moveType(index, 1)}
                      disabled={index === visibleKeys.length - 1}
                      aria-label="Переместить вниз"
                    >
                      <ArrowDown className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => toggleFavorite(key)}
                    >
                      {isFavorite ? (
                        <>
                          <Star className="mr-2 h-4 w-4 fill-current" /> Убрать из избранного
                        </>
                      ) : (
                        <>
                          <StarOff className="mr-2 h-4 w-4" /> В избранное
                        </>
                      )}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => toggleHidden(key)}
                    >
                      {isHidden ? (
                        <>
                          <Eye className="mr-2 h-4 w-4" /> Показать
                        </>
                      ) : (
                        <>
                          <EyeOff className="mr-2 h-4 w-4" /> Скрыть
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              )
            })
          )}
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onCancel}>
            Отмена
          </Button>
          <Button onClick={handleApply}>
            Применить
          </Button>
        </div>
      </div>
    </div>
  )
}

interface ExerciseDraft {
  title: string
  type: string
  difficulty: 'easy' | 'medium' | 'hard'
  estimated_duration: number
  instructions: string[]
  blocks: Array<{ id: number; title: string; type: string }>
  layout: CanvasLayoutValue
}

// Типы теперь берём только с бэкенда через /api/exercise-types

const DIFF_OPTIONS: Array<{ value: ExerciseDraft['difficulty']; label: string }> = [
  { value: 'easy', label: 'Легкий' },
  { value: 'medium', label: 'Средний' },
  { value: 'hard', label: 'Сложный' },
]

export function ExerciseConstructor({ onCreate, initialType }: { onCreate?: (draft: ExerciseDraft) => void; initialType?: string }) {
  const { t } = useI18n()
  const [draft, setDraft] = React.useState<ExerciseDraft>({
    title: '',
    type: (initialType as any) || 'pronunciation',
    difficulty: 'medium',
    estimated_duration: 10,
    instructions: ['Повторяйте вслух за диктором'],
    blocks: [],
    layout: {
      scene: createEmptyCanvasScene(),
      snapshot: null,
    },
  })
  const [customParams, setCustomParams] = React.useState<Record<string, any>>({})
  const [typeSchema, setTypeSchema] = React.useState<any | null>(null)
  const [allTypes, setAllTypes] = React.useState<ExerciseTypeInfo[]>([])
  const [typesLoading, setTypesLoading] = React.useState(false)
  const [typesError, setTypesError] = React.useState<string>('')
  const [typeSearch, setTypeSearch] = React.useState('')
  const [newInstruction, setNewInstruction] = React.useState('')
  const [hiddenCategories, setHiddenCategories] = React.useState<string[]>([])
  const [categoryOrder, setCategoryOrder] = React.useState<string[]>([])
  const [favoriteTypeKeys, setFavoriteTypeKeys] = React.useState<string[]>([])
  const [hiddenTypeKeys, setHiddenTypeKeys] = React.useState<string[]>([])
  const [typeOrder, setTypeOrder] = React.useState<string[]>([])
  const [favoriteExerciseKeys, setFavoriteExerciseKeys] = React.useState<string[]>([])
  const [hiddenExerciseKeys, setHiddenExerciseKeys] = React.useState<string[]>([])
  const [exerciseOrder, setExerciseOrder] = React.useState<string[]>([])
  const [categorySettingsOpen, setCategorySettingsOpen] = React.useState(false)
  const [typeSettingsOpen, setTypeSettingsOpen] = React.useState(false)
  const [preferencesLoaded, setPreferencesLoaded] = React.useState(false)
  const [typeSettingsInitialKey, setTypeSettingsInitialKey] = React.useState<string | null>(null)
  const [graphicDictationResult, setGraphicDictationResult] = React.useState<GraphicDictationResult | null>(null)
  const [currentStep, setCurrentStep] = React.useState<ConstructorStepId>('type')
  const [saveLoading, setSaveLoading] = React.useState(false)
  const [saveError, setSaveError] = React.useState<string>('')
  const [saveOk, setSaveOk] = React.useState<string>('')
  const handleLayoutChange = React.useCallback((value: CanvasLayoutValue) => {
    setDraft((prev) => ({ ...prev, layout: value }))
  }, [])
  React.useEffect(() => {
    if (!draft.type) return
    const load = async () => {
      try {
        const res = await apiFetch(`/api/exercise-types/${draft.type}`)
        if (!res.ok) throw new Error('HTTP '+res.status)
        const data = await res.json()
        setTypeSchema(data)
        if (data?.defaults) setCustomParams((prev) => ({ ...data.defaults, ...prev }))
      } catch (e) {
        // no-op, keep schema null
      }
    }
    load()
  }, [draft.type])

  React.useEffect(() => {
    if (initialType) {
      setDraft(prev => ({ ...prev, type: initialType as any }))
      setCurrentStep('configure')
    }
  }, [initialType])

  React.useEffect(() => {
    if (draft.type !== 'graphic_dictation') {
      setGraphicDictationResult(null)
    }
  }, [draft.type])

  // Загрузка списка типов с бэкенда
  React.useEffect(() => {
    const run = async () => {
      setTypesError(''); setTypesLoading(true)
      try {
        const res = await apiFetch(`/api/exercise-types`)
        if (!res.ok) throw new Error('HTTP '+res.status)
        const data = await res.json()
        const items: ExerciseTypeInfo[] = Array.isArray(data.types)
          ? data.types.map((item: any) => ({
              key: String(item.key),
              name: item.name ?? String(item.key),
              domain: normalizeDomain(item.domain),
              icon: item.icon ?? '📘',
              description: item.description ?? '',
            }))
          : []
        const availableKeys = new Set(items.map((item) => item.key))
        const availableDomains = Array.from(new Set(items.map((item) => item.domain)))
        setAllTypes(items)
        setFavoriteTypeKeys(prev => prev.filter((key) => availableKeys.has(key)))
        setHiddenTypeKeys(prev => prev.filter((key) => availableKeys.has(key)))
        setTypeOrder(prev => {
          const sanitized = prev.filter((key) => availableKeys.has(key))
          const missing = items.map((item) => item.key).filter((key) => !sanitized.includes(key))
          return [...sanitized, ...missing]
        })
        setHiddenCategories(prev => prev.filter((domain) => availableDomains.includes(domain)))
        setCategoryOrder(prev => prev.filter((domain) => availableDomains.includes(domain)))
      } catch (e:any) {
        setTypesError('Не удалось загрузить типы: '+(e?.message||e))
      } finally {
        setTypesLoading(false)
      }
    }
    run()
  }, [])

  React.useEffect(() => {
    try {
      const raw = window.localStorage.getItem(PREFERENCES_STORAGE_KEY)
      if (!raw) {
        setPreferencesLoaded(true)
        return
      }
      const parsed = JSON.parse(raw) as Partial<ConstructorPreferences>
      if (parsed?.categories) {
        setCategoryOrder(Array.isArray(parsed.categories.order) ? parsed.categories.order : [])
        setHiddenCategories(Array.isArray(parsed.categories.hidden) ? parsed.categories.hidden : [])
      }
      if (parsed?.types) {
        setFavoriteTypeKeys(Array.isArray(parsed.types.favorites) ? parsed.types.favorites : [])
        setHiddenTypeKeys(Array.isArray(parsed.types.hidden) ? parsed.types.hidden : [])
        setTypeOrder(Array.isArray(parsed.types.order) ? parsed.types.order : [])
      }
      if (parsed?.types) {
        // future exercise preferences loading placeholder
      }
    } catch (error) {
      // ignore malformed preferences
    } finally {
      setPreferencesLoaded(true)
    }
  }, [])

  React.useEffect(() => {
    if (!preferencesLoaded) return
    const payload: ConstructorPreferences = {
      categories: {
        favorites: [],
        hidden: hiddenCategories,
        order: categoryOrder,
      },
      types: {
        favorites: favoriteTypeKeys,
        hidden: hiddenTypeKeys,
        order: typeOrder,
      },
    }
    try {
      window.localStorage.setItem(PREFERENCES_STORAGE_KEY, JSON.stringify(payload))
    } catch (error) {
      // ignore storage errors
    }
  }, [preferencesLoaded, hiddenCategories, categoryOrder, favoriteTypeKeys, hiddenTypeKeys, typeOrder])

  const addInstruction = () => {
    const value = newInstruction.trim()
    if (!value) return
    setDraft(prev => ({ ...prev, instructions: [...prev.instructions, value] }))
    setNewInstruction('')
  }

  const removeInstruction = (idx: number) => {
    setDraft(prev => ({ ...prev, instructions: prev.instructions.filter((_, i) => i !== idx) }))
  }

  const create = async () => {
    setSaveError(''); setSaveOk(''); setSaveLoading(true)
    try {
      const payload = {
        title: draft.title || 'Без названия',
        description: draft.instructions.join('\n'),
        type: draft.type,
        difficulty: draft.difficulty,
        estimated_duration: draft.estimated_duration,
        // Преобразуем в content, которое проигрывает ребёнок
        content: {
          exercise_type: draft.type,
          instructions: draft.instructions,
          blocks: draft.blocks,
          custom_params: {
            ...customParams,
            graphic_dictation_result: draft.type === 'graphic_dictation' ? graphicDictationResult : undefined,
          },
          layout: draft.layout,
        },
        tags: [] as string[],
        is_active: true,
      }
      const res = await apiFetch(`/api/exercises`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      if (!res.ok) throw new Error('HTTP '+res.status)
      const data = await res.json()
      setSaveOk('Упражнение сохранено')
      onCreate?.(draft)
    } catch (e:any) {
      setSaveError('Ошибка сохранения: ' + (e?.message || e))
    } finally {
      setSaveLoading(false)
    }
  }

  const filteredTypes = React.useMemo(() => {
    const raw = typeSearch.trim()
    const q = raw ? raw.toLowerCase() : ''
    return allTypes.filter((item) => {
      if (!q) return true
      const haystack = [item.name, item.description, item.domain, item.key].join(' ').toLowerCase()
      return haystack.includes(q)
    })
  }, [allTypes, typeSearch])

  const visibleFavoriteTypeKeys = React.useMemo(() => {
    return favoriteTypeKeys.filter((key) => !hiddenTypeKeys.includes(key) || key === draft.type)
  }, [favoriteTypeKeys, hiddenTypeKeys, draft.type])

  const visibleFilteredTypes = React.useMemo(() => {
    const favoriteSet = new Set(visibleFavoriteTypeKeys)
    return filteredTypes.filter((item) => {
      if (hiddenTypeKeys.includes(item.key) && item.key !== draft.type) return false
      if (favoriteSet.has(item.key) && item.key !== draft.type) return false
      return true
    })
  }, [filteredTypes, hiddenTypeKeys, draft.type, visibleFavoriteTypeKeys])

  const typesByDomain = React.useMemo(() => {
    return visibleFilteredTypes.reduce<Record<string, Array<typeof visibleFilteredTypes[number]>>>((acc, item) => {
      const domain = normalizeDomain(item.domain)
      if (!acc[domain]) acc[domain] = []
      acc[domain].push(item)
      return acc
    }, {})
  }, [visibleFilteredTypes])

  const allDomains = React.useMemo(() => {
    const set = new Set<string>()
    visibleFilteredTypes.forEach((item) => set.add(normalizeDomain(item.domain)))
    return Array.from(set)
  }, [visibleFilteredTypes])

  const normalizedOrder = React.useMemo(() => {
    if (!categoryOrder.length) return null
    const orderMap = new Map(categoryOrder.map((item, idx) => [item, idx]))
    return orderMap
  }, [categoryOrder])

  const sortedDomainKeys = React.useMemo(() => {
    const keys = Object.keys(typesByDomain)
    if (!keys.length) return keys
    if (!normalizedOrder) return keys.sort((a, b) => a.localeCompare(b))
    return keys.sort((a, b) => {
      const idxA = normalizedOrder.get(a) ?? Number.MAX_SAFE_INTEGER
      const idxB = normalizedOrder.get(b) ?? Number.MAX_SAFE_INTEGER
      if (idxA === idxB) return a.localeCompare(b)
      return idxA - idxB
    })
  }, [typesByDomain, normalizedOrder])
  const currentStepIndex = React.useMemo(() => CONSTRUCTOR_STEPS.findIndex((step) => step.id === currentStep), [currentStep])
  const selectedTypeMeta = React.useMemo(() => allTypes.find((item) => item.key === draft.type) || null, [allTypes, draft.type])

  const toggleFavoriteType = React.useCallback((key: string) => {
    setFavoriteTypeKeys((prev) => (prev.includes(key) ? prev.filter((item) => item !== key) : [...prev, key]))
  }, [])

  const toggleTypeVisibility = React.useCallback((key: string) => {
    setHiddenTypeKeys((prev) => (prev.includes(key) ? prev.filter((item) => item !== key) : [...prev, key]))
  }, [])

  const jumpToConfigureStep = React.useCallback((key: string) => {
    setDraft((prev) => ({ ...prev, type: key }))
    setCurrentStep('configure')
  }, [])

  const toggleCategoryVisibility = React.useCallback((domain: string) => {
    setHiddenCategories((prev) => (prev.includes(domain) ? prev.filter((item) => item !== domain) : [...prev, domain]))
  }, [])

  const categoriesForSettings = React.useMemo(() => {
    return Array.from(new Set([...allDomains, ...sortedDomainKeys]))
  }, [allDomains, sortedDomainKeys])

  const typeOrderMap = React.useMemo(() => {
    return new Map(typeOrder.map((key, idx) => [key, idx]))
  }, [typeOrder])

  return (
    <div className="w-full space-y-6">
      <Card className="bg-card border border-border">
        <CardHeader>
            <CardTitle>Конструктор упражнения</CardTitle>
            <CardDescription>
              Сформируйте упражнение вручную: тип, сложность, инструкции и контентные блоки
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex flex-wrap gap-2">
              {CONSTRUCTOR_STEPS.map((step, idx) => {
                const isActive = step.id === currentStep
                const isCompleted = idx < currentStepIndex
                const isClickable = isCompleted || isActive || (!typesLoading && step.id === 'configure') || step.id === 'type'
                return (
                  <button
                    key={step.id}
                    type="button"
                    disabled={!isClickable}
                    onClick={() => {
                      if (isClickable) setCurrentStep(step.id)
                    }}
                    className={cn(
                      'flex min-w-[160px] flex-1 items-start gap-2 rounded-lg border p-3 text-left transition-colors',
                      isActive
                        ? 'border-primary bg-primary/10 text-primary'
                        : isCompleted
                          ? 'border-primary/50 bg-primary/5 text-foreground'
                          : 'border-border bg-muted/30 text-muted-foreground'
                    )}
                  >
                    <span className="text-sm font-semibold">{idx + 1}</span>
                    <span className="flex-1">
                      <span className="block text-sm font-medium">{step.label}</span>
                      <span className="block text-xs text-muted-foreground/90">{step.description}</span>
                    </span>
                  </button>
                )
              })}
            </div>

            {currentStep === 'type' && (
              <div className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-col gap-1">
                    <label className="text-sm text-muted-foreground">Поиск по типам</label>
                    <div className="flex gap-2">
                      <Input
                        placeholder="Начните вводить название или домен"
                        value={typeSearch}
                        onChange={(e) => setTypeSearch(e.target.value)}
                        className="w-64"
                      />
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setTypeSettingsOpen(true)}
                        >
                          <Settings2 className="mr-2 h-4 w-4" /> Настройка типов
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setCategorySettingsOpen(true)}
                        >
                          <Settings2 className="mr-2 h-4 w-4" /> Настройка категорий
                        </Button>
                      </div>
                    </div>
                  </div>
                  {visibleFavoriteTypeKeys.length > 0 && (
                    <div className="text-xs text-muted-foreground">
                      Закреплено: {visibleFavoriteTypeKeys.length}
                    </div>
                  )}
                </div>
                {typesError && <div className="text-sm text-red-600">{typesError}</div>}
                {typesLoading ? (
                  <div className="text-sm text-muted-foreground">Загрузка типов…</div>
                ) : (
                  <div className="space-y-4">
                    {visibleFavoriteTypeKeys.length > 0 && (
                      <div className="space-y-2 rounded-lg border border-border bg-card/60 p-3">
                        <div className="flex items-center justify-between text-xs uppercase font-semibold text-muted-foreground">
                          <span>Избранное</span>
                          <span className="text-[11px] font-normal lowercase tracking-wide text-muted-foreground/80">
                            {visibleFavoriteTypeKeys.length}
                          </span>
                        </div>
                        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                          {visibleFavoriteTypeKeys
                            .map((favKey) => allTypes.find((item) => item.key === favKey))
                            .filter(Boolean)
                            .map((fav) => (
                              <TypeCard
                                key={fav!.key}
                                typeItem={fav!}
                                isActive={draft.type === fav!.key}
                                isFavorite
                                onSelect={() => setDraft((prev) => ({ ...prev, type: fav!.key }))}
                                onToggleFavorite={() => toggleFavoriteType(fav!.key)}
                                onOpenEditor={() => jumpToConfigureStep(fav!.key)}
                              />
                            ))}
                        </div>
                      </div>
                    )}

                    <div className="max-h-[26rem] space-y-4 overflow-y-auto rounded-lg border border-border bg-muted/20 p-3">
                      {filteredTypes.length === 0 ? (
                        <div className="p-2 text-sm text-muted-foreground">Ничего не найдено</div>
                      ) : (
                        sortedDomainKeys.map((domain) => {
                          const isHidden = hiddenCategories.includes(domain)
                          const items = typesByDomain[domain] ?? []
                          if (!items.length && !typeSearch) return null
                          const orderedItems = [...items].sort((a, b) => {
                            const idxA = typeOrderMap.get(a.key) ?? Number.MAX_SAFE_INTEGER
                            const idxB = typeOrderMap.get(b.key) ?? Number.MAX_SAFE_INTEGER
                            if (idxA === idxB) return a.name.localeCompare(b.name)
                            return idxA - idxB
                          })
                          const visibleItems = orderedItems.filter((opt) => !hiddenTypeKeys.includes(opt.key) || opt.key === draft.type)
                          if (!visibleItems.length) {
                            if (typeSearch) return null
                            return (
                              <div key={domain} className="space-y-2">
                                <div className="flex items-center justify-between text-xs uppercase tracking-wide text-muted-foreground font-medium">
                                  <span>{domain}</span>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7 text-muted-foreground"
                                    onClick={() => toggleCategoryVisibility(domain)}
                                    aria-label={isHidden ? 'Показать категорию' : 'Скрыть категорию'}
                                  >
                                    {isHidden ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                  </Button>
                                </div>
                                <div className="rounded border border-dashed border-border bg-muted/40 p-2 text-xs text-muted-foreground">
                                  Нет видимых типов. Отредактируйте настройки.
                                </div>
                              </div>
                            )
                          }
                          return (
                            <div key={domain} className="space-y-2">
                              <div className="flex items-center justify-between text-xs uppercase tracking-wide text-muted-foreground font-medium">
                                <span>{domain}</span>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 text-muted-foreground"
                                  onClick={() => toggleCategoryVisibility(domain)}
                                  title={isHidden ? 'Показать категорию' : 'Скрыть категорию'}
                                >
                                  {isHidden ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </Button>
                              </div>
                              {isHidden && !typeSearch ? (
                                <div className="rounded border border-dashed border-border bg-muted/40 p-2 text-xs text-muted-foreground">
                                  Категория скрыта. Нажмите на значок глаза, чтобы показать.
                                </div>
                              ) : (
                                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                                  {visibleItems.map((opt) => (
                                    <TypeCard
                                      key={opt.key}
                                      typeItem={opt}
                                      isActive={draft.type === opt.key}
                                      isFavorite={favoriteTypeKeys.includes(opt.key)}
                                      isHidden={hiddenTypeKeys.includes(opt.key)}
                                      onSelect={() => setDraft((prev) => ({ ...prev, type: opt.key }))}
                                      onToggleFavorite={() => toggleFavoriteType(opt.key)}
                                      onToggleVisibility={() => toggleTypeVisibility(opt.key)}
                                      onOpenEditor={() => jumpToConfigureStep(opt.key)}
                                    />
                                  ))}
                                </div>
                              )}
                            </div>
                          )
                        })
                      )}
                    </div>
                  </div>
                )}
                <div className="flex justify-end pt-2">
                  <Button onClick={() => setCurrentStep('configure')} disabled={typesLoading}>
                    Далее: Настройка
                  </Button>
                </div>

                {categorySettingsOpen && (
                  <CategorySettingsDialog
                    categories={categoriesForSettings}
                    initialOrder={categoryOrder}
                    hiddenCategories={hiddenCategories}
                    onCancel={() => setCategorySettingsOpen(false)}
                    onApply={(payload: ListSettingsPayload) => {
                      setCategoryOrder(payload.order)
                      setHiddenCategories(payload.hidden)
                      setCategorySettingsOpen(false)
                    }}
                  />
                )}
                {typeSettingsOpen && (
                  <TypeSettingsDialog
                    types={allTypes}
                    favorites={favoriteTypeKeys}
                    hidden={hiddenTypeKeys}
                    order={typeOrder}
                    initialKey={typeSettingsInitialKey}
                    onCancel={() => {
                      setTypeSettingsOpen(false)
                      setTypeSettingsInitialKey(null)
                    }}
                    onApply={(payload) => {
                      setFavoriteTypeKeys(payload.favorites)
                      setHiddenTypeKeys(payload.hidden)
                      setTypeOrder(payload.order)
                      setTypeSettingsOpen(false)
                      setTypeSettingsInitialKey(null)
                    }}
                  />
                )}
              </div>
            )}

            {currentStep === 'configure' && (
              <div className="space-y-6">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="rounded-md border border-border bg-muted/30 px-3 py-2 text-sm">
                    <div className="text-xs uppercase text-muted-foreground">Выбранный тип</div>
                    <div className="text-sm font-medium">{selectedTypeMeta?.name || draft.type}</div>
                    {selectedTypeMeta?.description && (
                      <div className="text-xs text-muted-foreground mt-1">{selectedTypeMeta.description}</div>
                    )}
                  </div>
                  <Button variant="outline" size="sm" onClick={() => setCurrentStep('type')}>
                    Изменить тип
                  </Button>
                </div>

                <div>
                  <label className="block text-sm mb-1 text-muted-foreground">Название</label>
                  <Input
                    value={draft.title}
                    onChange={(e) => setDraft(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="Например: Повтори слоги с Р"
                  />
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <label className="block text-sm mb-1 text-muted-foreground">Сложность</label>
                    <div className="flex flex-wrap gap-2">
                      {DIFF_OPTIONS.map(opt => (
                        <button
                          key={opt.value}
                          onClick={() => setDraft(prev => ({ ...prev, difficulty: opt.value }))}
                          className={cn(
                            'px-3 py-1 rounded-full text-sm border transition-colors',
                            draft.difficulty === opt.value ? 'bg-primary text-primary-foreground border-transparent' : 'bg-muted text-foreground/80 border-border hover:bg-muted/80'
                          )}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm mb-1 text-muted-foreground">Длительность (мин)</label>
                    <Input
                      type="number"
                      min={1}
                      max={60}
                      value={draft.estimated_duration}
                      onChange={(e) => setDraft(prev => ({ ...prev, estimated_duration: Number(e.target.value || 0) }))}
                    />
                  </div>
                </div>

                {typeSchema?.schema && draft.type !== 'graphic_dictation' && (
                  <div className="space-y-4 rounded-lg border border-border bg-muted/30 p-4">
                    <div>
                      <div className="text-sm text-muted-foreground">Параметры типа</div>
                      <div className="text-base font-medium">{typeSchema?.name}</div>
                      {typeSchema?.description && (
                        <div className="text-xs text-muted-foreground mt-1">{typeSchema.description}</div>
                      )}
                    </div>
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      {Object.entries(typeSchema.schema as Record<string, any>).map(([key, def]: any) => {
                        const v = customParams[key]
                        if (def.type === 'integer' || def.type === 'number') {
                          return (
                            <div key={key}>
                              <label className="block text-sm mb-1 text-muted-foreground">{key}</label>
                              <Input
                                type="number"
                                value={v ?? ''}
                                min={def.min ?? undefined}
                                max={def.max ?? undefined}
                                step={def.type === 'number' ? '0.01' : '1'}
                                onChange={(e) => setCustomParams(prev => ({ ...prev, [key]: def.type === 'number' ? Number(e.target.value) : parseInt(e.target.value || '0', 10) }))}
                              />
                            </div>
                          )
                        }
                        if (def.type === 'enum') {
                          return (
                            <div key={key}>
                              <label className="block text-sm mb-1 text-muted-foreground">{key}</label>
                              <select
                                className="w-full rounded border border-border bg-background p-2"
                                value={v ?? def.default ?? ''}
                                onChange={(e) => setCustomParams(prev => ({ ...prev, [key]: e.target.value }))}
                              >
                                {(def.values as string[]).map(val => (
                                  <option key={val} value={val}>{val}</option>
                                ))}
                              </select>
                            </div>
                          )
                        }
                        if (def.type === 'boolean') {
                          return (
                            <div key={key} className="flex items-center gap-2">
                              <input
                                id={`bool_${key}`}
                                type="checkbox"
                                checked={Boolean(v ?? def.default ?? false)}
                                onChange={(e) => setCustomParams(prev => ({ ...prev, [key]: e.target.checked }))}
                              />
                              <label htmlFor={`bool_${key}`} className="text-sm text-muted-foreground">{key}</label>
                            </div>
                          )
                        }
                        if (def.type === 'array_enum') {
                          const values: string[] = def.values || []
                          const current: string[] = Array.isArray(v) ? v : (def.default || [])
                          return (
                            <div key={key}>
                              <label className="block text-sm mb-1 text-muted-foreground">{key}</label>
                              <div className="flex flex-wrap gap-2">
                                {values.map(val => (
                                  <button
                                    key={val}
                                    type="button"
                                    onClick={() => {
                                      setCustomParams(prev => {
                                        const arr = new Set<string>(Array.isArray(prev[key]) ? prev[key] : current)
                                        if (arr.has(val)) arr.delete(val); else arr.add(val)
                                        return { ...prev, [key]: Array.from(arr) }
                                      })
                                    }}
                                    className={cn(
                                      'px-2 py-1 text-xs rounded border transition-colors',
                                      (current.includes(val) || (Array.isArray(customParams[key]) && customParams[key].includes(val))) ? 'bg-primary text-primary-foreground border-transparent' : 'bg-muted text-foreground/80 border-border hover:bg-muted/80'
                                    )}
                                  >
                                    {val}
                                  </button>
                                ))}
                              </div>
                            </div>
                          )
                        }
                        return (
                          <div key={key} className="text-xs text-muted-foreground">Неподдерживаемое поле: {key}</div>
                        )
                      })}
                    </div>
                  </div>
                )}

                {draft.type === 'graphic_dictation' && (
                  <div className="space-y-4 rounded-lg border border-border bg-muted/30 p-4">
                    <GraphicDictationGenerator
                      initialPayload={graphicDictationResult}
                      onResult={(res) => {
                        setGraphicDictationResult(res)
                        if (res.instructions?.length) {
                          setDraft(prev => ({
                            ...prev,
                            instructions: res.instructions ?? prev.instructions,
                          }))
                        }
                      }}
                    />
                    {!graphicDictationResult && (
                      <div className="rounded-md border border-dashed border-border bg-muted/40 p-3 text-sm text-muted-foreground">
                        Сначала сгенерируйте графический диктант, затем сохраните упражнение.
                      </div>
                    )}
                  </div>
                )}

                <div>
                  <label className="block text-sm mb-1 text-muted-foreground">Инструкции</label>
                  <div className="mb-2 flex gap-2">
                    <Input
                      value={newInstruction}
                      onChange={(e) => setNewInstruction(e.target.value)}
                      placeholder="Добавить инструкцию"
                    />
                    <Button onClick={addInstruction}>Добавить</Button>
                  </div>
                  <ul className="space-y-2">
                    {draft.instructions.map((ins, idx) => (
                      <li key={idx} className="flex items-center justify-between rounded bg-muted/30 p-2">
                        <span className="text-sm">{ins}</span>
                        <Button variant="outline" size="sm" onClick={() => removeInstruction(idx)}>Удалить</Button>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="flex justify-between gap-2">
                  <Button variant="outline" onClick={() => setCurrentStep('type')}>
                    Назад к выбору типа
                  </Button>
                  <Button onClick={() => setCurrentStep('layout')}>
                    Далее: Макет задания
                  </Button>
                </div>
              </div>
            )}

            {currentStep === 'layout' && (
              <div className="space-y-6">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-medium">Визуальный макет упражнения</div>
                      <div className="text-xs text-muted-foreground">
                        Скомпонуйте элементы, которые появятся в печатном варианте упражнения
                      </div>
                    </div>
                  </div>
                  <WorksheetLayoutEditor 
                    value={draft.layout} 
                    onChange={handleLayoutChange}
                    exerciseType={draft.type}
                    exerciseData={graphicDictationResult || customParams}
                    instructions={
                      draft.type === 'graphic_dictation' && graphicDictationResult?.instructions
                        ? graphicDictationResult.instructions
                        : draft.instructions
                    }
                  />
                </div>

                <div className="space-y-2">
                  {saveError && <div className="text-sm text-red-600">{saveError}</div>}
                  {saveOk && <div className="text-sm text-green-700">{saveOk}</div>}
                  <div className="flex justify-between gap-2">
                    <Button variant="outline" onClick={() => setCurrentStep('configure')}>
                      Назад к настройке
                    </Button>
                    <Button onClick={create} disabled={saveLoading}>
                      {saveLoading ? 'Сохранение…' : 'Сохранить упражнение'}
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
      </Card>
    </div>
  )
}
