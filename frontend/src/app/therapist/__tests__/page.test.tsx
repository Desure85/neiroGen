import React from 'react'
import { render, screen } from '@testing-library/react'
import TherapistDashboard from '@/app/therapist/page'

jest.mock('next/navigation', () => ({
  useRouter: () => ({ replace: jest.fn() }),
  usePathname: () => '/therapist',
  useSearchParams: () => new URLSearchParams(),
}))

jest.mock('@/components/localization', () => ({
  useI18n: () => ({ t: (k: string) => k }),
}))

jest.mock('@/lib/api', () => ({
  apiFetch: jest.fn(async () => ({ ok: true, json: async () => ({ data: [] }) })),
}))

jest.mock('@/lib/comfy', () => ({
  listComfyPresets: jest.fn(async () => []),
  generateWithPreset: jest.fn(async () => ({ ok: true, prompt_id: 'test' })),
}))

describe('TherapistDashboard', () => {
  it('renders tabs and ComfyUI tab is present', async () => {
    render(<TherapistDashboard />)

    expect(await screen.findByText('therapist_dashboard')).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'ComfyUI' })).toBeInTheDocument()
  })
})
