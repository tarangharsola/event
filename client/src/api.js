export function getAuth() {
  return {
    sessionId: localStorage.getItem('sessionId') || '',
    role: localStorage.getItem('role') || '',
  }
}

export function setAuth({ sessionId, role }) {
  localStorage.setItem('sessionId', sessionId)
  localStorage.setItem('role', role)
}

export function clearAuth() {
  localStorage.removeItem('sessionId')
  localStorage.removeItem('role')
}

export async function apiFetch(path, { method = 'GET', body } = {}) {
  const { sessionId } = getAuth()

  const headers = {}
  if (sessionId) headers['x-session-id'] = sessionId
  if (body !== undefined) headers['Content-Type'] = 'application/json'

  const resp = await fetch(path, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })

  const data = await resp.json().catch(() => ({}))
  return { ok: resp.ok, status: resp.status, data }
}
