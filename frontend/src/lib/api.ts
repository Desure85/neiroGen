"use client"

const envApiBase = process.env.NEXT_PUBLIC_API_URL as string | undefined

function resolveApiBase(): string {
  if (typeof window === 'undefined') {
    return envApiBase || process.env.BACKEND_INTERNAL_URL || 'http://app:8000'
  }

  if (!envApiBase) {
    return ''
  }

  if (envApiBase.includes('app:8000')) {
    return ''
  }

  return envApiBase
}

export const API_BASE = resolveApiBase()

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS'])

function getXsrfToken(): string | null {
  if (typeof document === 'undefined') return null
  const tokenPair = document.cookie.split('; ').find((row) => row.startsWith('XSRF-TOKEN='))
  if (!tokenPair) return null
  try {
    return decodeURIComponent(tokenPair.split('=')[1])
  } catch (e) {
    console.warn('Failed to decode XSRF token', e)
    return null
  }
}

export async function ensureCsrfCookie(force = false) {
  if (typeof window === 'undefined') return
  if (!force && getXsrfToken()) return
  await fetch(`${API_BASE}/sanctum/csrf-cookie`, {
    credentials: 'include',
  })
}

export interface ExerciseTypeDto {
  id: number
  key: string
  name: string
  domain: string | null
  icon?: string | null
  description?: string | null
  is_active: boolean
  display_order: number
  fields?: Array<{
    id: number
    key: string
    label: string
    field_type: string
    is_required: boolean
    default_value?: unknown
    options?: unknown
    help_text?: string | null
    display_order: number
  }>
}

let cachedExerciseTypes: ExerciseTypeDto[] | null = null
let exerciseTypesPromise: Promise<ExerciseTypeDto[]> | null = null

export const fetchExerciseTypes = async (force = false): Promise<ExerciseTypeDto[]> => {
  if (!force && cachedExerciseTypes) {
    return cachedExerciseTypes
  }

  if (!force && exerciseTypesPromise) {
    return exerciseTypesPromise
  }

  exerciseTypesPromise = (async () => {
    const response = await apiFetch("/api/exercise-types")
    if (!response.ok) {
      throw new Error(`Не удалось загрузить типы упражнений (${response.status})`)
    }
    const body = await response.json()
    const items: ExerciseTypeDto[] = Array.isArray(body?.data)
      ? body.data
      : Array.isArray(body?.types)
        ? body.types
        : []
    cachedExerciseTypes = items
    exerciseTypesPromise = null
    return items
  })()

  try {
    const result = await exerciseTypesPromise
    exerciseTypesPromise = null
    return result
  } catch (err) {
    exerciseTypesPromise = null
    throw err
  }
}

export const apiFetch = async (input: RequestInfo, init?: RequestInit) => {
  const requestUrl = typeof input === 'string' ? input : input.url
  const resolvedUrl = requestUrl.startsWith('http')
    ? requestUrl
    : API_BASE
      ? `${API_BASE}${requestUrl.startsWith('/') ? requestUrl : `/${requestUrl}`}`
      : requestUrl.startsWith('/')
        ? requestUrl
        : `/${requestUrl}`

  const method = (init?.method || 'GET').toUpperCase()
  const headers = new Headers(init?.headers || {})

  if (!headers.has('Accept')) headers.set('Accept', 'application/json')
  if (!headers.has('X-Requested-With')) headers.set('X-Requested-With', 'XMLHttpRequest')

  if (!SAFE_METHODS.has(method) && typeof window !== 'undefined') {
    await ensureCsrfCookie()
    const token = getXsrfToken()
    if (token && !headers.has('X-XSRF-TOKEN')) headers.set('X-XSRF-TOKEN', token)
  }

  const response = await fetch(resolvedUrl, {
    ...init,
    method,
    headers,
    credentials: 'include',
    cache: 'no-store',
  })

  if (response.status === 419 && typeof window !== 'undefined') {
    await ensureCsrfCookie(true)
    throw new Error('CSRF token mismatch')
  }

  if (response.status === 401) {
    throw new Error('Unauthorized')
  }

  return response
}

export async function getMe() {
  const res = await apiFetch('/api/auth/me')
  if (!res.ok) throw new Error('HTTP ' + res.status)
  return res.json()
}
