import React from 'react'
import { render, screen } from '@testing-library/react'
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

jest.mock('@/lib/comfy', () => ({
  listComfyPresets: jest.fn(async () => ([])),
  createComfyPreset: jest.fn(async () => ({ id: 1, name: 'Test', enabled: true })),
}))

describe('AdminPage', () => {
  it('renders admin header and comfy presets section', async () => {
    mockUseAuth.mockReturnValue({
      user: { id: 1, name: 'Admin', email: 'admin@example.com', role: 'admin' },
      loading: false,
      error: null,
      refresh: jest.fn(),
      setUser: jest.fn(),
    })
    render(<AdminPage />)

    expect(await screen.findByText('Панель администратора')).toBeInTheDocument()
    expect(screen.getByText('ComfyUI пресеты')).toBeInTheDocument()
  })
})
