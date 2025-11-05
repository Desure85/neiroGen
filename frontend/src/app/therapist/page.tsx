"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { EmptyState } from "@/components/ui/empty-state"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { useToast } from "@/components/ui/use-toast"
import {
  Users,
  Plus,
  Settings,
  TrendingUp,
  Clock,
  Target,
  Award,
  Calendar,
  Search,
  UserPlus,
  AlertCircle
} from "lucide-react"
import { ExerciseGenerator, ExercisePlayer, ContentBlockManager } from "@/components/exercise-components"
import { ExerciseConstructor } from "@/components/exercise-constructor"
import { FileManager } from "@/components/file-manager"
import { useI18n } from "@/components/localization"
import { cn } from "@/lib/utils"
import { apiFetch } from "@/lib/api"
import { listComfyPresets, generateWithPreset, type ComfyPreset } from "@/lib/comfy"
import ProtectedRoute from "@/components/protected-route"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { DashboardHeader } from "@/components/dashboard-header"
import { DashboardTabsGroup } from "@/components/dashboard-tabs-group"
import { DashboardStatCard } from "@/components/dashboard-stat-card"
import { SectionCard } from "@/components/section-card"
import { ListHeader } from "@/components/list-header"

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
  const { toast } = useToast()
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
  const [searchQuery, setSearchQuery] = useState('')
  const [ageFilter, setAgeFilter] = useState<string>('all')
  const [genderFilter, setGenderFilter] = useState<string>('all')
  const [showCreateSession, setShowCreateSession] = useState(false)
  const [createdSessionCode, setCreatedSessionCode] = useState<string | null>(null)
  const [sessionChildId, setSessionChildId] = useState<number | null>(null)
  const [sessionExerciseId, setSessionExerciseId] = useState<number | null>(null)

  // Derived: count of sessions with accuracy >= 80% (simple proxy for achievements)
  const achievementsCount = sessionHistory.reduce((sum, s) => {
    const acc = Number(s?.results?.accuracy ?? 0)
    return sum + (acc >= 80 ? 1 : 0)
  }, 0)

  const dashboardTabs = [
    { value: 'overview', label: t('tab_overview') },
    { value: 'children', label: t('tab_children') },
    { value: 'generator', label: t('tab_generator') },
    { value: 'constructor', label: t('tab_constructor') },
    { value: 'blocks', label: t('tab_blocks') },
    { value: 'files', label: 'Файлы' },
    { value: 'sessions', label: t('tab_sessions') },
  ]

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

  // Фильтрация детей
  const filteredChildren = children.filter(child => {
    const matchesSearch = child.name.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesAge = ageFilter === 'all' || 
      (ageFilter === '0-5' && child.age <= 5) ||
      (ageFilter === '6-10' && child.age >= 6 && child.age <= 10) ||
      (ageFilter === '11+' && child.age >= 11)
    const matchesGender = genderFilter === 'all' || child.gender === genderFilter
    return matchesSearch && matchesAge && matchesGender
  })

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
    if (!trimmed) {
      toast({
        variant: "destructive",
        title: "⚠️ Заполните имя",
        description: "Имя ребёнка обязательно для заполнения",
        duration: 3000,
      })
      return
    }
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
        toast({
          title: "✅ Ребёнок добавлен",
          description: `${trimmed} успешно добавлен в список`,
          duration: 3000,
        })
      } catch (e) {
        toast({
          variant: "destructive",
          title: "❌ Ошибка создания",
          description: (e as any)?.message || 'Не удалось добавить ребёнка',
          duration: 5000,
        })
      }
    })()
  }

  const handleCreateSession = async () => {
    if (!sessionChildId) {
      toast({
        variant: "destructive",
        title: "⚠️ Выберите ребёнка",
        description: "Необходимо выбрать ребёнка для создания сессии",
        duration: 3000,
      })
      return
    }

    try {
      const payload = {
        child_id: sessionChildId,
        exercise_id: sessionExerciseId,
        score: 0,
        completed_items: 0,
        total_items: 10,
        time_spent: 0,
        accuracy: 0,
        started_at: new Date().toISOString(),
        metadata: {},
      }

      const res = await apiFetch(`/api/sessions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      if (!res.ok) throw new Error('HTTP ' + res.status)
      
      const data = await res.json()
      setCreatedSessionCode(data.session_code)
      
      // Reload sessions
      if (selectedChild?.id === sessionChildId) {
        const sessionsRes = await apiFetch(`/api/sessions?child_id=${sessionChildId}&per_page=50`)
        if (sessionsRes.ok) {
          const sessionsData = await sessionsRes.json()
          const items = Array.isArray(sessionsData?.data) ? sessionsData.data : (Array.isArray(sessionsData) ? sessionsData : [])
          setSessionHistory(items.map((s:any) => ({
            childId: s.child_id,
            exerciseId: s.exercise_id,
            sessionCode: s.session_code,
            results: {
              score: s.score,
              completedItems: s.completed_items,
              totalItems: s.total_items,
              timeSpent: s.time_spent,
              accuracy: s.accuracy,
            },
            timestamp: s.finished_at || s.created_at,
          })))
        }
      }
    } catch (e: any) {
      alert('Не удалось создать сессию: ' + (e?.message || e))
    }
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
      <DashboardHeader
        badge="Кабинет терапевта"
        title={t('therapist_dashboard')}
        description={t('therapist_subtitle')}
        actions={
          <div className="flex items-center gap-2">
            {selectedChild ? (
              <>
                <div className="flex h-10 items-center gap-2 rounded-lg border border-border bg-muted/40 px-3 shadow-sm">
                  <span className="text-lg leading-none">{selectedChild.avatar}</span>
                  <span className="max-w-[180px] truncate text-sm font-medium text-foreground" title={selectedChild.name}>
                    {selectedChild.name}
                  </span>
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
            ) : null}
            <Button onClick={() => setShowAddChild(true)}>
              <Plus className="mr-2 h-4 w-4" />
              {t('new_child')}
            </Button>
          </div>
        }
      />

      <div className="mx-auto w-full max-w-7xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
        {showAddChild && (
          <SectionCard
            title="Добавить ребёнка"
            description="Укажите имя, возраст и пол"
            contentClassName="space-y-4"
            footer={
              <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                <div className="flex gap-2 sm:justify-end">
                  <Button variant="outline" onClick={() => {
                    setShowAddChild(false)
                    setNewChild({ name: '', age: 6, gender: 'male' })
                  }}>
                    Отмена
                  </Button>
                  <Button 
                    onClick={handleCreateChild}
                    disabled={!newChild.name.trim() || newChild.age < 1 || newChild.age > 16}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Сохранить
                  </Button>
                </div>
              </div>
            }
          >
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <label htmlFor="new-child-name" className="text-sm font-medium">
                  Имя <span className="text-destructive">*</span>
                </label>
                <Input
                  id="new-child-name"
                  value={newChild.name}
                  onChange={(event) => setNewChild((state) => ({ ...state, name: event.target.value }))}
                  placeholder="Например: Саша"
                  required
                  aria-describedby="new-child-name-hint"
                />
                <p id="new-child-name-hint" className="text-xs text-muted-foreground">
                  Как зовут ребёнка
                </p>
              </div>
              <div className="space-y-2">
                <label htmlFor="new-child-age" className="text-sm font-medium">
                  Возраст
                </label>
                <Input
                  id="new-child-age"
                  type="number"
                  min={1}
                  max={16}
                  value={newChild.age}
                  onChange={(event) => setNewChild((state) => ({ ...state, age: Number(event.target.value || 0) }))}
                  aria-describedby="new-child-age-hint"
                />
                <p id="new-child-age-hint" className="text-xs text-muted-foreground">
                  От 1 до 16 лет
                </p>
              </div>
              <div className="space-y-2">
                <label htmlFor="new-child-gender" className="text-sm font-medium">
                  Пол
                </label>
                <select
                  id="new-child-gender"
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"
                  value={newChild.gender}
                  onChange={(event) => setNewChild((state) => ({ ...state, gender: event.target.value as 'male' | 'female' }))}
                  aria-label="Выберите пол"
                >
                  <option value="male">👦 Мальчик</option>
                  <option value="female">👧 Девочка</option>
                </select>
              </div>
            </div>
          </SectionCard>
        )}

        {/* Error State для детей */}
        {childrenError && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Ошибка загрузки</AlertTitle>
            <AlertDescription className="flex items-center justify-between">
              <span>{childrenError}</span>
              <Button variant="outline" size="sm" onClick={loadChildren}>
                Повторить
              </Button>
            </AlertDescription>
          </Alert>
        )}

        <DashboardTabsGroup
          value={activeTab}
          onValueChange={setActiveTab}
          items={dashboardTabs}
          variant="secondary"
          tabsWrapperClassName="w-full"
        >

          <TabsContent value="overview" className="space-y-6">
            {/* Статистика */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
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
              }].map(({ icon, label, value }, index) => (
                <DashboardStatCard
                  key={label}
                  icon={<div className="text-foreground/80" aria-hidden>{icon}</div>}
                  label={label}
                  value={value}
                  className="h-full"
                  contentClassName="p-5"
                />
              ))}
            </div>

            {/* Недавние сессии */}
            <SectionCard
              title={t('recent_sessions')}
              description={t('sessions_history_sub')}
              contentClassName="space-y-4"
            >
              {sessionHistory.length === 0 ? (
                <EmptyState
                  icon={Clock}
                  title="Нет данных о сессиях"
                  description="Выберите ребенка и начните сессию, чтобы увидеть статистику."
                  action={{
                    label: "Выбрать ребенка",
                    onClick: () => setActiveTab('children')
                  }}
                />
              ) : (
                <div className="space-y-3">
                  {sessionHistory.slice(-5).reverse().map((session, index) => {
                    const child = children.find((c) => c.id === session.childId)
                    const accuracy = session.results.accuracy
                    return (
                      <div 
                        key={index} 
                        className="flex items-center justify-between rounded-lg border border-border bg-card p-4 shadow-sm transition-shadow hover:shadow-md"
                      >
                        <div className="flex items-center gap-3">
                          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-blue-100 to-green-100 text-2xl dark:from-blue-900/30 dark:to-green-900/30">
                            <span aria-hidden>{child?.avatar}</span>
                          </div>
                          <div>
                            <p className="font-medium text-foreground">{child?.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(session.timestamp).toLocaleString('ru-RU', {
                                day: 'numeric',
                                month: 'short',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <Badge
                            className={cn(
                              "font-semibold",
                              accuracy >= 80
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400'
                                : accuracy >= 60
                                  ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
                                  : 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400'
                            )}
                          >
                            {accuracy.toFixed(0)}%
                          </Badge>
                          <p className="mt-1 text-sm text-muted-foreground">
                            {session.results.score} {session.results.score === 1 ? 'очко' : session.results.score < 5 ? 'очка' : 'очков'}
                          </p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </SectionCard>
          </TabsContent>

          <TabsContent value="children" className="space-y-6">
            {/* Поиск и фильтры */}
            <Card>
              <CardContent className="p-4">
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Поиск по имени..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9"
                      aria-label="Поиск детей"
                    />
                  </div>
                  <select
                    value={ageFilter}
                    onChange={(e) => setAgeFilter(e.target.value)}
                    className="px-3 py-2 border rounded-md bg-background text-foreground"
                    aria-label="Фильтр по возрасту"
                  >
                    <option value="all">Все возрасты</option>
                    <option value="0-5">0-5 лет</option>
                    <option value="6-10">6-10 лет</option>
                    <option value="11+">11+ лет</option>
                  </select>
                  <select
                    value={genderFilter}
                    onChange={(e) => setGenderFilter(e.target.value)}
                    className="px-3 py-2 border rounded-md bg-background text-foreground"
                    aria-label="Фильтр по полу"
                  >
                    <option value="all">Все</option>
                    <option value="male">Мальчики</option>
                    <option value="female">Девочки</option>
                  </select>
                </div>
              </CardContent>
            </Card>

            {/* Loading State */}
            {childrenLoading && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[...Array(6)].map((_, i) => (
                  <Card key={i}>
                    <CardContent className="p-6">
                      <div className="flex items-center gap-4 mb-4">
                        <Skeleton className="h-16 w-16 rounded-full" />
                        <div className="flex-1 space-y-2">
                          <Skeleton className="h-5 w-24" />
                          <Skeleton className="h-4 w-16" />
                        </div>
                      </div>
                      <div className="space-y-2 mb-4">
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-2 w-full" />
                      </div>
                      <div className="flex gap-2">
                        <Skeleton className="h-9 flex-1" />
                        <Skeleton className="h-9 w-24" />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {/* Empty State */}
            {!childrenLoading && filteredChildren.length === 0 && (
              <EmptyState
                icon={searchQuery || ageFilter !== 'all' || genderFilter !== 'all' ? Search : UserPlus}
                title={searchQuery || ageFilter !== 'all' || genderFilter !== 'all' 
                  ? 'Не найдено детей' 
                  : 'Пока нет детей'}
                description={searchQuery || ageFilter !== 'all' || genderFilter !== 'all'
                  ? 'Попробуйте изменить параметры поиска или добавьте нового ребенка.'
                  : 'Добавьте первого ребенка, чтобы начать работу с упражнениями.'}
                action={{
                  label: "Добавить ребенка",
                  onClick: () => setShowAddChild(true)
                }}
              />
            )}

            {/* Children Grid */}
            {!childrenLoading && filteredChildren.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredChildren.map((child) => {
                const stats = getChildStats(child)
                return (
                  <Card 
                    key={child.id} 
                    className="group cursor-pointer transition-all duration-200 hover:shadow-lg hover:scale-[1.02] hover:border-primary/50"
                  >
                    <CardContent className="p-6">
                      <div className="flex items-center gap-4 mb-4">
                        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-blue-100 to-green-100 text-4xl transition-transform group-hover:scale-110 dark:from-blue-900/30 dark:to-green-900/30">
                          <span aria-hidden>{child.avatar}</span>
                        </div>
                        <div className="flex-1">
                          <h3 className="text-lg font-semibold text-foreground">{child.name}</h3>
                          <p className="text-sm text-muted-foreground">{child.age} {child.age === 1 ? 'год' : child.age < 5 ? 'года' : 'лет'}</p>
                        </div>
                      </div>

                      <div className="space-y-2 mb-4">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Прогресс:</span>
                          <span className={cn(
                            "font-semibold",
                            child.overallProgress >= 80 ? "text-emerald-600 dark:text-emerald-400" :
                            child.overallProgress >= 50 ? "text-blue-600 dark:text-blue-400" :
                            "text-amber-600 dark:text-amber-400"
                          )}>
                            {child.overallProgress}%
                          </span>
                        </div>
                        <div className="w-full bg-muted h-2 rounded-full overflow-hidden">
                          <div
                            className={cn(
                              "h-2 rounded-full transition-all duration-500",
                              child.overallProgress >= 80 ? "bg-gradient-to-r from-emerald-500 to-emerald-600" :
                              child.overallProgress >= 50 ? "bg-gradient-to-r from-blue-500 to-blue-600" :
                              "bg-gradient-to-r from-amber-500 to-amber-600"
                            )}
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
            )}
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

          <TabsContent value="files" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Файловый менеджер</CardTitle>
                <CardDescription>
                  Управление изображениями и файлами для упражнений
                </CardDescription>
              </CardHeader>
              <CardContent>
                <FileManager 
                  filterTypes={['image/png', 'image/jpeg', 'image/webp', 'image/jpg']}
                  onFileSelect={(file) => {
                    toast({
                      title: '✅ Файл выбран',
                      description: `«${file.name}» можно использовать в упражнениях`,
                    })
                  }}
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="sessions" className="space-y-6">
            {/* Create Session Card */}
            <Card className="border-2 border-blue-200 bg-blue-50/30">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Plus className="h-5 w-5" />
                      Создать новую сессию
                    </CardTitle>
                    <CardDescription>
                      Сгенерируйте код для пациента, чтобы он мог выполнить упражнение
                    </CardDescription>
                  </div>
                  {!showCreateSession && (
                    <Button onClick={() => {
                      setShowCreateSession(true)
                      // Автоматически заполняем ребенка если он уже выбран
                      if (selectedChild) {
                        setSessionChildId(selectedChild.id)
                      }
                    }}>
                      <Plus className="h-4 w-4 mr-2" />
                      Создать
                    </Button>
                  )}
                </div>
              </CardHeader>
              {showCreateSession && (
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">Ребёнок</label>
                      {sessionChildId && children.find(c => c.id === sessionChildId) ? (
                        <div className="flex items-center gap-2">
                          <div className="flex-1 flex items-center gap-2 p-2 border rounded bg-muted">
                            <span className="text-lg">{children.find(c => c.id === sessionChildId)?.avatar}</span>
                            <span className="font-medium">{children.find(c => c.id === sessionChildId)?.name}</span>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setSessionChildId(null)}
                          >
                            Изменить
                          </Button>
                        </div>
                      ) : (
                        <select
                          className="w-full p-2 border rounded bg-background"
                          value={sessionChildId || ''}
                          onChange={(e) => setSessionChildId(Number(e.target.value) || null)}
                        >
                          <option value="">-- Выберите --</option>
                          {children.map((child) => (
                            <option key={child.id} value={child.id}>
                              {child.avatar} {child.name}
                            </option>
                          ))}
                        </select>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Упражнение (опционально)</label>
                      <select
                        className="w-full p-2 border rounded bg-background"
                        value={sessionExerciseId || ''}
                        onChange={(e) => setSessionExerciseId(Number(e.target.value) || null)}
                      >
                        <option value="">-- Любое --</option>
                        {/* TODO: Load exercises list */}
                      </select>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setShowCreateSession(false)
                        setSessionChildId(null)
                        setSessionExerciseId(null)
                        setCreatedSessionCode(null)
                      }}
                    >
                      Отмена
                    </Button>
                    <Button onClick={handleCreateSession}>
                      Создать сессию
                    </Button>
                  </div>

                  {createdSessionCode && (
                    <div className="mt-4 p-6 bg-green-50 border-2 border-green-200 rounded-lg">
                      <h4 className="font-semibold text-green-800 mb-2">✓ Сессия создана!</h4>
                      <p className="text-sm text-gray-600 mb-3">
                        Передайте этот код пациенту для выполнения упражнения
                      </p>
                      <div className="bg-white p-4 rounded border-2 border-green-300 text-center">
                        <p className="text-xs text-gray-500 mb-1">КОД СЕССИИ</p>
                        <p className="text-4xl font-mono font-bold text-green-700 tracking-wider">
                          {createdSessionCode}
                        </p>
                      </div>
                      <p className="text-xs text-gray-500 mt-3 text-center">
                        Пациент может войти по адресу: /patient/{createdSessionCode}
                      </p>
                      <Button
                        variant="outline"
                        className="w-full mt-3"
                        onClick={() => {
                          navigator.clipboard.writeText(`${window.location.origin}/patient/${createdSessionCode}`)
                          alert('Ссылка скопирована!')
                        }}
                      >
                        Копировать ссылку
                      </Button>
                    </div>
                  )}
                </CardContent>
              )}
            </Card>

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
        </DashboardTabsGroup>
      </div>
    </div>
  )
}
