"use client"

import React, { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"

type ProtectedRouteProps = {
  children: React.ReactNode
  allowedRoles?: string[]
  redirectTo?: string
  unauthorizedRedirectTo?: string
}

const defaultRedirect = "/login"
const defaultUnauthorizedRedirect = "/therapist"

export default function ProtectedRoute({
  children,
  allowedRoles,
  redirectTo = defaultRedirect,
  unauthorizedRedirectTo = defaultUnauthorizedRedirect,
}: ProtectedRouteProps) {
  const router = useRouter()
  const { user, loading, initialized } = useAuth()

  useEffect(() => {
    if (!initialized) return

    if (!user) {
      router.replace(redirectTo)
      return
    }

    if (allowedRoles && allowedRoles.length > 0) {
      const role = user.role ?? ""
      if (!allowedRoles.includes(role)) {
        router.replace(unauthorizedRedirectTo)
      }
    }
  }, [initialized, user, allowedRoles, redirectTo, unauthorizedRedirectTo, router])

  if (!initialized) {
    return (
      <div className="w-full py-12 text-center text-sm text-muted-foreground">
        Загружаем ваш профиль…
      </div>
    )
  }

  if (!user) {
    return null
  }

  if (allowedRoles && allowedRoles.length > 0) {
    const role = user.role ?? ""
    if (!allowedRoles.includes(role)) {
      return null
    }
  }

  return <>{children}</>
}
