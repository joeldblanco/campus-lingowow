import { SpeedInsights } from '@vercel/speed-insights/next'
import { Analytics } from '@vercel/analytics/next'

export function HostingTelemetry() {
  if (process.env.VERCEL !== '1') return null

  return (
    <>
      <SpeedInsights />
      <Analytics />
    </>
  )
}
