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

export interface ExerciseTypeFieldDto {
  id: number
  key: string
  label: string
  field_type: string
  is_required: boolean
  default_value?: unknown
  options?: unknown
  help_text?: string | null
  min_value?: number | null
  max_value?: number | null
  step?: number | null
  display_order: number
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
  fields?: ExerciseTypeFieldDto[]
}

export interface AdminExerciseTypeListItem extends ExerciseTypeDto {
  fields_count?: number
  exercises_count?: number
  updated_at?: string | null
  created_at?: string | null
}

export interface AdminExerciseTypeListResponse {
  data: AdminExerciseTypeListItem[]
  meta?: {
    total?: number
  }
}

export interface AdminExerciseTypeDetailDto extends ExerciseTypeDto {
  fields: ExerciseTypeFieldDto[]
  meta?: Record<string, unknown> | null
  exercises_count?: number
  updated_at?: string | null
  created_at?: string | null
}

export interface UpdateExerciseTypePayload {
  name?: string
  key?: string
  domain?: string | null
  icon?: string | null
  description?: string | null
  display_order?: number
  is_active?: boolean
  meta?: Record<string, unknown> | null
}

export interface CreateExerciseTypePayload {
  name: string
  key: string
  domain?: string | null
  icon?: string | null
  description?: string | null
  display_order?: number
  is_active?: boolean
  meta?: Record<string, unknown> | null
}

export async function fetchAdminExerciseTypes(params?: {
  search?: string
  domain?: string
  showInactive?: boolean
  signal?: AbortSignal
}): Promise<AdminExerciseTypeListResponse> {
  const query = new URLSearchParams()

  if (params?.search) {
    query.set('search', params.search)
  }

  if (params?.domain) {
    query.set('domain', params.domain)
  }

  if (params?.showInactive) {
    query.set('show_inactive', '1')
  }

  const queryString = query.toString()
  const url = `/api/admin/exercise-types${queryString ? `?${queryString}` : ''}`

  const response = await apiFetch(url, { signal: params?.signal })
  if (!response.ok) {
    throw new Error(`Не удалось загрузить типы упражнений (${response.status})`)
  }

  const body = await response.json()
  return {
    data: Array.isArray(body?.data) ? (body.data as AdminExerciseTypeListItem[]) : [],
    meta: body?.meta,
  }
}

