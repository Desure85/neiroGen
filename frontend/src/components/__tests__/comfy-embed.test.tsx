import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import { ComfyEmbed } from '@/components/comfy-embed'

jest.mock('@/lib/api', () => ({
  apiFetch: jest.fn(),
}))

const { apiFetch } = jest.requireMock('@/lib/api') as { apiFetch: jest.Mock }

describe('ComfyEmbed', () => {
  beforeEach(() => {
    jest.resetAllMocks()
    process.env.NEXT_PUBLIC_COMFY_URL = 'http://localhost:8190'
  })

  it('shows connected status and link when health ok', async () => {
    apiFetch.mockResolvedValue({ json: async () => ({ ok: true }) })

    render(<ComfyEmbed />)

    expect(await screen.findByText('Подключено')).toBeInTheDocument()
    await waitFor(() => {
      const link = screen.getByRole('link', { name: /Открыть UI в новой вкладке/i })
      expect(link).toHaveAttribute('href', expect.stringMatching(/^http:\/\/localhost:(8188|8189|8190)$/))
    })
  })

  it('shows not connected when health fails', async () => {
    apiFetch.mockRejectedValue(new Error('Network'))

    render(<ComfyEmbed />)

    expect(await screen.findByText('Сервис ComfyUI не подключен или недоступен.')).toBeInTheDocument()
  })
})
