# AGENTS.md

## Approved design fidelity — required delivery gate

The user's approved graphic guide and mockups are acceptance requirements, not
optional inspiration. For illustrated units, inspect
`docs/design/graphic-guide-v1/` and
`docs/design/content-format-mockups/v3/`, together with the user's latest
approved references. Later explicit user instructions take precedence.

Before implementation, record the approved reference for each screen and its
essential composition: illustration scale and coverage, complete environments,
character identity/style, objects, text hierarchy, control shape/placement,
spacing, and responsive behavior. Include these requirements and references in
every delegated visual task.

Do not replace illustrated environments with abstract CSS shapes, gradients,
isolated portraits, generic cards, or simplified layouts without explicit user
approval. Reuse and implementation convenience do not authorize a design change.
Prepare a concrete comparison before requesting approval for any deviation.

Before calling a visual implementation complete:

- Compare actual rendered screens with the approved references side by side,
  at comparable viewport sizes, including representative interaction states and
  mobile layouts. Technical tests do not establish visual fidelity.
- Check each recorded composition requirement. A missing or materially reduced
  illustration/environment is a failed requirement even when colors and fonts
  match.
- Save and show actual implementation screenshots as evidence; do not substitute
  mockups or assert fidelity based on source code, DOM checks, or passing tests.
- Before merging or publishing a visual change as complete, include a visual
  acceptance report with the approved reference, actual screenshot, per-screen
  requirement results, and unresolved deviations. A screenshot without the
  reference comparison does not establish compliance.
- Re-dispatch delegated work that fails these requirements instead of combining
  it as finished work.
- Resolve material discrepancies before treating a deployment as the approved
  design. If the user disallows visual checks, honor that instruction and report
  visual fidelity as unverified; never claim it was verified.

A release may be technically healthy while failing the approved design.
Report these outcomes separately and describe incomplete work honestly.

Conventions for any AI coding agent working in this repository. Equivalent to the
"Definition of Done" section of [CLAUDE.md](./CLAUDE.md) — kept here under the
`AGENTS.md` filename so non-Claude tooling picks it up too.

## Before you say a task is done

All of the following must hold. No exceptions, no soft phrasing.

1. `npm run test:unit` — zero failing tests.
2. `npm run lint` — zero errors. Pre-existing warnings unrelated to your change may stay.
3. `npx tsc --noEmit` — zero TypeScript errors.
4. Every behavioural change has a test that fails without it and passes with it.
   Write the test first when practical. The only acceptable skips are:
   docs-only edits, non-behavioural styling, or files in a repo with no real
   test surface — and you must say so explicitly when reporting.
5. No test was deleted, weakened, or rewritten to silence a failure
   **without first asking the user and getting a yes**.

## Modifying existing tests

If a new requirement conflicts with an existing test (or a test written
earlier in the same task), **stop**. Tell the user:

> Test X asserts behaviour A. The new requirement implies behaviour B.
> Which is correct?

Wait for the answer. Do not change the implementation in a way that breaks the
test, do not edit the test to match the new behaviour, and do not delete the
test until the user confirms which behaviour wins.

## Reporting

When you mark a task complete, lead with **one line** stating that tests, lint
and tsc are green, followed by a short list of tests added or updated.
Anything else is a partial delivery — say so honestly.
