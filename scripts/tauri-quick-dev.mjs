import { createServer } from 'node:http'
import { createReadStream, existsSync, statSync } from 'node:fs'
import { extname, join, normalize, resolve } from 'node:path'
import { spawn, spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const projectRoot = resolve(fileURLToPath(new URL('..', import.meta.url)))
const frontendRoot = join(projectRoot, 'dist-tauri')
const binaryPath = join(projectRoot, 'src-tauri', 'target', 'debug', 'aster-tauri.exe')
const port = 1420

if (!existsSync(binaryPath)) {
  const cargo = process.platform === 'win32' ? 'cargo.exe' : 'cargo'
  const result = spawnSync(cargo, ['build', '--manifest-path', 'src-tauri/Cargo.toml'], {
    cwd: projectRoot,
    stdio: 'inherit'
  })
  if (result.status !== 0 || !existsSync(binaryPath)) {
    process.exit(result.status ?? 1)
  }
}

const mimeTypes = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2'
}

const server = createServer((request, response) => {
  const requestPath = decodeURIComponent((request.url ?? '/').split('?')[0])
  const candidate = normalize(join(frontendRoot, requestPath === '/' ? 'index.html' : requestPath))
  const safeCandidate = candidate.startsWith(frontendRoot) ? candidate : join(frontendRoot, 'index.html')
  const filePath = existsSync(safeCandidate) && statSync(safeCandidate).isFile()
    ? safeCandidate
    : join(frontendRoot, 'index.html')

  response.setHeader('Content-Type', mimeTypes[extname(filePath)] ?? 'application/octet-stream')
  createReadStream(filePath)
    .on('error', () => {
      response.writeHead(500)
      response.end('Unable to load the frontend')
    })
    .pipe(response)
})

let app
let shuttingDown = false

function shutdown (code = 0) {
  if (shuttingDown) return
  shuttingDown = true
  server.close()
  if (app !== undefined && app.exitCode === null) {
    app.kill()
  }
  process.exit(code)
}

process.on('SIGINT', () => shutdown())
process.on('SIGTERM', () => shutdown())

server.listen(port, '127.0.0.1', () => {
  app = spawn(binaryPath, [], {
    cwd: projectRoot,
    stdio: 'inherit'
  })
  app.on('exit', code => shutdown(code ?? 0))
})
