import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { HostingTelemetry } from './hosting-telemetry'
vi.mock('@vercel/speed-insights/next', () => ({
  SpeedInsights: () => <script async src="/_vercel/speed-insights/script.js" />,
}))
vi.mock('@vercel/analytics/next', () => ({
  Analytics: () => <script async src="/_vercel/insights/script.js" />,
}))

describe('hosting telemetry', () => {
  afterEach(() => vi.unstubAllEnvs())

  it('does not request Vercel scripts on the VPS', () => {
    vi.stubEnv('VERCEL', undefined)
    const html = renderToStaticMarkup(<><div>Content</div><HostingTelemetry /></>)
    expect(html).not.toContain('/_vercel/')
    expect(html).toContain('Content')
  })

  it('enables both Vercel scripts when hosted on Vercel', () => {
    vi.stubEnv('VERCEL', '1')
    const html = renderToStaticMarkup(<><div>Content</div><HostingTelemetry /></>)
    expect(html).toContain('/_vercel/speed-insights/script.js')
    expect(html).toContain('/_vercel/insights/script.js')
  })
})
