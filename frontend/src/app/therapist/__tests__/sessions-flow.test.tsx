import React from 'react'
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'
import TherapistDashboard from '@/app/therapist/page'

jest.mock('next/navigation', () => ({
  useRouter: () => ({ replace: jest.fn() }),
  usePathname: () => '/therapist',
  useSearchParams: () => new URLSearchParams('tab=children'),
}))

const mockUseAuth = jest.fn()

jest.mock('@/lib/auth-context', () => ({
  useAuth: () => mockUseAuth(),
}))

jest.mock('@/components/localization', () => ({
  useI18n: () => ({ t: (k: string) => k }),
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
      // Return initial children like in component stub
      return { ok: true, json: async () => ({ data: [
        { id: 1, name: 'Маша', age: 6, gender: 'female', overall_progress: 75 },
        { id: 2, name: 'Петя', age: 8, gender: 'male', overall_progress: 60 },
        { id: 3, name: 'Аня', age: 5, gender: 'female', overall_progress: 85 },
      ] }) }
    }
    if (url.startsWith('/api/sessions') && (!init || init.method === undefined)) {
      // Provide sessions for selected child
      return { ok: true, json: async () => ({ data: [
        { child_id: 1, exercise_id: 101, score: 10, completed_items: 5, total_items: 5, time_spent: 30, accuracy: 100, created_at: new Date().toISOString() }
      ] }) }
    }
    return { ok: true, json: async () => ({}) }
  })
})

describe('TherapistDashboard sessions flow', () => {
  it('shows sessions after selecting a child and navigating to sessions tab', async () => {
    render(<TherapistDashboard />)

    // Switch to children tab and wait children to load
    const childrenTab = screen.getByRole('tab', { name: 'tab_children' })
    fireEvent.click(childrenTab)
    await waitFor(() => {
      // Wait until child action buttons appear
      expect(screen.getAllByRole('button', { name: 'Начать сессию' }).length).toBeGreaterThan(0)
    })

    // Click "Начать сессию" on first child card
    const card = screen.getAllByRole('button', { name: 'Начать сессию' })[0]
    fireEvent.click(card)

    // We are on sessions tab; wait for session data to appear
    await waitFor(() => {
      // Selected child name visible in at least one history item
      expect(screen.getAllByText(/Маша/).length).toBeGreaterThan(0)
    })
  })
})
