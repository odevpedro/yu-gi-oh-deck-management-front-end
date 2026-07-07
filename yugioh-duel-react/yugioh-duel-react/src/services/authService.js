const AUTH_URL = import.meta.env.VITE_AUTH_URL ?? 'http://localhost:8086/auth'

async function requestJson(path, options) {
  const response = await fetch(`${AUTH_URL}${path}`, {
    headers: { 'Content-Type': 'application/json', ...(options.headers ?? {}) },
    ...options,
  })

  if (!response.ok) {
    const message = await response.text()
    throw new Error(message || `HTTP ${response.status}`)
  }

  return response.json()
}

export function login(username, password) {
  return requestJson('/login', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  })
}

export function register(username, email, password) {
  return requestJson('/register', {
    method: 'POST',
    body: JSON.stringify({ username, email, password }),
  })
}
