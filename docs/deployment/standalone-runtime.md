# Standalone deployment runtime

The dev deployment previously exported an approximately 5.69 GB Nixpacks image.
Its last failed export exhausted the server disk. The release now separates
build dependencies from the traced Next.js runtime.

## Validation on 2026-10-07

- Isolated Linux build: 438 seconds, including dependencies and image export.
- Runtime after Chromium libraries: 334,741,411 bytes (~335 MB), versus ~5.69 GB.
- Non-root runtime checker: generated a valid PDF with production Chromium.
- Prisma CLI 6.16.2 and Debian/OpenSSL 3 engines present; `--version` passed.
- HTTP smoke: `/auth/signin` and the opening lesson WebP returned 200.
- Unit tests: 163 files / 1,173 tests. ESLint and TypeScript passed.

The measured image reduction is approximately 94%. This is not a guarantee of
an end-to-end deployment duration: compilation and quality checks remain.

## Runtime requirements

`public` and `.next/static` are copied explicitly. Chromium compressed binaries
and the generated Prisma client are included in file tracing. The migration
CLI uses a separate dependency tree so the protected dev-refresh command keeps
working without replacing Next's traced modules. The Prisma schema/migrations
remain available. Runtime libraries include OpenSSL, NSS, NSPR, ALSA, Expat and
curl for Coolify health checks.

Public browser variables are build arguments; credentials are runtime settings.
`.env` and key files are excluded from Docker context. Content JSON imported by
source code remains included. Puppeteer's unused Chrome download is skipped in
Docker and quality-check jobs. All existing release gates remain enabled.

Before switching a deployment to Dockerfile mode, build and smoke-test the
container separately. Configure only dev initially; production remains on its
existing build pack until a separate authorized release. Verify the live app's
commit, health, static chunks, lesson images and PDF runtime after rollout.

Run `node scripts/deployment/verify-standalone.mjs /app --pdf` inside the image
with the checker mounted read-only. Its unit tests reject runtimes missing
assets, Prisma tools/engines or Chromium binaries.