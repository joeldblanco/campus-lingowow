/** Opens the classroom access check in a separate browser tab. */
export function openClassroomWindow(url: string) {
  const classroomWindow = window.open(url, '_blank')

  if (!classroomWindow) {
    window.location.assign(url)
  }
}

/** Replaces the validated classroom tab with its Google Meet room. */
export function replaceClassroomWithGoogleMeet(meetingUrl: string) {
  const classroomWindow = window.open(meetingUrl, '_self')

  if (!classroomWindow) {
    window.location.assign(meetingUrl)
  }
}

/**
 * Closes the classroom tab when the class ends. Browsers only honor
 * window.close() on script-opened tabs (openClassroomWindow above);
 * when the classroom was reached by regular navigation the call is
 * ignored, so we fall back to the provided navigation instead.
 */
export function closeClassroomWindow(fallback: () => void) {
  window.close()
  window.setTimeout(() => {
    if (!window.closed) {
      fallback()
    }
  }, 300)
}
