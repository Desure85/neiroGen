"use client"

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import {
  Users,
  Plus,
  Settings,
  TrendingUp,
  Clock,
  Target,
  Award,
  Calendar
} from 'lucide-react'
import { ExerciseGenerator, ExercisePlayer, ContentBlockManager } from '@/components/exercise-components'
import { ExerciseConstructor } from '@/components/exercise-constructor'
import { useI18n } from '@/components/localization'
import { cn } from '@/lib/utils'
import { apiFetch } from '@/lib/api'
import { listComfyPresets, generateWithPreset, type ComfyPreset } from '@/lib/comfy'
import ProtectedRoute from '@/components/protected-route'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'

interface Child {
  id: number
  name: string
  age: number
  avatar?: string
  lastSession?: string
  overallProgress: number
  gender?: 'male' | 'female'
}

export default function TherapistDashboard() {
  return (
    <ProtectedRoute>
      <TherapistDashboardContent />
    </ProtectedRoute>
  )
}

interface Exercise {
  id: number
  title: string
  type: string
  difficulty: string
  estimated_duration: number
  content: {
    exercise_type: string
    items: string[]
    instructions: string[]
  }
}

interface ExerciseResults {
  exerciseId: number
  score: number
  completedItems: number
  totalItems: number
  timeSpent: number
  accuracy: number
}

