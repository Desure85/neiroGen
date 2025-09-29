"use client"

import * as React from 'react'
import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Plus,
  Search,
  Edit,
  Copy,
  Trash2,
  Download,
  Upload,
  Eye,
  Play,
  Image as ImageIcon,
  Volume2,
  Video,
  MousePointer,
  Palette,
  List,
  Hash
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { apiFetch } from '@/lib/api'

type InteractiveTypeKey =
  | 'listen_repeat'
  | 'sound_recognition'
  | 'word_completion'
  | 'sentence_building'
  | 'rhythm_tapping'
  | 'memory_cards'
  | 'phoneme_discrimination'

interface ContentBlock {
  id: number
  type: string
  title: string
  content: {
    text?: string
    question?: string
    options?: string[]
    items?: unknown[]
    interactive_type?: InteractiveTypeKey | string
  }
  settings?: any
  is_template?: boolean
  created_by: number
  created_at: string
  updated_at: string
}

interface ContentBlockManagerProps {
  onBlockSelect?: (block: ContentBlock) => void
  onBlocksUpdate?: (blocks: ContentBlock[]) => void
  mode?: 'manage' | 'select'
}

const BLOCK_TYPES = {
  text: { name: 'Текст', icon: '📝', color: 'bg-blue-500' },
  image: { name: 'Изображение', icon: '🖼️', color: 'bg-green-500' },
  audio: { name: 'Аудио', icon: '🔊', color: 'bg-purple-500' },
  video: { name: 'Видео', icon: '🎥', color: 'bg-red-500' },
  interactive: { name: 'Интерактивный', icon: '🎮', color: 'bg-yellow-500' },
  drawing: { name: 'Рисование', icon: '🎨', color: 'bg-pink-500' },
  choice: { name: 'Выбор ответа', icon: '❓', color: 'bg-indigo-500' },
  sequence: { name: 'Последовательность', icon: '🔢', color: 'bg-orange-500' }
}

const INTERACTIVE_TYPES: Record<InteractiveTypeKey, string> = {
  listen_repeat: 'Слушай и повторяй',
  sound_recognition: 'Распознавание звуков',
  word_completion: 'Дополни слово',
  sentence_building: 'Составь предложение',
  rhythm_tapping: 'Ритмичное постукивание',
  memory_cards: 'Карточки памяти',
  phoneme_discrimination: 'Различение фонем'
}

function CreateBlockForm({ onSubmit, onCancel }: { onSubmit: (data: any) => void; onCancel: () => void }) {
  const [formData, setFormData] = useState({
    type: 'text',
    title: '',
    content: {} as Record<string, any>,
    is_template: false
  })

  const updateFormData = (field: string, value: any) => {
    if (field === 'content') {
      setFormData(prev => ({ ...prev, content: { ...prev.content, ...value } }))
    } else {
      setFormData(prev => ({ ...prev, [field]: value }))
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit(formData)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Создать новый блок контента</CardTitle>
        <CardDescription>
          Создайте блок контента для использования в упражнениях
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="type">Тип блока</Label>
            <select
              id="type"
              value={formData.type}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => updateFormData('type', e.target.value)}
              className="w-full p-2 border rounded"
            >
              {Object.entries(BLOCK_TYPES).map(([key, info]) => (
                <option key={key} value={key}>
                  {info.icon} {info.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <Label htmlFor="title">Название</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateFormData('title', e.target.value)}
              placeholder="Введите название блока"
            />
          </div>

          {formData.type === 'text' && (
            <div>
              <Label htmlFor="text">Текст</Label>
              <Textarea
                id="text"
                value={(formData.content as any)?.text || ''}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => updateFormData('content', { text: e.target.value })}
                placeholder="Введите текст"
                rows={3}
              />
            </div>
          )}

          {formData.type === 'choice' && (
            <div>
              <Label htmlFor="question">Вопрос</Label>
              <Input
                id="question"
                value={(formData.content as any)?.question || ''}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateFormData('content', { question: e.target.value })}
                placeholder="Введите вопрос"
              />
              <Label htmlFor="options" className="mt-2 block">Варианты ответа</Label>
              <Textarea
                id="options"
                value={Array.isArray((formData.content as any)?.options) ? ((formData.content as any).options as string[]).join('\n') : ''}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => updateFormData('content', { options: e.target.value.split('\n').filter(Boolean) })}
                placeholder="Каждый вариант с новой строки"
                rows={3}
              />
            </div>
          )}

          {formData.type === 'interactive' && (
            <div>
              <Label htmlFor="interactive_type">Тип взаимодействия</Label>
              <select
                id="interactive_type"
                value={(formData.content as any)?.interactive_type || ''}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => updateFormData('content', { interactive_type: e.target.value })}
                className="w-full p-2 border rounded"
              >
                <option value="">Выберите тип</option>
                {Object.entries(INTERACTIVE_TYPES).map(([key, name]) => (
                  <option key={key} value={key}>{name}</option>
                ))}
              </select>
            </div>
          )}

          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="is_template"
              checked={formData.is_template}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateFormData('is_template', e.target.checked)}
            />
            <Label htmlFor="is_template">Сохранить как шаблон</Label>
          </div>

          <div className="flex gap-2">
            <Button type="submit">Создать блок</Button>
            <Button type="button" variant="outline" onClick={onCancel}>
              Отмена
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}

