"use client"

import React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { ThemeToggle } from '@/components/theme-toggle'
import { LangToggle } from '@/components/localization'
import { apiFetch, ensureCsrfCookie } from '@/lib/api'
import { useAuth } from '@/lib/auth-context'

export function Header() {
  const router = useRouter()
  const { user, loading, setUser } = useAuth()

  const logout = async () => {
    try {
      await ensureCsrfCookie()
      await apiFetch('/api/auth/logout', { method: 'POST' })
    } catch {}
    setUser(null)
    router.replace('/login')
  }

  return (
    <div className="bg-card border-b border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between py-4">
          <div className="flex items-center gap-4">
            <Link href="/therapist" className="font-semibold">NeiroGen</Link>
            <nav className="hidden md:flex items-center gap-3 text-sm text-muted-foreground">
              <Link href="/therapist" className="hover:text-foreground">Кабинет</Link>
              <Link href="/admin" className="hover:text-foreground">Админка</Link>
            </nav>
          </div>
          <div className="flex items-center gap-2">
            {loading ? null : user ? (
              <span className="text-sm text-muted-foreground whitespace-nowrap">{user.name} · {user.role}</span>
            ) : null}
            <LangToggle />
            <ThemeToggle />
            {loading ? null : user ? (
              <Button size="sm" variant="outline" onClick={logout} className="h-9">Выйти</Button>
            ) : (
              <Button size="sm" onClick={() => router.push('/login')} className="h-9">Войти</Button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
