import { apiFetch } from '@/lib/api'

export type ContentType = 'text' | 'image' | 'audio' | 'exercise'

export type AiProviderStatus = {
  name: string
  available: boolean
  content_types: string[]
  health: {
    status: string
    message?: string
  }
}

export type AiProviderConfig = {
  name: string
  available: boolean
  enabled: boolean
  model: string | null
  has_api_key: boolean
  content_types: string[]
  health: {
    status: string
    message?: string
  }
}

export interface AiGenerationResponse {
  ok: boolean
  content?: string
  error?: string
  model?: string
  provider?: string
  metadata?: Record<string, unknown>
}

export interface AiGenerationRequest {
  prompt: string
  content_type: ContentType
  parameters?: Record<string, unknown>
  model?: string
}

/**
 * Get AI providers health status (only enabled providers)
 */
export async function getAiHealth(): Promise<{ ok: boolean; providers: Record<string, AiProviderStatus> }> {
  const res = await apiFetch('/api/ai/health')
  if (!res.ok) {
    throw new Error(`Failed to fetch AI health: ${res.status}`)
  }
  return res.json()
}

/**
 * Get all available AI providers (including unconfigured ones)
 */
export async function getAiProviders(): Promise<{ ok: boolean; providers: Record<string, AiProviderConfig> }> {
  const res = await apiFetch('/api/ai/providers')
  if (!res.ok) {
    throw new Error(`Failed to fetch AI providers: ${res.status}`)
  }
  return res.json()
}

/**
 * Update AI provider settings
 */
export async function updateAiProvider(
  provider: string,
  data: {
    api_key?: string
    model?: string
    enabled?: boolean
    settings?: Record<string, unknown>
  }
): Promise<{ ok: boolean; message?: string; error?: string }> {
  const res = await apiFetch(`/api/ai/providers/${provider}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) {
    throw new Error(`Failed to update AI provider: ${res.status}`)
  }
  return res.json()
}

/**
 * Generate content using AI
 */
export async function generateWithAi(request: AiGenerationRequest): Promise<AiGenerationResponse> {
  const res = await apiFetch('/api/ai/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  })
  return res.json()
}

/**
 * Generate text content
 */
export async function generateText(
  prompt: string,
  parameters?: Record<string, unknown>,
  model?: string
): Promise<AiGenerationResponse> {
  const res = await apiFetch('/api/ai/text', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt, parameters, model }),
  })
  return res.json()
}

/**
 * Generate image content
 */
export async function generateImage(
  prompt: string,
  parameters?: Record<string, unknown>,
  model?: string
): Promise<AiGenerationResponse> {
  const res = await apiFetch('/api/ai/image', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt, parameters, model }),
  })
  return res.json()
}

/**
 * Generate exercise content
 */
export async function generateExercise(
  prompt: string,
  parameters?: Record<string, unknown>,
  model?: string
): Promise<AiGenerationResponse> {
  const res = await apiFetch('/api/ai/exercise', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt, parameters, model }),
  })
  return res.json()
}
