import { test, expect } from '@playwright/test'

/**
 * Tests de autenticación de los endpoints `/api/bot/*`.
 *
 * Regresión que motiva este archivo: `GET /api/bot/students` se desplegó sin
 * `authenticateRequest`, exponiendo nombre y email de los estudiantes con
 * inscripción activa a cualquiera. Las rutas hermanas sí validaban scopes, y la
 * documentación (`workspace/LINGOWOW-API.md`) ya indicaba llamarla con
 * `Authorization: Bearer $LINGOWOW_API_KEY`.
 *
 * `/api/bot/courses` es público a propósito (solo devuelve info pública de
 * cursos); se cubre aquí para que el arreglo no se pase de largo.
 *
 * El happy path necesita `BOT_TEST_API_KEY` con una key activa que tenga el
 * scope `enrollments:read`. Sin esa variable, esos tests se saltan.
 *
 * Ejecutar:
 *   BOT_TEST_API_KEY=lw_live_xxx npx playwright test tests/api/bot-endpoints.spec.ts --project=chromium
 */

const API_KEY = process.env.BOT_TEST_API_KEY

test.describe('Bot API — autenticación', () => {
  test('GET /api/bot/students - rechaza sin Authorization', async ({ request }) => {
    const response = await request.get('/api/bot/students')

    expect(response.status()).toBe(401)

    const body = await response.json()
    expect(body).toHaveProperty('error')
    expect(JSON.stringify(body)).not.toContain('@')
  })

  test('GET /api/bot/students - rechaza con API key inválida', async ({ request }) => {
    const response = await request.get('/api/bot/students', {
      headers: { Authorization: 'Bearer lw_live_invalida' },
    })

    expect(response.status()).toBe(401)
  })

  test('GET /api/bot/courses - sigue siendo público', async ({ request }) => {
    const response = await request.get('/api/bot/courses')

    expect(response.ok()).toBeTruthy()
  })

  test('GET /api/bot/students - devuelve estudiantes con key válida', async ({ request }) => {
    test.skip(!API_KEY, 'Requiere BOT_TEST_API_KEY con scope enrollments:read')

    const response = await request.get('/api/bot/students', {
      headers: { Authorization: `Bearer ${API_KEY}` },
    })

    expect(response.ok()).toBeTruthy()

    const body = await response.json()
    expect(body).toHaveProperty('students')
    expect(Array.isArray(body.students)).toBeTruthy()
  })
})
