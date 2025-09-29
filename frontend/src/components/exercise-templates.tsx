"use client"

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import { apiFetch } from '@/lib/api'

interface ExerciseTemplate {
  id: number
  name: string
  description?: string
  type: string
  difficulty: 'easy' | 'medium' | 'hard'
  estimated_duration: number
  template_data: any
  tags: string[]
  is_global: boolean
  created_at: string
}

interface ExerciseTemplatesProps {
  onTemplateSelect?: (template: ExerciseTemplate) => void
}

export function ExerciseTemplates({ onTemplateSelect }: ExerciseTemplatesProps) {
  const [templates, setTemplates] = useState<ExerciseTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [newTemplate, setNewTemplate] = useState({
    name: '',
    description: '',
    type: 'pronunciation',
    difficulty: 'medium' as const,
    estimated_duration: 10,
    template_data: {},
    tags: [] as string[],
  })
  const [newTag, setNewTag] = useState('')

  useEffect(() => {
    loadTemplates()
  }, [])

  const loadTemplates = async () => {
    try {
      setLoading(true)
      const response = await apiFetch(`/api/templates`)
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }
      
      const data = await response.json()
      setTemplates(Array.isArray(data) ? data : data.data || [])
    } catch (err: any) {
      setError('Ошибка загрузки шаблонов: ' + (err.message || err))
    } finally {
      setLoading(false)
    }
  }

  const createTemplate = async () => {
    try {
      const response = await apiFetch(`/api/templates`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newTemplate),
      })
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }
      
      const template = await response.json()
      setTemplates(prev => [template, ...prev])
      setShowCreateForm(false)
      setNewTemplate({
        name: '',
        description: '',
        type: 'pronunciation',
        difficulty: 'medium',
        estimated_duration: 10,
        template_data: {},
        tags: [],
      })
    } catch (err: any) {
      setError('Ошибка создания шаблона: ' + (err.message || err))
    }
  }

  const addTag = () => {
    if (newTag.trim() && !newTemplate.tags.includes(newTag.trim())) {
      setNewTemplate(prev => ({
        ...prev,
        tags: [...prev.tags, newTag.trim()]
      }))
      setNewTag('')
    }
  }

  const removeTag = (tagToRemove: string) => {
    setNewTemplate(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }))
  }

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'bg-green-100 text-green-800'
      case 'medium': return 'bg-yellow-100 text-yellow-800'
      case 'hard': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="text-sm text-muted-foreground">Загрузка шаблонов...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <div className="text-sm text-red-600">{error}</div>
        <Button variant="outline" size="sm" onClick={loadTemplates} className="mt-2">
          Повторить
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div className="text-sm text-muted-foreground">
          Найдено шаблонов: {templates.length}
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => setShowCreateForm(!showCreateForm)}
        >
          {showCreateForm ? 'Отмена' : 'Создать шаблон'}
        </Button>
      </div>

      {showCreateForm && (
        <Card className="bg-muted/30 border border-border">
          <CardHeader>
            <CardTitle className="text-base">Новый шаблон</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <label className="block text-sm mb-1 text-muted-foreground">Название</label>
              <Input
                value={newTemplate.name}
                onChange={(e) => setNewTemplate(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Название шаблона"
              />
            </div>
            
            <div>
              <label className="block text-sm mb-1 text-muted-foreground">Описание</label>
              <Textarea
                value={newTemplate.description}
                onChange={(e) => setNewTemplate(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Описание шаблона"
                rows={2}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm mb-1 text-muted-foreground">Тип</label>
                <select
                  className="w-full p-2 border border-border rounded bg-background"
                  value={newTemplate.type}
                  onChange={(e) => setNewTemplate(prev => ({ ...prev, type: e.target.value }))}
                >
                  <option value="pronunciation">Произношение</option>
                  <option value="articulation">Артикуляция</option>
                  <option value="rhythm">Ритм</option>
                  <option value="memory">Память</option>
                  <option value="other">Другое</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm mb-1 text-muted-foreground">Сложность</label>
                <select
                  className="w-full p-2 border border-border rounded bg-background"
                  value={newTemplate.difficulty}
                  onChange={(e) => setNewTemplate(prev => ({ ...prev, difficulty: e.target.value as any }))}
                >
                  <option value="easy">Легкая</option>
                  <option value="medium">Средняя</option>
                  <option value="hard">Сложная</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm mb-1 text-muted-foreground">Длительность (мин)</label>
              <Input
                type="number"
                value={newTemplate.estimated_duration}
                onChange={(e) => setNewTemplate(prev => ({ ...prev, estimated_duration: parseInt(e.target.value) || 10 }))}
                min="1"
                max="120"
              />
            </div>

            <div>
              <label className="block text-sm mb-1 text-muted-foreground">Теги</label>
              <div className="flex gap-2 mb-2">
                <Input
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  placeholder="Добавить тег"
                  onKeyPress={(e) => e.key === 'Enter' && addTag()}
                />
                <Button variant="outline" size="sm" onClick={addTag}>
                  Добавить
                </Button>
              </div>
              {newTemplate.tags.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {newTemplate.tags.map(tag => (
                    <Badge 
                      key={tag} 
                      variant="secondary" 
                      className="cursor-pointer"
                      onClick={() => removeTag(tag)}
                    >
                      {tag} ×
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowCreateForm(false)}>
                Отмена
              </Button>
              <Button onClick={createTemplate} disabled={!newTemplate.name.trim()}>
                Создать
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="space-y-3">
        {templates.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <div className="text-sm">Шаблоны не найдены</div>
            <div className="text-xs mt-1">Создайте первый шаблон</div>
          </div>
        ) : (
          templates.map(template => (
            <Card 
              key={template.id} 
              className={cn(
                "bg-card border border-border cursor-pointer transition-colors hover:bg-muted/30",
                onTemplateSelect && "hover:border-primary/50"
              )}
              onClick={() => onTemplateSelect?.(template)}
            >
              <CardContent className="p-4">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <div className="font-medium text-sm">{template.name}</div>
                    {template.description && (
                      <div className="text-xs text-muted-foreground mt-1">
                        {template.description}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={getDifficultyColor(template.difficulty)}>
                      {template.difficulty}
                    </Badge>
                    {template.is_global && (
                      <Badge variant="outline">Глобальный</Badge>
                    )}
                  </div>
                </div>
                
                <div className="flex justify-between items-center text-xs text-muted-foreground">
                  <div className="flex items-center gap-3">
                    <span>Тип: {template.type}</span>
                    <span>Время: {template.estimated_duration} мин</span>
                  </div>
                  <div>
                    {new Date(template.created_at).toLocaleDateString()}
                  </div>
                </div>
                
                {template.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {template.tags.map(tag => (
                      <Badge key={tag} variant="outline" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}
