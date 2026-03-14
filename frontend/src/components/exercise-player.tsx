"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { StatsCard } from '@/components/ui/stats-card'
import {
  Play,
  Pause,
  RotateCcw,
  CheckCircle,
  Volume2,
  Mic,
  Star
} from 'lucide-react'
import { cn } from '@/lib/utils'

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

interface ExercisePlayerProps {
  exercise: Exercise
  onComplete?: (results: ExerciseResults) => void
  onExit?: () => void
}

interface ExerciseResults {
  exerciseId: number
  score: number
  completedItems: number
  totalItems: number
  timeSpent: number
  accuracy: number
}

export function ExercisePlayer({ exercise, onComplete, onExit }: ExercisePlayerProps) {
  const [currentStep, setCurrentStep] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [score, setScore] = useState(0)
  const [completedItems, setCompletedItems] = useState(0)
  const [timeSpent, setTimeSpent] = useState(0)
  const [showResult, setShowResult] = useState(false)

  const totalItems = exercise.content.items.length
  const progress = (completedItems / totalItems) * 100

  useEffect(() => {
    let timer: NodeJS.Timeout
    if (isPlaying && !showResult) {
      timer = setInterval(() => {
        setTimeSpent(prev => prev + 1)
      }, 1000)
    }
    return () => clearInterval(timer)
  }, [isPlaying, showResult])

  const handleItemComplete = (itemIndex: number, success: boolean) => {
    if (success) {
      setScore(prev => prev + 10)
      setCompletedItems(prev => prev + 1)
    }

    if (itemIndex === totalItems - 1) {
      // Упражнение завершено
      setShowResult(true)
      setIsPlaying(false)

      const results: ExerciseResults = {
        exerciseId: exercise.id,
        score: Math.round((score + (success ? 10 : 0)) / totalItems * 10),
        completedItems: completedItems + (success ? 1 : 0),
        totalItems,
        timeSpent,
        accuracy: ((completedItems + (success ? 1 : 0)) / totalItems) * 100
      }

      setTimeout(() => {
        onComplete?.(results)
      }, 2000)
    } else {
      setCurrentStep(prev => prev + 1)
    }
  }

  const resetExercise = () => {
    setCurrentStep(0)
    setScore(0)
    setCompletedItems(0)
    setTimeSpent(0)
    setShowResult(false)
    setIsPlaying(false)
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const getCurrentItem = () => {
    return exercise.content.items[currentStep] || ''
  }

  const getExerciseIcon = (type: string) => {
    switch (type) {
      case 'pronunciation': return '🗣️'
      case 'articulation': return '👅'
      case 'rhythm': return '🎵'
      case 'memory': return '🧠'
      default: return '📝'
    }
  }

  if (showResult) {
    const accuracy = (completedItems / totalItems) * 100
    const performance = accuracy >= 80 ? 'Отлично!' : accuracy >= 60 ? 'Хорошо!' : 'Нужно еще поработать!'

    return (
      <Card className="max-w-2xl mx-auto">
        <CardContent className="p-8 text-center">
          <div className="mb-6">
            <div className="text-6xl mb-4">🎉</div>
            <h2 className="text-2xl font-bold mb-2">{performance}</h2>
            <p className="text-gray-600">
              Вы завершили упражнение &laquo;{exercise.title}&raquo;
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-6">
            <StatsCard
              label="Точность"
              value={`${accuracy.toFixed(0)}%`}
              variant="blue"
            />
            <StatsCard
              label="Очки"
              value={score}
              variant="green"
            />
          </div>

          <div className="flex gap-4">
            <Button onClick={resetExercise} variant="outline" className="flex-1">
              <RotateCcw className="mr-2 h-4 w-4" />
              Повторить
            </Button>
            <Button onClick={onExit} className="flex-1">
              Завершить
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="max-w-4xl mx-auto">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-3xl">{getExerciseIcon(exercise.type)}</span>
            <div>
              <CardTitle>{exercise.title}</CardTitle>
              <div className="flex gap-2 mt-1">
                <Badge variant="outline">{exercise.type}</Badge>
                <Badge variant={exercise.difficulty === 'easy' ? 'easy' : exercise.difficulty === 'medium' ? 'medium' : 'hard'}>
                  {exercise.difficulty}
                </Badge>
              </div>
            </div>
          </div>
          <div className="text-right text-sm text-gray-600">
            <div>Время: {formatTime(timeSpent)}</div>
            <div>Шаг {currentStep + 1} из {totalItems}</div>
          </div>
        </div>

        <Progress value={progress} className="mt-4" />
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Инструкции */}
        <div className="bg-muted/50 p-4 rounded-lg">
          <h3 className="font-medium mb-2">Инструкция:</h3>
          <ul className="space-y-1 text-sm">
            {exercise.content.instructions.map((instruction: string, index: number) => (
              <li key={index} className="flex items-start gap-2">
                <span className="text-blue-500 mt-1">•</span>
                <span>{instruction}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Текущее задание */}
        <div className="text-center py-8">
          <div className="text-6xl mb-4 animate-bounce-gentle">
            {getCurrentItem()}
          </div>

          {exercise.content.exercise_type === 'pronunciation' && (
            <p className="text-lg text-gray-600 mb-4">
              Повторите вслух за диктором
            </p>
          )}

          {exercise.content.exercise_type === 'articulation' && (
            <p className="text-lg text-gray-600 mb-4">
              Произнесите четко и ясно
            </p>
          )}

          {exercise.content.exercise_type === 'rhythm' && (
            <p className="text-lg text-gray-600 mb-4">
              Повторите в том же ритме
            </p>
          )}

          {exercise.content.exercise_type === 'memory' && (
            <p className="text-lg text-gray-600 mb-4">
              Запомните и повторите последовательность
            </p>
          )}
        </div>

        {/* Управление */}
        <div className="flex justify-center gap-4">
          <Button
            onClick={() => setIsPlaying(!isPlaying)}
            variant={isPlaying ? "secondary" : "default"}
            size="lg"
          >
            {isPlaying ? (
              <>
                <Pause className="mr-2 h-5 w-5" />
                Пауза
              </>
            ) : (
              <>
                <Play className="mr-2 h-5 w-5" />
                Слушать
              </>
            )}
          </Button>

          <Button
            onClick={() => handleItemComplete(currentStep, true)}
            size="lg"
            variant="success"
          >
            <CheckCircle className="mr-2 h-5 w-5" />
            Готово!
          </Button>

          <Button
            onClick={() => handleItemComplete(currentStep, false)}
            variant="outline"
            size="lg"
          >
            Пропустить
          </Button>
        </div>

        {/* Прогресс */}
        <div className="flex justify-between items-center text-sm text-gray-600">
          <span>Выполнено: {completedItems} из {totalItems}</span>
          <span>Очки: {score}</span>
          <span>Точность: {totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0}%</span>
        </div>
      </CardContent>
    </Card>
  )
}
