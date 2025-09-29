"use client"

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Brain, Sparkles, Target, Clock } from 'lucide-react'
import { cn } from '@/lib/utils'

interface AdaptiveGeneratorProps {
  childId?: string
  onExerciseSelect?: (exercise: any) => void
}

export function AdaptiveGenerator({ childId, onExerciseSelect }: AdaptiveGeneratorProps) {
  const [isGenerating, setIsGenerating] = useState(false)
  const [exercises, setExercises] = useState<any[]>([])
  const [selectedType, setSelectedType] = useState<string>('mixed')

  const sessionTypes = {
    mixed: { name: 'Смешанная сессия', icon: '🎯', color: 'bg-blue-500' },
    focused: { name: 'Фокусированная', icon: '🎯', color: 'bg-green-500' },
    intensive: { name: 'Интенсивная', icon: '🚀', color: 'bg-purple-500' },
    review: { name: 'Повторение', icon: '🔄', color: 'bg-orange-500' }
  }

  const generateAdaptiveSession = async () => {
    setIsGenerating(true)

    try {
      const response = await fetch('/api/adaptive/session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          child_id: childId,
          session_type: selectedType,
          count: 5,
          preferences: {
            include_audio: true,
            difficulty_adaptation: true
          }
        })
      })

      if (response.ok) {
        const data = await response.json()
        setExercises(data.exercises || [])
      } else {
        console.error('Failed to generate adaptive session')
      }
    } catch (error) {
      console.error('Error generating adaptive session:', error)
    } finally {
      setIsGenerating(false)
    }
  }

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'bg-green-100 text-green-800'
      case 'medium': return 'bg-yellow-100 text-yellow-800'
      case 'hard': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            Адаптивный генератор
          </CardTitle>
          <CardDescription>
            Персонализированные упражнения на основе прогресса ребенка
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Типы сессий */}
          <div>
            <h4 className="font-medium mb-2">Тип сессии</h4>
            <div className="flex flex-wrap gap-2">
              {Object.entries(sessionTypes).map(([type, info]) => (
                <button
                  key={type}
                  onClick={() => setSelectedType(type)}
                  className={cn(
                    "px-3 py-1 rounded-full text-sm border transition-colors",
                    selectedType === type
                      ? `${info.color} text-white border-transparent`
                      : "bg-gray-100 text-gray-700 border-gray-300 hover:bg-gray-200"
                  )}
                >
                  <span className="mr-1">{info.icon}</span>
                  {info.name}
                </button>
              ))}
            </div>
          </div>

          {/* Кнопка генерации */}
          <Button
            onClick={generateAdaptiveSession}
            disabled={isGenerating || !childId}
            className="w-full"
          >
            {isGenerating ? (
              <>
                <Sparkles className="mr-2 h-4 w-4 animate-spin" />
                Генерирую персональную сессию...
              </>
            ) : (
              <>
                <Target className="mr-2 h-4 w-4" />
                Сгенерировать адаптивную сессию
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Результаты генерации */}
      {exercises.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Персональная сессия</CardTitle>
            <CardDescription>
              Упражнения подобраны специально для ребенка
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4">
              {exercises.map((exercise, index) => (
                <Card key={exercise.id || index} className="cursor-pointer hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">
                          {exercise.type === 'pronunciation' && '🗣️'}
                          {exercise.type === 'articulation' && '👅'}
                          {exercise.type === 'rhythm' && '🎵'}
                          {exercise.type === 'memory' && '🧠'}
                        </span>
                        <div>
                          <h3 className="font-medium">{exercise.title}</h3>
                          <p className="text-sm text-gray-600">
                            {exercise.type}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Badge className={getDifficultyColor(exercise.difficulty)}>
                          {exercise.difficulty}
                        </Badge>
                        <Badge variant="outline" className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {exercise.estimated_duration} мин
                        </Badge>
                      </div>
                    </div>

                    <div className="text-sm text-gray-600 mb-3">
                      <p><strong>Элементы:</strong> {exercise.content?.items?.length || 0} шт.</p>
                      <p><strong>Тип упражнения:</strong> {exercise.content?.exercise_type}</p>
                    </div>

                    <div className="space-y-2 mb-4">
                      <h4 className="font-medium text-sm">Рекомендации:</h4>
                      <ul className="text-sm text-gray-600 space-y-1">
                        {exercise.content?.instructions?.slice(0, 2)?.map((instruction: string, idx: number) => (
                          <li key={idx} className="flex items-start gap-2">
                            <span className="text-blue-500">•</span>
                            <span>{instruction}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <Button
                      onClick={() => onExerciseSelect?.(exercise)}
                      className="w-full"
                      variant="outline"
                    >
                      Начать упражнение
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
