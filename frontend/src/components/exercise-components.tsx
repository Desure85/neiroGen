import React from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import { useI18n } from '@/components/localization'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ExerciseTemplates } from '@/components/exercise-templates'
import { apiFetch, API_BASE } from '@/lib/api'
import { Clock } from 'lucide-react'
import { WorksheetGenerator, WorksheetGeneratorProps } from '@/components/worksheets/worksheet-generator'

type ExerciseGeneratorProps = {
  onExerciseSelect: (exercise: any) => void
  childContext?: WorksheetGeneratorProps['childContext']
  worksheetId?: WorksheetGeneratorProps['initialWorksheetId']
  onWorksheetLoaded?: WorksheetGeneratorProps['onWorksheetLoaded']
}

export const ExerciseGenerator: React.FC<ExerciseGeneratorProps> = ({ onExerciseSelect, childContext, worksheetId, onWorksheetLoaded }) => {
  const generateExercise = () => {
    const mockExercise = {
      id: 1,
      title: 'Произношение звуков',
      type: 'pronunciation',
      difficulty: 'easy',
      estimated_duration: 15,
      content: {
        exercise_type: 'sound_practice',
        items: ['А', 'О', 'У', 'И', 'Э'],
        instructions: [
          'Повторите за аудио',
          'Произнесите звуки четко',
          'Следите за правильным положением губ'
        ]
      }
    } as any
    onExerciseSelect(mockExercise)
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Генератор рабочих листов</CardTitle>
          <CardDescription>
            Сформируйте печатный лист: выберите упражнения, настройте поля и скачайте PDF.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <WorksheetGenerator
            childContext={childContext}
            initialWorksheetId={worksheetId ?? null}
            onWorksheetLoaded={onWorksheetLoaded}
          />
        </CardContent>
      </Card>
    </div>
  )
}

export const ExercisePlayer: React.FC<{ exercise: any, onComplete: (results: any) => void, onExit: () => void }> = ({ exercise, onComplete, onExit }) => {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardDescription>
            Тип: {exercise.content.exercise_type} | Сложность: {exercise.difficulty}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <Badge>{exercise.type}</Badge>
              <div className="flex items-center gap-1 text-sm text-gray-600">
                <Clock className="h-4 w-4" />
                {exercise.estimated_duration} мин
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="font-medium">Инструкции:</h4>
              <ul className="space-y-1">
                {exercise.content?.instructions?.filter((instruction: any) => Boolean(instruction)).map((instruction: any, idx: number) => {
                  const safeInstruction = String(instruction || '');
                  return (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="text-blue-500">•</span>
                      <span>{safeInstruction}</span>
                    </li>
                  );
                }) || []}
              </ul>
            </div>

            <div className="space-y-2">
              <h4 className="font-medium">Элементы упражнения:</h4>
              <div className="grid grid-cols-5 gap-2">
                {exercise.content.items.map((item: string, idx: number) => (
                  <div key={idx} className="text-center p-2 bg-gray-100 rounded">
                    {item}
                  </div>
                ))}
              </div>
            </div>

            <div className="flex gap-2">
              <Button onClick={onExit} variant="outline">
                Выйти
              </Button>
              <Button onClick={() => onComplete({ exerciseId: exercise.id, score: 85, completedItems: 4, totalItems: 5, timeSpent: 12, accuracy: 85 })}>
                Завершить упражнение
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export const ContentBlockManager: React.FC = () => {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Управление контент-блоками</CardTitle>
          <CardDescription>
            Создание и управление блоками контента для упражнений
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600">Здесь будет интерфейс для управления контент-блоками.</p>
        </CardContent>
      </Card>
    </div>
  )
}

export const ExerciseComposer: React.FC = () => {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Композитор упражнений</CardTitle>
          <CardDescription>
            Создание сложных упражнений из простых блоков
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600">Здесь будет интерфейс для составления упражнений.</p>
        </CardContent>
      </Card>
    </div>
  )
}
