import { existsSync, readdirSync, statSync } from 'node:fs'
import { createRequire } from 'node:module'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

export function verifyStandalone(root) {
  const required = [
    'server.js', '.next/static', 'public/images/lessons/this-is-me',
    'prisma/schema.prisma', 'prisma/migrations',
    'node_modules/prisma/build/index.js',
    'node_modules/.prisma/client', 'node_modules/@sparticuz/chromium/bin',
  ]
  for (const file of required) {
    const path = resolve(root, file)
    if (!existsSync(path) || (statSync(path).isDirectory() && readdirSync(path).length === 0)) {
      throw new Error(`Incomplete runtime: ${file}`)
    }
  }
  const engineDir = resolve(root, 'node_modules/.prisma/client')
  if (!readdirSync(engineDir).some(file => /query_engine.*\.so\.node$/.test(file))) {
    throw new Error('Missing Linux Prisma query engine')
  }
  const chromiumDir = resolve(root, 'node_modules/@sparticuz/chromium/bin')
  if (!existsSync(resolve(chromiumDir, 'chromium.br'))) {
    throw new Error('Missing compressed Chromium binary')
  }
}

export async function verifyPdf(root) {
  const require = createRequire(resolve(root, 'server.js'))
  const chromium = require('@sparticuz/chromium')
  const puppeteer = require('puppeteer-core')
  const browser = await puppeteer.launch({
    args: chromium.args, executablePath: await chromium.executablePath(), headless: true,
  })
  try {
    const page = await browser.newPage()
    await page.setContent('<!doctype html><h1>Lingowow runtime check</h1>')
    const pdf = await page.pdf({ format: 'A4' })
    if (Buffer.from(pdf).subarray(0, 5).toString() !== '%PDF-') throw new Error('Invalid PDF output')
  } finally {
    await browser.close()
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const root = resolve(process.argv[2] || '.')
  verifyStandalone(root)
  if (process.argv.includes('--pdf')) await verifyPdf(root)
  console.log('Standalone runtime verified' + (process.argv.includes('--pdf') ? ' including PDF generation' : ''))
}
