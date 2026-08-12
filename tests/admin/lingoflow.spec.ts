import { expect } from '@playwright/test'
import { test, testAsAdmin } from '../fixtures/auth-fixtures'

test.describe('LingoFlow API authentication', () => {
  test('returns a JSON 401 instead of a sign-in redirect when unauthenticated', async ({ request }) => {
    const response = await request.post('/api/admin/lingoflow/generate', {
      data: { mode: 'growth-analysis' },
      maxRedirects: 0,
    })

    expect(response.status()).toBe(401)
    expect(response.headers()['content-type']).toContain('application/json')
    await expect(response.json()).resolves.toEqual({ error: 'No autenticado' })
  })
})

testAsAdmin.describe('LingoFlow responsive dashboard', () => {
  for (const width of [320, 375, 414, 768]) {
    testAsAdmin(`has no horizontal overflow at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 })
      await page.goto('/admin/lingoflow')
      await expect(page.getByTestId('lingoflow-dashboard')).toBeVisible()
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
    })
  }
})
