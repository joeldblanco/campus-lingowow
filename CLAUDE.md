# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Lingowow is a SaaS campus for an online language academy. Four roles: `GUEST`, `STUDENT`, `TEACHER`, `ADMIN`. Production on Vercel + Neon PostgreSQL. Never break production routes or mutate real data.

---

## Commands

```bash
# Development
npm run dev              # Dev server (Turbopack)
npm run build            # Production build (8GB memory allocated)
npm run lint             # ESLint
npx tsc --noEmit         # Type check without building

# Unit tests (Vitest, jsdom environment)
npm run test:unit                                          # All unit tests
npx vitest run src/path/to/file.test.ts                    # Single file
npx vitest run --reporter=verbose                          # With details

# E2E tests (Playwright – tests/ directory, needs dev server running)
npm run test:stable                                        # Chromium + Firefox
npx playwright test tests/auth.spec.ts                     # Single file
npx playwright test tests/auth.spec.ts --project=chromium  # Single file + browser
npx playwright test --grep "test name"                     # By name
npm run test:auth    # Focused suites: auth|admin|student|teacher|video-call|ecommerce|api

# Database
npm run db:studio        # Prisma Studio
npx prisma generate      # Regenerate client after schema changes
npx prisma db push       # Sync schema to DB (dev only, never prod)
```

---

## Architecture

### Route groups

Three isolated layouts in `src/app/`:

| Group          | Layout                                       | Purpose                                                                     |
| -------------- | -------------------------------------------- | --------------------------------------------------------------------------- |
| `(private)/`   | Sidebar + session validation + all providers | All authenticated routes                                                    |
| `(public)/`    | Minimal header/footer                        | Marketing, shop, library, courses                                           |
| `(recording)/` | Bare — no sidebar, no session providers      | LiveKit recording template (isolated to avoid provider/hydration conflicts) |

New routes requiring auth must be added to `src/routes.ts` (consumed by `src/middleware.ts`).

### Auth flow

Four files work together: `src/auth.config.ts` (providers: Credentials + Google) → `src/auth.ts` (JWT callbacks, session enrichment, PrismaAdapter) → `src/middleware.ts` (edge runtime, role-based redirects) → `src/routes.ts` (public/auth/admin route allowlists).

- `session.user.roles` is **`string[]`**, not a string. Always use `.includes('ADMIN')`.
- Admin impersonation is wired into JWT callbacks in `src/auth.ts`. Do not break `isImpersonating` / `originalUserId` logic.
- Server Components: `const session = await auth()` (from `@/auth`). Client: `useSession()` (from `next-auth/react`). Never import `next-auth/react` in Server Components.

### Server Actions vs API Routes

Mutations live in `src/lib/actions/[domain].ts` with `'use server'` at the **file top** (not per-function).

**Server Actions:** all internal mutations, form submissions, data writes.
**API Routes:** external webhooks (PayPal, Niubiz, LiveKit), mobile app (`/api/mobile/`), Socket.io (`/api/socket`).

Standard action return: `{ success: boolean; message: string; data?: T }`
Always: validate with Zod schema from `src/schemas/`, use `handleError` from `@/lib/handleError` in catch, call `revalidatePath()` after writes.

### Data layer

Prisma singleton: `import { db } from '@/lib/db'`. Use `db.$transaction` for multiple dependent writes. Derive complex return types with `Prisma.XxxGetPayload<{include: ...}>` — do not duplicate Prisma model shapes in `src/types/`.

Unit tests mock Prisma globally via `src/__mocks__/@prisma/client.ts` (aliased in `vitest.config.ts`). Never import real `db` in unit tests.

### Realtime (Socket.io)

All realtime features use **Socket.io** exclusively. Pusher has been removed.

- **Config:** `src/lib/socket.ts` — `socketServer.trigger(room, event, data)` and `socketServer.triggerBatch(events)` for server-side emission. Uses `SOCKETIO_INTERNAL_URL` + `SOCKETIO_INTERNAL_SECRET`.
- **Client hook:** `src/hooks/use-socket-channel.ts` — `useSocketChannel(channelName, events[])` joins a room, registers handlers, leaves on unmount.
- **Server Actions that emit:** `src/lib/actions/floating-chat.ts` (`createFloatingConversation`, `sendFloatingMessage`, `markMessagesAsRead`)
- **Channels:** `user-${userId}` (personal notifications), `conversation-${id}` (live messages)
- **Events:** `new-conversation`, `new-message`, `conversation-update`, `conversation-read`

The Socket.io server is external (`NEXT_PUBLIC_SOCKETIO_URL`, default `https://ws.lingowow.com`), not in this repo.

### Payment + credits

Two external gateways: PayPal (`src/lib/paypal.ts`) and Niubiz (`src/lib/niubiz.ts`, Peruvian gateway). Internal credit system uses `StudentCredit` / `ClassCredit` Prisma models — separate from external payment flows. Do not modify Niubiz integration without its documentation.

### Styling

Tailwind v4 + `cn()` from `@/lib/utils`. Custom design tokens in `tailwind.config.ts`: `primary` (#137fec), `background-light`, `background-dark`, `card-dark`. Fonts: `font-sans` (Geist Sans), `font-lexend`, `font-mono` (Geist Mono). Dark mode via `dark:` classes. No CSS Modules, no styled-components.

---

## Key conventions

- **Server Component by default.** Add `'use client'` only for browser APIs, event handlers, or React hooks.
- **No `any`.** Use `Prisma.XxxGetPayload<>` for DB types or define in `src/types/`.
- **Errors:** `handleError` in Server Actions catches and formats errors. Sentry captures automatically in `global-error.tsx` — do not add redundant try/catch where Sentry already covers.
- **Toasts:** `toast()` from `sonner` for user-facing messages in client components.
- **After schema changes:** run `npx prisma generate` before anything else.
- **New env vars:** add to `.env.example`.
- **Commits:** conventional format (`feat:`, `fix:`, `refactor:`, `chore:`). Never commit directly to `main`.

---

## Definition of Done (read before claiming a task complete)

A task is **not** complete until **all** of these hold:

1. `npm run test:unit` passes — zero failing tests.
2. `npm run lint` passes — zero errors. Warnings only allowed if they pre-existed and are unrelated to the change.
3. `npx tsc --noEmit` passes — zero TypeScript errors.
4. Every behavioural change has at least one test that fails without the change and passes with it (write the test first when practical). Exceptions are limited to: documentation-only edits, non-behavioural styling, or changes in repos with no realistic automated test surface — and the exception must be stated explicitly when reporting the task.
5. No test was deleted, weakened, or rewritten to make a failure go away without **explicit user confirmation first**.

### Modifying existing tests

If a user request appears to conflict with an existing test (or a test written earlier in the same task), **stop and ask the user** which behaviour is correct before:
- changing the implementation in a way that breaks the test,
- editing the test to match the new behaviour,
- deleting the test.

State the conflict plainly: "Test X asserts behaviour A. The new requirement implies behaviour B. Which is correct?" Wait for the answer before proceeding.

### Reporting

When you report a task as done, include — in this order — a one-line confirmation that **(a) tests, (b) lint, (c) tsc** all pass, and a short list of tests added or updated. Anything else is a partial delivery.
