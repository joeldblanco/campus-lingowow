import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

export const PROTECTED_BASE_BRANCH = 'main'
export const PROMOTION_HEAD_BRANCH = 'dev'
export const STATUS_CONTEXT = 'main-from-dev'

function repositoryName(repository) {
  return typeof repository?.full_name === 'string'
    ? repository.full_name.trim().toLowerCase()
    : ''
}

/**
 * Compare repository identity from trusted GitHub event metadata.
 * Repository IDs are preferred when both are present; full_name is retained
 * as a fallback for older or reduced event fixtures.
 */
export function isSameRepository(baseRepository, headRepository) {
  if (!baseRepository || !headRepository) return false

  if (baseRepository.id != null && headRepository.id != null) {
    return String(baseRepository.id) === String(headRepository.id)
  }

  const baseName = repositoryName(baseRepository)
  const headName = repositoryName(headRepository)
  return baseName !== '' && baseName === headName
}

/**
 * Evaluate the only protected promotion path: dev from this repository into
 * main. Pull requests targeting dev are intentionally outside this policy so
 * that work branches remain free to enter the staging branch.
 */
export function evaluatePromotion(pullRequest) {
  const baseRef = pullRequest?.base?.ref
  if (baseRef !== PROTECTED_BASE_BRANCH) {
    return {
      applies: false,
      allowed: true,
      close: false,
      reason: 'base-is-not-main',
    }
  }

  const headRef = pullRequest?.head?.ref
  const sameRepository = isSameRepository(
    pullRequest?.base?.repo,
    pullRequest?.head?.repo,
  )
  const isPromotion = headRef === PROMOTION_HEAD_BRANCH && sameRepository

  return {
    applies: true,
    allowed: isPromotion,
    close: !isPromotion,
    reason: isPromotion
      ? 'dev-from-same-repository'
      : headRef === PROMOTION_HEAD_BRANCH
        ? 'dev-is-from-another-repository'
        : 'head-is-not-dev',
    headSha: pullRequest?.head?.sha,
  }
}

function splitRepository(repository) {
  if (typeof repository !== 'string') {
    throw new Error('GITHUB_REPOSITORY is required')
  }

  const parts = repository.split('/')
  if (parts.length !== 2 || parts.some((part) => part.length === 0)) {
    throw new Error('GITHUB_REPOSITORY must be in owner/repository form')
  }

  return parts
}

function defaultApiUrl(serverUrl) {
  if (!serverUrl || serverUrl === 'https://github.com') {
    return 'https://api.github.com'
  }
  return `${serverUrl.replace(/\/$/, '')}/api/v3`
}

function actionRunUrl(environment) {
  if (!environment.GITHUB_SERVER_URL || !environment.GITHUB_REPOSITORY || !environment.GITHUB_RUN_ID) {
    return undefined
  }
  return `${environment.GITHUB_SERVER_URL}/${environment.GITHUB_REPOSITORY}/actions/runs/${environment.GITHUB_RUN_ID}`
}

function createApiClient({ environment, fetchImpl }) {
  const token = environment.GITHUB_TOKEN
  if (!token) throw new Error('GITHUB_TOKEN is required')

  const [owner, repository] = splitRepository(environment.GITHUB_REPOSITORY)
  const apiUrl = (environment.GITHUB_API_URL || defaultApiUrl(environment.GITHUB_SERVER_URL))
    .replace(/\/$/, '')

  async function request(path, options) {
    const response = await fetchImpl(`${apiUrl}${path}`, {
      ...options,
      headers: {
        accept: 'application/vnd.github+json',
        authorization: `Bearer ${token}`,
        'X-GitHub-Api-Version': '2022-11-28',
        ...(options?.headers || {}),
      },
    })

    if (!response.ok) {
      throw new Error(`GitHub API request failed with status ${response.status}`)
    }
  }

  const repositoryPath = `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repository)}`

  return {
    setStatus(headSha, state, targetUrl) {
      return request(`${repositoryPath}/statuses/${encodeURIComponent(headSha)}`, {
        method: 'POST',
        body: JSON.stringify({
          state,
          context: STATUS_CONTEXT,
          description: state === 'success'
            ? 'Main promotion comes from dev in this repository.'
            : 'Main accepts promotion from dev in this repository only.',
          ...(targetUrl ? { target_url: targetUrl } : {}),
        }),
      })
    },
    closePullRequest(number) {
      return request(`${repositoryPath}/pulls/${number}`, {
        method: 'PATCH',
        body: JSON.stringify({ state: 'closed' }),
      })
    },
  }
}

export async function readEvent(eventPath) {
  if (!eventPath) throw new Error('GITHUB_EVENT_PATH is required')
  return JSON.parse(await readFile(eventPath, 'utf8'))
}

/**
 * Apply the policy using only pull request metadata and GitHub's API.
 * No pull request head is checked out or executed.
 */
/**
 * @param {{
 *   environment?: Record<string, string | undefined>,
 *   event?: Record<string, any>,
 *   eventName?: string,
 *   fetchImpl?: typeof fetch,
 * }} options
 */
export async function runPromotionPolicy({
  environment = process.env,
  event,
  eventName = environment.GITHUB_EVENT_NAME,
  fetchImpl = globalThis.fetch,
} = {}) {
  if (eventName !== 'pull_request_target') {
    return { skipped: true, reason: 'event-is-not-pull-request-target' }
  }
  if (typeof fetchImpl !== 'function') throw new Error('fetch is required')

  const payload = event || await readEvent(environment.GITHUB_EVENT_PATH)
  const decision = evaluatePromotion(payload.pull_request)
  if (!decision.applies) return { skipped: true, ...decision }

  const headSha = decision.headSha
  if (typeof headSha !== 'string' || headSha.length === 0) {
    throw new Error('The pull request head SHA is required')
  }

  const pullNumber = payload.pull_request?.number
  if (!Number.isInteger(pullNumber) || pullNumber < 1) {
    throw new Error('The pull request number is required')
  }

  const api = createApiClient({ environment, fetchImpl })
  const targetUrl = actionRunUrl(environment)
  let statusError
  let closeError

  try {
    await api.setStatus(headSha, decision.allowed ? 'success' : 'failure', targetUrl)
  } catch (error) {
    statusError = error
  }

  if (decision.close) {
    try {
      await api.closePullRequest(pullNumber)
    } catch (error) {
      closeError = error
    }
  }

  if (statusError || closeError) {
    const errors = [statusError, closeError].filter(Boolean)
    throw new AggregateError(errors, 'Branch promotion policy could not complete')
  }

  return { skipped: false, ...decision }
}

async function main() {
  const result = await runPromotionPolicy()
  if (result.skipped) {
    console.log('Branch promotion policy skipped for this event.')
  } else if (result.allowed) {
    console.log('Branch promotion policy passed.')
  } else {
    console.log('Unauthorized main pull request closed by branch promotion policy.')
  }
}

const invokedPath = process.argv[1]
const isInvokedDirectly = invokedPath
  && pathToFileURL(resolve(invokedPath)).href === import.meta.url

if (isInvokedDirectly) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : 'Branch promotion policy failed')
    process.exitCode = 1
  })
}
