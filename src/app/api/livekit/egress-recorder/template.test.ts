import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/db', () => ({
  db: {
    classRecording: { findFirst: vi.fn() },
    videoCall: { findFirst: vi.fn() },
    classBooking: { findUnique: vi.fn() },
  },
}))

import { db } from '@/lib/db'
import { buildEgressRecorderHtml } from './template'

describe('buildEgressRecorderHtml', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(db.classRecording.findFirst).mockResolvedValue(null as never)
    vi.mocked(db.videoCall.findFirst).mockResolvedValue(null as never)
    vi.mocked(db.classBooking.findUnique).mockResolvedValue(null as never)
  })

  it('renders a complete HTML document with the START_RECORDING marker (required by egress)', async () => {
    const html = await buildEgressRecorderHtml({
      roomName: 'class-abc',
      url: 'wss://meet.example.com',
      token: 'header.eyJ2aWRlbyI6eyJyb29tIjoiY2xhc3MtYWJjIn19.sig', // payload: {video:{room:"class-abc"}}
    })

    expect(html).toMatch(/<!DOCTYPE html>/i)
    expect(html).toContain('START_RECORDING')
    // Title is escaped, no raw room name appears
    expect(html).toContain('<title>Recording - class-abc</title>')
  })

  it('escapes a hostile roomName so it cannot break out of the <title> tag', async () => {
    const evil = '</title><script>window.PWNED=1</script>'
    const html = await buildEgressRecorderHtml({
      roomName: evil,
      url: 'wss://meet.example.com',
      token: 'a.b.c',
    })

    // The raw string MUST NOT appear in <title>
    expect(html).not.toContain(`<title>Recording - ${evil}</title>`)
    // A live, executable <script> tag injected by the room name MUST NOT appear in <head>
    expect(html).not.toMatch(/<title>Recording -[^<]*<script>window\.PWNED/i)
    // Escaped form must be present
    expect(html).toContain('&lt;/title&gt;&lt;script&gt;')
  })

  it('does not emit START_RECORDING in a tight 100ms interval (no flood)', async () => {
    const html = await buildEgressRecorderHtml({
      roomName: 'class-abc',
      url: 'wss://meet.example.com',
      token: 'a.b.c',
    })

    expect(html).not.toContain('setInterval(function(){ console.log(\'START_RECORDING\')')
  })
})
