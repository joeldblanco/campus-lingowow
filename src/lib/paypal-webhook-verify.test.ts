import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { verifyPayPalWebhookSignature } from './paypal'

const VALID_HEADERS = {
  transmissionId: 'tx-id',
  transmissionTime: '2026-06-03T00:00:00Z',
  transmissionSig: 'sig',
  certUrl: 'https://api.paypal.com/cert',
  authAlgo: 'SHA256withRSA',
}

const EVENT = { id: 'WH-1', event_type: 'INVOICING.INVOICE.PAID' }

function mockFetchSequence(verifyResponse: { ok: boolean; status?: number; status_field?: string }) {
  // getPayPalAccessToken() fetches a token first, then the verify call.
  const fetchMock = vi
    .fn()
    .mockResolvedValueOnce({
      ok: true,
      json: async () => ({ access_token: 'fake-token' }),
    })
    .mockResolvedValueOnce({
      ok: verifyResponse.ok,
      status: verifyResponse.status ?? 200,
      json: async () => ({ verification_status: verifyResponse.status_field }),
      text: async () => 'error',
    })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

describe('verifyPayPalWebhookSignature (fail-closed)', () => {
  beforeEach(() => {
    vi.stubEnv('PAYPAL_WEBHOOK_ID', 'WH-CONFIGURED-ID')
    vi.stubEnv('PAYPAL_MODE', 'sandbox')
    vi.stubEnv('PAYPAL_CLIENT_ID', 'cid')
    vi.stubEnv('PAYPAL_CLIENT_SECRET', 'secret')
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.unstubAllEnvs()
    vi.restoreAllMocks()
  })

  it('returns true when PayPal reports verification_status SUCCESS', async () => {
    const fetchMock = mockFetchSequence({ ok: true, status_field: 'SUCCESS' })
    const ok = await verifyPayPalWebhookSignature({ headers: VALID_HEADERS, event: EVENT })
    expect(ok).toBe(true)
    // verify call body carries the configured webhook id + the event
    const verifyCall = fetchMock.mock.calls[1]
    expect(verifyCall[0]).toContain('/v1/notifications/verify-webhook-signature')
    const sentBody = JSON.parse(verifyCall[1].body)
    expect(sentBody.webhook_id).toBe('WH-CONFIGURED-ID')
    expect(sentBody.webhook_event).toEqual(EVENT)
  })

  it('returns false when PayPal reports FAILURE', async () => {
    mockFetchSequence({ ok: true, status_field: 'FAILURE' })
    expect(await verifyPayPalWebhookSignature({ headers: VALID_HEADERS, event: EVENT })).toBe(false)
  })

  it('returns false (and does not call PayPal) when PAYPAL_WEBHOOK_ID is missing', async () => {
    vi.stubEnv('PAYPAL_WEBHOOK_ID', '')
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    expect(await verifyPayPalWebhookSignature({ headers: VALID_HEADERS, event: EVENT })).toBe(false)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('returns false when transmission headers are missing', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    const ok = await verifyPayPalWebhookSignature({
      headers: { ...VALID_HEADERS, transmissionSig: null },
      event: EVENT,
    })
    expect(ok).toBe(false)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('returns false when the verify API errors (HTTP not ok)', async () => {
    mockFetchSequence({ ok: false, status: 500 })
    expect(await verifyPayPalWebhookSignature({ headers: VALID_HEADERS, event: EVENT })).toBe(false)
  })
})