export async function updateExerciseType(
  id: number | string,
  payload: UpdateExerciseTypePayload,
  options?: { signal?: AbortSignal },
): Promise<AdminExerciseTypeDetailDto> {
  const response = await apiFetch(`/api/admin/exercise-types/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    signal: options?.signal,
  })

  if (!response.ok) {
    const body = await response.json().catch(() => null)
    throw new Error(body?.message || `Не удалось обновить тип упражнения (${response.status})`)
  }

  const body = await response.json().catch(() => null)
  const data = (body?.data ?? body) as AdminExerciseTypeDetailDto | null

  if (!data) {
    throw new Error('Пустой ответ от сервера при обновлении типа упражнения')
  }

  return data
}

export async function deleteExerciseType(id: number | string, options?: { signal?: AbortSignal }): Promise<void> {
  const response = await apiFetch(`/api/admin/exercise-types/${id}`, {
    method: 'DELETE',
    signal: options?.signal,
  })

  if (response.status === 409) {
    const body = await response.json().catch(() => null)
    throw new Error(body?.message || 'Нельзя удалить тип упражнения, пока к нему привязаны упражнения')
  }

  if (!response.ok && response.status !== 204) {
    const body = await response.json().catch(() => null)
    throw new Error(body?.message || `Не удалось удалить тип упражнения (${response.status})`)
  }
}

export async function createExerciseType(
  payload: CreateExerciseTypePayload,
  options?: { signal?: AbortSignal },
): Promise<AdminExerciseTypeDetailDto> {
  const response = await apiFetch('/api/admin/exercise-types', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    signal: options?.signal,
  })

  if (!response.ok) {
    const body = await response.json().catch(() => null)
    throw new Error(body?.message || `Не удалось создать тип упражнения (${response.status})`)
  }

  const body = await response.json().catch(() => null)
  const data = (body?.data ?? body) as AdminExerciseTypeDetailDto | null

  if (!data) {
    throw new Error('Пустой ответ от сервера при создании типа упражнения')
  }

  return data
}

export async function fetchAdminExerciseTypeDetail(
  id: number | string,
  options?: { signal?: AbortSignal },
): Promise<AdminExerciseTypeDetailDto> {
  const response = await apiFetch(`/api/admin/exercise-types/${id}`, {
    method: 'GET',
    signal: options?.signal,
  })

  if (response.status === 404) {
    throw new Error('not_found')
  }

  if (!response.ok) {
    const body = await response.json().catch(() => null)
    throw new Error(body?.message || `Не удалось загрузить тип упражнения (${response.status})`)
  }

  const body = await response.json().catch(() => null)
  const data = (body?.data ?? body) as AdminExerciseTypeDetailDto | null

  if (!data) {
    throw new Error('Пустой ответ от сервера при загрузке типа упражнения')
  }

  return data
}

export interface CreateExerciseTypeFieldPayload {
  label: string
  key: string
  field_type: string
  is_required?: boolean
  default_value?: unknown
  min_value?: number | null
  max_value?: number | null
  step?: number | null
  options?: unknown
  help_text?: string | null
}

export async function createExerciseTypeField(
  exerciseTypeId: number | string,
  payload: CreateExerciseTypeFieldPayload,
  options?: { signal?: AbortSignal },
): Promise<ExerciseTypeFieldDto> {
  const response = await apiFetch(`/api/admin/exercise-types/${exerciseTypeId}/fields`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    signal: options?.signal,
  })

  if (!response.ok) {
    const body = await response.json().catch(() => null)
    throw new Error(body?.message || `Не удалось создать поле (${response.status})`)
  }

  const body = await response.json().catch(() => null)
  const data = (body?.data ?? body) as ExerciseTypeFieldDto | null

  if (!data) {
    throw new Error('Пустой ответ от сервера при создании поля')
  }

  return data
}

export async function deleteExerciseTypeField(
  exerciseTypeId: number | string,
  fieldId: number | string,
  options?: { signal?: AbortSignal },
): Promise<void> {
  const response = await apiFetch(`/api/admin/exercise-types/${exerciseTypeId}/fields/${fieldId}`, {
    method: 'DELETE',
    signal: options?.signal,
  })

  if (!response.ok && response.status !== 204) {
    const body = await response.json().catch(() => null)
    throw new Error(body?.message || `Не удалось удалить поле (${response.status})`)
  }
}

export interface UpdateExerciseTypeFieldPayload {
  label?: string
  key?: string
  field_type?: string
  is_required?: boolean
  default_value?: unknown
  min_value?: number | null
  max_value?: number | null
  step?: number | null
  options?: unknown
  help_text?: string | null
  display_order?: number | null
}

export async function updateExerciseTypeField(
  exerciseTypeId: number | string,
  fieldId: number | string,
  payload: UpdateExerciseTypeFieldPayload,
  options?: { signal?: AbortSignal },
): Promise<ExerciseTypeFieldDto> {
  const response = await apiFetch(`/api/admin/exercise-types/${exerciseTypeId}/fields/${fieldId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    signal: options?.signal,
  })

  if (!response.ok) {
    const body = await response.json().catch(() => null)
    throw new Error(body?.message || `Не удалось обновить поле (${response.status})`)
  }

  const body = await response.json().catch(() => null)
  const data = (body?.data ?? body) as ExerciseTypeFieldDto | null

  if (!data) {
    throw new Error('Пустой ответ от сервера при обновлении поля')
  }

  return data
}

export async function reorderExerciseTypeFields(
  exerciseTypeId: number | string,
  order: Array<number | string>,
  options?: { signal?: AbortSignal },
): Promise<void> {
  const response = await apiFetch(`/api/admin/exercise-types/${exerciseTypeId}/fields/reorder`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ order }),
    signal: options?.signal,
  })

  if (!response.ok && response.status !== 204) {
    const body = await response.json().catch(() => null)
    throw new Error(body?.message || `Не удалось изменить порядок полей (${response.status})`)
  }
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
