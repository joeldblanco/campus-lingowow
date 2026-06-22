import { siFacebook, siInstagram, siX, siYoutube } from 'simple-icons'
import type { ComponentProps } from 'react'

// LinkedIn was removed from simple-icons (trademark takedown), so its glyph
// path is inlined here. Canonical 24x24 LinkedIn mark.
const LINKEDIN_PATH =
  'M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z'

type BrandIconProps = ComponentProps<'svg'>

/**
 * Brand/social icons. lucide-react v1 removed brand glyphs (trademark reasons),
 * so these are rendered from `simple-icons` path data while keeping a
 * lucide-like API (pass `className` for sizing; color follows `currentColor`).
 */
function createBrandIcon(path: string, displayName: string) {
  function BrandIcon({ className, ...props }: BrandIconProps) {
    return (
      <svg
        viewBox="0 0 24 24"
        width="24"
        height="24"
        fill="currentColor"
        aria-hidden="true"
        focusable="false"
        className={className}
        {...props}
      >
        <path d={path} />
      </svg>
    )
  }
  BrandIcon.displayName = displayName
  return BrandIcon
}

export const Facebook = createBrandIcon(siFacebook.path, 'Facebook')
export const Instagram = createBrandIcon(siInstagram.path, 'Instagram')
export const Linkedin = createBrandIcon(LINKEDIN_PATH, 'Linkedin')
export const Youtube = createBrandIcon(siYoutube.path, 'Youtube')
// X (formerly Twitter) — simple-icons exports it as `siX`.
export const Twitter = createBrandIcon(siX.path, 'Twitter')
