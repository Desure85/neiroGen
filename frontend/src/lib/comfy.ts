"use client"

import { apiFetch } from '@/lib/api'

export type ComfyPreset = {
  id: number
  name: string
  description?: string | null
  graph: any
  defaults?: Record<string, any> | null
  enabled: boolean
  created_at?: string
  updated_at?: string
}

export async function listComfyPresets(): Promise<ComfyPreset[]> {
  const res = await apiFetch('/api/comfy-presets?per_page=100')
  const data = await res.json()
  // API returns pagination or array; normalize
  return Array.isArray(data?.data) ? data.data : (Array.isArray(data) ? data : [])
}

export async function createComfyPreset(input: Partial<ComfyPreset>): Promise<ComfyPreset> {
  const res = await apiFetch('/api/comfy-presets', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
  if (!res.ok) {
    try {
      const body = await res.json()
      throw new Error((body?.message || body?.error) ? `HTTP ${res.status}: ${body.message || body.error}` : `HTTP ${res.status}`)
    } catch {
      throw new Error(`HTTP ${res.status}`)
    }
  }
  return res.json()
}

export async function updateComfyPreset(id: number, input: Partial<ComfyPreset>): Promise<ComfyPreset> {
  const res = await apiFetch(`/api/comfy-presets/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
  if (!res.ok) {
    try {
      const body = await res.json()
      throw new Error((body?.message || body?.error) ? `HTTP ${res.status}: ${body.message || body.error}` : `HTTP ${res.status}`)
    } catch {
      throw new Error(`HTTP ${res.status}`)
    }
  }
  return res.json()
}

export async function deleteComfyPreset(id: number): Promise<void> {
  const res = await apiFetch(`/api/comfy-presets/${id}`, {
    method: 'DELETE',
  })
  if (!res.ok) {
    try {
      const body = await res.json()
      throw new Error((body?.message || body?.error) ? `HTTP ${res.status}: ${body.message || body.error}` : `HTTP ${res.status}`)
    } catch {
      throw new Error(`HTTP ${res.status}`)
    }
  }
}

export async function generateWithPreset(presetId: number, vars: Record<string, any>) {
  const res = await apiFetch(`/api/comfy/generate/${presetId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ vars }),
  })
  if (!res.ok) {
    try {
      const body = await res.json()
      throw new Error((body?.message || body?.error) ? `HTTP ${res.status}: ${body.message || body.error}` : `HTTP ${res.status}`)
    } catch {
      throw new Error(`HTTP ${res.status}`)
    }
  }
  return res.json()
}
