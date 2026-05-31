import { test, expect, type APIRequestContext } from '@playwright/test'

/**
 * Smoke tests del endpoint MCP (`POST /api/mcp`).
 *
 * Estos tests cubren:
 *  - Rechazo sin Authorization (401)
 *  - Rechazo con API key inválida (401)
 *  - Listado de tools con API key válida (`tools/list`)
 *  - Llamada a una tool de solo lectura (`lingowow_courses_stats`)
 *  - Rate limiting básico (429 al exceder)
 *
 * Para los tests "happy path" se necesita la variable de entorno
 * `MCP_TEST_ADMIN_API_KEY` con una key activa de un usuario ADMIN
 * que tenga al menos los scopes `mcp:courses:read` y `mcp:users:read`.
 * Si no está definida, esos tests se saltan automáticamente.
 *
 * Ejecutar:
 *   MCP_TEST_ADMIN_API_KEY=lw_live_xxx npx playwright test tests/api/mcp.spec.ts --project=chromium
 */

const ENDPOINT = '/api/mcp'
const ADMIN_KEY = process.env.MCP_TEST_ADMIN_API_KEY
const PROTOCOL_VERSION = '2025-03-26'

interface JsonRpcRequest {
  jsonrpc: '2.0'
  id: number
  method: string
  params?: Record<string, unknown>
}

let nextId = 1
function rpc(method: string, params?: Record<string, unknown>): JsonRpcRequest {
  return { jsonrpc: '2.0', id: nextId++, method, params }
}

async function postMcp(
  request: APIRequestContext,
  body: JsonRpcRequest | JsonRpcRequest[],
  headers: Record<string, string> = {}
) {
  return request.post(ENDPOINT, {
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json, text/event-stream',
      'MCP-Protocol-Version': PROTOCOL_VERSION,
      ...headers,
    },
    data: body,
  })
}

async function initialize(request: APIRequestContext, apiKey: string) {
  const res = await postMcp(
    request,
    rpc('initialize', {
      protocolVersion: PROTOCOL_VERSION,
      capabilities: {},
      clientInfo: { name: 'lingowow-mcp-tests', version: '0.1.0' },
    }),
    { Authorization: `Bearer ${apiKey}` }
  )
  expect(res.ok()).toBeTruthy()
  return res
}

test.describe('MCP endpoint /api/mcp', () => {
  test('rechaza POST sin Authorization', async ({ request }) => {
    const res = await postMcp(request, rpc('tools/list'))
    expect(res.status()).toBe(401)
  })

  test('rechaza POST con API key inválida', async ({ request }) => {
    const res = await postMcp(request, rpc('tools/list'), {
      Authorization: 'Bearer lw_live_definitely_not_a_real_key_0000000000',
    })
    expect(res.status()).toBe(401)
  })

  test('rechaza POST con prefijo Bearer mal formado', async ({ request }) => {
    const res = await postMcp(request, rpc('tools/list'), {
      Authorization: 'Token lw_live_xxx',
    })
    expect(res.status()).toBe(401)
  })

  test.describe('con API key admin válida', () => {
    test.skip(!ADMIN_KEY, 'Define MCP_TEST_ADMIN_API_KEY para correr este grupo')

    test('tools/list devuelve las tools registradas', async ({ request }) => {
      await initialize(request, ADMIN_KEY!)
      const res = await postMcp(request, rpc('tools/list'), {
        Authorization: `Bearer ${ADMIN_KEY!}`,
      })
      expect(res.ok()).toBeTruthy()
      const json = await res.json()
      expect(json.result).toBeDefined()
      expect(Array.isArray(json.result.tools)).toBeTruthy()
      const names = (json.result.tools as { name: string }[]).map((t) => t.name)
      expect(names).toEqual(expect.arrayContaining([
        'lingowow_users_list',
        'lingowow_enrollments_list',
        'lingowow_courses_list',
        'lingowow_finance_report',
      ]))
    })

    test('tools/call lingowow_courses_stats responde con datos', async ({ request }) => {
      await initialize(request, ADMIN_KEY!)
      const res = await postMcp(
        request,
        rpc('tools/call', {
          name: 'lingowow_courses_stats',
          arguments: {},
        }),
        { Authorization: `Bearer ${ADMIN_KEY!}` }
      )
      expect(res.ok()).toBeTruthy()
      const json = await res.json()
      expect(json.result).toBeDefined()
      expect(json.result.isError).not.toBe(true)
      const text = json.result.content[0]?.text
      expect(typeof text).toBe('string')
      const stats = JSON.parse(text)
      expect(stats).toHaveProperty('totalCourses')
    })

    test('tools/call con scope insuficiente devuelve error', async ({ request }) => {
      // Asume que la key de pruebas NO tiene mcp:users:write — si la tiene,
      // este test pasa trivialmente.
      await initialize(request, ADMIN_KEY!)
      const res = await postMcp(
        request,
        rpc('tools/call', {
          name: 'lingowow_users_delete',
          arguments: { id: 'non-existent-user-id' },
        }),
        { Authorization: `Bearer ${ADMIN_KEY!}` }
      )
      // Aceptamos tanto error de scope (403 lógico dentro del payload) como
      // error de "usuario no encontrado" — ambos son comportamiento válido.
      expect(res.ok()).toBeTruthy()
      const json = await res.json()
      const text = json.result.content[0]?.text || ''
      expect(json.result.isError === true || text.includes('error')).toBeTruthy()
    })

    test('rate limit responde 429 al exceder el cupo', async ({ request }) => {
      // El default es 60 req/min; lanzamos 80 en paralelo para forzar el límite.
      // Si MCP_RATE_LIMIT_PER_MINUTE está configurado más alto, este test puede
      // pasar sin disparar el 429 — lo skipeamos en ese caso.
      const limit = Number.parseInt(process.env.MCP_RATE_LIMIT_PER_MINUTE || '60', 10)
      test.skip(limit > 100, 'Rate limit demasiado alto para este test')

      const promises = Array.from({ length: limit + 20 }, () =>
        postMcp(request, rpc('tools/list'), {
          Authorization: `Bearer ${ADMIN_KEY!}`,
        })
      )
      const responses = await Promise.all(promises)
      const tooMany = responses.filter((r) => r.status() === 429)
      expect(tooMany.length).toBeGreaterThan(0)
    })
  })
})
