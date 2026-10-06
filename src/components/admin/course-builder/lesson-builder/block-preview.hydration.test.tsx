import { act, cleanup } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { hydrateRoot } from 'react-dom/client'
import { renderToString } from 'react-dom/server'
import { BlockPreview } from './block-preview'

vi.mock('@/components/lessons/essay-ai-grading', () => ({
  EssayAIGrading: () => <button type="button">Enviar</button>,
}))
vi.mock('@/components/lessons/recording-ai-grading', () => ({
  RecordingAIGrading: () => <button type="button">Obtener Retroalimentación</button>,
}))
vi.mock('@/lib/actions/ai-grading-limits', () => ({
  canUseAIGrading: vi.fn(),
  recordAIGradingUsage: vi.fn(),
}))

afterEach(() => cleanup())

describe('BlockPreview guided hydration', () => {
  it('hydrates guided audio and matching without random recoverable mismatches', async () => {
    const content = () => (
      <>
        <BlockPreview
          guidedAppearance
          block={{ id: 'hydration-audio', type: 'audio', order: 0, url: '/lesson.mp3' }}
        />
        <BlockPreview
          guidedAppearance
          block={{
            id: 'hydration-match',
            type: 'match',
            order: 1,
            pairs: [
              { id: 'name', left: 'Name', right: 'Peter' },
              { id: 'age', left: 'Age', right: '20 years old' },
            ],
          }}
        />
      </>
    )
    const random = vi.spyOn(Math, 'random').mockReturnValue(0.9)
    const serverMarkup = renderToString(content())
    random.mockReturnValue(0.1)
    const container = document.createElement('div')
    container.innerHTML = serverMarkup
    document.body.appendChild(container)
    const recoverableErrors: unknown[] = []
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)

    let root: ReturnType<typeof hydrateRoot> | undefined
    await act(async () => {
      root = hydrateRoot(container, content(), {
        onRecoverableError: (error) => recoverableErrors.push(error),
      })
    })

    expect(recoverableErrors).toEqual([])
    expect(consoleError).not.toHaveBeenCalled()

    await act(async () => root?.unmount())
    consoleError.mockRestore()
    random.mockRestore()
    container.remove()
  })
})
