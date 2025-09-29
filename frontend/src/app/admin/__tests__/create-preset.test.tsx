import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import AdminPage from '@/app/admin/page'

jest.mock('next/navigation', () => ({
  useRouter: () => ({ replace: jest.fn() }),
}))

const mockUseAuth = jest.fn()

jest.mock('@/lib/auth-context', () => ({
  useAuth: () => mockUseAuth(),
}))

jest.mock('@/lib/api', () => ({
  getMe: jest.fn(async () => ({ id: 1, name: 'Admin', email: 'admin@example.com', role: 'admin' })),
}))

const mockCreate = jest.fn(async () => ({ id: 99, name: 'Preset X', enabled: true }))
const mockList = jest.fn(async () => ([]))

jest.mock('@/lib/comfy', () => ({
  listComfyPresets: (...args: any[]) => (mockList as any)(...args),
  createComfyPreset: (...args: any[]) => (mockCreate as any)(...args),
}))

describe('AdminPage create preset flow', () => {
  beforeEach(() => {
    jest.resetAllMocks()
    mockList.mockResolvedValue([])
    mockCreate.mockResolvedValue({ id: 99, name: 'Preset X', enabled: true })
    mockUseAuth.mockReturnValue({
      user: { id: 1, name: 'Admin', email: 'admin@example.com', role: 'admin' },
      loading: false,
      error: null,
      refresh: jest.fn(),
      setUser: jest.fn(),
    })
  })

  it('opens form, submits JSON and shows new preset in list', async () => {
    render(<AdminPage />)

    // Wait for page header
    expect(await screen.findByText('Панель администратора')).toBeInTheDocument()

    // Open create form
    fireEvent.click(screen.getByRole('button', { name: /Создать пресет/i }))

    // Fill minimal fields (use placeholder since labels are not bound via htmlFor)
    fireEvent.change(screen.getByPlaceholderText('Например: SD Simple'), { target: { value: 'Preset X' } })

    // Submit
    fireEvent.click(screen.getByRole('button', { name: 'Сохранить' }))

    await waitFor(() => {
      expect(mockCreate).toHaveBeenCalled()
      expect(screen.getByText(/Preset X/)).toBeInTheDocument()
    })
  })
})
