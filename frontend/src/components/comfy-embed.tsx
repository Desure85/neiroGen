"use client"

import React from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { API_BASE, getToken, apiFetch } from '@/lib/api'


async function fetchHealth() {
  try {
    const res = await apiFetch('/api/integration/comfy/health')
    return await res.json()
  } catch {
    return { ok: false }
  }
}

export function ComfyEmbed() {
  const [status, setStatus] = React.useState<{ ok: boolean; url?: string; status?: number; error?: string } | null>(null)
  const [loading, setLoading] = React.useState(true)
  const publicUrl = (process.env.NEXT_PUBLIC_COMFY_URL as string) || (typeof window !== 'undefined' ? `${window.location.protocol}//${window.location.hostname}:8188` : 'http://localhost:8188')

  React.useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const data = await fetchHealth()
        if (mounted) setStatus(data)
      } catch (e: any) {
        if (mounted) setStatus({ ok: false, error: e?.message || 'Unknown error' })
      } finally {
        if (mounted) setLoading(false)
      }
    })()
    return () => {
      mounted = false
    }
  }, [])

  return (
    <Card className="bg-card border border-border">
      <CardHeader>
        <CardTitle>ComfyUI</CardTitle>
        <CardDescription>
          {loading ? 'Проверка подключения…' : status?.ok ? 'Подключено' : 'Не подключено'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!loading && status?.ok ? (
          <div className="space-y-3">
            <div className="text-sm text-muted-foreground">Сервис подключен</div>
            <div className="flex items-center justify-between gap-4">
              <div className="text-sm break-all">URL: {publicUrl}</div>
              <a className="text-sm underline" href={publicUrl} target="_blank" rel="noreferrer">
                Открыть UI в новой вкладке
              </a>
            </div>
          </div>
        ) : (
          <div className="text-sm text-muted-foreground">
            {loading ? 'Загрузка…' : 'Сервис ComfyUI не подключен или недоступен.'}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
