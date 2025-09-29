import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import TherapistDashboard from '@/app/therapist/page'

jest.mock('next/navigation', () => ({
  useRouter: () => ({ replace: jest.fn() }),
  usePathname: () => '/therapist',
  useSearchParams: () => new URLSearchParams(),
}))

const mockUseAuth = jest.fn()

jest.mock('@/lib/auth-context', () => ({
  useAuth: () => mockUseAuth(),
}))

jest.mock('@/components/localization', () => ({
  useI18n: () => ({ t: (k: string) => (k === 'new_child' ? 'Добавить ребёнка' : k) }),
}))

const apiFetchMock = jest.fn()
jest.mock('@/lib/api', () => ({
  apiFetch: (...args: any[]) => (apiFetchMock as any)(...args),
}))

beforeEach(() => {
  jest.resetAllMocks()
  mockUseAuth.mockReturnValue({
    user: { id: 1, name: 'Therapist', email: 'therapist@example.com', role: 'therapist' },
    loading: false,
    error: null,
    refresh: jest.fn(),
    setUser: jest.fn(),
  })
  apiFetchMock.mockImplementation(async (url: string, init?: RequestInit) => {
    if (url.startsWith('/api/children') && (!init || init.method === undefined)) {
      return { ok: true, json: async () => ({ data: [] }) }
    }
    return { ok: true, json: async () => ({}) }
  })
})

describe('TherapistDashboard children validation', () => {
  it('does not submit when name is empty', async () => {
    render(<TherapistDashboard />)

    fireEvent.click(await screen.findByRole('button', { name: 'Добавить ребёнка' }))

    // Name remains empty
    const save = screen.getByRole('button', { name: 'Сохранить' })
    fireEvent.click(save)

    // Ensure POST /api/children was not called
    expect(apiFetchMock).not.toHaveBeenCalledWith(expect.stringMatching(/\/api\/children$/), expect.objectContaining({ method: 'POST' }))
  })
})
