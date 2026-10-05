import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

describe('self-hosted analytics', () => {
  it('does not install Vercel telemetry packages', () => {
    const manifest = JSON.parse(readFileSync(resolve('package.json'), 'utf8'))
    const dependencies = { ...manifest.dependencies, ...manifest.devDependencies }
    expect(dependencies).not.toHaveProperty('@vercel/analytics')
    expect(dependencies).not.toHaveProperty('@vercel/speed-insights')
    const lock = JSON.parse(readFileSync(resolve('package-lock.json'), 'utf8'))
    expect(lock.packages).not.toHaveProperty('node_modules/@vercel/analytics')
    expect(lock.packages).not.toHaveProperty('node_modules/@vercel/speed-insights')
  })

  it('keeps self-hosted analytics without loading Vercel integrations', () => {
    const layout = readFileSync(resolve('src/app/layout.tsx'), 'utf8')
    expect(layout).not.toContain('@vercel/')
    expect(layout).not.toContain('HostingTelemetry')
    expect(layout).not.toContain('/_vercel/')
    expect(layout).toContain('https://analytics.lingowow.com/script.js')
  })
})
