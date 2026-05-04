# Lingowow Admin MCP Server

Servidor [Model Context Protocol](https://modelcontextprotocol.io/) que expone
operaciones administrativas de Lingowow a agentes LLM. Está integrado en la app
Next.js como una API route (`POST /api/mcp`) y reutiliza el sistema de API keys
existente para autenticación.

## Dominios cubiertos

| Dominio | Scopes | Ejemplos de tools |
|---------|--------|-------------------|
| Usuarios | `mcp:users:read`, `mcp:users:write` | `lingowow_users_list`, `lingowow_users_create`, `lingowow_users_set_status` |
| Inscripciones | `mcp:enrollments:read`, `mcp:enrollments:write` | `lingowow_enrollments_create`, `lingowow_enrollments_activate_pending` |
| Finanzas | `mcp:finance:read`, `mcp:finance:write` | `lingowow_finance_report`, `lingowow_finance_movement_create`, `lingowow_payments_update_status` |
| Cursos | `mcp:courses:read`, `mcp:courses:write` | `lingowow_courses_list`, `lingowow_courses_toggle_published` |
| Clases / sesiones | `mcp:classes:read`, `mcp:classes:write` | `lingowow_classes_create`, `lingowow_classes_reschedule`, `lingowow_classes_bulk_update` |
| Cupones | `mcp:coupons:read`, `mcp:coupons:write` | `lingowow_coupons_create`, `lingowow_coupons_update` |
| Productos / planes | `mcp:products:read`, `mcp:products:write` | `lingowow_products_create`, `lingowow_plans_create` |
| Profesores | `mcp:teachers:read`, `mcp:teachers:write` | `lingowow_teachers_payment_report`, `lingowow_teachers_projected_cost`, `lingowow_teachers_toggle_class_payable` |
| Períodos académicos | `mcp:academic-periods:read`, `mcp:academic-periods:write` | `lingowow_academic_periods_list`, `lingowow_academic_periods_set_active`, `lingowow_academic_periods_generate_year` |
| Créditos virtuales | `mcp:credits:read`, `mcp:credits:write` | `lingowow_credits_get_balance`, `lingowow_credits_add`, `lingowow_credits_packages_create` |
| Audit logs | `mcp:audit-logs:read` | `lingowow_audit_logs_list`, `lingowow_audit_logs_recent_mcp` |
| Exámenes | `mcp:exams:read`, `mcp:exams:write` | `lingowow_exams_create`, `lingowow_exams_assign`, `lingowow_exams_grade_answer`, `lingowow_exams_finalize_review` |
| Calificaciones | `mcp:grades:read`, `mcp:grades:write` | `lingowow_grades_list`, `lingowow_grades_progress_report`, `lingowow_grades_update_activity` |
| Notificaciones | `mcp:notifications:read`, `mcp:notifications:write` | `lingowow_notifications_create`, `lingowow_notifications_send_bulk`, `lingowow_notifications_newsletter_subscribe` |
| Analytics | `mcp:analytics:read` | `lingowow_analytics_dashboard_kpis`, `lingowow_analytics_revenue`, `lingowow_analytics_projections`, `lingowow_analytics_financial_health` |

Lista completa y actualizada de scopes en [`scopes.ts`](./scopes.ts). Todos los
tools registrados se concentran en [`registry.ts`](./registry.ts).

## Cómo crear una API key MCP

1. Inicia sesión como **ADMIN** en el campus.
2. Visita `/admin/api-keys`.
3. En "Crear nueva API key":
   - Asigna un nombre descriptivo (ej. `Agente de soporte`).
   - Usa el preset **MCP solo lectura** o **MCP admin completo**, o marca scopes individuales.
   - Para scopes `mcp:*:write` la expiración es obligatoria (máx 90 días).
4. Crea la key. **Cópiala inmediatamente** — solo se muestra una vez.

> Las keys se almacenan como hash SHA-256 (`db.apiKey.key`). El prefijo visible
> sirve para identificar la key en la UI sin exponer el secreto.

## Probar con MCP Inspector

```bash
npx @modelcontextprotocol/inspector
```

En la UI del Inspector:

- **Transport**: `Streamable HTTP`
- **URL**: `http://localhost:3000/api/mcp`
- **Headers**: `Authorization: Bearer lw_live_xxx`

Luego prueba `tools/list` y llama `lingowow_users_list` con `{ "limit": 5 }`.

## Conectar Claude Code

```bash
claude mcp add --transport http lingowow https://tu-dominio/api/mcp \
  --header "Authorization: Bearer lw_live_xxx"
```

O añádelo en `~/.claude/mcp_servers.json` (formato exacto puede variar; consulta
la documentación oficial).

## Conectar Claude Desktop

Edita `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "lingowow": {
      "transport": "http",
      "url": "https://tu-dominio/api/mcp",
      "headers": {
        "Authorization": "Bearer lw_live_xxx"
      }
    }
  }
}
```

Reinicia Claude Desktop. Las tools `lingowow_*` aparecerán en el selector.

## Arquitectura

```
src/lib/mcp/
├── README.md          ← este archivo
├── audit.ts           ← logToolInvocation() escribe AuditLog con args redactados
├── auth.ts            ← authenticateMcpRequest() valida API key + ADMIN
├── context.ts         ← AsyncLocalStorage propaga userId/scopes al stack
├── errors.ts          ← McpToolError + unwrapActionResult()
├── idempotency.ts     ← cache TTL 24h por (userId, tool, idempotencyKey)
├── rate-limit.ts      ← in-memory por userId (60 req/min default)
├── registry.ts        ← TOOL_REGISTRY: AnyToolModule[]
├── scopes.ts          ← catálogo de scopes y presets
├── server.ts          ← buildMcpServer() registra todas las tools
├── types.ts           ← interfaz ToolModule
└── tools/             ← un archivo por dominio
    ├── academic-periods.ts
    ├── analytics.ts
    ├── audit-logs.ts
    ├── classes.ts
    ├── coupons.ts
    ├── courses.ts
    ├── credits.ts
    ├── enrollments.ts
    ├── exams.ts
    ├── finance.ts
    ├── grades.ts
    ├── notifications.ts
    ├── products.ts
    ├── teachers.ts
    └── users.ts
```

El endpoint HTTP está en [`src/app/api/mcp/route.ts`](../../app/api/mcp/route.ts).

### Flujo de una llamada

```
POST /api/mcp
  ↓ authenticateMcpRequest    → API key + ADMIN
  ↓ checkMcpRateLimit         → 60 req/min/userId, 429 si excede
  ↓ runWithMcpContext         → AsyncLocalStorage { userId, scopes, roles }
  ↓ WebStandardStreamableHTTPServerTransport
  ↓ McpServer (handler)
    ↓ hasAllScopes            → 403 si faltan
    ↓ getIdempotentResult     → devuelve cached si idempotencyKey ya usado
    ↓ tool.handler            → server action existente (reusa lógica)
    ↓ storeIdempotentResult   → cachea por 24h si idempotencyKey
    ↓ logToolInvocation       → AuditLog (args redactados)
```

El `AsyncLocalStorage` es clave: muchas server actions llaman `auth()`
internamente, y los helpers `getCurrentUser()` y `ensureAdminUser()` (en
finance) caen al contexto MCP cuando no hay sesión NextAuth, así las acciones
funcionan sin cookies.

## Añadir un dominio nuevo

1. Crea `src/lib/mcp/tools/<dominio>.ts` exportando `<dominio>Tools: AnyToolModule[]`.
2. Importa y agrega al array en `registry.ts`.
3. Añade los nuevos scopes a `scopes.ts` (los presets se actualizan automáticamente).
4. Si la server action subyacente llama `auth()` directamente y no funciona vía MCP, refactorízala para usar `getCurrentUser()` (que ya cae al contexto MCP) o sigue el patrón de `ensureAdminUser` en `finance.ts`.

Ejemplo mínimo:

```ts
// src/lib/mcp/tools/notifications.ts
import { z } from 'zod'
import { sendNotification } from '@/lib/actions/notifications'
import { unwrapActionResult } from '@/lib/mcp/errors'
import type { AnyToolModule } from '@/lib/mcp/types'

export const notificationTools: AnyToolModule[] = [
  {
    name: 'lingowow_notifications_send',
    description: 'Envía una notificación a un usuario.',
    scopes: ['mcp:notifications:write'],
    inputShape: {
      userId: z.string().min(1),
      message: z.string().min(1),
    },
    handler: async ({ userId, message }) => {
      const r = await sendNotification(userId, message)
      return unwrapActionResult(r)
    },
  },
]
```

## Idempotencia

Cualquier tool de escritura acepta opcionalmente `idempotencyKey: string`.
Cuando se pasa, la primera llamada se ejecuta y el resultado se cachea por 24h
(in-memory). Llamadas posteriores con la misma `(userId, tool, idempotencyKey)`
devuelven el resultado cacheado sin re-ejecutar.

Recomendado para mutaciones que el agente podría reintentar tras un timeout
(`lingowow_users_create`, `lingowow_classes_create`, `lingowow_finance_movement_create`,
etc.).

```json
{
  "name": "lingowow_classes_create",
  "arguments": {
    "enrollmentId": "...",
    "teacherId": "...",
    "datetime": "2026-05-10T14:00",
    "idempotencyKey": "agent-job-7e2a-001"
  }
}
```

## Variables de entorno

| Variable | Default | Descripción |
|----------|---------|-------------|
| `MCP_RATE_LIMIT_PER_MINUTE` | `60` | Requests por minuto por userId. |
| `MCP_TEST_ADMIN_API_KEY` | _unset_ | Habilita los smoke tests happy-path en `tests/api/mcp.spec.ts`. |

## Auditoría

Cada llamada se registra en `AuditLog` con:

- `action: MCP_TOOL_INVOKED`
- `category: ADMIN`
- `userId`: dueño de la API key
- `metadata`: `{ tool, args (redactado), durationMs, ok, error?, _cached? }`

Campos como `password`, `token`, `apiKey`, `secret`, `cookie` se reemplazan por
`[REDACTED]` antes de persistir.

## Limitaciones conocidas

- **Stateless**: cada request HTTP instancia un servidor MCP nuevo. No hay subscripciones server→client persistentes. Para notificaciones push, añadir un store externo (Redis) y switch a modo stateful.
- **Rate limit por instancia**: in-memory; en deployments multi-region (Vercel) cada instancia tiene su propio contador. Para límite global, sustituir `rate-limit.ts` por Upstash Redis.
- **Idempotencia por instancia**: igual al rate limit. Cache local de 24h.
- **Vercel timeout**: 60s. Reportes financieros muy amplios pueden cortarse — usa filtros (`periodId`, `startDate`/`endDate`) para acotarlos.
- **Edge runtime no soportado**: el SDK requiere Node (`runtime = 'nodejs'` en `route.ts`).
