/**
 * Return the lesson viewport to its start when a new task is selected.
 *
 * The lesson is normally part of the document flow, so `scrollIntoView` keeps
 * the page positioned at the lesson even when the student had scrolled through
 * a long response. The fallback is useful for embedded/jsdom environments
 * where the element method is unavailable. Both browser APIs can throw in
 * constrained test or embedded contexts, so this helper deliberately has no
 * observable failure mode.
 */
export function resetGuidedLessonViewport(viewer: HTMLElement | null): void {
  if (typeof window === 'undefined') return

  if (viewer && typeof viewer.scrollIntoView === 'function') {
    try {
      viewer.scrollIntoView({ behavior: 'auto', block: 'start' })
      return
    } catch {
      // Fall through to the window fallback when the host rejects the options.
    }
  }

  try {
    // jsdom exposes a throwing `scrollTo` stub and no scrolling element. A
    // real document has the latter even when the page is not currently
    // scrollable, so this also avoids noisy test-console errors.
    if (document.scrollingElement && typeof window.scrollTo === 'function') {
      window.scrollTo({ top: 0, left: 0, behavior: 'auto' })
    }
  } catch {
    // jsdom and some embedded webviews expose scrollTo but do not implement it.
  }
}

/** Focus the task heading without causing a second, browser-controlled jump. */
export function focusGuidedLessonHeading(heading: HTMLElement | null): void {
  if (!heading) return

  try {
    heading.focus({ preventScroll: true })
  } catch {
    // Older browsers and jsdom versions may reject FocusOptions.
    try {
      heading.focus()
    } catch {
      // A detached node can reject focus; navigation must still complete.
    }
  }
}
