import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import AdminPage from '@/app/admin/page'
import { getMe, apiFetch } from '@/lib/api'
import { listComfyPresets, updateComfyPreset, deleteComfyPreset } from '@/lib/comfy'

jest.mock('next/navigation', () => ({
  useRouter: () => ({ replace: jest.fn() }),
}))

const mockUseAuth = jest.fn()

jest.mock('@/lib/auth-context', () => ({
  useAuth: () => mockUseAuth(),
}))

jest.mock('@/lib/api')
jest.mock('@/lib/comfy')

const getMeMock = getMe as jest.MockedFunction<typeof getMe>
const apiFetchMock = apiFetch as jest.MockedFunction<typeof apiFetch>
const listMock = listComfyPresets as jest.MockedFunction<typeof listComfyPresets>
const updateMock = updateComfyPreset as jest.MockedFunction<typeof updateComfyPreset>
const deleteMock = deleteComfyPreset as jest.MockedFunction<typeof deleteComfyPreset>

describe('AdminPage presets actions', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    getMeMock.mockResolvedValue({ id: 1, name: 'Admin', email: 'admin@example.com', role: 'admin' })
    apiFetchMock.mockResolvedValue({ ok: true, json: async () => ({}) })
    mockUseAuth.mockReturnValue({
      user: { id: 1, name: 'Admin', email: 'admin@example.com', role: 'admin' },
      loading: false,
      error: null,
      refresh: jest.fn(),
      setUser: jest.fn(),
    })
  })

  it('toggles enabled with optimistic UI', async () => {
    listMock.mockResolvedValue([{ id: 7, name: 'P', enabled: true, graph: {}, defaults: {} }])
    updateMock.mockResolvedValue({ id: 7, name: 'P', enabled: false, graph: {}, defaults: {} })

    render(<AdminPage />)

    // Wait list render
    await screen.findByText(/ComfyUI пресеты/)
    expect(await screen.findByText(/P/)).toBeInTheDocument()

    // Click "Выключить"
    fireEvent.click(screen.getByRole('button', { name: 'Выключить' }))

    // Optimistic label becomes (выключен)
    await waitFor(() => {
      expect(screen.getByText(/выключен/)).toBeInTheDocument()
    })
  })

  it('deletes preset with optimistic UI and reverts on error', async () => {
    listMock.mockResolvedValue([{ id: 9, name: 'ToDelete', enabled: true, graph: {}, defaults: {} }])
    deleteMock.mockRejectedValue(new Error('fail'))

    const confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(true)
    const alertSpy = jest.spyOn(window, 'alert').mockImplementation(() => {})

    render(<AdminPage />)
    await screen.findByText('ToDelete')

    // Click delete
    fireEvent.click(screen.getByRole('button', { name: 'Удалить' }))

    // After error, item should still be present (reverted)
    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalled()
      expect(screen.getByText('ToDelete')).toBeInTheDocument()
    })

    confirmSpy.mockRestore()
    alertSpy.mockRestore()
  })
})
