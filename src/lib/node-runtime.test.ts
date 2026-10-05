import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const read = (file: string) => readFileSync(resolve(process.cwd(), file), 'utf8')

describe('supported dependency runtime', () => {
  it('uses Node 24 in development, CI, and new staging deployments', () => {
    expect(read('.nvmrc').trim()).toBe('24')
    expect(JSON.parse(read('package.json')).engines.node).toBe('24.x')
    expect(read('scripts/deployment/provision-dev.php')).toContain("'NIXPACKS_NODE_VERSION' => '24'")
    for (const workflow of ['pr-quality.yml', 'deploy-environments.yml', 'playwright.yml']) {
      const source = read(`.github/workflows/${workflow}`)
      const versions = [...source.matchAll(/node-version:\s*(\d+)/g)].map(match => match[1])
      expect(versions.length).toBeGreaterThan(0)
      expect(versions.every(version => version === '24')).toBe(true)
    }
  })

  it('pins setup-node v7 in every Node workflow without enabling automatic deployment', () => {
    for (const workflow of ['pr-quality.yml', 'deploy-environments.yml', 'playwright.yml']) {
      const source = read(`.github/workflows/${workflow}`)
      const actions = [...source.matchAll(/actions\/setup-node@([^\s]+)/g)].map(match => match[1])
      expect(actions.length).toBeGreaterThan(0)
      expect(actions.every(action => action === '820762786026740c76f36085b0efc47a31fe5020')).toBe(true)
    }
    expect(read('scripts/deployment/provision-dev.php')).toContain("'is_auto_deploy_enabled' => false")
  })
})
