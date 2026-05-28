# AGENTS.md

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
