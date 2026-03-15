/**
 * Opens the classroom in a dedicated immersive popup window
 * without browser toolbars for a focused learning experience.
 */
export function openClassroomWindow(url: string) {
  const width = window.screen.availWidth
  const height = window.screen.availHeight

  const features = [
    `width=${width}`,
    `height=${height}`,
    `top=0`,
    `left=0`,
    'menubar=no',
    'toolbar=no',
    'location=no',
    'status=no',
    'scrollbars=no',
    'resizable=yes',
  ].join(',')

  const classroomWindow = window.open(url, 'lingowow-classroom', features)

  if (classroomWindow) {
    // Maximize the window after opening
    classroomWindow.moveTo(0, 0)
    classroomWindow.resizeTo(screen.availWidth, screen.availHeight)
  } else {
    // If popup was blocked, fall back to regular navigation
    window.location.href = url
  }
}
