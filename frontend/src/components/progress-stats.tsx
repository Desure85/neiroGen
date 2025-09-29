"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Trophy, Target, Clock, TrendingUp } from 'lucide-react'

interface ProgressStats {
  total_exercises: number
  completed_exercises: number
  average_score: number
  total_time_spent: number
  improvement_rate: number
  skill_levels: {
    pronunciation: number
    articulation: number
    rhythm: number
    memory: number
  }
}

interface ProgressStatsProps {
  childId: string
}

export function ProgressStats({ childId }: ProgressStatsProps) {
  const [stats, setStats] = useState<ProgressStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true)
        const response = await fetch(`/api/progress?child_id=${childId}`)

        if (response.ok) {
          const data = await response.json()
          setStats(data)
        } else {
          setError('Не удалось загрузить статистику')
        }
      } catch (err) {
        setError('Ошибка при загрузке данных')
      } finally {
        setLoading(false)
      }
    }

    if (childId) {
      fetchStats()
    }
  }, [childId])

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-red-600">{error}</p>
        </CardContent>
      </Card>
    )
  }

  if (!stats) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-gray-600">Нет данных для отображения</p>
        </CardContent>
      </Card>
    )
  }

  const completionRate = (stats.completed_exercises / stats.total_exercises) * 100

  return (
    <div className="space-y-6">
      {/* Общая статистика */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5" />
            Общая статистика
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{stats.total_exercises}</div>
              <div className="text-sm text-gray-600">Всего упражнений</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{stats.completed_exercises}</div>
              <div className="text-sm text-gray-600">Выполнено</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">{stats.average_score}%</div>
              <div className="text-sm text-gray-600">Средний балл</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">
                {Math.floor(stats.total_time_spent / 60)}ч
              </div>
              <div className="text-sm text-gray-600">Общее время</div>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Прогресс выполнения</span>
              <span>{completionRate.toFixed(1)}%</span>
            </div>
            <Progress value={completionRate} className="h-2" />
          </div>
        </CardContent>
      </Card>

      {/* Уровни навыков */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Уровни навыков
          </CardTitle>
          <CardDescription>
            Текущий уровень развития навыков речи
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Произношение</span>
                <Badge variant="outline">{stats.skill_levels.pronunciation}/10</Badge>
              </div>
              <Progress value={stats.skill_levels.pronunciation * 10} className="h-2" />
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Артикуляция</span>
                <Badge variant="outline">{stats.skill_levels.articulation}/10</Badge>
              </div>
              <Progress value={stats.skill_levels.articulation * 10} className="h-2" />
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Ритм</span>
                <Badge variant="outline">{stats.skill_levels.rhythm}/10</Badge>
              </div>
              <Progress value={stats.skill_levels.rhythm * 10} className="h-2" />
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Память</span>
                <Badge variant="outline">{stats.skill_levels.memory}/10</Badge>
              </div>
              <Progress value={stats.skill_levels.memory * 10} className="h-2" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Тренды */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Динамика развития
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <div className="text-3xl font-bold text-green-600">
              +{stats.improvement_rate}%
            </div>
            <div className="text-sm text-gray-600 mt-2">
              Улучшение за последние 7 дней
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
