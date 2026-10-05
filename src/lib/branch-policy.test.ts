import { describe, expect, it } from 'vitest'

// The policy runner is deliberately kept outside the application bundle so it
// can execute in GitHub Actions without loading application dependencies.
import {
  evaluatePromotion,
  isSameRepository,
  runPromotionPolicy,
} from '../../scripts/check-branch-policy.mjs'

const repository = {
  id: 100,
  full_name: 'Lingowow/web',
}

function pullRequest(overrides = {}) {
  return {
    base: { ref: 'main', repo: repository },
    head: { ref: 'dev', sha: 'a'.repeat(40), repo: repository },
    ...overrides,
  }
}

describe('branch promotion policy', () => {
  it('allows dev from the same repository into main', () => {
    expect(evaluatePromotion(pullRequest())).toMatchObject({
      applies: true,
      allowed: true,
      close: false,
      reason: 'dev-from-same-repository',
    })
  })

  it('rejects a foreign repository that uses the dev branch name', () => {
    const foreignHead = {
      ref: 'dev',
      sha: 'b'.repeat(40),
      repo: { id: 200, full_name: 'contributor/web' },
    }

    expect(evaluatePromotion(pullRequest({ head: foreignHead }))).toMatchObject({
      applies: true,
      allowed: false,
      close: true,
      reason: 'dev-is-from-another-repository',
    })
  })

  it('rejects any non-dev head targeting main', () => {
    expect(evaluatePromotion(pullRequest({ head: { ...pullRequest().head, ref: 'feature/login' } }))).toMatchObject({
      applies: true,
      allowed: false,
      close: true,
      reason: 'head-is-not-dev',
    })
  })

  it('leaves pull requests targeting dev available for work branches', () => {
    expect(evaluatePromotion(pullRequest({ base: { ref: 'dev', repo: repository } }))).toMatchObject({
      applies: false,
      allowed: true,
      close: false,
      reason: 'base-is-not-main',
    })
  })

  it('uses repository identity instead of the branch name alone', () => {
    expect(isSameRepository(repository, { id: 200, full_name: repository.full_name })).toBe(false)
  })

  it('writes main-from-dev to the pull request head SHA', async () => {
    const requests: Array<{ url: string; init: RequestInit }> = []
    const fetchImpl: typeof fetch = async (input, init) => {
      requests.push({ url: String(input), init: init ?? {} })
      return { ok: true, status: 201 } as Response
    }

    await runPromotionPolicy({
      eventName: 'pull_request_target',
      event: { pull_request: { ...pullRequest(), number: 42 } },
      environment: {
        ...process.env,
        GITHUB_TOKEN: 'token',
        GITHUB_REPOSITORY: 'Lingowow/web',
        GITHUB_API_URL: 'https://api.github.com',
      },
      fetchImpl,
    })

    expect(requests).toHaveLength(1)
    expect(requests[0].url).toBe(`https://api.github.com/repos/Lingowow/web/statuses/${'a'.repeat(40)}`)
    expect(JSON.parse(String(requests[0].init.body))).toMatchObject({
      state: 'success',
      context: 'main-from-dev',
    })
  })

  it('closes an unauthorized main pull request after recording failure', async () => {
    const requests: Array<{ url: string; init: RequestInit }> = []
    const fetchImpl: typeof fetch = async (input, init) => {
      requests.push({ url: String(input), init: init ?? {} })
      return { ok: true, status: 200 } as Response
    }
    const event = {
      pull_request: {
        ...pullRequest({ head: { ...pullRequest().head, ref: 'feature/login' }, number: 43 }),
      },
    }

    await runPromotionPolicy({
      eventName: 'pull_request_target',
      event,
      environment: {
        ...process.env,
        GITHUB_TOKEN: 'token',
        GITHUB_REPOSITORY: 'Lingowow/web',
        GITHUB_API_URL: 'https://api.github.com',
      },
      fetchImpl,
    })

    expect(requests).toHaveLength(2)
    expect(JSON.parse(String(requests[0].init.body))).toMatchObject({
      state: 'failure',
      context: 'main-from-dev',
    })
    expect(requests[1].url).toBe('https://api.github.com/repos/Lingowow/web/pulls/43')
    expect(JSON.parse(String(requests[1].init.body))).toEqual({ state: 'closed' })
  })
})
