"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { getAiProviders, updateAiProvider, type AiProviderConfig } from '@/lib/ai'
import { useToast } from '@/components/ui/use-toast'
import { Loader2, Save, Eye, EyeOff, CheckCircle2, XCircle } from 'lucide-react'

export function AISettings() {
  const [providers, setProviders] = useState<Record<string, AiProviderConfig>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)
  const [showApiKey, setShowApiKey] = useState<Record<string, boolean>>({})
  const { toast } = useToast()

  // Form state for each provider
  const [formData, setFormData] = useState<Record<string, {
    api_key: string
    model: string
    enabled: boolean
  }>>({})

  useEffect(() => {
    loadProviders()
  }, [])

  const loadProviders = async () => {
    try {
      const data = await getAiProviders()
      setProviders(data.providers || {})
      
      // Initialize form data
      const initialFormData: Record<string, { api_key: string; model: string; enabled: boolean }> = {}
      for (const [key, provider] of Object.entries(data.providers || {})) {
        initialFormData[key] = {
          api_key: '',
          model: provider.model || '',
          enabled: provider.enabled,
        }
      }
      setFormData(initialFormData)
    } catch (error) {
      console.error('Failed to load AI providers:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async (providerKey: string) => {
    setSaving(providerKey)
    try {
      const data = formData[providerKey]
      const result = await updateAiProvider(providerKey, {
        api_key: data.api_key || undefined,
        model: data.model || undefined,
        enabled: data.enabled,
      })

      if (result.ok) {
        toast({
          title: 'Настройки сохранены',
          description: `Провайдер ${providerKey} обновлён`,
        })
        // Reload to get fresh data
        loadProviders()
        // Clear API key from form after save
        setFormData(prev => ({
          ...prev,
          [providerKey]: { ...prev[providerKey], api_key: '' }
        }))
      } else {
        toast({
          variant: 'destructive',
          title: 'Ошибка',
          description: result.error || 'Не удалось сохранить настройки',
        })
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Ошибка',
        description: 'Произошла ошибка при сохранении',
      })
    } finally {
      setSaving(null)
    }
  }

  const toggleApiKeyVisibility = (provider: string) => {
    setShowApiKey(prev => ({ ...prev, [provider]: !prev[provider] }))
  }

  const getStatusBadge = (provider: AiProviderConfig) => {
    if (provider.available && provider.enabled) {
      return <Badge variant="success">Активен</Badge>
    }
    if (provider.available) {
      return <Badge variant="secondary">Доступен</Badge>
    }
    if (!provider.has_api_key && !provider.enabled) {
      return <Badge variant="outline">Не настроен</Badge>
    }
    return <Badge variant="destructive">Ошибка</Badge>
  }

  const providerInfo: Record<string, { name: string; description: string; models: string[] }> = {
    openai: {
      name: 'OpenAI',
      description: 'GPT-4, DALL-E для генерации текста и изображений',
      models: ['gpt-4o', 'gpt-4-turbo', 'gpt-3.5-turbo', 'dall-e-3', 'dall-e-2'],
    },
    anthropic: {
      name: 'Anthropic',
      description: 'Claude для генерации текста и упражнений',
      models: ['claude-3-5-sonnet-20241022', 'claude-3-opus-20240229', 'claude-3-sonnet-20240229'],
    },
    google: {
      name: 'Google AI',
      description: 'Gemini для генерации текста и изображений',
      models: ['gemini-2.0-flash-exp', 'gemini-1.5-pro', 'gemini-1.5-flash'],
    },
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {Object.entries(providers).map(([key, provider]) => (
        <Card key={key}>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <CardTitle className="text-lg">
                  {providerInfo[key]?.name || key}
                </CardTitle>
                {getStatusBadge(provider)}
              </div>
              <div className="flex items-center gap-2">
                <Label htmlFor={`enabled-${key}`} className="text-sm mr-2">
                  Включён
                </Label>
                <Switch
                  id={`enabled-${key}`}
                  checked={formData[key]?.enabled ?? false}
                  onCheckedChange={(checked) => {
                    setFormData(prev => ({
                      ...prev,
                      [key]: { ...prev[key], enabled: checked }
                    }))
                  }}
                />
              </div>
            </div>
            <CardDescription>
              {providerInfo[key]?.description || provider.health.message}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor={`api-key-${key}`}>API Key</Label>
                <div className="relative">
                  <Input
                    id={`api-key-${key}`}
                    type={showApiKey[key] ? 'text' : 'password'}
                    placeholder={provider.has_api_key ? '••••••••••••••••' : 'Введите API ключ'}
                    value={formData[key]?.api_key || ''}
                    onChange={(e) => {
                      setFormData(prev => ({
                        ...prev,
                        [key]: { ...prev[key], api_key: e.target.value }
                      }))
                    }}
                    className="pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3"
                    onClick={() => toggleApiKeyVisibility(key)}
                  >
                    {showApiKey[key] ? (
                      <EyeOff className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <Eye className="h-4 w-4 text-muted-foreground" />
                    )}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  {provider.has_api_key 
                    ? 'Оставьте пустым, чтобы сохранить текущий ключ'
                    : 'Получить ключ можно на сайте провайдера'}
                </p>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor={`model-${key}`}>Модель</Label>
                <Input
                  id={`model-${key}`}
                  placeholder={providerInfo[key]?.models[0] || 'Выберите модель'}
                  value={formData[key]?.model || ''}
                  onChange={(e) => {
                    setFormData(prev => ({
                      ...prev,
                      [key]: { ...prev[key], model: e.target.value }
                    }))
                  }}
                  list={`models-${key}`}
                />
                <datalist id={`models-${key}`}>
                  {providerInfo[key]?.models.map((model) => (
                    <option key={model} value={model} />
                  ))}
                </datalist>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <div className="text-sm text-muted-foreground">
                Поддерживаемые типпы контента: {provider.content_types?.join(', ') || '—'}
              </div>
              <Button
                size="sm"
                onClick={() => handleSave(key)}
                disabled={saving === key}
              >
                {saving === key ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-2 h-4 w-4" />
                )}
                Сохранить
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}

      {Object.keys(providers).length === 0 && (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground">
              AI провайдеры не найдены
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
