"use client"

import { useState, useEffect, useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Brain, Volume2, Clock, Target, Zap } from 'lucide-react'
import { cn } from '@/lib/utils'
import { fetchExerciseTypes, type ExerciseTypeDto } from '@/lib/api'
import { AdaptiveGenerator } from './adaptive-generator'
import { ProgressStats } from './progress-stats'

interface ExerciseTypeSummary {
  id: number
  key: string
  name: string
  icon?: string | null
  domain?: string | null
}

interface Exercise {
  id: number
  title: string
  type: string
  exercise_type_id?: number | null
  exerciseType?: ExerciseTypeSummary | null
  difficulty: string
  estimated_duration: number
  content: {
    exercise_type: string
    items: string[]
    instructions: string[]
  }
}

interface ExerciseGeneratorProps {
  onExerciseSelect?: (exercise: Exercise) => void
  childId?: string
}

export function ExerciseGenerator({ onExerciseSelect, childId }: ExerciseGeneratorProps) {
  const [isGenerating, setIsGenerating] = useState(false)
  const [exercises, setExercises] = useState<Exercise[]>([])
  const [selectedTypes, setSelectedTypes] = useState<string[]>([])
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('medium')
  const [mode, setMode] = useState<'manual' | 'adaptive'>('manual')

  const [availableTypes, setAvailableTypes] = useState<ExerciseTypeDto[]>([])
  const [typesLoading, setTypesLoading] = useState(true)
  const [typesError, setTypesError] = useState<string | null>(null)

  const difficulties = {
    easy: { name: 'Легкий', color: 'bg-green-100 text-green-800' },
    medium: { name: 'Средний', color: 'bg-yellow-100 text-yellow-800' },
    hard: { name: 'Сложный', color: 'bg-red-100 text-red-800' },
  }

  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        setTypesLoading(true)
        setTypesError(null)
        const items = await fetchExerciseTypes()
        if (!mounted) return
        const activeSorted = items
          .filter((item) => item.is_active)
          .sort((a, b) => a.display_order - b.display_order || a.name.localeCompare(b.name, 'ru'))
        setAvailableTypes(activeSorted)
      } catch (error) {
        if (mounted) {
          setTypesError(error instanceof Error ? error.message : 'Не удалось загрузить типы упражнений')
        }
      } finally {
        if (mounted) {
          setTypesLoading(false)
        }
      }
    })()

    return () => {
      mounted = false
    }
  }, [])

  useEffect(() => {
    if (availableTypes.length === 0 || selectedTypes.length > 0) {
      return
    }
    setSelectedTypes(availableTypes.slice(0, 2).map((item) => item.key))
  }, [availableTypes, selectedTypes.length])

  const typeByKey = useMemo(() => {
    const map: Record<string, ExerciseTypeDto> = {}
    availableTypes.forEach((item) => {
      map[item.key] = item
    })
    return map
  }, [availableTypes])

  const typeButtons = useMemo(() => {
    return availableTypes.map((item) => ({
      key: item.key,
      name: item.name,
      icon: item.icon ?? '🧩',
    }))
  }, [availableTypes])

  const generateExercises = async () => {
    if (selectedTypes.length === 0) {
      setTypesError('Выберите хотя бы один тип упражнения')
      return
    }

    setIsGenerating(true)

    try {
      const response = await fetch('/api/generator/generate-batch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          count: 3,
          types: selectedTypes,
          difficulties: [selectedDifficulty],
          custom_params: {
            interactive: true,
            audio_guidance: true,
          },
        }),
      })

      if (response.ok) {
        const data = await response.json()
        setExercises(data.exercises || [])
      } else {
        console.error('Failed to generate exercises')
      }
    } catch (error) {
      console.error('Error generating exercises:', error)
    } finally {
      setIsGenerating(false)
    }
  }

  const getTypeIcon = (type: string) => typeByKey[type]?.icon ?? '📝'

  const getDifficultyColor = (difficulty: string) =>
    difficulties[difficulty as keyof typeof difficulties]?.color || 'bg-gray-100 text-gray-800'

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Режим генерации</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Button
              onClick={() => setMode('manual')}
              variant={mode === 'manual' ? 'default' : 'outline'}
              className="flex-1"
            >
              <Target className="mr-2 h-4 w-4" />
              Ручной
            </Button>
            <Button
              onClick={() => setMode('adaptive')}
              variant={mode === 'adaptive' ? 'default' : 'outline'}
              className="flex-1"
            >
              <Zap className="mr-2 h-4 w-4" />
              Адаптивный
            </Button>
          </div>
        </CardContent>
      </Card>

      {mode === 'manual' ? (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="h-5 w-5" />
                Генератор упражнений
              </CardTitle>
              <CardDescription>
                Создавайте персонализированные упражнения для развития речи
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-medium mb-2">Типы упражнений</h4>
                {typesLoading ? (
                  <p className="text-sm text-muted-foreground">Загружаю список типов…</p>
                ) : typesError ? (
                  <p className="text-sm text-destructive">{typesError}</p>
                ) : typeButtons.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Нет доступных типов упражнений.</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {typeButtons.map((item) => (
                      <button
                        key={item.key}
                        type="button"
                        onClick={() => {
                          setTypesError(null)
                          setSelectedTypes((prev) =>
                            prev.includes(item.key)
                              ? prev.filter((t) => t !== item.key)
                              : [...prev, item.key]
                          )
                        }}
                        className={cn(
                          "px-3 py-1 rounded-full text-sm border transition-colors",
                          selectedTypes.includes(item.key)
                            ? "bg-primary text-primary-foreground border-transparent"
                            : "bg-muted text-foreground border-border hover:bg-muted/80"
                        )}
                      >
                        <span className="mr-1">{item.icon}</span>
                        {item.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <h4 className="font-medium mb-2">Сложность</h4>
                <div className="flex gap-2">
                  {Object.entries(difficulties).map(([level, info]) => (
                    <button
                      key={level}
                      onClick={() => setSelectedDifficulty(level)}
                      className={cn(
                        "px-3 py-1 rounded-full text-sm border transition-colors",
                        selectedDifficulty === level
                          ? "bg-blue-500 text-white border-transparent"
                          : "bg-gray-100 text-gray-700 border-gray-300 hover:bg-gray-200"
                      )}
                    >
                      {info.name}
                    </button>
                  ))}
                </div>
              </div>

              <Button
                onClick={generateExercises}
                disabled={isGenerating || selectedTypes.length === 0}
                className="w-full"
              >
                {isGenerating ? (
                  <>
                    <Volume2 className="mr-2 h-4 w-4 animate-spin" />
                    Генерирую упражнения...
                  </>
                ) : (
                  <>
                    <Target className="mr-2 h-4 w-4" />
                    Сгенерировать упражнения
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {exercises.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Сгенерированные упражнения</CardTitle>
                <CardDescription>
                  Выберите упражнение для начала занятия
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4">
                  {exercises.map((exercise) => (
                    <Card key={exercise.id} className="cursor-pointer hover:shadow-md transition-shadow">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className="text-2xl">{getTypeIcon(exercise.type)}</span>
                            <div>
                              <h3 className="font-medium">{exercise.title}</h3>
                              <p className="text-sm text-gray-600">
                                {typeByKey[exercise.type]?.name ?? exercise.content.exercise_type ?? exercise.type}
                              </p>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Badge className={getDifficultyColor(exercise.difficulty)}>
                              {difficulties[exercise.difficulty as keyof typeof difficulties]?.name}
                            </Badge>
                            <Badge variant="outline" className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {exercise.estimated_duration} мин
                            </Badge>
                          </div>
                        </div>

                        <div className="text-sm text-gray-600 mb-3">
                          <p>
                            <strong>Тип:</strong> {typeByKey[exercise.type]?.name ?? exercise.content.exercise_type ?? exercise.type}
                          </p>
                          <p>
                            <strong>Элементы:</strong> {exercise.content.items.length} шт.
                          </p>
                        </div>

                        <div className="space-y-2 mb-4">
                          <h4 className="font-medium text-sm">Инструкции:</h4>
                          <ul className="text-sm text-gray-600 space-y-1">
                            {exercise.content.instructions.slice(0, 2).map((instruction: string, index: number) => (
                              <li key={index} className="flex items-start gap-2">
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
        </>
      ) : (
        <div className="space-y-6">
          {childId ? <ProgressStats childId={childId} /> : null}
          <AdaptiveGenerator childId={childId} onExerciseSelect={onExerciseSelect} />
        </div>
      )}
    </div>
  )
}
