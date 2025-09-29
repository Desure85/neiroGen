"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Brain, Volume2, Clock, Target, Zap, FileDown, Layout } from 'lucide-react'
import { cn } from '@/lib/utils'
import { AdaptiveGenerator } from './adaptive-generator'
import { apiFetch } from '@/lib/api'
import { Input } from '@/components/ui/input'
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
  const [selectedForSheet, setSelectedForSheet] = useState<number[]>([])
  const [selectedTypes, setSelectedTypes] = useState<string[]>([])
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('medium')
  const [mode, setMode] = useState<'manual' | 'adaptive'>('manual')
  const [typesLoading, setTypesLoading] = useState(false)
  const [typesError, setTypesError] = useState<string>('')
  const [allTypes, setAllTypes] = useState<Array<{key:string;name:string;domain:string;icon:string;description:string}>>([])
  const [search, setSearch] = useState('')
  const [domainFilter, setDomainFilter] = useState<'all'|'speech'|'neuro'|'behavioral'>('all')

  useEffect(() => {
    const loadTypes = async () => {
      setTypesError(''); setTypesLoading(true)
      try {
        const res = await apiFetch(`/api/exercise-types`)
        if (!res.ok) throw new Error('HTTP '+res.status)
        const data = await res.json()
        setAllTypes(data.types || [])
      } catch (e:any) {
        setTypesError('Не удалось загрузить типы: '+(e?.message||e))
      } finally {
        setTypesLoading(false)
      }
    }
    loadTypes()
  }, [])

  const typesByDomain = (domain: 'speech'|'neuro'|'behavioral') => (
    allTypes
      .filter(t => (domainFilter==='all' || t.domain===domain)
        && (t.name.toLowerCase().includes(search.toLowerCase()) || t.key.toLowerCase().includes(search.toLowerCase())))
      .filter(t => t.domain===domain)
  )

  const difficulties = {
    easy: { name: 'Легкий', color: 'bg-green-100 text-green-800' },
    medium: { name: 'Средний', color: 'bg-yellow-100 text-yellow-800' },
    hard: { name: 'Сложный', color: 'bg-red-100 text-red-800' }
  }

  const [sheetFormat, setSheetFormat] = useState<'A4' | 'A5'>('A4')
  const [sheetCount, setSheetCount] = useState(1)
  const [isSheetGenerating, setIsSheetGenerating] = useState(false)
  const [sheetError, setSheetError] = useState<string>('')
  const [sheetSuccess, setSheetSuccess] = useState<string>('')

  const toggleSheetSelection = (exerciseId: number) => {
    setSelectedForSheet(prev => prev.includes(exerciseId)
      ? prev.filter(id => id !== exerciseId)
      : [...prev, exerciseId]
    )
  }

  const generateSheet = async () => {
    setSheetError(''); setSheetSuccess(''); setIsSheetGenerating(true)
    try {
      if (selectedForSheet.length === 0) {
        setSheetError('Выберите хотя бы одно упражнение для листа.')
        return
      }
      const payload = {
        exercise_ids: selectedForSheet,
        format: sheetFormat,
        copies: sheetCount,
      }
      const res = await apiFetch(`/api/worksheets/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      if (!res.ok) {
        throw new Error('HTTP ' + res.status)
      }
      const data = await res.json()
      const url = data?.url
      if (url) {
        setSheetSuccess('PDF подготовлен. Скачивание начнется автоматически.')
        window.open(url, '_blank', 'noopener,noreferrer')
      } else {
        throw new Error('Сервер не вернул ссылку на PDF')
      }
    } catch (e: any) {
      setSheetError('Не удалось сгенерировать лист: ' + (e?.message || e))
    } finally {
      setIsSheetGenerating(false)
    }
  }

  const generateExercises = async () => {
    setIsGenerating(true)

    try {
      const response = await apiFetch(`/api/generator/generate-batch`, {
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
    const found = allTypes.find(t => t.key === type)
    return found?.icon || '📝'
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
              {/* Типы упражнений из реестра */}
              <div className="space-y-3">
                <div className="flex flex-col md:flex-row md:items-center gap-3">
                  <Input
                    placeholder="Поиск типов..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                  <div className="flex gap-2">
                    {(['all','speech','neuro','behavioral'] as const).map(d => (
                      <button
                        key={d}
                        onClick={() => setDomainFilter(d)}
                        className={cn(
                          'px-3 py-1 rounded-full text-sm border',
                          domainFilter===d ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'
                        )}
                      >
                        {d === 'all' ? 'Все' : d === 'speech' ? 'Логопедические' : d === 'neuro' ? 'Нейропсихологические' : 'Поведенческие'}
                      </button>
                    ))}
                  </div>
                </div>

                {typesError && <div className="text-sm text-red-600">{typesError}</div>}
                {typesLoading ? (
                  <div className="text-sm text-gray-600">Загрузка типов...</div>
                ) : (
                  <div className="space-y-4">
                    {(['speech','neuro','behavioral'] as const).map(domain => {
                      const list = typesByDomain(domain)
                      if (list.length === 0) return null
                      return (
                        <div key={domain}>
                          <h4 className="font-medium mb-2">
                            {domain === 'speech' ? 'Логопедические' : domain === 'neuro' ? 'Нейропсихологические' : 'Поведенческие'}
                          </h4>
                          <div className="flex flex-wrap gap-2">
                            {list.map(t => (
                              <div key={t.key} className="flex items-center gap-2">
                                <button
                                  onClick={() => {
                                    setSelectedTypes(prev => prev.includes(t.key) ? prev.filter(x => x!==t.key) : [...prev, t.key])
                                  }}
                                  className={cn(
                                    'px-3 py-1 rounded-full text-sm border',
                                    selectedTypes.includes(t.key) ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'
                                  )}
                                  title={t.description}
                                >
                                  <span className="mr-1">{t.icon}</span>
                                  {t.name}
                                </button>
                                <a
                                  href={`/therapist?tab=constructor&type=${encodeURIComponent(t.key)}`}
                                  className="text-xs text-blue-600 hover:underline"
                                  title="Создать упражнение этого типа"
                                >
                                  Создать
                                </a>
                              </div>
                            ))}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
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
                    <Card key={exercise.id} className={cn(
                      'transition-shadow border-2',
                      selectedForSheet.includes(exercise.id)
                        ? 'border-primary shadow-md'
                        : 'border-transparent hover:border-border hover:shadow-md'
                    )}>
                      <CardContent className="p-4 space-y-4">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className="text-2xl">{getTypeIcon(exercise.type)}</span>
                            <div>
                              <h3 className="font-medium">{exercise.title}</h3>
                              <p className="text-sm text-gray-600">
                                {allTypes.find(t => t.key === exercise.type)?.name || exercise.type}
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

                        <div className="text-sm text-gray-600">
                          <p><strong>Тип:</strong> {exercise.content.exercise_type}</p>
                          <p><strong>Элементы:</strong> {exercise.content.items.length} шт.</p>
                        </div>

                        <div className="space-y-2">
                          <h4 className="font-medium text-sm">Инструкции:</h4>
                          <ul className="text-sm text-gray-600 space-y-1">
                            {exercise.content.instructions.slice(0, 2).map((instruction: unknown, index: number) => (
                              <li key={index} className="flex items-start gap-2">
                                <span className="text-blue-500">•</span>
                                <span>{String(instruction ?? '')}</span>
                              </li>
                            ))}
                          </ul>
                        </div>

                        <div className="flex flex-col sm:flex-row gap-2">
                          <Button
                            onClick={() => onExerciseSelect?.(exercise)}
                            className="flex-1"
                            variant="outline"
                          >
                            Начать упражнение
                          </Button>
                          <Button
                            onClick={() => toggleSheetSelection(exercise.id)}
                            variant={selectedForSheet.includes(exercise.id) ? 'default' : 'secondary'}
                            className="flex-1"
                          >
                            {selectedForSheet.includes(exercise.id) ? 'Убрать из листа' : 'Добавить в лист'}
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {exercises.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Layout className="h-5 w-5" />
                  Формирование печатных листов
                </CardTitle>
                <CardDescription>
                  Соберите упражнения в PDF для печати (A4/A5)
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Формат</label>
                    <div className="flex gap-2">
                      {(['A4','A5'] as const).map(format => (
                        <Button
                          key={format}
                          variant={sheetFormat === format ? 'default' : 'outline'}
                          onClick={() => setSheetFormat(format)}
                          className="flex-1"
                        >
                          {format}
                        </Button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Количество копий</label>
                    <Input
                      type="number"
                      min={1}
                      max={10}
                      value={sheetCount}
                      onChange={(e) => setSheetCount(Math.max(1, Math.min(10, Number(e.target.value) || 1)))}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Выбрано упражнений</label>
                    <div className="text-2xl font-semibold">{selectedForSheet.length}</div>
                    <div className="text-xs text-muted-foreground">Рекомендуем 2-3 задания на лист</div>
                  </div>
                </div>

                {sheetError && <div className="text-sm text-red-600">{sheetError}</div>}
                {sheetSuccess && <div className="text-sm text-green-600">{sheetSuccess}</div>}

                <Button
                  onClick={generateSheet}
                  disabled={isSheetGenerating || selectedForSheet.length === 0}
                  className="w-full"
                >
                  {isSheetGenerating ? (
                    <>
                      <Volume2 className="mr-2 h-4 w-4 animate-spin" />
                      Формируем PDF...
                    </>
                  ) : (
                    <>
                      <FileDown className="mr-2 h-4 w-4" />
                      Сформировать PDF лист
                    </>
                  )}
                </Button>
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
