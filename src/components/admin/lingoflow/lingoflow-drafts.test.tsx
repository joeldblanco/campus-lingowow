import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { LingoFlowDrafts } from './lingoflow-drafts'

describe('LingoFlowDrafts', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('requests only the selected closed mode and labels the result as a draft', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        draft: { isDraft: true, title: 'Prueba', content: 'Contenido revisable.', safetyNote: 'Sin envío ni publicación.' },
      }),
    })
    vi.stubGlobal('fetch', fetchMock)

    render(<LingoFlowDrafts />)
    fireEvent.click(screen.getByRole('button', { name: /Análisis de crecimiento/i }))

    await waitFor(() => expect(fetchMock).toHaveBeenCalledOnce())
    expect(fetchMock).toHaveBeenCalledWith('/api/admin/lingoflow/generate', expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({ mode: 'growth-analysis' }),
    }))
    expect(await screen.findByText(/Borrador — requiere revisión humana/i)).toBeInTheDocument()
  })
})
