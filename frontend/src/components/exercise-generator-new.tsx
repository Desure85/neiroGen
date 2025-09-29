"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Brain, Volume2, Clock, Target, Zap } from 'lucide-react'
import { cn } from '@/lib/utils'
import { AdaptiveGenerator } from './adaptive-generator'
import { ProgressStats } from './progress-stats'

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

interface ExerciseGeneratorProps {
  onExerciseSelect?: (exercise: Exercise) => void
  childId?: string
}

export function ExerciseGenerator({ onExerciseSelect, childId }: ExerciseGeneratorProps) {
  const [isGenerating, setIsGenerating] = useState(false)
  const [exercises, setExercises] = useState<Exercise[]>([])
  const [selectedTypes, setSelectedTypes] = useState<string[]>(['pronunciation', 'articulation'])
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('medium')
  const [mode, setMode] = useState<'manual' | 'adaptive'>('manual')

  const exerciseTypes = {
    pronunciation: { name: 'Произношение', icon: '🗣️', color: 'bg-blue-500' },
    articulation: { name: 'Артикуляция', icon: '👅', color: 'bg-green-500' },
    rhythm: { name: 'Ритм', icon: '🎵', color: 'bg-purple-500' },
    memory: { name: 'Память', icon: '🧠', color: 'bg-orange-500' }
  }

  const difficulties = {
    easy: { name: 'Легкий', color: 'bg-green-100 text-green-800' },
    medium: { name: 'Средний', color: 'bg-yellow-100 text-yellow-800' },
    hard: { name: 'Сложный', color: 'bg-red-100 text-red-800' }
  }

  const generateExercises = async () => {
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
            audio_guidance: true
          }
        })
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

  const getTypeIcon = (type: string) => {
    return exerciseTypes[type as keyof typeof exerciseTypes]?.icon || '📝'
  }

  const getDifficultyColor = (difficulty: string) => {
    return difficulties[difficulty as keyof typeof difficulties]?.color || 'bg-gray-100 text-gray-800'
  }

  return (
    <div className="space-y-6">
      {/* Переключатель режимов */}
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
              {/* Типы упражнений */}
              <div>
                <h4 className="font-medium mb-2">Типы упражнений</h4>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(exerciseTypes).map(([type, info]) => (
                    <button
                      key={type}
                      onClick={() => {
                        setSelectedTypes(prev =>
                          prev.includes(type)
                            ? prev.filter(t => t !== type)
                            : [...prev, type]
                        )
                      }}
                      className={cn(
                        "px-3 py-1 rounded-full text-sm border transition-colors",
                        selectedTypes.includes(type)
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

              {/* Сложность */}
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

              {/* Кнопка генерации */}
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

          {/* Результаты генерации */}
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
                                {exerciseTypes[exercise.type as keyof typeof exerciseTypes]?.name}
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
                          <p><strong>Тип:</strong> {exercise.content.exercise_type}</p>
                          <p><strong>Элементы:</strong> {exercise.content.items.length} шт.</p>
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
        /* Адаптивный режим */
        <div className="space-y-6">
          {childId ? <ProgressStats childId={childId} /> : null}
          <AdaptiveGenerator childId={childId} onExerciseSelect={onExerciseSelect} />
        </div>
      )}
    </div>
  )
}
