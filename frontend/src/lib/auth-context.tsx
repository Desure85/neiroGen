"use client"

import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react"
import { getMe } from "@/lib/api"

type AppUser = {
  id: number
  name: string
  email: string
  role?: string | null
  [key: string]: any
}

type AuthContextValue = {
  user: AppUser | null
  loading: boolean
  initialized: boolean
  error: string | null
  refresh: () => Promise<void>
  setUser: (user: AppUser | null) => void
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUserState] = useState<AppUser | null>(null)
  const [initialized, setInitialized] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const mountedRef = useRef(true)
  const refreshingRef = useRef(false)

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
    }
  }, [])

  const applyUser = useCallback((value: AppUser | null) => {
    if (!mountedRef.current) return
    setUserState(value)
    setInitialized(true)
    setLoading(false)
  }, [])

  const refresh = useCallback(async () => {
    if (refreshingRef.current) return
    refreshingRef.current = true

    if (!initialized) {
      setLoading(true)
    }
    setError(null)

    try {
      const data = await getMe()
      if (data) {
        applyUser(data)
      } else {
        applyUser(null)
      }
    } catch (err: any) {
      if (!mountedRef.current) return

      if (err?.message === "Unauthorized") {
        applyUser(null)
      } else {
        console.error("Auth refresh failed", err)
        setError(err?.message ?? "Не удалось получить данные пользователя")
        setInitialized(true)
        setLoading(false)
      }
    } finally {
      refreshingRef.current = false
      if (mountedRef.current) {
        setInitialized(true)
        setLoading(false)
      }
    }
  }, [initialized, applyUser])

  useEffect(() => {
    refresh()
  }, [refresh])

  useEffect(() => {
    if (typeof window !== "undefined") {
      ;(window as any).__auth_debug = { user, loading, initialized, error }
    }
  }, [user, loading, initialized, error])

  const value = useMemo<AuthContextValue>(() => ({
    user,
    loading,
    initialized,
    error,
    refresh,
    setUser: applyUser,
  }), [user, loading, initialized, error, refresh, applyUser])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return ctx
}
