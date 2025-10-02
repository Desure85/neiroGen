"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { apiFetch } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

interface ExerciseTypeListItem {
  id: number
  key: string
  name: string
  domain: string | null
  icon?: string | null
  description?: string | null
  is_active: boolean
  display_order: number
  fields_count?: number
  exercises_count?: number
  updated_at?: string | null
}

interface ExerciseTypeListResponse {
  data: ExerciseTypeListItem[]
  meta?: {
    total?: number
  }
}

export default function ExerciseTypesPage() {
  const [items, setItems] = useState<ExerciseTypeListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const [showInactive, setShowInactive] = useState(false)

  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        setLoading(true)
        setError(null)
        const res = await apiFetch("/api/admin/exercise-types")
        if (!res.ok) {
          throw new Error(`Ошибка загрузки (${res.status})`)
        }
        const payload: ExerciseTypeListResponse = await res.json()
        if (mounted) {
          setItems(payload.data ?? [])
        }
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err.message : "Не удалось загрузить типы упражнений")
        }
      } finally {
        if (mounted) {
          setLoading(false)
        }
      }
    })()
    return () => {
      mounted = false
    }
  }, [])

  const filteredItems = useMemo(() => {
    const q = search.trim().toLowerCase()
    return (items ?? [])
      .filter((item) => (showInactive ? true : item.is_active))
      .filter((item) =>
        !q
          ? true
          : [item.name, item.key, item.domain ?? "", item.description ?? ""]
              .join(" ")
              .toLowerCase()
              .includes(q),
      )
      .sort((a, b) => a.display_order - b.display_order || a.name.localeCompare(b.name))
  }, [items, search, showInactive])

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Типы упражнений</h2>
          <p className="text-sm text-muted-foreground">
            Управляйте справочником типов и их схемой полей. Всего: {items.length}
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <input
              id="show-inactive"
              type="checkbox"
              className="h-4 w-4"
              checked={showInactive}
              onChange={(e) => setShowInactive(e.target.checked)}
            />
            <label htmlFor="show-inactive">Показывать неактивные</label>
          </div>
          <Button asChild>
            <Link href="/admin/exercise-types/new">Создать тип</Link>
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader className="gap-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle>Справочник типов</CardTitle>
              <CardDescription>
                Список доступных типов упражнений и связанных параметров. Клик по строке откроет подробную карточку.
              </CardDescription>
            </div>
            <div className="flex w-full max-w-sm items-center gap-2" role="search">
              <Input
                placeholder="Поиск по имени, ключу или описанию"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, idx) => (
                <Skeleton key={idx} className="h-16 w-full" />
              ))}
            </div>
          ) : error ? (
            <div className="rounded-md border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
              {error}
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="rounded-md border border-border/60 bg-muted/30 p-6 text-sm text-muted-foreground">
              Результатов нет. Попробуйте изменить фильтр или создать новый тип.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] table-fixed border-collapse">
                <thead>
                  <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                    <th className="px-3 py-2">Название</th>
                    <th className="px-3 py-2">Ключ</th>
                    <th className="px-3 py-2">Домен</th>
                    <th className="px-3 py-2">Поля</th>
                    <th className="px-3 py-2">Упражнений</th>
                    <th className="px-3 py-2">Обновлено</th>
                    <th className="px-3 py-2 text-right">Действия</th>
                  </tr>
                </thead>
                <tbody className="text-sm">
                  {filteredItems.map((item) => (
                    <tr key={item.id} className="border-b border-border/60 last:border-b-0 hover:bg-muted/30">
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{item.icon ?? "📄"}</span>
                          <div>
                            <div className="font-medium text-foreground">{item.name}</div>
                            {item.description && (
                              <div className="text-xs text-muted-foreground line-clamp-1">{item.description}</div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3 font-mono text-xs text-muted-foreground">{item.key}</td>
                      <td className="px-3 py-3">
                        <Badge variant="secondary">{item.domain || "—"}</Badge>
                      </td>
                      <td className="px-3 py-3 text-muted-foreground">
                        {item.fields_count ?? 0}
                      </td>
                      <td className="px-3 py-3 text-muted-foreground">
                        {item.exercises_count ?? 0}
                      </td>
                      <td className="px-3 py-3 text-xs text-muted-foreground">
                        {item.updated_at ? new Date(item.updated_at).toLocaleString() : "—"}
                      </td>
                      <td className="px-3 py-3 text-right">
                        <div className="inline-flex items-center gap-2">
                          <Badge variant={item.is_active ? "success" : "outline"}>
                            {item.is_active ? "активен" : "скрыт"}
                          </Badge>
                          <Button asChild variant="outline" size="sm">
                            <Link href={`/admin/exercise-types/${item.id}`}>Открыть</Link>
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