export function ContentBlockManager({ onBlockSelect, onBlocksUpdate, mode = 'manage' }: ContentBlockManagerProps) {
  const [blocks, setBlocks] = useState<ContentBlock[]>([])
  const [selectedBlock, setSelectedBlock] = useState<ContentBlock | null>(null)
  const [activeTab, setActiveTab] = useState('list')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedType, setSelectedType] = useState<string | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const blocksUpdateRef = useRef(onBlocksUpdate)

  useEffect(() => {
    blocksUpdateRef.current = onBlocksUpdate
  }, [onBlocksUpdate])

  const loadBlocks = useCallback(async () => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams()
      if (selectedType) params.append('type', selectedType)

      const response = await apiFetch(`/api/content-blocks?${params.toString()}`)
      if (response.ok) {
        const data = await response.json()
        setBlocks(data.data || [])
        blocksUpdateRef.current?.(data.data || [])
      }
    } catch (error) {
      console.error('Error loading blocks:', error)
    } finally {
      setIsLoading(false)
    }
  }, [selectedType])

  // Загрузка блоков
  useEffect(() => {
    loadBlocks()
  }, [loadBlocks])

  const handleBlockClick = (block: ContentBlock) => {
    setSelectedBlock(block)
    onBlockSelect?.(block)
  }

  const handleCreateBlock = async (blockData: Partial<ContentBlock>) => {
    try {
      const response = await apiFetch(`/api/content-blocks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(blockData)
      })

      if (response.ok) {
        await loadBlocks()
        setIsCreating(false)
      }
    } catch (error) {
      console.error('Error creating block:', error)
    }
  }

  const handleDeleteBlock = async (blockId: number) => {
    if (!confirm('Вы уверены, что хотите удалить этот блок?')) return

    try {
      const response = await apiFetch(`/api/content-blocks/${blockId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        await loadBlocks()
        if (selectedBlock?.id === blockId) {
          setSelectedBlock(null)
        }
      }
    } catch (error) {
      console.error('Error deleting block:', error)
    }
  }

  const handleDuplicateBlock = async (block: ContentBlock) => {
    try {
      const response = await apiFetch(`/api/content-blocks/${block.id}/duplicate`, {
        method: 'POST'
      })

      if (response.ok) {
        await loadBlocks()
      }
    } catch (error) {
      console.error('Error duplicating block:', error)
    }
  }

  const getBlockIcon = (type: string) => {
    return BLOCK_TYPES[type as keyof typeof BLOCK_TYPES]?.icon || '📦'
  }

  const getBlockColor = (type: string) => {
    return BLOCK_TYPES[type as keyof typeof BLOCK_TYPES]?.color || 'bg-gray-500'
  }

  const filteredBlocks = useMemo(() => {
    if (!searchQuery.trim()) return blocks
    const q = searchQuery.trim().toLowerCase()
    return blocks.filter(block => {
      const payload = [
        block.title,
        block.type,
        block.content?.text,
        block.content?.question,
        Array.isArray(block.content?.options) ? block.content?.options?.join(' ') : ''
      ]
        .join(' ')
        .toLowerCase()
      return payload.includes(q)
    })
  }, [blocks, searchQuery])

  const renderBlockPreview = (block: ContentBlock) => {
    switch (block.type) {
      case 'text':
        return <div className="text-sm text-muted-foreground truncate">{block.content?.text}</div>
      case 'image':
        return <div className="text-sm text-muted-foreground">🖼️ Изображение</div>
      case 'audio':
        return <div className="text-sm text-muted-foreground">🔊 Аудио файл</div>
      case 'video':
        return <div className="text-sm text-muted-foreground">🎥 Видео файл</div>
      case 'interactive': {
        const key = (block.content?.interactive_type || '') as InteractiveTypeKey
        const name = (key && INTERACTIVE_TYPES[key]) ? INTERACTIVE_TYPES[key] : 'Интерактив'
        return <div className="text-sm text-muted-foreground">🎮 {name}</div>
      }
      case 'drawing':
        return <div className="text-sm text-muted-foreground">🎨 Рисование</div>
      case 'choice':
        return <div className="text-sm text-muted-foreground">❓ {block.content?.question}</div>
      case 'sequence':
        return <div className="text-sm text-muted-foreground">🔢 {block.content?.items?.length} элементов</div>
      default:
        return <div className="text-sm text-muted-foreground">Неизвестный тип</div>
    }
  }

  const renderCreateForm = () => null

  const filtersNode = (
    <Card className="bg-card border border-border">
      <CardContent className="p-4">
        <div className="flex gap-4 items-center">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Поиск блоков..."
                value={searchQuery}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
                className="pl-8 bg-background text-foreground"
              />
            </div>
          </div>
          <select
            value={selectedType || ''}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setSelectedType(e.target.value || null)}
            className="p-2 border border-border rounded bg-background text-foreground"
          >
            <option value="">Все типы</option>
            {Object.entries(BLOCK_TYPES).map(([key, info]) => (
              <option key={key} value={key}>{info.icon} {info.name}</option>
            ))}
          </select>
        </div>
      </CardContent>
    </Card>
  )

  const blocksListNode = isLoading ? (
    <div className="text-center py-8 text-muted-foreground">Загрузка...</div>
  ) : filteredBlocks.length === 0 ? (
    <Card className="bg-card border border-dashed border-border">
      <CardContent className="p-6 text-center space-y-3">
        <div className="text-4xl">➕</div>
        <h3 className="text-lg font-medium text-foreground">Нет блоков контента</h3>
        <p className="text-sm text-muted-foreground">Измените фильтр или создайте новый блок</p>
        {mode === 'manage' && (
          <Button onClick={() => setIsCreating(true)}>Создать блок</Button>
        )}
      </CardContent>
    </Card>
  ) : (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {filteredBlocks.map((block) => (
        <Card
          key={block.id}
          className={cn(
            'cursor-pointer transition-shadow hover:shadow-md border bg-card text-foreground',
            selectedBlock?.id === block.id ? 'border-primary shadow-lg' : 'border-border'
          )}
          onClick={() => handleBlockClick(block)}
        >
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className={cn('w-10 h-10 rounded-full flex items-center justify-center text-lg text-white', getBlockColor(block.type))}>
                {getBlockIcon(block.type)}
              </div>
              <span className="text-xs text-muted-foreground">{new Date(block.updated_at).toLocaleDateString()}</span>
            </div>
            <div>
              <h4 className="font-semibold mb-1 text-foreground">{block.title}</h4>
              {renderBlockPreview(block)}
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Badge variant="secondary">{block.type}</Badge>
              {block.is_template && <Badge variant="outline">Шаблон</Badge>}
            </div>
            {mode === 'manage' && (
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleDuplicateBlock(block)
                  }}
                >
                  <Copy className="h-3 w-3" />
                </Button>
                <Button
                  variant="ghost"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleDeleteBlock(block.id)
                  }}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  )



  if (mode === 'select') {
    return (
      <div className="space-y-4">
        {filtersNode}
        {blocksListNode}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Блоки контента</h2>
          <p className="text-gray-600">Создавайте и управляйте блоками для упражнений</p>
        </div>
        <Button onClick={() => setIsCreating(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Создать блок
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="list">Список блоков</TabsTrigger>
          <TabsTrigger value="templates">Шаблоны</TabsTrigger>
          <TabsTrigger value="create">Создание</TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="space-y-4">
          {filtersNode}
          {blocksListNode}
        </TabsContent>

        <TabsContent value="templates" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-8 text-center">
                <div className="text-4xl mb-4">📋</div>
                <h3 className="text-lg font-medium mb-2">Шаблоны блоков</h3>
                <p className="text-gray-600 mb-4">Готовые блоки для быстрого использования</p>
                <Button variant="outline" onClick={() => setActiveTab('list')}>
                  Перейти к списку
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="create" className="space-y-4">
          {isCreating && (
            <CreateBlockForm
              onSubmit={(data) => handleCreateBlock(data)}
              onCancel={() => setIsCreating(false)}
            />
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
