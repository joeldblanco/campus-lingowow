import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ExamEntryDialog, type ExamEntryDialogProps } from './exam-entry-dialog'

const defaultProctoring: ExamEntryDialogProps['proctoring'] = {
  enabled: true,
  requireFullscreen: true,
  blockCopyPaste: true,
  blockRightClick: true,
  maxWarnings: 3,
}

let fullscreenElement: Element | null = null

function installFullscreenApi({
  requestFullscreen,
  exitFullscreen = vi.fn().mockResolvedValue(undefined),
}: {
  requestFullscreen?: () => Promise<void>
  exitFullscreen?: () => Promise<void>
}) {
  Object.defineProperty(document.documentElement, 'requestFullscreen', {
    configurable: true,
    value: requestFullscreen,
  })
  Object.defineProperty(document, 'fullscreenElement', {
    configurable: true,
    get: () => fullscreenElement,
  })
  Object.defineProperty(document, 'exitFullscreen', {
    configurable: true,
    value: exitFullscreen,
  })
}

function renderDialog({
  proctoring = defaultProctoring,
  onEnter = vi.fn().mockResolvedValue(undefined),
  onCancel = vi.fn(),
}: Partial<ExamEntryDialogProps> = {}) {
  return {
    onEnter,
    onCancel,
    ...render(
      <ExamEntryDialog
        title="Evaluación de nivel B1"
        proctoring={proctoring}
        onEnter={onEnter}
        onCancel={onCancel}
      />
    ),
  }
}

