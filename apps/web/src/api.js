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
    if (Array.isArray(detail)) detail = detail.map((d) => d.msg).join(', ')
    throw new Error(detail || `เกิดข้อผิดพลาด (HTTP ${res.status})`)
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

/** Fetch an image that needs the login token. Returns the Response; read it with res.blob(). */
export async function apiImage(path) {
  const token = getToken()
  const res = await fetch(`/api${path}`, { headers: token ? { Authorization: `Bearer ${token}` } : {} })
  if (!res.ok && res.status !== 404) throw new Error(`HTTP ${res.status}`)
  return res
}

export const fileUrl = (path) => (path ? `/${path}` : null)

/** Current GPS position for geotagged evidence, or null if denied/unavailable. */
export function getPosition() {
  return new Promise((resolve) => {
    if (!navigator.geolocation) return resolve(null)
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
      () => resolve(null),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 },
    )
  })
}
