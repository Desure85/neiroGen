"use client"

import { useState, useEffect } from "react"
import { fetchExerciseTypeDeliveryTypes, updateExerciseTypeDeliveryTypes, type DeliveryType } from "@/lib/api"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { useToast } from "@/components/ui/use-toast"

interface DeliveryTypesEditorProps {
  exerciseTypeId: number | string
}

export function DeliveryTypesEditor({ exerciseTypeId }: DeliveryTypesEditorProps) {
  const [deliveryTypes, setDeliveryTypes] = useState<DeliveryType[]>([])
  const [options, setOptions] = useState<Record<DeliveryType, { name: string; description: string; icon: string }>>({} as any)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    async function loadDeliveryTypes() {
      try {
        const data = await fetchExerciseTypeDeliveryTypes(exerciseTypeId)
        setDeliveryTypes(data.delivery_types)
        setOptions(data.options)
      } catch (error) {
        console.error("Failed to load delivery types:", error)
        toast({
          variant: "destructive",
          title: "Ошибка",
          description: "Не удалось загрузить типы выполнения",
        })
      } finally {
        setLoading(false)
      }
    }
    loadDeliveryTypes()
  }, [exerciseTypeId])

  const handleToggle = async (type: DeliveryType) => {
    const newTypes = deliveryTypes.includes(type)
      ? deliveryTypes.filter(t => t !== type)
      : [...deliveryTypes, type]
    
    // Must have at least one type
    if (newTypes.length === 0) {
      toast({
        variant: "destructive",
        title: "Ошибка",
        description: "Должен быть выбран хотя бы один тип выполнения",
      })
      return
    }

    setSaving(true)
    try {
      const result = await updateExerciseTypeDeliveryTypes(exerciseTypeId, newTypes)
      setDeliveryTypes(result.delivery_types)
      toast({
        title: "Сохранено",
        description: "Типы выполнения обновлены",
      })
    } catch (error) {
      console.error("Failed to save delivery types:", error)
      toast({
        variant: "destructive",
        title: "Ошибка",
        description: "Не удалось сохранить типы выполнения",
      })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Типы выполнения</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-3">
            <div className="h-12 bg-muted rounded"></div>
            <div className="h-12 bg-muted rounded"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Типы выполнения</CardTitle>
        <CardDescription>
          Выберите, как ребёнок может выполнять упражнения этого типа
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {Object.entries(options).map(([type, info]) => (
          <div
            key={type}
            className={`flex items-center space-x-4 p-4 rounded-lg border transition-colors ${
              deliveryTypes.includes(type as DeliveryType)
                ? "border-primary bg-primary/5"
                : "border-border hover:border-muted-foreground"
            }`}
          >
            <Checkbox
              id={type}
              checked={deliveryTypes.includes(type as DeliveryType)}
              onCheckedChange={() => handleToggle(type as DeliveryType)}
              disabled={saving}
            />
            <label
              htmlFor={type}
              className="flex-1 cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <span className="text-2xl">{info.icon}</span>
                <div>
                  <div className="font-medium">{info.name}</div>
                  <div className="text-sm text-muted-foreground">{info.description}</div>
                </div>
              </div>
            </label>
            {deliveryTypes.includes(type as DeliveryType) && (
              <span className="text-xs text-primary font-medium">Активно</span>
            )}
          </div>
        ))}

        <div className="mt-4 p-3 bg-muted rounded-lg text-sm">
          <strong>Подсказка:</strong>
          <ul className="mt-1 space-y-1 text-muted-foreground">
            <li>• <strong>Онлайн</strong> — ребёнок выполняет задание прямо в приложении</li>
            <li>• <strong>Печать</strong> — задание можно распечатать, ребёнок выполняет на бумаге</li>
            <li>• Выберите оба варианта, чтобы дать родителю выбор</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  )
}
