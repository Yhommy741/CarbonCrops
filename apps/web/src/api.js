import { useCallback, useEffect, useState } from 'react'

const TOKEN_KEY = 'cc_token'

export function getToken() {
  try {
    return localStorage.getItem(TOKEN_KEY)
  } catch {
    return null
  }
}

export function setToken(token) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token)
    else localStorage.removeItem(TOKEN_KEY)
  } catch {
    // storage blocked (private mode); the session just won't survive a reload
  }
}

function apiError(message, code, params) {
  return Object.assign(new Error(message), { code, params })
}

/** Call the FastAPI backend. `body` is sent as JSON, `form` as multipart (photos). */
export async function api(path, { method = 'GET', body, form } = {}) {
  const headers = {}
  const token = getToken()
  if (token) headers.Authorization = `Bearer ${token}`
  let payload = form
  if (body !== undefined) {
    headers['Content-Type'] = 'application/json'
    payload = JSON.stringify(body)
  }

  const res = await fetch(`/api${path}`, { method, headers, body: payload })
  if (res.status === 401 && token) {
    setToken(null)
    window.dispatchEvent(new Event('cc:logout'))
  }
  if (!res.ok) {
    let detail = null
    try {
      detail = (await res.json()).detail
    } catch {
      // not JSON
    }
    // API errors are {code, message}; <ErrorBox> translates the code (locales: errors.<code>)
    if (detail?.code) throw apiError(detail.message, detail.code)
    if (Array.isArray(detail)) throw apiError(detail.map((d) => d.msg).join(', ')) // validation errors
    throw apiError(detail || `HTTP ${res.status}`, 'http', { status: res.status })
  }
  return res.status === 204 ? null : res.json()
}

/** GET `path` on mount and whenever it changes. Pass null to skip. */
export function useApi(path) {
  const [state, setState] = useState({ data: null, error: null, loading: true })
  const [version, setVersion] = useState(0)

  useEffect(() => {
    if (!path) return undefined
    let alive = true
    setState((s) => ({ ...s, loading: true }))
    api(path)
      .then((data) => alive && setState({ data, error: null, loading: false }))
      .catch((error) => alive && setState({ data: null, error, loading: false }))
    return () => {
      alive = false
    }
  }, [path, version])

  const reload = useCallback(() => setVersion((v) => v + 1), [])
  return { ...state, reload }
}

export const fileUrl = (path) => (path ? `/${path}` : null)
