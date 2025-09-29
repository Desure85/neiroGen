import React from 'react'
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'
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
  // First list request returns empty children
  apiFetchMock.mockImplementation(async (url: string, init?: RequestInit) => {
    if (url.startsWith('/api/children') && (!init || init.method === undefined)) {
      return { ok: true, json: async () => ({ data: [] }) }
    }
    if (url.startsWith('/api/children') && init?.method === 'POST') {
      return { ok: true, json: async () => ({ id: 10, name: 'Саша', age: 7, gender: 'male' }) }
    }
    return { ok: true, json: async () => ({}) }
  })
})

describe('TherapistDashboard children flow', () => {
  it('creates a child via form and shows it in the list', async () => {
    render(<TherapistDashboard />)

    // Initially shows no sessions block, and children grid will render after fetch
    // Open add child form
    fireEvent.click(await screen.findByRole('button', { name: 'Добавить ребёнка' }))

    // Fill name via placeholder
    fireEvent.change(screen.getByPlaceholderText('Например: Саша'), { target: { value: 'Саша' } })

    // Age input (spinbutton)
    const ageInput = screen.getByRole('spinbutton') as HTMLInputElement
    fireEvent.change(ageInput, { target: { value: '7' } })

    // Gender select (combobox)
    const genderSelect = screen.getByRole('combobox')
    fireEvent.change(genderSelect, { target: { value: 'male' } })

    // Switch API mock so that subsequent list contains the created child
    apiFetchMock.mockImplementation(async (url: string, init?: RequestInit) => {
      if (url.startsWith('/api/children') && (!init || init.method === undefined)) {
        return { ok: true, json: async () => ({ data: [{ id: 10, name: 'Саша', age: 7, gender: 'male' }] }) }
      }
      if (url.startsWith('/api/children') && init?.method === 'POST') {
        return { ok: true, json: async () => ({ id: 10, name: 'Саша', age: 7, gender: 'male' }) }
      }
      return { ok: true, json: async () => ({}) }
    })

    // Save
    fireEvent.click(screen.getByRole('button', { name: 'Сохранить' }))

    // Ensure we are on children tab (some tab libs require explicit click in tests)
    const childrenTab = screen.getByRole('tab', { name: 'tab_children' })
    fireEvent.click(childrenTab)

    // Expect child card to appear (allow async state updates)
    await waitFor(() => {
      expect(screen.getByText('Саша')).toBeInTheDocument()
    })
  })
})
