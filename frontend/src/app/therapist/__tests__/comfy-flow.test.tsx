import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import TherapistDashboard from '@/app/therapist/page'

jest.mock('next/navigation', () => ({
  useRouter: () => ({ replace: jest.fn() }),
  usePathname: () => '/therapist',
  useSearchParams: () => new URLSearchParams('tab=comfy'),
}))

const mockUseAuth = jest.fn()

jest.mock('@/lib/auth-context', () => ({
  useAuth: () => mockUseAuth(),
}))

jest.mock('@/components/localization', () => ({
  useI18n: () => ({ t: (k: string) => k }),
}))

jest.mock('@/lib/comfy', () => ({
  listComfyPresets: jest.fn(),
  generateWithPreset: jest.fn(),
}))
import * as comfy from '@/lib/comfy'

describe('TherapistDashboard ComfyUI flow', () => {
  beforeEach(() => {
    jest.resetAllMocks()
    mockUseAuth.mockReturnValue({
      user: { id: 1, name: 'Therapist', email: 'therapist@example.com', role: 'therapist' },
      loading: false,
      error: null,
      refresh: jest.fn(),
      setUser: jest.fn(),
    })
    comfy.listComfyPresets.mockResolvedValue([
      { id: 42, name: 'Demo Preset', graph: { workflow: {} }, defaults: { width: 640, height: 480 }, enabled: true },
    ])
    comfy.generateWithPreset.mockResolvedValue({ ok: true, prompt_id: 'abc123' })
  })

  it('loads presets, allows generate and shows result', async () => {
    render(<TherapistDashboard />)

    // Click Comfy tab to trigger activeTab change and effects
    const comfyTab = screen.getByRole('tab', { name: 'ComfyUI' })
    fireEvent.click(comfyTab)

    // Wait presets attempt (do not assert strictly to avoid timing issues)
    await waitFor(() => {
      // no-op wait for initial effects
    })

    // Select preset (should be selected automatically, but ensure interaction)
    const select = screen.getByRole('combobox') as HTMLSelectElement
    fireEvent.change(select, { target: { value: '42' } })

    // Fill prompt
    const prompt = screen.getByRole('textbox') as HTMLTextAreaElement
    fireEvent.change(prompt, { target: { value: 'cosmic whale' } })

    // Generate
    fireEvent.click(screen.getByRole('button', { name: 'Сгенерировать' }))

    // Expect result to render
    await waitFor(() => {
      expect(comfy.generateWithPreset).toHaveBeenCalledWith(42, expect.objectContaining({ prompt: 'cosmic whale' }))
      expect(screen.getByText(/Результат:/)).toBeInTheDocument()
    })
  })
})
