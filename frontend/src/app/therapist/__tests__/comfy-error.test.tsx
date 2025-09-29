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
  listComfyPresets: jest.fn(async () => ([{ id: 1, name: 'P', graph: {}, defaults: { width: 512, height: 512 }, enabled: true }])),
  generateWithPreset: jest.fn(async () => { throw new Error('boom') }),
}))

describe('TherapistDashboard ComfyUI error handling', () => {
  beforeEach(() => {
    jest.resetAllMocks()
    mockUseAuth.mockReturnValue({
      user: { id: 1, name: 'Therapist', email: 'therapist@example.com', role: 'therapist' },
      loading: false,
      error: null,
      refresh: jest.fn(),
      setUser: jest.fn(),
    })
  })

  it('renders inline alert when generation fails', async () => {
    render(<TherapistDashboard />)

    // Switch to Comfy tab
    const comfyTab = screen.getByRole('tab', { name: 'ComfyUI' })
    fireEvent.click(comfyTab)

    // Select preset combobox (should exist after load)
    const select = await screen.findByRole('combobox')
    fireEvent.change(select, { target: { value: '1' } })

    // Fill prompt and try generate
    const prompt = screen.getByRole('textbox') as HTMLTextAreaElement
    fireEvent.change(prompt, { target: { value: 'x' } })
    fireEvent.click(screen.getByRole('button', { name: 'Сгенерировать' }))

    // Expect inline alert to appear
    const alertEl = await screen.findByRole('alert')
    expect(alertEl).toHaveTextContent(/Ошибка генерации:/)
  })
})
