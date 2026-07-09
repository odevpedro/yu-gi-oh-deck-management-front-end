const API_BASE = import.meta.env.VITE_API_BASE ?? ''

export class ApiError extends Error {
  constructor(message, status, data) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.data = data
  }
}

function getToken() {
  try {
    const raw = localStorage.getItem('auth')
    if (!raw) return null
    const parsed = JSON.parse(raw)
    return parsed?.token ?? null
  } catch {
    return null
  }
}

export async function apiRequest(path, options = {}) {
  const token = getToken()
  const headers = { ...options.headers }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  if (!headers['Content-Type'] && !(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json'
  }

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 15000)

  try {
    const res = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers,
      signal: controller.signal,
    })

    if (res.status === 401) {
      localStorage.removeItem('auth')
      window.location.href = '/'
      throw new ApiError('Nao autorizado', 401)
    }

    if (!res.ok) {
      const body = await res.text()
      let data
      try { data = JSON.parse(body) } catch { data = body }
      throw new ApiError(data?.message ?? `Erro ${res.status}`, res.status, data)
    }

    const text = await res.text()
    return text ? JSON.parse(text) : null
  } catch (err) {
    if (err instanceof ApiError) throw err
    if (err.name === 'AbortError') {
      throw new ApiError('Tempo limite excedido', 408)
    }
    throw new ApiError(err.message ?? 'Erro de conexao', 0)
  } finally {
    clearTimeout(timeout)
  }
}
