import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/lib/mail', () => ({
  sendContactFormEmail: vi.fn().mockResolvedValue({ success: true }),
}))

vi.mock('@/lib/slack', () => ({
  sendSlackNotification: vi.fn().mockResolvedValue({ success: true }),
}))

import { sendContactFormEmail } from '@/lib/mail'
import { sendSlackNotification } from '@/lib/slack'
import { POST } from './route'

function createPostRequest(body: Record<string, unknown>, ip = '127.0.0.1') {
  return new NextRequest('http://localhost/api/contact', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-forwarded-for': ip,
    },
    body: JSON.stringify(body),
  })
}

describe('POST /api/contact anti-spam', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('sends email and slack notification for legitimate contact requests', async () => {
    const req = createPostRequest({
      name: 'María López',
      email: 'maria.lopez@example.com',
      countryCode: '+51',
      phone: '987654321',
      subject: 'informacion',
      message: 'Hola, quisiera más detalles sobre las clases de inglés.',
    }, '10.0.0.1')

    const res = await POST(req)
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.success).toBe(true)
    expect(sendContactFormEmail).toHaveBeenCalledTimes(1)
    expect(sendSlackNotification).toHaveBeenCalledTimes(1)
  })

  it('silently blocks spam when honeypot field website is filled', async () => {
    const req = createPostRequest({
      name: 'Bot User',
      email: 'bot@example.com',
      countryCode: '+1',
      phone: '123456789',
      subject: 'informacion',
      message: 'Cheap SEO services for your website today',
      website: 'http://spam-link.com',
    }, '10.0.0.2')

    const res = await POST(req)
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.success).toBe(true)
    expect(sendContactFormEmail).not.toHaveBeenCalled()
    expect(sendSlackNotification).not.toHaveBeenCalled()
  })

  it('silently blocks spam when message contains spam keywords or multiple links', async () => {
    const req = createPostRequest({
      name: 'Spam Bot',
      email: 'spammer@example.com',
      countryCode: '+1',
      phone: '123456789',
      subject: 'informacion',
      message: 'Buy casino backlinks and boost rank #1 at http://link1.com and http://link2.com',
    }, '10.0.0.3')

    const res = await POST(req)
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.success).toBe(true)
    expect(sendContactFormEmail).not.toHaveBeenCalled()
    expect(sendSlackNotification).not.toHaveBeenCalled()
  })

  it('returns 400 when required fields are missing', async () => {
    const req = createPostRequest({
      name: '',
      email: 'invalid-email',
    }, '10.0.0.4')

    const res = await POST(req)
    const json = await res.json()

    expect(res.status).toBe(400)
    expect(json.error).toBeDefined()
    expect(sendContactFormEmail).not.toHaveBeenCalled()
  })
})
