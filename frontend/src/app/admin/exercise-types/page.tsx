"use client"

import Link from "next/link"
import { useMemo } from "react"

import { ListHeader } from "@/components/list-header"
import { SectionCard } from "@/components/section-card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { useAdminExerciseTypes } from "@/components/admin/exercise-types/use-admin-exercise-types"
import { useToast } from "@/components/ui/use-toast"
import type { AdminExerciseTypeListItem } from "@/lib/api"

export default function ExerciseTypesPage() {
  const { toast } = useToast()
  const {
    items,
    meta,
    search,
    setSearch,
    showInactive,
    setShowInactive,
    loading,
    error,
    updatingId,
    toggleActive,
    reload,
  } = useAdminExerciseTypes({ toast })

  const filteredItems = useMemo(() => {
    const q = search.trim().toLowerCase()
    return (items ?? [])
      .filter((item: AdminExerciseTypeListItem) => (showInactive ? true : item.is_active))
      .filter((item: AdminExerciseTypeListItem) =>
        !q
          ? true
          : [item.name, item.key, item.domain ?? "", item.description ?? ""]
              .join(" ")
              .toLowerCase()
              .includes(q),
      )
      .sort((a: AdminExerciseTypeListItem, b: AdminExerciseTypeListItem) =>
        a.display_order - b.display_order || a.name.localeCompare(b.name),
      )
  }, [items, search, showInactive])

  const totalCount = meta?.total ?? items.length

  return (
    <div className="space-y-6">
      <ListHeader
        title="Типы упражнений"
        description="Управляйте справочником типов и их схемой полей"
        meta={`Всего: ${totalCount}`}
        filters={
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <input
              id="show-inactive"
              type="checkbox"
              className="h-4 w-4"
              checked={showInactive}
              onChange={(event) => setShowInactive(event.target.checked)}
            />
            <label htmlFor="show-inactive">Показывать неактивные</label>
          </div>
        }
        actions={
          <Button asChild>
            <Link href="/admin/exercise-types/new">Создать тип</Link>
          </Button>
        }
        className="gap-3"
        direction="row"
      />

      <SectionCard
        title="Справочник типов"
        description="Список доступных типов упражнений и связанных параметров. Клик по строке откроет подробную карточку."
        actions={
          <div className="flex w-full max-w-sm items-center gap-2" role="search">
            <Input
              placeholder="Поиск по имени, ключу или описанию"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
            <Button type="button" variant="outline" onClick={() => reload({ silent: true })}>
              Обновить
            </Button>
          </div>
        }
        contentClassName="space-y-4"
      >
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={index} className="h-16 w-full" />
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
                {filteredItems.map((item: AdminExerciseTypeListItem) => (
                  <tr key={item.id} className="border-b border-border/60 last:border-b-0 hover:bg-muted/30">
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{item.icon ?? "📄"}</span>
                        <div>
                          <div className="font-medium text-foreground">{item.name}</div>
                          {item.description ? (
                            <div className="text-xs text-muted-foreground line-clamp-1">{item.description}</div>
                          ) : null}
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3 font-mono text-xs text-muted-foreground">{item.key}</td>
                    <td className="px-3 py-3">
                      <Badge variant="secondary">{item.domain || "—"}</Badge>
                    </td>
                    <td className="px-3 py-3 text-muted-foreground">{item.fields_count ?? 0}</td>
                    <td className="px-3 py-3 text-muted-foreground">{item.exercises_count ?? 0}</td>
                    <td className="px-3 py-3 text-xs text-muted-foreground">
                      {item.updated_at ? new Date(item.updated_at).toLocaleString() : "—"}
                    </td>
                    <td className="px-3 py-3 text-right">
                      <div className="inline-flex items-center gap-2">
                        <Badge
                          variant={item.is_active ? "secondary" : "outline"}
                          className={item.is_active ? "bg-emerald-100 text-emerald-900" : undefined}
                        >
                          {item.is_active ? "активен" : "скрыт"}
                        </Badge>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleActive(item)}
                          disabled={updatingId === item.id}
                        >
                          {updatingId === item.id ? "Обновляю..." : item.is_active ? "Скрыть" : "Показать"}
                        </Button>
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
      </SectionCard>
    </div>
  )
}
