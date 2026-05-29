import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/auth', () => ({
  auth: vi.fn(),
}))

vi.mock('@/lib/db', () => ({
  db: {
    user: {
      findUnique: vi.fn(),
    },
    classBooking: {
      findUnique: vi.fn(),
    },
  },
}))

vi.mock('livekit-server-sdk', () => {
  const addGrant = vi.fn()
  const toJwt = vi.fn(async () => 'jwt-token')
  const AccessToken = vi.fn().mockImplementation((apiKey: string, secret: string, opts: unknown) => ({
    apiKey,
    secret,
    opts,
    addGrant,
    toJwt,
  }))
  return { AccessToken, __addGrant: addGrant, __toJwt: toJwt }
})

import { auth } from '@/auth'
import { db } from '@/lib/db'
import * as livekitSdk from 'livekit-server-sdk'
import { POST } from './route'

const STUDENT_ID = 'student-1'
const TEACHER_ID = 'teacher-1'
const OTHER_STUDENT_ID = 'student-2'
const BOOKING_ID = 'booking-xyz'

function buildRequest(body: unknown) {
  return new Request('http://localhost/api/livekit/token', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  }) as unknown as Parameters<typeof POST>[0]
}

describe('POST /api/livekit/token', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.LIVEKIT_API_KEY = 'test-key'
    process.env.LIVEKIT_API_SECRET = 'test-secret'
    process.env.NEXT_PUBLIC_LIVEKIT_URL = 'wss://meet.example.com'
  })

  it('rejects unauthenticated callers', async () => {
    vi.mocked(auth).mockResolvedValue(null as never)
    const res = await POST(buildRequest({ bookingId: BOOKING_ID }))
    expect(res.status).toBe(401)
  })

  it('rejects when bookingId is missing', async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: STUDENT_ID } } as never)
    const res = await POST(buildRequest({}))
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(String(body.error).toLowerCase()).toContain('booking')
  })

  it('rejects users who are neither student nor teacher of the booking', async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: OTHER_STUDENT_ID } } as never)
    vi.mocked(db.user.findUnique).mockResolvedValue({
      id: OTHER_STUDENT_ID,
      name: 'Other',
      email: 'other@example.com',
      image: null,
      roles: ['STUDENT'],
    } as never)
    vi.mocked(db.classBooking.findUnique).mockResolvedValue({
      teacherId: TEACHER_ID,
      studentId: STUDENT_ID,
    } as never)

    const res = await POST(buildRequest({ bookingId: BOOKING_ID }))
    expect(res.status).toBe(403)
  })

  it('returns 404 when booking does not exist', async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: STUDENT_ID } } as never)
    vi.mocked(db.user.findUnique).mockResolvedValue({
      id: STUDENT_ID,
      name: 'Student',
      email: 's@example.com',
      image: null,
      roles: ['STUDENT'],
    } as never)
    vi.mocked(db.classBooking.findUnique).mockResolvedValue(null as never)

    const res = await POST(buildRequest({ bookingId: BOOKING_ID }))
    expect(res.status).toBe(404)
  })

  it('ignores client-supplied roomName and derives it from bookingId', async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: STUDENT_ID } } as never)
    vi.mocked(db.user.findUnique).mockResolvedValue({
      id: STUDENT_ID,
      name: 'Student',
      email: 's@example.com',
      image: null,
      roles: ['STUDENT'],
    } as never)
    vi.mocked(db.classBooking.findUnique).mockResolvedValue({
      teacherId: TEACHER_ID,
      studentId: STUDENT_ID,
    } as never)

    const res = await POST(
      buildRequest({ bookingId: BOOKING_ID, roomName: 'class-OTHER-PERSONS-ROOM' })
    )
    expect(res.status).toBe(200)

    // grants must be scoped to the derived room, not the client-supplied one
    const addGrant = (livekitSdk as unknown as { __addGrant: ReturnType<typeof vi.fn> }).__addGrant
    expect(addGrant).toHaveBeenCalledTimes(1)
    const grantArg = addGrant.mock.calls[0][0]
    expect(grantArg.room).toBe(`class-${BOOKING_ID}`)
    expect(grantArg.room).not.toContain('OTHER-PERSONS-ROOM')
  })

  it('returns a token with non-moderator grants for a student', async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: STUDENT_ID } } as never)
    vi.mocked(db.user.findUnique).mockResolvedValue({
      id: STUDENT_ID,
      name: 'Student',
      email: 's@example.com',
      image: null,
      roles: ['STUDENT'],
    } as never)
    vi.mocked(db.classBooking.findUnique).mockResolvedValue({
      teacherId: TEACHER_ID,
      studentId: STUDENT_ID,
    } as never)

    const res = await POST(buildRequest({ bookingId: BOOKING_ID }))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.token).toBe('jwt-token')
    expect(body.user.isModerator).toBe(false)
    expect(body.serverUrl).toBe('wss://meet.example.com')

    const addGrant = (livekitSdk as unknown as { __addGrant: ReturnType<typeof vi.fn> }).__addGrant
    const grantArg = addGrant.mock.calls[0][0]
    expect(grantArg.roomAdmin).toBe(false)
    expect(grantArg.roomCreate).toBe(false)
    expect(grantArg.roomList).toBe(false)
    expect(grantArg.roomRecord).toBe(false)
    expect(grantArg.room).toBe(`class-${BOOKING_ID}`)
  })

  it('returns a moderator-scoped token for the booking teacher only', async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: TEACHER_ID } } as never)
    vi.mocked(db.user.findUnique).mockResolvedValue({
      id: TEACHER_ID,
      name: 'Teacher',
      email: 't@example.com',
      image: null,
      roles: ['TEACHER'],
    } as never)
    vi.mocked(db.classBooking.findUnique).mockResolvedValue({
      teacherId: TEACHER_ID,
      studentId: STUDENT_ID,
    } as never)

    const res = await POST(buildRequest({ bookingId: BOOKING_ID }))
    expect(res.status).toBe(200)

    const addGrant = (livekitSdk as unknown as { __addGrant: ReturnType<typeof vi.fn> }).__addGrant
    const grantArg = addGrant.mock.calls[0][0]
    // Moderator gets admin/record on the room, but NOT global roomCreate/roomList
    expect(grantArg.roomAdmin).toBe(true)
    expect(grantArg.roomRecord).toBe(true)
    expect(grantArg.roomCreate).toBe(false)
    expect(grantArg.roomList).toBe(false)
  })

  it('does not grant moderator status to a TEACHER role on a booking they do not own', async () => {
    const stalkingTeacherId = 'teacher-99'
    vi.mocked(auth).mockResolvedValue({ user: { id: stalkingTeacherId } } as never)
    vi.mocked(db.user.findUnique).mockResolvedValue({
      id: stalkingTeacherId,
      name: 'Other Teacher',
      email: 'ot@example.com',
      image: null,
      roles: ['TEACHER'],
    } as never)
    vi.mocked(db.classBooking.findUnique).mockResolvedValue({
      teacherId: TEACHER_ID,
      studentId: STUDENT_ID,
    } as never)

    const res = await POST(buildRequest({ bookingId: BOOKING_ID }))
    expect(res.status).toBe(403)
  })

  it('encodes isModerator into the AccessToken metadata', async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: TEACHER_ID } } as never)
    vi.mocked(db.user.findUnique).mockResolvedValue({
      id: TEACHER_ID,
      name: 'Teacher',
      email: 't@example.com',
      image: null,
      roles: ['TEACHER'],
    } as never)
    vi.mocked(db.classBooking.findUnique).mockResolvedValue({
      teacherId: TEACHER_ID,
      studentId: STUDENT_ID,
    } as never)

    await POST(buildRequest({ bookingId: BOOKING_ID }))

    const accessTokenCtor = livekitSdk.AccessToken as unknown as ReturnType<typeof vi.fn>
    const opts = accessTokenCtor.mock.calls[0][2]
    expect(opts.identity).toBe(TEACHER_ID)
    const metadata = JSON.parse(opts.metadata)
    expect(metadata.isModerator).toBe(true)
  })

  it('sets a bounded ttl on the AccessToken', async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: STUDENT_ID } } as never)
    vi.mocked(db.user.findUnique).mockResolvedValue({
      id: STUDENT_ID,
      name: 'Student',
      email: 's@example.com',
      image: null,
      roles: ['STUDENT'],
    } as never)
    vi.mocked(db.classBooking.findUnique).mockResolvedValue({
      teacherId: TEACHER_ID,
      studentId: STUDENT_ID,
    } as never)

    await POST(buildRequest({ bookingId: BOOKING_ID }))

    const accessTokenCtor = livekitSdk.AccessToken as unknown as ReturnType<typeof vi.fn>
    const opts = accessTokenCtor.mock.calls[0][2]
    expect(opts.ttl).toBeDefined()
  })
})
