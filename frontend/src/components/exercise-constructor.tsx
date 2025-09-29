"use client"

import React from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { ContentBlockManager } from '@/components/content-block-manager'
import { GraphicDictationGenerator, GraphicDictationResult } from '@/components/graphic-dictation-generator'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import { useI18n } from '@/components/localization'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ExerciseTemplates } from '@/components/exercise-templates'
import { apiFetch, API_BASE } from '@/lib/api'

interface ExerciseDraft {
  title: string
  type: string
  difficulty: 'easy' | 'medium' | 'hard'
  estimated_duration: number
  instructions: string[]
  blocks: Array<{ id: number; title: string; type: string }>
}

// Типы теперь берём только с бэкенда через /api/exercise-types

const DIFF_OPTIONS: Array<{ value: ExerciseDraft['difficulty']; label: string }> = [
  { value: 'easy', label: 'Легкий' },
  { value: 'medium', label: 'Средний' },
  { value: 'hard', label: 'Сложный' },
]

export function ExerciseConstructor({ onCreate, initialType }: { onCreate?: (draft: ExerciseDraft) => void; initialType?: string }) {
  const { t } = useI18n()
  const apiBase = API_BASE
  const [draft, setDraft] = React.useState<ExerciseDraft>({
    title: '',
    type: (initialType as any) || 'pronunciation',
    difficulty: 'medium',
    estimated_duration: 10,
    instructions: ['Повторяйте вслух за диктором'],
    blocks: [],
  })
  const [typeSchema, setTypeSchema] = React.useState<any | null>(null)
  const [customParams, setCustomParams] = React.useState<Record<string, any>>({})
  const [allTypes, setAllTypes] = React.useState<Array<{ key: string; name: string; domain: string; icon: string; description: string }>>([])
  const [typesLoading, setTypesLoading] = React.useState(false)
  const [typesError, setTypesError] = React.useState<string>('')
  const [typeSearch, setTypeSearch] = React.useState('')
  const [newInstruction, setNewInstruction] = React.useState('')
  const [svgPrompt, setSvgPrompt] = React.useState('')
  const [svgSize, setSvgSize] = React.useState<{width:number;height:number}>({ width: 512, height: 512 })
  const [svgUrl, setSvgUrl] = React.useState<string>('')
  const [svgLoading, setSvgLoading] = React.useState(false)
  const [svgError, setSvgError] = React.useState<string>('')
  const [graphicDictationResult, setGraphicDictationResult] = React.useState<GraphicDictationResult | null>(null)
  const [saveLoading, setSaveLoading] = React.useState(false)
  const [saveError, setSaveError] = React.useState<string>('')
  const [saveOk, setSaveOk] = React.useState<string>('')

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
    }
  }, [initialType])

  // Загрузка списка типов с бэкенда
  React.useEffect(() => {
    const run = async () => {
      setTypesError(''); setTypesLoading(true)
      try {
        const res = await apiFetch(`/api/exercise-types`)
        if (!res.ok) throw new Error('HTTP '+res.status)
        const data = await res.json()
        setAllTypes(data.types || [])
      } catch (e:any) {
        setTypesError('Не удалось загрузить типы: '+(e?.message||e))
      } finally {
        setTypesLoading(false)
      }
    }
    run()
  }, [])

  const addInstruction = () => {
    const value = newInstruction.trim()
    if (!value) return
    setDraft(prev => ({ ...prev, instructions: [...prev.instructions, value] }))
    setNewInstruction('')
  }

  const removeInstruction = (idx: number) => {
    setDraft(prev => ({ ...prev, instructions: prev.instructions.filter((_, i) => i !== idx) }))
  }

  const handleBlocksUpdate = (blocks: any[]) => {
    const mapped = blocks.map(b => ({ id: b.id, title: b.title, type: b.type }))
    setDraft(prev => ({ ...prev, blocks: mapped }))
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
    if (!typeSearch.trim()) return allTypes
    const q = typeSearch.trim().toLowerCase()
    return allTypes.filter(item => {
      const haystack = [item.name, item.description, item.domain, item.key].join(' ').toLowerCase()
      return haystack.includes(q)
    })
  }, [allTypes, typeSearch])

  const typesByDomain = React.useMemo(() => {
    return filteredTypes.reduce<Record<string, Array<typeof filteredTypes[number]>>>((acc, item) => {
      const domain = item.domain || 'Общее'
      if (!acc[domain]) acc[domain] = []
      acc[domain].push(item)
      return acc
    }, {})
  }, [filteredTypes])

  const sortedDomainKeys = React.useMemo(() => Object.keys(typesByDomain).sort((a, b) => a.localeCompare(b)), [typesByDomain])

  return (
    <div className="w-full space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Левая колонка: форма */}
        <div className="lg:col-span-2 space-y-6">
        <Card className="bg-card border border-border">
          <CardHeader>
            <CardTitle>Конструктор упражнения</CardTitle>
            <CardDescription>
              Сформируйте упражнение вручную: тип, сложность, инструкции и контентные блоки
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm mb-1 text-muted-foreground">Название</label>
              <Input
                value={draft.title}
                onChange={(e) => setDraft(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Например: Повтори слоги с Р"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-start">
              <div className="md:col-span-3">
                <label className="block text-sm mb-1 text-muted-foreground">Тип</label>
                {typesError && <div className="text-xs text-red-600 mb-2">{typesError}</div>}
                {typesLoading ? (
                  <div className="text-sm text-muted-foreground">Загрузка типов…</div>
                ) : (
                  <div className="space-y-3">
                    <Input
                      placeholder="Найти тип"
                      value={typeSearch}
                      onChange={(e) => setTypeSearch(e.target.value)}
                      className="bg-background"
                    />
                    <div className="max-h-80 overflow-y-auto space-y-4 pr-1 border border-border rounded-lg bg-muted/20">
                      {filteredTypes.length === 0 ? (
                        <div className="p-4 text-sm text-muted-foreground">Ничего не найдено</div>
                      ) : (
                        sortedDomainKeys.map(domain => (
                          <div key={domain} className="space-y-2 px-3 py-2">
                            <div className="text-xs uppercase tracking-wide text-muted-foreground font-medium sticky top-0 bg-muted/20 pb-1">{domain}</div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              {typesByDomain[domain]?.map(opt => {
                                const isActive = draft.type === opt.key
                                return (
                                  <button
                                    key={opt.key}
                                    onClick={() => setDraft(prev => ({ ...prev, type: opt.key as any }))}
                                    className={cn(
                                      'flex items-start gap-2 rounded-lg border p-3 text-left transition-colors h-full',
                                      isActive
                                        ? 'bg-primary text-primary-foreground border-transparent shadow-sm'
                                        : 'bg-muted text-foreground/90 border-border hover:bg-muted/80'
                                    )}

            {draft.type === 'graphic_dictation' && (
              <div className="space-y-4">
                <GraphicDictationGenerator
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
                  <div className="rounded-md border border-border bg-muted/30 p-3 text-sm text-muted-foreground">
                    Сначала сгенерируйте графический диктант, затем сохраните упражнение.
                  </div>
                )}
              </div>
            )}
                                  >
                                    <span className="text-lg leading-none mt-0.5">{opt.icon}</span>
                                    <span className="flex-1">
                                      <span className="block text-sm font-medium">{opt.name}</span>
                                      {opt.description && (
                                        <span className="block text-xs text-muted-foreground/90 leading-snug">
                                          {opt.description}
                                        </span>
                                      )}
                                    </span>
                                  </button>
                                )
                              })}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="md:col-span-1">
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

              <div className="md:col-span-1">
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

            {/* Динамические поля по выбранному типу */}
            {typeSchema?.schema && draft.type !== 'graphic_dictation' && (
              <div className="rounded-lg border border-border p-4 bg-muted/30">
                <div className="mb-3">
                  <div className="text-sm text-muted-foreground">Параметры типа</div>
                  <div className="text-base font-medium">{typeSchema?.name}</div>
                  {typeSchema?.description && (
                    <div className="text-xs text-muted-foreground mt-1">{typeSchema.description}</div>
                  )}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                            className="w-full p-2 border border-border rounded bg-background"
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

            <div>
              <label className="block text-sm mb-1 text-muted-foreground">Инструкции</label>
              <div className="flex gap-2 mb-2">
                <Input
                  value={newInstruction}
                  onChange={(e) => setNewInstruction(e.target.value)}
                  placeholder="Добавить инструкцию"
                />
                <Button onClick={addInstruction}>Добавить</Button>
              </div>
              <ul className="space-y-2">
                {draft.instructions.map((ins, idx) => (
                  <li key={idx} className="flex items-center justify-between bg-muted/30 rounded p-2">
                    <span className="text-sm">{ins}</span>
                    <Button variant="outline" size="sm" onClick={() => removeInstruction(idx)}>Удалить</Button>
                  </li>
                ))}
              </ul>
            </div>

            <div className="space-y-2">
              {saveError && <div className="text-sm text-red-600">{saveError}</div>}
              {saveOk && <div className="text-sm text-green-700">{saveOk}</div>}
              <div className="flex justify-end">
                <Button onClick={create} disabled={saveLoading}>
                  {saveLoading ? 'Сохранение…' : 'Сохранить упражнение'}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
        </div>

        {/* Правая колонка: выбор контентных блоков и предпросмотр */}
        <div className="space-y-6">
        <Card className="bg-card border border-border">
          <CardHeader>
            <CardTitle>Контентные блоки</CardTitle>
            <CardDescription>Выберите готовые блоки для упражнения</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="blocks" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="blocks">Список блоков</TabsTrigger>
                <TabsTrigger value="templates">Шаблоны</TabsTrigger>
                <TabsTrigger value="create">Создание</TabsTrigger>
              </TabsList>
              <TabsContent value="blocks" className="space-y-4">
                <ContentBlockManager onBlocksUpdate={handleBlocksUpdate} mode="select" />
              </TabsContent>
              <TabsContent value="templates" className="space-y-4">
                <ExerciseTemplates onTemplateSelect={(template) => {
                  setDraft(prev => ({
                    ...prev,
                    title: template.name,
                    type: template.type,
                    difficulty: template.difficulty,
                    estimated_duration: template.estimated_duration,
                    instructions: template.template_data?.instructions || []
                  }))
                  if (template.template_data?.customParams) {
                    setCustomParams(template.template_data.customParams)
                  }
                }} />
              </TabsContent>
              <TabsContent value="create" className="space-y-4">
                <div className="text-center py-8 text-muted-foreground">
                  <div className="text-sm">Создание блока</div>
                  <div className="text-xs mt-1">Скоро будет доступно</div>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        <Card className="bg-card border border-border">
          <CardHeader>
            <CardTitle>Генерация SVG по описанию</CardTitle>
            <CardDescription>Создайте иллюстрацию по текстовому промпту</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <label className="block text-sm mb-1 text-muted-foreground">Промпт</label>
              <Textarea
                rows={3}
                value={svgPrompt}
                onChange={(e) => setSvgPrompt(e.target.value)}
                placeholder='Например: Большой круг и внутри надпись "Произнеси звук Р"'
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm mb-1 text-muted-foreground">Ширина</label>
                <Input
                  type="number"
                  min={64}
                  max={2048}
                  value={svgSize.width}
                  onChange={(e)=> setSvgSize(s=>({...s, width: Number(e.target.value||0)}))}
                />
              </div>
              <div>
                <label className="block text-sm mb-1 text-muted-foreground">Высота</label>
                <Input
                  type="number"
                  min={64}
                  max={2048}
                  value={svgSize.height}
                  onChange={(e)=> setSvgSize(s=>({...s, height: Number(e.target.value||0)}))}
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={async ()=>{
                  setSvgError(''); setSvgLoading(true); setSvgUrl('')
                  try {
                    const res = await apiFetch(`/api/svg/generate`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ prompt: svgPrompt, width: svgSize.width, height: svgSize.height })
                    })
                    if (!res.ok) throw new Error('HTTP '+res.status)
                    const data = await res.json()
                    if (data?.url) setSvgUrl(String(data.url))
                    else throw new Error('Bad payload')
                  } catch (e:any) {
                    setSvgError('Ошибка генерации SVG: '+ (e?.message || e))
                  } finally {
                    setSvgLoading(false)
                  }
                }}
                disabled={svgLoading || !svgPrompt.trim()}
              >{svgLoading ? 'Генерация…' : 'Сгенерировать'}</Button>
              {svgUrl && (
                <Button variant="outline" onClick={()=>{
                  const title = svgPrompt.slice(0, 50) || 'SVG ресурс'
                  setDraft(prev => ({
                    ...prev,
                    blocks: [...prev.blocks, { id: Date.now(), title, type: 'image' }]
                  }))
                }}>Добавить как блок</Button>
              )}
            </div>
            {svgError && (
              <div className="text-sm text-red-600">{svgError}</div>
            )}
            {svgUrl && (
              <div>
                <div className="text-sm font-medium mb-1">Предпросмотр SVG:</div>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={svgUrl} alt="svg preview" className="w-full border rounded" />
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="bg-card border border-border">
          <CardHeader>
            <CardTitle>Предпросмотр</CardTitle>
            <CardDescription>Краткая сводка по упражнению</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="text-sm"><b>Название:</b> {draft.title || '—'}</div>
            <div className="text-sm"><b>Тип:</b> {allTypes.find(t => t.key === draft.type)?.name || draft.type}</div>
            <div className="text-sm"><b>Сложность:</b> {DIFF_OPTIONS.find(o => o.value === draft.difficulty)?.label}</div>
            <div className="text-sm"><b>Длительность:</b> {draft.estimated_duration} мин</div>
            <div>
              <div className="text-sm font-medium mb-1">Инструкции:</div>
              <ul className="list-disc pl-5 space-y-1 text-sm">
                {draft.instructions.map((i, idx) => (
                  <li key={idx}>{i}</li>
                ))}
              </ul>
            </div>
            <div>
              <div className="text-sm font-medium mb-1">Блоки:</div>
              {draft.blocks.length === 0 ? (
                <div className="text-sm text-muted-foreground">Инструкции</div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {draft.blocks.map(b => (
                    <Badge key={b.id} variant="secondary">{b.title}</Badge>
                  ))}
                  {draft.type === 'graphic_dictation' && (
                    <GraphicDictationGenerator
                      prompt={svgPrompt}
                      width={svgSize.width}
                      height={svgSize.height}
                      onSvgGenerated={(url) => setSvgUrl(url)}
                    />
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
        </div>
      </div>
    </div>
  )
}
