/**
 * Webhook de auditoría para operaciones sensibles del MCP.
 *
 * Configuración:
 *   - MCP_AUDIT_WEBHOOK_URL: URL completa (Slack/Discord/genérica). Si está
 *     vacía, los webhooks se desactivan silenciosamente.
 *   - MCP_AUDIT_WEBHOOK_SCOPES: CSV de scopes que disparan el webhook. Por
 *     defecto se notifican `mcp:users:impersonate` y todos los `*:write`
 *     que afecten datos críticos. "*" para notificar todo.
 *
 * Política: fire-and-forget con timeout corto (3s). Nunca bloquea la
 * respuesta del MCP ni propaga errores. Los fallos van a Sentry.
 */

import * as Sentry from '@sentry/nextjs'

const WEBHOOK_TIMEOUT_MS = 3000

const DEFAULT_SENSITIVE_SCOPES = new Set<string>([
  'mcp:users:impersonate',
  'mcp:users:write',
  'mcp:finance:write',
  'mcp:credits:write',
  'mcp:enrollments:write',
])

function getWebhookUrl(): string | null {
  const raw = process.env.MCP_AUDIT_WEBHOOK_URL?.trim()
  return raw || null
}

function getSensitiveScopes(): { allScopes: boolean; set: Set<string> } {
  const raw = process.env.MCP_AUDIT_WEBHOOK_SCOPES?.trim()
  if (!raw) return { allScopes: false, set: DEFAULT_SENSITIVE_SCOPES }
  if (raw === '*') return { allScopes: true, set: new Set() }
  return {
    allScopes: false,
    set: new Set(
      raw
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
    ),
  }
}

export function isSensitiveTool(toolScopes: string[]): boolean {
  const url = getWebhookUrl()
  if (!url) return false
  const config = getSensitiveScopes()
  if (config.allScopes) return true
  return toolScopes.some((scope) => config.set.has(scope))
}

interface WebhookPayload {
  toolName: string
  toolScopes: string[]
  userId: string
  ok: boolean
  durationMs: number
  argsPreview: unknown
  error?: string
  timestamp: string
}

function buildSlackBlock(payload: WebhookPayload): Record<string, unknown> {
  const status = payload.ok ? '✅ ok' : '❌ error'
  return {
    text: `MCP tool *${payload.toolName}* invocada — ${status}`,
    blocks: [
      {
        type: 'section',
        fields: [
          { type: 'mrkdwn', text: `*Tool*\n\`${payload.toolName}\`` },
          { type: 'mrkdwn', text: `*Scopes*\n${payload.toolScopes.join(', ')}` },
          { type: 'mrkdwn', text: `*User*\n\`${payload.userId}\`` },
          { type: 'mrkdwn', text: `*Status*\n${status} (${payload.durationMs}ms)` },
        ],
      },
      ...(payload.error
        ? [
            {
              type: 'section',
              text: { type: 'mrkdwn', text: `*Error*\n\`\`\`${payload.error}\`\`\`` },
            },
          ]
        : []),
      {
        type: 'context',
        elements: [
          {
            type: 'mrkdwn',
            text: `_${payload.timestamp}_`,
          },
        ],
      },
    ],
  }
}

/**
 * Dispara el webhook de auditoría para una invocación de tool sensible.
 * No bloquea: si falla, lo reporta a Sentry y continúa.
 */
export function fireSensitiveToolWebhook(payload: WebhookPayload): void {
  const url = getWebhookUrl()
  if (!url) return
  if (!isSensitiveTool(payload.toolScopes)) return

  const body = JSON.stringify(buildSlackBlock(payload))
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), WEBHOOK_TIMEOUT_MS)

  fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
    signal: controller.signal,
    cache: 'no-store',
  })
    .catch((error) => {
      Sentry.captureException(error, { tags: { mcp_audit_webhook: 'failed' } })
    })
    .finally(() => clearTimeout(timeout))
}
