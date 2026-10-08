import { spawn, spawnSync } from 'node:child_process'
import { existsSync, mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

/*
 * PocketBase de verdad para los tests: arranca backend/bin/pocketbase en una carpeta temporal con las migraciones
 * y los hooks del repo, y da un cliente mínimo de la API. Si no está el binario, HAS_PB es false y los tests se saltan.
 */
const ROOT = new URL('..', import.meta.url).pathname
const BIN = join(ROOT, 'bin/pocketbase')
export const HAS_PB = existsSync(BIN)
export const PASS = 'contraseña-de-prueba-1'

export function client(base, token) {
  const api = async (method, path, body) => {
    const res = await fetch(base + path, {
      method,
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: token } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    })
    const data = await res.json().catch(() => null)
    return { ok: res.ok, status: res.status, data }
  }
  return {
    token,
    api,
    get: p => api('GET', p),
    post: (c, b) => api('POST', `/api/collections/${c}/records`, b),
    patch: (c, id, b) => api('PATCH', `/api/collections/${c}/records/${id}`, b),
    del: (c, id) => api('DELETE', `/api/collections/${c}/records/${id}`),
    list: (c, q = '') => api('GET', `/api/collections/${c}/records?perPage=500${q}`),
    one: (c, id) => api('GET', `/api/collections/${c}/records/${id}`),
  }
}

export async function startPocketBase() {
  const dir = mkdtempSync(join(tmpdir(), 'novaclass-pb-'))
  const port = 8700 + Math.floor(Math.random() * 250)
  const base = `http://127.0.0.1:${port}`
  const args = ['--dir', join(dir, 'data'), '--migrationsDir', join(ROOT, 'pb_migrations'), '--hooksDir', join(ROOT, 'pb_hooks')]
  const up = spawnSync(BIN, ['superuser', 'upsert', 'admin@test.local', PASS, ...args], { encoding: 'utf8' })
  if (up.status !== 0) throw new Error(up.stderr || up.stdout)
  const proc = spawn(BIN, ['serve', '--http', `127.0.0.1:${port}`, ...args], { stdio: 'ignore' })
  for (let i = 0; i < 60; i++) {
    if (
      await fetch(base + '/api/health').then(
        x => x.ok,
        () => false,
      )
    )
      break
    await new Promise(x => setTimeout(x, 100))
  }
  const login = async (collection, email) => {
    const res = await client(base).api('POST', `/api/collections/${collection}/auth-with-password`, { identity: email, password: PASS })
    if (!res.ok) throw new Error('login ' + email + ': ' + JSON.stringify(res.data))
    return client(base, res.data.token)
  }
  const loginWith = async (email, password) => {
    const res = await client(base).api('POST', '/api/collections/users/auth-with-password', { identity: email, password })
    if (!res.ok) throw new Error('login ' + email + ': ' + JSON.stringify(res.data))
    return client(base, res.data.token)
  }
  return {
    base,
    login,
    loginWith,
    admin: await login('_superusers', 'admin@test.local'),
    stop() {
      proc.kill()
      rmSync(dir, { recursive: true, force: true })
    },
  }
}