describe('ExamEntryDialog', () => {
  beforeEach(() => {
    fullscreenElement = null
  })

  afterEach(() => {
    fullscreenElement = null
    delete (document.documentElement as { requestFullscreen?: unknown }).requestFullscreen
    delete (document as { exitFullscreen?: unknown }).exitFullscreen
    delete (document as { fullscreenElement?: unknown }).fullscreenElement
  })

  it('cancels without starting an attempt or requesting fullscreen', () => {
    const requestFullscreen = vi.fn().mockResolvedValue(undefined)
    installFullscreenApi({ requestFullscreen })
    const onEnter = vi.fn().mockResolvedValue(undefined)
    const onCancel = vi.fn()
    renderDialog({ onEnter, onCancel })

    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }))

    expect(onCancel).toHaveBeenCalledOnce()
    expect(onEnter).not.toHaveBeenCalled()
    expect(requestFullscreen).not.toHaveBeenCalled()
  })

  it('cancels on Escape without starting an attempt', () => {
    const requestFullscreen = vi.fn().mockResolvedValue(undefined)
    installFullscreenApi({ requestFullscreen })
    const onEnter = vi.fn().mockResolvedValue(undefined)
    const onCancel = vi.fn()
    renderDialog({ onEnter, onCancel })

    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' })

    expect(onCancel).toHaveBeenCalledOnce()
    expect(onEnter).not.toHaveBeenCalled()
    expect(requestFullscreen).not.toHaveBeenCalled()
  })

  it('requests fullscreen before starting the attempt', async () => {
    const events: string[] = []
    const requestFullscreen = vi.fn().mockImplementation(async () => {
      events.push('fullscreen')
    })
    installFullscreenApi({ requestFullscreen })
    const onEnter = vi.fn().mockImplementation(async () => {
      events.push('enter')
    })
    renderDialog({ onEnter })

    fireEvent.click(screen.getByRole('button', { name: 'Entrar a la evaluación' }))

    await waitFor(() => expect(onEnter).toHaveBeenCalledOnce())
    expect(events).toEqual(['fullscreen', 'enter'])
    expect(requestFullscreen).toHaveBeenCalledOnce()
  })

  it('does not request fullscreen again when the document is already fullscreen', async () => {
    const requestFullscreen = vi.fn().mockResolvedValue(undefined)
    installFullscreenApi({ requestFullscreen })
    fullscreenElement = document.documentElement
    const onEnter = vi.fn().mockResolvedValue(undefined)
    renderDialog({ onEnter })

    fireEvent.click(screen.getByRole('button', { name: 'Entrar a la evaluación' }))

    await waitFor(() => expect(onEnter).toHaveBeenCalledOnce())
    expect(requestFullscreen).not.toHaveBeenCalled()
  })

  it('reports unsupported or rejected fullscreen without starting the attempt', async () => {
    installFullscreenApi({
      requestFullscreen: vi.fn().mockRejectedValue(new Error('NotAllowedError')),
    })
    const onEnter = vi.fn().mockResolvedValue(undefined)
    renderDialog({ onEnter })

    fireEvent.click(screen.getByRole('button', { name: 'Entrar a la evaluación' }))

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent(/pantalla completa/i)
    expect(alert).toHaveTextContent(/vuelve a intentarlo/i)
    expect(onEnter).not.toHaveBeenCalled()
    expect(screen.getByRole('button', { name: 'Entrar a la evaluación' })).toBeEnabled()
  })

  it('can retry after the attempt fails and exits fullscreen it entered', async () => {
    const requestFullscreen = vi.fn().mockResolvedValue(undefined)
    const exitFullscreen = vi.fn().mockResolvedValue(undefined)
    installFullscreenApi({ requestFullscreen, exitFullscreen })
    const onEnter = vi
      .fn()
      .mockRejectedValueOnce(new Error('server failure'))
      .mockResolvedValueOnce(undefined)
    renderDialog({ onEnter })
    const enterButton = screen.getByRole('button', { name: 'Entrar a la evaluación' })

    fireEvent.click(enterButton)
    await screen.findByRole('alert')
    expect(exitFullscreen).toHaveBeenCalledOnce()
    expect(enterButton).toBeEnabled()

    fireEvent.click(enterButton)
    await waitFor(() => expect(onEnter).toHaveBeenCalledTimes(2))
    expect(requestFullscreen).toHaveBeenCalledTimes(2)
  })

  it('blocks duplicate clicks while entering', async () => {
    const requestFullscreen = vi.fn().mockResolvedValue(undefined)
    installFullscreenApi({ requestFullscreen })
    const onEnter = vi.fn().mockReturnValue(new Promise<void>(() => undefined))
    renderDialog({ onEnter })
    const enterButton = screen.getByRole('button', { name: 'Entrar a la evaluación' })

    fireEvent.click(enterButton)
    fireEvent.click(enterButton)

    expect(await screen.findByRole('button', { name: 'Entrando...' })).toBeDisabled()
    expect(onEnter).toHaveBeenCalledOnce()
    expect(requestFullscreen).toHaveBeenCalledOnce()
  })

  it('describes enabled monitoring and only enabled restrictions', () => {
    installFullscreenApi({ requestFullscreen: vi.fn().mockResolvedValue(undefined) })
    renderDialog()

    expect(screen.getByText(/supervisión está activa/i)).toBeInTheDocument()
    expect(screen.getByText(/cambios de pestaña, ventana y pantalla completa/i)).toBeInTheDocument()
    expect(screen.getByText(/copiar y pegar/i)).toBeInTheDocument()
    expect(screen.getByText(/clic derecho/i)).toBeInTheDocument()
    expect(screen.getByText(/3 advertencias.*revisión/i)).toBeInTheDocument()
    expect(screen.queryByText(/cámara|micrófono/i)).not.toBeInTheDocument()
  })

  it('does not claim monitoring restrictions when proctoring is disabled', () => {
    installFullscreenApi({ requestFullscreen: vi.fn().mockResolvedValue(undefined) })
    renderDialog({
      proctoring: {
        ...defaultProctoring,
        enabled: false,
      },
    })

    expect(screen.getByText(/supervisión está desactivada/i)).toBeInTheDocument()
    expect(screen.getByText(/no monitorea/i)).toBeInTheDocument()
    expect(screen.queryByText(/copiar y pegar/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/clic derecho/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/advertencias|revisión/i)).not.toBeInTheDocument()
  })
})