function TherapistDashboardContent() {
  const { t } = useI18n()
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const { user } = useAuth()
  
  const [selectedChild, setSelectedChild] = useState<Child | null>(null)
  const [selectedExercise, setSelectedExercise] = useState<Exercise | null>(null)
  const [activeTab, setActiveTab] = useState('overview')
  const [initialType, setInitialType] = useState<string | undefined>(undefined)
  const [sessionHistory, setSessionHistory] = useState<any[]>([])
  const [childWorksheets, setChildWorksheets] = useState<any[]>([])
  const [activeWorksheetId, setActiveWorksheetId] = useState<number | null>(null)
  const [sessionsLoading, setSessionsLoading] = useState(false)
  const [sessionsError, setSessionsError] = useState('')
  const [worksheetsLoading, setWorksheetsLoading] = useState(false)
  const [worksheetsError, setWorksheetsError] = useState('')
  const [showAddChild, setShowAddChild] = useState(false)
  const [newChild, setNewChild] = useState<{ name: string; age: number; gender: 'male' | 'female'; avatar?: string }>({
    name: '',
    age: 6,
    gender: 'male',
  })
  const [childrenLoading, setChildrenLoading] = useState(false)
  const [childrenError, setChildrenError] = useState('')

  // Derived: count of sessions with accuracy >= 80% (simple proxy for achievements)
  const achievementsCount = sessionHistory.reduce((sum, s) => {
    const acc = Number(s?.results?.accuracy ?? 0)
    return sum + (acc >= 80 ? 1 : 0)
  }, 0)

  // ComfyUI presets state
  const [comfyPresets, setComfyPresets] = useState<ComfyPreset[]>([])
  const [comfyLoading, setComfyLoading] = useState(false)
  const [selectedPresetId, setSelectedPresetId] = useState<number | ''>('' as any)
  const [comfyVars, setComfyVars] = useState<Record<string, any>>({ prompt: '', width: 512, height: 512 })
  const [comfyResult, setComfyResult] = useState<any>(null)
  const [comfyError, setComfyError] = useState<string | null>(null)

  // Sync tab/type from URL query params (URL has priority), then fallback to localStorage
  useEffect(() => {
    const tabFromUrl = searchParams.get('tab') || undefined
    const typeFromUrl = searchParams.get('type') || undefined
    if (tabFromUrl) {
      setActiveTab(tabFromUrl)
    } else {
      if (typeof window !== 'undefined') {
        const saved = window.localStorage.getItem('therapist_tab')
        if (saved) setActiveTab(saved)
      }
    }
    if (typeFromUrl) setInitialType(typeFromUrl)
  }, [searchParams])

  // Persist tab to URL and localStorage when it changes
  useEffect(() => {
    if (!pathname) return
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('therapist_tab', activeTab)
    }
    // keep other params if needed later
    const params = new URLSearchParams(Array.from(searchParams.entries()))
    params.set('tab', activeTab)
    router.replace(`${pathname}?${params.toString()}`, { scroll: false })
  }, [activeTab, pathname, router, searchParams])

  // Load comfy presets when tab becomes active (or first mount)
  useEffect(() => {
    if (activeTab !== 'comfy') return
    let mounted = true
    ;(async () => {
      try {
        setComfyLoading(true)
        const items = await listComfyPresets()
        if (!mounted) return
        setComfyPresets(items)
        if (items.length > 0 && !selectedPresetId) {
          setSelectedPresetId(items[0].id)
          const d = items[0].defaults || {}
          setComfyVars({ prompt: '', width: 512, height: 512, ...d })
        }
      } catch (e) {
        // ignore
      } finally {
        if (mounted) setComfyLoading(false)
      }
    })()
    return () => { mounted = false }
  }, [activeTab, selectedPresetId])

  // Моковые данные детей (в state)
  const initialChildren: Child[] = [
    {
      id: 1,
      name: 'Маша',
      age: 6,
      avatar: '👧',
      lastSession: '2024-01-15',
      overallProgress: 75,
      gender: 'female'
    },
    {
      id: 2,
      name: 'Петя',
      age: 8,
      avatar: '👦',
      lastSession: '2024-01-14',
      overallProgress: 60,
      gender: 'male'
    },
    {
      id: 3,
      name: 'Аня',
      age: 5,
      avatar: '👧',
      lastSession: '2024-01-16',
      overallProgress: 85,
      gender: 'female'
    }
  ]
  const [children, setChildren] = useState<Child[]>(initialChildren)

  // Load children from backend
  const loadChildren = async () => {
    setChildrenError(''); setChildrenLoading(true)
    try {
      const res = await apiFetch(`/api/children?per_page=100`)
      if (!res.ok) throw new Error('HTTP '+res.status)
      const data = await res.json()
      const items = Array.isArray(data?.data) ? data.data : (Array.isArray(data) ? data : [])
      setChildren(items.map((it: any) => ({
        id: it.id,
        name: it.name,
        age: it.age ?? 0,
        avatar: it.avatar ?? (it.gender === 'female' ? '👧' : '👦'),
        overallProgress: it.overall_progress ?? 0,
        lastSession: it.last_session_at ?? undefined,
        gender: it.gender ?? 'male'
      })))
    } catch (e: any) {
      setChildrenError('Не удалось загрузить детей: ' + (e?.message || e))
    } finally {
      setChildrenLoading(false)
    }
  }

  useEffect(() => { loadChildren() }, [])

  // Restore selected child from localStorage after children are loaded
  useEffect(() => {
    if (children.length === 0) return
    if (typeof window === 'undefined') return
    const savedId = window.localStorage.getItem('therapist_selected_child_id')
    if (savedId) {
      const found = children.find(c => String(c.id) === savedId)
      if (found) setSelectedChild(found)
    }
  }, [children])

  // Persist selected child id
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (selectedChild) {
      window.localStorage.setItem('therapist_selected_child_id', String(selectedChild.id))
    } else {
      window.localStorage.removeItem('therapist_selected_child_id')
    }
  }, [selectedChild])

  const handleCreateChild = () => {
    const trimmed = newChild.name.trim()
    if (!trimmed) return
    const payload = {
      name: trimmed,
      age: Number(newChild.age || 0),
      gender: newChild.gender,
      avatar: newChild.gender === 'female' ? '👧' : '👦'
    }
    ;(async () => {
      try {
        const res = await apiFetch(`/api/children`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        })
        if (!res.ok) throw new Error('HTTP '+res.status)
        await loadChildren()
        setShowAddChild(false)
        setNewChild({ name: '', age: 6, gender: 'male' })
        setActiveTab('children')
      } catch (e) {
        alert('Не удалось создать: ' + (e as any)?.message)
      }
    })()
  }

  const handleExerciseSelect = (exercise: Exercise) => {
    setSelectedExercise(exercise)
  }

  const handleExerciseComplete = (results: ExerciseResults) => {
    if (!selectedChild) return
    const payload = {
      child_id: selectedChild.id,
      exercise_id: results.exerciseId,
      score: results.score,
      completed_items: results.completedItems,
      total_items: results.totalItems,
      time_spent: results.timeSpent,
      accuracy: results.accuracy,
      finished_at: new Date().toISOString(),
      metadata: {},
    }
    ;(async () => {
      try {
        const res = await apiFetch(`/api/sessions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        })
        if (!res.ok) throw new Error('HTTP '+res.status)
        const saved = await res.json()
        setSessionHistory(prev => [...prev, {
          childId: saved.child_id,
          exerciseId: saved.exercise_id,
          results: {
            score: saved.score,
            completedItems: saved.completed_items,
            totalItems: saved.total_items,
            timeSpent: saved.time_spent,
            accuracy: saved.accuracy,
          },
          timestamp: saved.finished_at || saved.created_at
        }])
      } catch (e:any) {
        alert('Не удалось сохранить сессию: ' + (e?.message || e))
      } finally {
        setSelectedExercise(null)
        setActiveTab('sessions')
      }
    })()
  }

  // Load sessions for selected child
  useEffect(() => {
    if (!selectedChild) return
    const load = async () => {
      setSessionsError(''); setSessionsLoading(true)
      try {
        const res = await apiFetch(`/api/sessions?child_id=${selectedChild.id}&per_page=50`)
        if (!res.ok) throw new Error('HTTP '+res.status)
        const data = await res.json()
        const items = Array.isArray(data?.data) ? data.data : (Array.isArray(data) ? data : [])
        setSessionHistory(items.map((s:any) => ({
          childId: s.child_id,
          exerciseId: s.exercise_id,
          results: {
            score: s.score,
            completedItems: s.completed_items,
            totalItems: s.total_items,
            timeSpent: s.time_spent,
            accuracy: s.accuracy,
          },
          timestamp: s.finished_at || s.created_at,
        })))
      } catch (e:any) {
        setSessionsError('Не удалось загрузить сессии: ' + (e?.message || e))
      } finally {
        setSessionsLoading(false)
      }
    }
    load()
  }, [selectedChild, activeTab])

  useEffect(() => {
    if (!selectedChild || activeTab !== 'sessions') return

    const load = async () => {
      setWorksheetsError(''); setWorksheetsLoading(true)
      try {
        const params = new URLSearchParams({ child_id: String(selectedChild.id), per_page: '50', include: 'layout,child' })
        const res = await apiFetch(`/api/worksheets?${params.toString()}`)
        if (!res.ok) throw new Error('HTTP ' + res.status)
        const data = await res.json()
        const items = Array.isArray(data?.data) ? data.data : (Array.isArray(data) ? data : [])
        setChildWorksheets(items.map((worksheet: any) => ({
          id: worksheet.id,
          title: worksheet.title,
          status: worksheet.status,
          createdAt: worksheet.created_at,
          pdfPath: worksheet.pdf_path,
          layout: worksheet.layout ?? null,
        })))
      } catch (error: any) {
        setWorksheetsError('Не удалось загрузить закреплённые листы: ' + (error?.message || error))
      } finally {
        setWorksheetsLoading(false)
      }
    }

    load()
  }, [selectedChild, activeTab])

  const getChildStats = (child: Child) => {
    const childSessions = sessionHistory.filter(s => s.childId === child.id)
    const totalScore = childSessions.reduce((sum, s) => sum + s.results.score, 0)
    const avgScore = childSessions.length > 0 ? totalScore / childSessions.length : 0

    return {
      totalSessions: childSessions.length,
      averageScore: Math.round(avgScore),
      lastActivity: childSessions.length > 0
        ? new Date(childSessions[childSessions.length - 1].timestamp).toLocaleDateString()
        : 'Нет данных'
    }
  }

  if (selectedExercise) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <div className="bg-card border-b border-border">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-4">
              <div className="flex items-center gap-4">
                <Button onClick={() => setSelectedExercise(null)} variant="outline">
                  ← Назад
                </Button>
                <div>
                  <h1 className="text-xl font-semibold text-foreground">
                    {selectedChild?.avatar} {selectedChild?.name} - {selectedExercise.title}
                  </h1>
                  <p className="text-sm text-muted-foreground">
                    Возраст: {selectedChild?.age} лет
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <ExercisePlayer
            exercise={selectedExercise}
            onComplete={handleExerciseComplete}
            onExit={() => setSelectedExercise(null)}
          />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50 dark:from-gray-900 dark:to-gray-800 text-foreground">
      <div className="bg-card shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-2xl font-bold text-foreground">{t('therapist_dashboard')}</h1>
              <p className="text-sm text-muted-foreground">{t('therapist_subtitle')}</p>
            </div>
            <div className="flex items-center gap-2">
              {selectedChild && (
                <>
                  <div className="flex items-center gap-2 h-10 rounded-lg border border-border bg-muted/40 px-3 shadow-sm">
                    <span className="text-lg leading-none">{selectedChild.avatar}</span>
                    <span className="text-sm font-medium text-foreground truncate max-w-[180px]" title={selectedChild.name}>{selectedChild.name}</span>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-10 px-3 text-primary hover:text-primary"
                    onClick={() => {
                      setSelectedChild(null)
                      setActiveTab('children')
                      setShowAddChild(false)
                    }}
                  >
                    Сменить
                  </Button>
                </>
              )}
              <Button onClick={() => setShowAddChild(true)}>
                <Plus className="mr-2 h-4 w-4" />
                {t('new_child')}
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {showAddChild && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Добавить ребёнка</CardTitle>
              <CardDescription>Укажите имя, возраст и пол</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label htmlFor="new-child-name" className="block text-sm mb-1">Имя</label>
                  <Input
                    id="new-child-name"
                    value={newChild.name}
                    onChange={(e) => setNewChild(s => ({ ...s, name: e.target.value }))}
                    placeholder="Например: Саша"
                  />
                </div>
                <div>
                  <label htmlFor="new-child-age" className="block text-sm mb-1">Возраст</label>
                  <Input
                    id="new-child-age"
                    type="number"
                    min={1}
                    max={16}
                    value={newChild.age}
                    onChange={(e) => setNewChild(s => ({ ...s, age: Number(e.target.value || 0) }))}
                  />
                </div>
                <div>
                  <label htmlFor="new-child-gender" className="block text-sm mb-1">Пол</label>
                  <select
                    id="new-child-gender"
                    className="w-full p-2 border rounded bg-background text-foreground"
                    value={newChild.gender}
                    onChange={(e) => setNewChild(s => ({ ...s, gender: e.target.value as 'male' | 'female' }))}
                  >
                    <option value="male">Мальчик</option>
                    <option value="female">Девочка</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setShowAddChild(false)}>Отмена</Button>
                <Button onClick={handleCreateChild}>Сохранить</Button>
              </div>
            </CardContent>
          </Card>
        )}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-7">
            <TabsTrigger value="overview">{t('tab_overview')}</TabsTrigger>
            <TabsTrigger value="children">{t('tab_children')}</TabsTrigger>
            <TabsTrigger value="generator">{t('tab_generator')}</TabsTrigger>
            <TabsTrigger value="constructor">{t('tab_constructor')}</TabsTrigger>
            <TabsTrigger value="blocks">{t('tab_blocks')}</TabsTrigger>
            <TabsTrigger value="sessions">{t('tab_sessions')}</TabsTrigger>
            <TabsTrigger value="comfy">ComfyUI</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {/* Статистика */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[{
                icon: <Users className="h-8 w-8 text-blue-500" />, label: t('total_children'), value: children.length
              }, {
                icon: <Target className="h-8 w-8 text-emerald-500" />, label: t('active_sessions'), value: sessionHistory.length
              }, {
                icon: <TrendingUp className="h-8 w-8 text-purple-500" />, label: t('avg_progress'),
                value: children.length > 0
                  ? `${Math.round(children.reduce((sum, c) => sum + c.overallProgress, 0) / children.length)}%`
                  : '0%'
              }, {
                icon: <Award className="h-8 w-8 text-amber-400" />, label: t('achievements'), value: achievementsCount
              }].map(({ icon, label, value }, idx) => (
                <Card key={idx} className="bg-muted/40 border border-border shadow-sm">
                  <CardContent className="p-5">
                    <div className="flex items-center gap-3">
                      <div className="text-foreground/80" aria-hidden>{icon}</div>
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">{label}</p>
                        <p className="text-2xl font-semibold text-foreground">{value}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Недавние сессии */}
            <Card>
              <CardHeader>
                <CardTitle>{t('recent_sessions')}</CardTitle>
                <CardDescription>{t('sessions_history_sub')}</CardDescription>
              </CardHeader>
              <CardContent>
                {sessionHistory.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">{t('no_sessions_yet')}</p>
                ) : (
                  <div className="space-y-4">
                    {sessionHistory.slice(-5).reverse().map((session, index) => {
                      const child = children.find(c => c.id === session.childId)
                      return (
                        <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                          <div className="flex items-center gap-3">
                            <span className="text-2xl">{child?.avatar}</span>
                            <div>
                              <p className="font-medium">{child?.name}</p>
                              <p className="text-sm text-gray-600">
                                {new Date(session.timestamp).toLocaleString()}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <Badge className={
                              session.results.accuracy >= 80 ? 'bg-green-100 text-green-800' :
                              session.results.accuracy >= 60 ? 'bg-yellow-100 text-yellow-800' :
                              'bg-red-100 text-red-800'
                            }>
                              {session.results.accuracy.toFixed(0)}%
                            </Badge>
                            <p className="text-sm text-gray-600 mt-1">
                              {session.results.score} очков
                            </p>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="comfy" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Генерация через ComfyUI пресет</CardTitle>
                <CardDescription>Выберите пресет и параметры. Переменные с одинаковыми именами подставятся в граф</CardDescription>
              </CardHeader>
              <CardContent>
                {comfyLoading ? (
                  <div className="text-sm text-muted-foreground">Загрузка пресетов…</div>
                ) : (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label htmlFor="comfy-preset" className="block text-sm mb-1">Пресет</label>
                        <select
                          id="comfy-preset"
                          className="w-full p-2 border rounded bg-background text-foreground"
                          value={selectedPresetId || ''}
                          onChange={(e) => {
                            const id = Number(e.target.value)
                            setSelectedPresetId(id)
                            const p = comfyPresets.find(pp => pp.id === id)
                            if (p) {
                              const d = p.defaults || {}
                              setComfyVars(prev => ({ ...prev, ...d }))
                            }
                          }}
                        >
                          <option value="" disabled>Выберите пресет…</option>
                          {comfyPresets.map(p => (
                            <option key={p.id} value={p.id}>{p.name}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label htmlFor="comfy-width" className="block text-sm mb-1">Ширина</label>
                        <input id="comfy-width" type="number" className="w-full p-2 border rounded bg-background text-foreground" value={comfyVars.width}
                          onChange={(e) => setComfyVars(v => ({ ...v, width: Number(e.target.value || 0) }))} />
                      </div>
                      <div>
                        <label htmlFor="comfy-height" className="block text-sm mb-1">Высота</label>
                        <input id="comfy-height" type="number" className="w-full p-2 border rounded bg-background text-foreground" value={comfyVars.height}
                          onChange={(e) => setComfyVars(v => ({ ...v, height: Number(e.target.value || 0) }))} />
                      </div>
                    </div>
                    <div>
                      <label htmlFor="comfy-prompt" className="block text-sm mb-1">Промпт</label>
                      <textarea id="comfy-prompt" className="w-full p-2 border rounded bg-background text-foreground" rows={3} value={comfyVars.prompt}
                        onChange={(e) => setComfyVars(v => ({ ...v, prompt: e.target.value }))} />
                    </div>
                    <div className="text-right">
                      <Button
                        disabled={!selectedPresetId}
                        onClick={async () => {
                          try {
                            setComfyError(null)
                            const res = await generateWithPreset(Number(selectedPresetId), comfyVars)
                            setComfyResult(res)
                          } catch (e: any) {
                            setComfyError('Ошибка генерации: ' + (e?.message || e))
                          }
                        }}
                      >
                        Сгенерировать
                      </Button>
                    </div>
                    {comfyResult && (
                      <div className="text-sm text-muted-foreground">
                        Результат: {JSON.stringify(comfyResult)}
                      </div>
                    )}
                    {comfyError && (
                      <div role="alert" className="text-sm text-red-600">
                        {comfyError}
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="children" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {children.map((child) => {
                const stats = getChildStats(child)
                return (
                  <Card key={child.id} className="cursor-pointer hover:shadow-md transition-shadow">
                    <CardContent className="p-6">
                      <div className="flex items-center gap-4 mb-4">
                        <span className="text-4xl" aria-hidden>{child.avatar}</span>
                        <div>
                          <h3 className="text-lg font-semibold text-foreground">{child.name}</h3>
                          <p className="text-sm text-muted-foreground">{child.age} лет</p>
                        </div>
                      </div>

                      <div className="space-y-2 mb-4">
                        <div className="flex justify-between text-sm text-muted-foreground">
                          <span>Прогресс:</span>
                          <span className="font-medium text-foreground">{child.overallProgress}%</span>
                        </div>
                        <div className="w-full bg-muted h-2 rounded-full overflow-hidden">
                          <div
                            className="bg-primary h-2 rounded-full transition-all"
                            style={{ width: `${child.overallProgress}%` }}
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4 text-sm text-muted-foreground mb-4">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          {stats.lastActivity}
                        </div>
                        <div className="flex items-center gap-1">
                          <Target className="h-4 w-4" />
                          {stats.averageScore}%
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <Button
                          onClick={() => { setSelectedChild(child); setActiveTab('sessions') }}
                          className="flex-1"
                          size="sm"
                        >
                          Начать сессию
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => { setSelectedChild(child); setActiveTab('generator') }}
                        >
                          Генератор
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          </TabsContent>

          <TabsContent value="generator" className="space-y-6">
            {/* Генератор всегда доступен. Если выбран ребенок — используем как контекст. */}
            <ExerciseGenerator
              onExerciseSelect={handleExerciseSelect}
              childContext={selectedChild ? {
                id: selectedChild.id,
                name: selectedChild.name,
                age: selectedChild.age,
                avatar: selectedChild.avatar,
              } : undefined}
              worksheetId={activeWorksheetId}
              onWorksheetLoaded={setActiveWorksheetId}
            />
          </TabsContent>

          <TabsContent value="constructor" className="space-y-6">
            <ExerciseConstructor initialType={initialType} onCreate={(draft) => {
              // Здесь в следующей итерации можно вызвать API сохранения упражнения
              // Пока просто переводим пользователя на вкладку "Сессии" или показываем уведомление
              console.log('Создано упражнение (draft):', draft)
            }} />
          </TabsContent>
          <TabsContent value="blocks" className="space-y-6">
            <ContentBlockManager />
          </TabsContent>

          <TabsContent value="sessions" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>История сессий</CardTitle>
                <CardDescription>
                  Все завершенные упражнения и их результаты
                </CardDescription>
              </CardHeader>
              <CardContent>
                {sessionsLoading ? (
                  <div className="text-sm text-muted-foreground py-6">Загрузка истории…</div>
                ) : sessionsError ? (
                  <div className="text-sm text-destructive py-6">{sessionsError}</div>
                ) : sessionHistory.length === 0 ? (
                  <div className="text-center py-8">
                    <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500">Пока нет данных о сессиях</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {sessionHistory
                      .slice()
                      .reverse()
                      .map((session, index) => {
                        const child = children.find((c) => c.id === session.childId)
                        return (
                          <Card key={`${session.childId}-${session.timestamp}-${index}`}>
                            <CardContent className="p-4">
                              <div className="flex items-center justify-between gap-4">
                                <div className="flex items-center gap-3">
                                  <span className="text-2xl">{child?.avatar}</span>
                                  <div>
                                    <p className="font-medium">{child?.name}</p>
                                    <p className="text-sm text-gray-600">
                                      {new Date(session.timestamp).toLocaleString()}
                                    </p>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <Badge
                                    className={
                                      session.results.accuracy >= 80
                                        ? 'bg-green-100 text-green-800'
                                        : session.results.accuracy >= 60
                                          ? 'bg-yellow-100 text-yellow-800'
                                          : 'bg-red-100 text-red-800'
                                    }
                                  >
                                    {session.results.accuracy.toFixed(0)}%
                                  </Badge>
                                  <p className="text-sm text-gray-600 mt-1">
                                    {session.results.score} очков
                                  </p>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        )
                      })}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Рабочие листы ребёнка</CardTitle>
                <CardDescription>
                  Сохранённые листы, привязанные к выбранному ребёнку
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {!selectedChild ? (
                  <div className="text-sm text-muted-foreground py-6">
                    Выберите ребёнка, чтобы увидеть связанные листы.
                  </div>
                ) : worksheetsLoading ? (
                  <div className="text-sm text-muted-foreground py-6">Загрузка листов…</div>
                ) : worksheetsError ? (
                  <div className="text-sm text-destructive py-6">{worksheetsError}</div>
                ) : childWorksheets.length === 0 ? (
                  <div className="text-sm text-muted-foreground py-6">
                    Пока нет закреплённых листов для этого ребёнка.
                  </div>
                ) : (
                  <div className="grid gap-3">
                    {childWorksheets.map((worksheet) => (
                      <Card key={worksheet.id} className="border border-border/80">
                        <CardContent className="flex flex-col gap-3 p-4 md:flex-row md:items-center md:justify-between">
                          <div>
                            <p className="text-sm text-muted-foreground">Создан {new Date(worksheet.createdAt).toLocaleString()}</p>
                            <h4 className="text-base font-semibold text-foreground">{worksheet.title}</h4>
                            <div className="mt-1 flex flex-wrap gap-2 text-xs text-muted-foreground">
                              <Badge variant="outline">Статус: {worksheet.status === 'ready' ? 'готов' : worksheet.status}</Badge>
                              {worksheet.layout ? (
                                <Badge variant="secondary">Макет: {worksheet.layout.name}</Badge>
                              ) : null}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setSelectedChild(selectedChild)
                                setActiveWorksheetId(worksheet.id)
                                setActiveTab('generator')
                              }}
                            >
                              Открыть в генераторе
                            </Button>
                            <Button
                              size="sm"
                              disabled={!worksheet.pdfPath}
                              onClick={() => {
                                if (worksheet.pdfPath) {
                                  window.open(worksheet.pdfPath, '_blank', 'noopener')
                                }
                              }}
                            >
                              Открыть PDF
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
