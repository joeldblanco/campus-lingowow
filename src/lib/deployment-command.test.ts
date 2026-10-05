import { spawnSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const bash = process.platform === 'win32'
  ? 'C:/Program Files/Git/bin/bash.exe'
  : '/bin/bash'
const commandScript = resolve('scripts/deployment/ci-command.sh')

describe('restricted deployment SSH command', () => {
  it('has a valid shell syntax', () => {
    expect(existsSync(bash)).toBe(true)
    expect(spawnSync(bash, ['-n', commandScript]).status).toBe(0)
    expect(spawnSync(bash, ['-n', resolve('scripts/deployment/refresh-dev-data.sh')]).status).toBe(0)
  })

  it.each([
    '',
    'bash',
    'refresh-dev-data extra',
    'refresh-main-data',
    'deploy-main HEAD',
    `deploy-dev ${'a'.repeat(40)}; touch /tmp/not-allowed`,
    `deploy-feature ${'a'.repeat(40)}`,
  ])('rejects unsupported input before loading server configuration: %s', (command) => {
    const result = spawnSync(bash, [commandScript], {
      encoding: 'utf8',
      env: { ...process.env, SSH_ORIGINAL_COMMAND: command },
    })
    expect(result.status).toBe(2)
    expect(result.stderr).toContain('Unsupported staging/deployment command.')
    expect(result.stderr).not.toContain('config.sh')
  })
})
