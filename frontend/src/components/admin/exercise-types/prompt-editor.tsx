"use client"

import { useState, useEffect } from "react"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { 
  fetchExerciseTypePrompts, 
  updateExerciseTypePrompts, 
  type ExerciseTypePrompt,
  type ExerciseTypePromptTypes 
} from "@/lib/api"
import { useToast } from "@/components/ui/use-toast"
import { Loader2, Save, Copy } from "lucide-react"

interface PromptEditorProps {
  exerciseTypeId: number | string
}

export function PromptEditor({ exerciseTypeId }: PromptEditorProps) {
  const [prompts, setPrompts] = useState<ExerciseTypePrompt>({
    instructions: '',
    content: '',
    solution: '',
    variations: '',
  })
  const [promptTypes, setPromptTypes] = useState<ExerciseTypePromptTypes>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [testPrompt, setTestPrompt] = useState<string | null>(null)
  const { toast } = useToast()

  useEffect(() => {
    loadPrompts()
  }, [exerciseTypeId])

  const loadPrompts = async () => {
    try {
      setLoading(true)
      const data = await fetchExerciseTypePrompts(exerciseTypeId)
      setPrompts(data.prompts)
      setPromptTypes(data.types)
    } catch (error) {
      console.error('Failed to load prompts:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    try {
      setSaving(true)
      await updateExerciseTypePrompts(exerciseTypeId, prompts)
      toast({
        title: 'Промпты сохранены',
        description: 'Промпты для AI генерации обновлены',
      })
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Ошибка',
        description: 'Не удалось сохранить промпты',
      })
    } finally {
      setSaving(false)
    }
  }

  const handlePromptChange = (type: keyof ExerciseTypePrompt, value: string) => {
    setPrompts(prev => ({ ...prev, [type]: value }))
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      toast({
        title: 'Скопировано',
        description: 'Промпт скопирован в буфер обмена',
      })
    }).catch(() => {
      toast({
        variant: 'destructive',
        title: 'Ошибка',
        description: 'Не удалось скопировать в буфер обмена',
      })
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  const availableVariables = [
    { var: '{{topic}}', desc: 'Тема упражнения' },
    { var: '{{difficulty}}', desc: 'Сложность (easy/medium/hard)' },
    { var: '{{age}}', desc: 'Возраст ребёнка' },
    { var: '{{count}}', desc: 'Количество элементов' },
    { var: '{{domain}}', desc: 'Область (neuro/speech)' },
  ]

  return (
    <div className="space-y-6">
      {/* Variable Reference */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Доступные переменные</CardTitle>
          <CardDescription>Используйте эти переменные в промптах</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {availableVariables.map(({ var: v, desc }) => (
              <Badge key={v} variant="outline" className="font-mono text-xs cursor-pointer" onClick={() => {
                navigator.clipboard.writeText(v)
                toast({ title: 'Скопировано', description: v })
              }}>
                {v}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Prompt Fields */}
      {Object.entries(promptTypes).map(([type, info]) => (
        <Card key={type}>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">{info.name}</CardTitle>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => copyToClipboard(prompts[type as keyof ExerciseTypePrompt])}
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            <CardDescription>{info.description}</CardDescription>
          </CardHeader>
          <CardContent>
            <Textarea
              value={prompts[type as keyof ExerciseTypePrompt]}
              onChange={(e) => handlePromptChange(type as keyof ExerciseTypePrompt, e.target.value)}
              placeholder={info.placeholder}
              className="min-h-[100px] font-mono text-sm"
            />
          </CardContent>
        </Card>
      ))}

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Save className="mr-2 h-4 w-4" />
          )}
          Сохранить промпты
        </Button>
      </div>

      {/* Quick Examples */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Примеры промптов</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="text-sm">
            <p className="font-medium mb-1">Генерация контента:</p>
            <pre className="text-xs bg-muted p-2 rounded overflow-x-auto">
{`Создай {{count}} карточек для упражнения "Визуальная память" на тему {{topic}}.
Каждая карточка должна быть простой и понятной для ребёнка {{age}} лет.
Уровень сложности: {{difficulty}}.`}
            </pre>
          </div>
          <div className="text-sm">
            <p className="font-medium mb-1">Инструкция:</p>
            <pre className="text-xs bg-muted p-2 rounded overflow-x-auto">
{`Посмотри на картинку и запомни её. Через несколько секунд тебе нужно будет
вспомнить, что было на картинке.`}
            </pre>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
