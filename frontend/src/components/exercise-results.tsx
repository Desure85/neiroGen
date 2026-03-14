"use client"

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { StatsCard } from '@/components/ui/stats-card'
import {
  CheckCircle,
  XCircle,
  RotateCcw,
  Save,
  Star
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface ExerciseResult {
  exerciseId: number
  score: number
  completedItems: number
  totalItems: number
  timeSpent: number
  accuracy: number
}

interface ExerciseResultsProps {
  result: ExerciseResult
  onSave?: (result: ExerciseResult) => void
  onRetry?: () => void
  onExit?: () => void
}

export function ExerciseResults({ result, onSave, onRetry, onExit }: ExerciseResultsProps) {
  const [isSaving, setIsSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const performance = result.accuracy >= 80 ? 'Отлично!' :
                     result.accuracy >= 60 ? 'Хорошо!' : 'Нужно еще поработать!'

  const stars = Math.round(result.accuracy / 20) // 0-5 stars

  const handleSave = async () => {
    if (!onSave || saved) return

    setIsSaving(true)
    try {
      await onSave(result)
      setSaved(true)
    } catch (error) {
      console.error('Error saving result:', error)
    } finally {
      setIsSaving(false)
    }
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader className="text-center">
        <div className="mb-4">
          <div className="flex justify-center mb-4">
            {[...Array(5)].map((_, i) => (
              <Star
                key={i}
                className={cn(
                  "h-8 w-8",
                  i < stars ? "text-yellow-400 fill-current" : "text-gray-300"
                )}
              />
            ))}
          </div>
          <h2 className="text-2xl font-bold mb-2">{performance}</h2>
          <p className="text-muted-foreground">
            Результаты выполнения упражнения
          </p>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Основные метрики */}
        <div className="grid grid-cols-2 gap-4">
          <StatsCard
            label="Точность"
            value={`${result.accuracy.toFixed(0)}%`}
            variant="blue"
          />
          <StatsCard
            label="Очки"
            value={result.score}
            variant="green"
          />
          <StatsCard
            label="Элементы"
            value={`${result.completedItems}/${result.totalItems}`}
            variant="purple"
          />
          <StatsCard
            label="Время"
            value={formatTime(result.timeSpent)}
            variant="orange"
          />
        </div>

        {/* Детальный прогресс */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Правильные ответы</span>
            <span>{result.completedItems} из {result.totalItems}</span>
          </div>
          <Progress value={result.accuracy} className="h-2" />
        </div>

        {/* Кнопки действий */}
        <div className="flex gap-4">
          <Button
            onClick={onRetry}
            variant="outline"
            className="flex-1"
          >
            <RotateCcw className="mr-2 h-4 w-4" />
            Повторить
          </Button>

          <Button
            onClick={handleSave}
            disabled={isSaving || saved}
            className="flex-1"
          >
            {isSaving ? (
              <>
                <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                Сохранение...
              </>
            ) : saved ? (
              <>
                <CheckCircle className="mr-2 h-4 w-4" />
                Сохранено
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Сохранить
              </>
            )}
          </Button>

          <Button onClick={onExit} className="flex-1">
            Завершить
          </Button>
        </div>

        {/* Рекомендации */}
        <div className="bg-muted/50 p-4 rounded-lg">
          <h4 className="font-medium mb-2">Рекомендации:</h4>
          <ul className="text-sm text-muted-foreground space-y-1">
            {result.accuracy >= 80 && (
              <li className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                Отличный результат! Можно переходить к более сложным упражнениям.
              </li>
            )}
            {result.accuracy >= 60 && result.accuracy < 80 && (
              <li className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-yellow-500 mt-0.5" />
                Хороший результат! Повторите упражнение для закрепления.
              </li>
            )}
            {result.accuracy < 60 && (
              <li className="flex items-start gap-2">
                <XCircle className="h-4 w-4 text-red-500 mt-0.5" />
                Нужно больше практики. Рекомендуем начать с более простых упражнений.
              </li>
            )}
          </ul>
        </div>
      </CardContent>
    </Card>
  )
}
