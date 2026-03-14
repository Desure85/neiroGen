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

// AI Prompt types for exercise types
export interface ExerciseTypePrompt {
  instructions: string
  content: string
  solution: string
  variations: string
}

export interface ExerciseTypePromptTypes {
  [key: string]: {
    name: string
    description: string
    placeholder: string
  }
}

export interface ExerciseTypePromptsResponse {
  ok: boolean
  prompts: ExerciseTypePrompt
  types: ExerciseTypePromptTypes
}

export async function fetchExerciseTypePrompts(
  exerciseTypeId: number | string,
): Promise<ExerciseTypePromptsResponse> {
  const response = await apiFetch(`/api/admin/exercise-types/${exerciseTypeId}/prompts`)
  
  if (!response.ok) {
    throw new Error(`Не удалось загрузить промпты (${response.status})`)
  }
  
  return response.json()
}

export async function updateExerciseTypePrompts(
  exerciseTypeId: number | string,
  prompts: ExerciseTypePrompt,
): Promise<ExerciseTypePromptsResponse> {
  const response = await apiFetch(`/api/admin/exercise-types/${exerciseTypeId}/prompts`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompts }),
  })
  
  if (!response.ok) {
    const body = await response.json().catch(() => null)
    throw new Error(body?.message || `Не удалось сохранить промпты (${response.status})`)
  }
  
  return response.json()
}

// ==================== Gamification Types ====================

export interface GamificationStats {
  xp: number
  level: number
  xp_progress: number
  xp_to_next_level: number
  streak_days: number
  total_exercises_completed: number
  total_time_spent: number
  total_time_spent_formatted: string
  achievements: string[]
  rewards: unknown[]
  avatar_theme: string
}

export interface Achievement {
  id: string
  name: string
  description: string
  icon: string
  xp_reward: number
  unlocked: boolean
  progress: number
  requirement: number
  condition: string
}

export interface AchievementsResponse {
  achievements: Achievement[]
  unlocked_count: number
  total_count: number
}

export interface CompleteExerciseResponse {
  xp_earned: number
  total_xp: number
  level: number
  streak_days: number
  total_exercises: number
  leveled_up: boolean
  xp_progress: number
  stats: GamificationStats
  new_achievements: Achievement[]
}

// ==================== Gamification API ====================

export async function fetchChildGamification(
  childId: number | string
): Promise<GamificationStats> {
  const response = await apiFetch(`/api/children/${childId}/gamification`)
  
  if (!response.ok) {
    throw new Error(`Не удалось загрузить статистику (${response.status})`)
  }
  
  return response.json()
}

export async function fetchChildAchievements(
  childId: number | string
): Promise<AchievementsResponse> {
  const response = await apiFetch(`/api/children/${childId}/achievements`)
  
  if (!response.ok) {
    throw new Error(`Не удалось загрузить достижения (${response.status})`)
  }
  
  return response.json()
}

export async function completeExercise(
  childId: number | string,
  timeSpent: number = 0
): Promise<CompleteExerciseResponse> {
  const response = await apiFetch(`/api/children/${childId}/complete-exercise`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ time_spent: timeSpent }),
  })
  
  if (!response.ok) {
    throw new Error(`Не удалось сохранить результат (${response.status})`)
  }
  
  return response.json()
}

export async function updateChildAvatarTheme(
  childId: number | string,
  theme: string
): Promise<{ ok: boolean; avatar_theme: string }> {
  const response = await apiFetch(`/api/children/${childId}/avatar-theme`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ theme }),
  })
  
  if (!response.ok) {
    throw new Error(`Не удалось обновить тему (${response.status})`)
  }
  
  return response.json()
}

// ==================== Exercise Type Delivery Types ====================

export type DeliveryType = 'online' | 'printable'

export interface DeliveryTypesResponse {
  ok: boolean
  delivery_types: DeliveryType[]
  options: Record<DeliveryType, { name: string; description: string; icon: string }>
}

export async function fetchExerciseTypeDeliveryTypes(
  exerciseTypeId: number | string
): Promise<DeliveryTypesResponse> {
  const response = await apiFetch(`/api/admin/exercise-types/${exerciseTypeId}/delivery-types`)
  
  if (!response.ok) {
    throw new Error(`Не удалось загрузить типы выполнения (${response.status})`)
  }
  
  return response.json()
}

export async function updateExerciseTypeDeliveryTypes(
  exerciseTypeId: number | string,
  deliveryTypes: DeliveryType[]
): Promise<DeliveryTypesResponse> {
  const response = await apiFetch(`/api/admin/exercise-types/${exerciseTypeId}/delivery-types`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ delivery_types: deliveryTypes }),
  })
  
  if (!response.ok) {
    throw new Error(`Не удалось обновить типы выполнения (${response.status})`)
  }
  
  return response.json()
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

  if (res.status === 401 || res.status === 419) {
    return null
  }

  if (!res.ok) {
    const body = await res.json().catch(() => null)
    const message = body?.message || `HTTP ${res.status}`
    throw new Error(message)
  }

  return res.json()
}

// ==================== Worksheet Share & PDF API ====================

export interface ShareLinkResponse {
  share_token: string
  share_url: string
  expires_at: string | null
}

export interface WorksheetShareData {
  id: number
  title: string
  share_token: string | null
  share_expires_at: string | null
  pdf_path: string | null
  items_count: number
}

/**
 * Generate a share link for parent to access printable worksheet.
 */
export async function generateWorksheetShareLink(
  worksheetId: number | string,
  daysValid: number = 30
): Promise<ShareLinkResponse> {
  const response = await apiFetch(`/api/worksheets/${worksheetId}/share`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ days: daysValid }),
  })
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({}))
    throw new Error(error.message || `Не удалось создать ссылку (${response.status})`)
  }
  
  return response.json()
}

/**
 * Invalidate a worksheet share link.
 */
export async function invalidateWorksheetShareLink(
  worksheetId: number | string
): Promise<{ message: string }> {
  const response = await apiFetch(`/api/worksheets/${worksheetId}/share`, {
    method: 'DELETE',
  })
  
  if (!response.ok) {
    throw new Error(`Не удалось удалить ссылку (${response.status})`)
  }
  
  return response.json()
}

/**
 * Generate PDF for a worksheet.
 */
export async function generateWorksheetPdf(
  worksheetId: number | string
): Promise<{ url: string; format: string; copies: number }> {
  const response = await apiFetch(`/api/worksheets/${worksheetId}/pdf`, {
    method: 'POST',
  })
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({}))
    throw new Error(error.message || `Не удалось сгенерировать PDF (${response.status})`)
  }
  
  return response.json()
}

/**
 * Get worksheet by share token (public access).
 */
export async function getWorksheetByShareToken(
  token: string
): Promise<WorksheetShareData> {
  const response = await apiFetch(`/api/worksheets/share/${token}`)
  
  if (!response.ok) {
    throw new Error(`Worksheet not found (${response.status})`)
  }
  
  return response.json()
}

/**
 * Upload completed worksheet photo (public access via token).
 */
export async function uploadCompletedWorksheet(
  token: string,
  photoFile: File,
  notes?: string
): Promise<{ message: string; photo_url: string }> {
  const formData = new FormData()
  formData.append('photo', photoFile)
  if (notes) {
    formData.append('notes', notes)
  }
  
  const response = await apiFetch(`/api/worksheets/share/${token}/upload`, {
    method: 'POST',
    body: formData,
  })
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({}))
    throw new Error(error.message || `Не удалось загрузить работу (${response.status})`)
  }
  
  return response.json()
}
