"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Plus,
  ArrowUp,
  ArrowDown,
  Trash2,
  Play,
  Save,
  Clock,
  Target,
  Eye
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface ContentBlock {
  id: number
  type: string
  title: string
  content: any
  display_content: string
}

interface ExerciseComposerProps {
  availableBlocks: ContentBlock[]
  onSaveExercise?: (exerciseData: any) => void
  onPreviewExercise?: (blocks: ContentBlock[]) => void
}

const EXERCISE_TYPES = {
  custom: 'Кастомное упражнение',
  pronunciation: 'Произношение',
  articulation: 'Артикуляция',
  rhythm: 'Ритм',
  memory: 'Память'
}

const DIFFICULTY_LEVELS = {
  easy: { name: 'Легкий', color: 'bg-green-100 text-green-800' },
  medium: { name: 'Средний', color: 'bg-yellow-100 text-yellow-800' },
  hard: { name: 'Сложный', color: 'bg-red-100 text-red-800' }
}

export function ExerciseComposer({ availableBlocks, onSaveExercise, onPreviewExercise }: ExerciseComposerProps) {
  const [exerciseTitle, setExerciseTitle] = useState('')
  const [exerciseDescription, setExerciseDescription] = useState('')
  const [exerciseType, setExerciseType] = useState('custom')
  const [difficulty, setDifficulty] = useState('medium')
  const [estimatedDuration, setEstimatedDuration] = useState(15)
  const [selectedBlocks, setSelectedBlocks] = useState<ContentBlock[]>([])
  const [blockOrder, setBlockOrder] = useState<number[]>([])
  const [blockDelays, setBlockDelays] = useState<Record<number, number>>({})
  const [searchQuery, setSearchQuery] = useState('')

  // Инициализация порядка блоков
  useEffect(() => {
    if (selectedBlocks.length > 0 && blockOrder.length === 0) {
      const order = selectedBlocks.map(block => block.id)
      setBlockOrder(order)
    }
  }, [selectedBlocks, blockOrder])

  const filteredBlocks = availableBlocks.filter(block =>
    block.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    block.display_content.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleAddBlock = (block: ContentBlock) => {
    if (!selectedBlocks.find(b => b.id === block.id)) {
      setSelectedBlocks(prev => [...prev, block])
      setBlockDelays(prev => ({ ...prev, [block.id]: 0 }))
    }
  }

  const handleRemoveBlock = (blockId: number) => {
    setSelectedBlocks(prev => prev.filter(b => b.id !== blockId))
    setBlockDelays(prev => {
      const newDelays = { ...prev }
      delete newDelays[blockId]
      return newDelays
    })
  }

  const handleMoveBlock = (blockId: number, direction: 'up' | 'down') => {
    const currentIndex = blockOrder.indexOf(blockId)
    if (currentIndex === -1) return

    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1
    if (newIndex < 0 || newIndex >= blockOrder.length) return

    const newOrder = [...blockOrder]
    newOrder[currentIndex] = blockOrder[newIndex]
    newOrder[newIndex] = blockId
    setBlockOrder(newOrder)
  }

  const handleDelayChange = (blockId: number, delay: number) => {
    setBlockDelays(prev => ({ ...prev, [blockId]: Math.max(0, delay) }))
  }

  const handleSaveExercise = () => {
    if (!exerciseTitle.trim() || selectedBlocks.length === 0) {
      alert('Необходимо указать название упражнения и добавить хотя бы один блок')
      return
    }

    const exerciseData = {
      title: exerciseTitle,
      description: exerciseDescription,
      type: exerciseType,
      difficulty,
      estimated_duration: estimatedDuration,
      tags: ['custom', exerciseType],
      block_ids: blockOrder,
      delays: blockDelays
    }

    onSaveExercise?.(exerciseData)
  }

  const handlePreview = () => {
    if (selectedBlocks.length === 0) return
    onPreviewExercise?.(selectedBlocks)
  }

  const getBlockIcon = (type: string) => {
    switch (type) {
      case 'text': return '📝'
      case 'image': return '🖼️'
      case 'audio': return '🔊'
      case 'video': return '🎥'
      case 'interactive': return '🎮'
      case 'drawing': return '🎨'
      case 'choice': return '❓'
      case 'sequence': return '🔢'
      default: return '📦'
    }
  }

  const orderedBlocks = blockOrder
    .map(id => selectedBlocks.find(b => b.id === id))
    .filter(Boolean) as ContentBlock[]

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Левая колонка - Доступные блоки */}
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Доступные блоки контента</CardTitle>
            <CardDescription>
              Выберите блоки для составления упражнения
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Поиск блоков..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full p-2 border rounded pl-8"
                />
                <div className="absolute left-2 top-2.5 text-gray-400">🔍</div>
              </div>

              <div className="grid grid-cols-1 gap-2 max-h-96 overflow-y-auto">
                {filteredBlocks.map((block) => (
                  <div
                    key={block.id}
                    className={cn(
                      "p-3 border rounded cursor-pointer transition-colors hover:bg-gray-50",
                      selectedBlocks.find(b => b.id === block.id) && "bg-blue-50 border-blue-300"
                    )}
                    onClick={() => handleAddBlock(block)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{getBlockIcon(block.type)}</span>
                        <div>
                          <div className="font-medium text-sm">{block.title}</div>
                          <div className="text-xs text-gray-500">{block.display_content}</div>
                        </div>
                      </div>
                      <div className="text-xs text-gray-400">
                        {block.type}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Правая колонка - Составление упражнения */}
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Составление упражнения</CardTitle>
            <CardDescription>
              Настройте параметры и порядок блоков
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Основная информация */}
            <div className="space-y-3">
              <div>
                <Label htmlFor="title">Название упражнения</Label>
                <Input
                  id="title"
                  value={exerciseTitle}
                  onChange={(e) => setExerciseTitle(e.target.value)}
                  placeholder="Введите название упражнения"
                />
              </div>

              <div>
                <Label htmlFor="description">Описание</Label>
                <Textarea
                  id="description"
                  value={exerciseDescription}
                  onChange={(e) => setExerciseDescription(e.target.value)}
                  placeholder="Краткое описание упражнения"
                  rows={2}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="type">Тип упражнения</Label>
                  <select
                    id="type"
                    value={exerciseType}
                    onChange={(e) => setExerciseType(e.target.value)}
                    className="w-full p-2 border rounded"
                  >
                    {Object.entries(EXERCISE_TYPES).map(([key, name]) => (
                      <option key={key} value={key}>{name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <Label htmlFor="difficulty">Сложность</Label>
                  <select
                    id="difficulty"
                    value={difficulty}
                    onChange={(e) => setDifficulty(e.target.value)}
                    className="w-full p-2 border rounded"
                  >
                    {Object.entries(DIFFICULTY_LEVELS).map(([key, info]) => (
                      <option key={key} value={key}>{info.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <Label htmlFor="duration">Предполагаемая длительность (мин)</Label>
                <Input
                  id="duration"
                  type="number"
                  min="1"
                  max="60"
                  value={estimatedDuration}
                  onChange={(e) => setEstimatedDuration(parseInt(e.target.value) || 15)}
                />
              </div>
            </div>

            {/* Выбранные блоки */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label>Блоки в упражнении ({selectedBlocks.length})</Label>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handlePreview}
                  disabled={selectedBlocks.length === 0}
                >
                  <Eye className="mr-1 h-3 w-3" />
                  Предварительный просмотр
                </Button>
              </div>

              {orderedBlocks.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <div className="text-4xl mb-2">📦</div>
                  <p>Выберите блоки из списка слева</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {orderedBlocks.map((block, index) => (
                    <div
                      key={block.id}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded border"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex flex-col items-center">
                          <span className="text-lg">{getBlockIcon(block.type)}</span>
                          <div className="flex flex-col">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleMoveBlock(block.id, 'up')}
                              disabled={index === 0}
                              className="h-6 w-6 p-0"
                            >
                              <ArrowUp className="h-3 w-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleMoveBlock(block.id, 'down')}
                              disabled={index === orderedBlocks.length - 1}
                              className="h-6 w-6 p-0"
                            >
                              <ArrowDown className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                        <div className="flex-1">
                          <div className="font-medium text-sm">{block.title}</div>
                          <div className="text-xs text-gray-500">{block.display_content}</div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1">
                          <Label htmlFor={`delay-${block.id}`} className="text-xs">Задержка:</Label>
                          <Input
                            id={`delay-${block.id}`}
                            type="number"
                            min="0"
                            value={blockDelays[block.id] || 0}
                            onChange={(e) => handleDelayChange(block.id, parseInt(e.target.value) || 0)}
                            className="w-16 h-8 text-xs"
                          />
                          <span className="text-xs">сек</span>
                        </div>

                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleRemoveBlock(block.id)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Действия */}
            <div className="flex gap-2 pt-4">
              <Button
                onClick={handleSaveExercise}
                disabled={!exerciseTitle.trim() || selectedBlocks.length === 0}
                className="flex-1"
              >
                <Save className="mr-2 h-4 w-4" />
                Сохранить упражнение
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
