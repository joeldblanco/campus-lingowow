const { spawn } = require('node:child_process')

function runBuild(args = ['node_modules/next/dist/bin/next', 'build'], intervalMs = 20000) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, ['--max-old-space-size=6144', ...args], {
      stdio: 'inherit',
      env: process.env,
    })
    const heartbeat = setInterval(() => console.log('Build still running'), intervalMs)
    child.once('error', () => {
      clearInterval(heartbeat)
      resolve(1)
    })
    child.once('exit', (code) => {
      clearInterval(heartbeat)
      resolve(code ?? 1)
    })
  })
}

module.exports = { runBuild }
if (require.main === module) {
  runBuild().then((code) => { process.exitCode = code })
}
