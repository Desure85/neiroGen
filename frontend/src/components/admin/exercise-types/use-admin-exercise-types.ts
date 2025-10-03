"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import {
  fetchAdminExerciseTypes,
  updateExerciseType,
  type AdminExerciseTypeListItem,
  type AdminExerciseTypeListResponse,
} from "@/lib/api"

type ToastFunction = ReturnType<typeof import("@/components/ui/use-toast").useToast>["toast"]

type UseAdminExerciseTypesParams = {
  toast?: ToastFunction
}

type ReloadOptions = {
  silent?: boolean
}

type UseAdminExerciseTypesResult = {
  items: AdminExerciseTypeListItem[]
  meta: AdminExerciseTypeListResponse["meta"]
  loading: boolean
  error: string | null
  search: string
  setSearch: (value: string) => void
  showInactive: boolean
  setShowInactive: (value: boolean) => void
  updatingId: number | null
  toggleActive: (item: AdminExerciseTypeListItem) => Promise<void>
  reload: (options?: ReloadOptions) => Promise<void>
}

export function useAdminExerciseTypes({ toast }: UseAdminExerciseTypesParams = {}): UseAdminExerciseTypesResult {
  const [items, setItems] = useState<AdminExerciseTypeListItem[]>([])
  const [meta, setMeta] = useState<AdminExerciseTypeListResponse["meta"]>()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const [showInactive, setShowInactive] = useState(false)
  const [updatingId, setUpdatingId] = useState<number | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)

  const loadItems = useCallback(
    async ({ silent }: ReloadOptions = {}) => {
      abortControllerRef.current?.abort()
      const controller = new AbortController()
      abortControllerRef.current = controller

      if (!silent) {
        setLoading(true)
      }

      try {
        setError(null)
        const response = await fetchAdminExerciseTypes({
          showInactive,
          signal: controller.signal,
        })

        if (controller.signal.aborted) {
          return
        }

        setItems(response.data)
        setMeta(response.meta)
      } catch (err) {
        if (controller.signal.aborted) {
          return
        }

        const message = err instanceof Error ? err.message : "Не удалось загрузить типы упражнений"
        setError(message)
        toast?.({
          title: "Ошибка загрузки",
          description: message,
          variant: "destructive",
        })
      } finally {
        abortControllerRef.current = null
        if (!controller.signal.aborted && !silent) {
          setLoading(false)
        }
      }
    },
    [showInactive, toast],
  )

  useEffect(() => {
    void loadItems()

    return () => {
      abortControllerRef.current?.abort()
    }
  }, [loadItems])

  const toggleActive = useCallback(
    async (item: AdminExerciseTypeListItem) => {
      setUpdatingId(item.id)

      try {
        const updated = await updateExerciseType(item.id, { is_active: !item.is_active })
        const { fields, ...rest } = updated
        const nextItem: AdminExerciseTypeListItem = {
          ...item,
          ...rest,
          fields_count: fields?.length ?? item.fields_count,
          exercises_count: updated.exercises_count ?? item.exercises_count,
        }

        setItems((prev) => {
          const next = prev.map((existing) => (existing.id === item.id ? nextItem : existing))
          if (!showInactive && !nextItem.is_active) {
            return next.filter((existing) => existing.id !== item.id)
          }
          return next
        })

        setMeta((prev) => {
          if (!prev || typeof prev.total !== "number") {
            return prev
          }
          if (!showInactive && !nextItem.is_active) {
            return { ...prev, total: Math.max(0, prev.total - 1) }
          }
          return prev
        })

        setError(null)
        toast?.({
          title: nextItem.is_active ? "Тип активирован" : "Тип скрыт",
          description: `Тип «${nextItem.name}» теперь ${nextItem.is_active ? "доступен" : "скрыт"}.`,
        })
      } catch (err) {
        const message = err instanceof Error ? err.message : "Не удалось изменить статус"
        setError(message)
        toast?.({
          title: "Ошибка",
          description: message,
          variant: "destructive",
        })
      } finally {
        setUpdatingId(null)
      }
    },
    [showInactive, toast],
  )

  const reload = useCallback(
    async (options?: ReloadOptions) => {
      await loadItems(options)
    },
    [loadItems],
  )

  return {
    items,
    meta,
    loading,
    error,
    search,
    setSearch,
    showInactive,
    setShowInactive,
    updatingId,
    toggleActive,
    reload,
  }
}
