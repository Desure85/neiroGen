"use client"

import { useEffect, useState } from "react"
import { TrendingUp, Users, Settings, AlertCircle } from "lucide-react"

import ProtectedRoute from "@/components/protected-route"
import { DashboardHeader } from "@/components/dashboard-header"
import { DashboardStatCard } from "@/components/dashboard-stat-card"
import { SectionCard } from "@/components/section-card"
import { ExerciseTemplates } from "@/components/exercise-templates"
import { AISettings } from "@/components/ai-settings"
import { EmptyState } from "@/components/ui/empty-state"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { getAiHealth, type AiProviderStatus } from "@/lib/ai"
import { useAuth } from "@/lib/auth-context"

function AdminContent() {
  const { user } = useAuth()
  const [aiProviders, setAiProviders] = useState<Record<string, AiProviderStatus>>({})
  const [loadingProviders, setLoadingProviders] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        setLoadingProviders(true)
        const data = await getAiHealth()
        if (mounted) {
          setAiProviders(data.providers || {})
        }
      } catch (e: any) {
        if (mounted) {
          setError(e?.message || 'Не удалось загрузить AI провайдеров')
        }
      } finally {
        if (mounted) {
          setLoadingProviders(false)
        }
      }
    })()
    return () => {
      mounted = false
    }
  }, [])

  const activeProvidersCount = Object.values(aiProviders).filter(
    (p) => p.available && p.health.status === 'ok'
  ).length

  const totalProvidersCount = Object.keys(aiProviders).length

  const getProviderBadges = () => {
    const badges: { name: string; status: string }[] = []
    for (const [name, provider] of Object.entries(aiProviders)) {
      badges.push({
        name,
        status: provider.available && provider.health.status === 'ok' ? 'active' : 'inactive'
      })
    }
    return badges
  }

  if (!user) {
    return null
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50 dark:from-gray-900 dark:to-gray-800">
      {/* Page Header */}
      <DashboardHeader
        badge="Панель администратора"
        title="Управление системой"
        description="Настройка AI провайдеров, шаблонов упражнений и генерации контента"
      />

      {/* Main Content */}
      <div className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
        {/* Error State */}
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Ошибка загрузки</AlertTitle>
            <AlertDescription>
              {error}
            </AlertDescription>
          </Alert>
        )}

        {/* AI Providers Settings */}
        <SectionCard
          title="AI Провайдеры"
          description="Управление подключением к AI сервисам"
        >
          <AISettings />
        </SectionCard>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <DashboardStatCard
            icon={<Settings className="h-6 w-6 text-blue-500" />}
            label="Активные провайдеры"
            value={activeProvidersCount}
            hint="Количество подключённых AI"
          />
          <DashboardStatCard
            icon={<TrendingUp className="h-6 w-6 text-emerald-500" />}
            label="Всего провайдеров"
            value={totalProvidersCount}
            hint="Зарегистрированные провайдеры"
            loading={loadingProviders}
          />
          <DashboardStatCard
            icon={<Users className="h-6 w-6 text-purple-500" />}
            label="Типы упражнений"
            value="-"
            hint="В разработке"
          />
        </div>

        {/* System Info */}
        <SectionCard
          title="Системная информация"
          description="Статус компонентов"
          contentClassName="space-y-4"
        >
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {getProviderBadges().map((badge) => (
              <div 
                key={badge.name}
                className="flex items-center justify-between rounded-lg bg-muted/50 p-3"
              >
                <span className="text-sm font-medium capitalize">{badge.name}</span>
                <Badge variant={badge.status === 'active' ? 'success' : 'secondary'}>
                  {badge.status === 'active' ? 'Подключён' : 'Недоступен'}
                </Badge>
              </div>
            ))}
            <div className="flex items-center justify-between rounded-lg bg-muted/50 p-3">
              <span className="text-sm font-medium">База данных</span>
              <Badge variant="success">Активна</Badge>
            </div>
            <div className="flex items-center justify-between rounded-lg bg-muted/50 p-3">
              <span className="text-sm font-medium">Кэш</span>
              <Badge variant="success">Работает</Badge>
            </div>
          </div>
        </SectionCard>

        {/* Exercise Templates */}
        <SectionCard
          title="Шаблоны упражнений"
          description="Управление типами и шаблонами логопедических упражнений"
          contentClassName="space-y-6"
        >
          <ExerciseTemplates />
        </SectionCard>
      </div>
    </div>
  )
}

export default function AdminPage() {
  return (
    <ProtectedRoute allowedRoles={["admin"]}>
      <AdminContent />
    </ProtectedRoute>
  )
}
