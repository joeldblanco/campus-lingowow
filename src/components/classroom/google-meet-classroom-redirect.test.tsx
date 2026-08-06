import { render, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { StudentClassroomLayout } from './student-classroom-layout'
import { TeacherClassroomLayout } from './teacher-classroom-layout'
import { enterGoogleMeetClassroom } from '@/lib/actions/google-meet-classroom'
import { checkTeacherAttendance } from '@/lib/actions/attendance'
import { replaceClassroomWithGoogleMeet } from '@/lib/open-classroom-window'

vi.mock('@/lib/actions/google-meet-classroom', () => ({
  enterGoogleMeetClassroom: vi.fn(),
}))

vi.mock('@/lib/actions/attendance', () => ({
  checkTeacherAttendance: vi.fn(),
  markTeacherAttendance: vi.fn(),
}))

vi.mock('@/lib/open-classroom-window', () => ({
  replaceClassroomWithGoogleMeet: vi.fn(),
}))

vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
    info: vi.fn(),
    success: vi.fn(),
  },
}))

const meetingUrl = 'https://meet.google.com/abc-defg-hij'

const classroomProps = {
  classId: 'class-1',
  teacherId: 'teacher-1',
  studentId: 'student-1',
  courseName: 'Inglés',
  lessonName: 'Conversación',
  bookingId: 'booking-1',
  day: '2026-08-05',
  timeSlot: '10:00',
  currentUserName: 'Usuario',
}

describe('Google Meet classroom redirect', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(enterGoogleMeetClassroom).mockResolvedValue({
      success: true,
      meetingUrl,
      provider: 'GOOGLE_MEET',
    } as never)
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true }))
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('redirects the student to Google Meet after the access check', async () => {
    render(<StudentClassroomLayout {...classroomProps} />)

    await waitFor(() => {
      expect(replaceClassroomWithGoogleMeet).toHaveBeenCalledWith(meetingUrl)
    })
    expect(fetch).toHaveBeenCalledWith('/api/attendance/mark', expect.any(Object))
  })

  it('redirects the teacher to Google Meet after attendance is checked', async () => {
    vi.mocked(checkTeacherAttendance).mockResolvedValue({ attendanceMarked: true } as never)

    render(<TeacherClassroomLayout {...classroomProps} />)

    await waitFor(() => {
      expect(replaceClassroomWithGoogleMeet).toHaveBeenCalledWith(meetingUrl)
    })
  })
})
